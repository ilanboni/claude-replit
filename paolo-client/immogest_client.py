"""
ImmoGest API client — moduli HTTP per Paolo (responder.py).

Sostituisce le chiamate dirette a Supabase con chiamate REST a ImmoGest.
Tutti gli endpoint richiedono header X-API-Key.

Env vars necessarie:
    IMMOGEST_BASE_URL  — es. "https://cavour.replit.app" (prod) o "http://localhost:5000" (dev)
    IMMOGEST_API_KEY   — la chiave plaintext "paolo_live_..." (generata via npm run create-api-key)

Pattern di errore: tutte le funzioni ritornano dict.
    Successo: dict con le chiavi del record (es. "id", "nome", ecc.)
    Errore:   {"_error": True, "_status": int, "_message": str, "_details": Any}

Paolo dovrebbe SEMPRE controllare `if r.get("_error"):` e riportare il _message a Ilan (mai
mentire sul successo — vedi regola di onestà in PAOLO_ADVISORY_SYSTEM).
"""
from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from loguru import logger


# ─── Config ───────────────────────────────────────────────────────────

BASE_URL = os.environ.get("IMMOGEST_BASE_URL", "").rstrip("/")
API_KEY = os.environ.get("IMMOGEST_API_KEY", "")
TIMEOUT_SECONDS = 10.0


def _headers() -> dict[str, str]:
    return {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _is_configured() -> bool:
    return bool(BASE_URL and API_KEY)


def _err(status: int, message: str, details: Any = None) -> dict:
    return {"_error": True, "_status": status, "_message": message, "_details": details}


def _request(method: str, path: str, **kwargs) -> dict:
    if not _is_configured():
        return _err(0, "IMMOGEST_BASE_URL o IMMOGEST_API_KEY mancanti in env")
    url = f"{BASE_URL}{path}"
    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            resp = client.request(method, url, headers=_headers(), **kwargs)
        if resp.status_code >= 400:
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            return _err(resp.status_code, f"{method} {path} → HTTP {resp.status_code}", body)
        try:
            return resp.json()
        except Exception:
            return {"_raw": resp.text}
    except httpx.HTTPError as e:
        logger.exception(f"[immogest_client] {method} {path} failed")
        return _err(0, f"HTTP error: {e}", None)


# ─── Clienti ──────────────────────────────────────────────────────────

def cerca_cliente_per_telefono(telefono: str) -> Optional[dict]:
    """Restituisce il cliente con quel telefono, o None se non esiste."""
    r = _request("GET", f"/api/clienti/by-phone/{telefono}")
    if r.get("_error"):
        if r.get("_status") == 404:
            return None
        logger.warning(f"[immogest] cerca_cliente_per_telefono fallita: {r['_message']}")
        return None
    return r


def lista_clienti(search: Optional[str] = None, tipo: Optional[str] = None, limit: int = 50) -> dict:
    params = {"limit": limit}
    if search:
        params["search"] = search
    if tipo:
        params["tipo"] = tipo
    return _request("GET", "/api/clienti", params=params)


def crea_cliente(
    nome: Optional[str] = None,
    cognome: Optional[str] = None,
    telefono: Optional[str] = None,
    email: Optional[str] = None,
    tipo_cliente: str = "compratore",
    rating_cliente: int = 3,
    note: Optional[str] = None,
    **extra,
) -> dict:
    """Crea un nuovo cliente. Ritorna il record creato (con id) o _error."""
    payload = {
        "nome": nome,
        "cognome": cognome,
        "telefono": telefono,
        "email": email,
        "tipoCliente": tipo_cliente,
        "ratingCliente": rating_cliente,
        "note": note,
    }
    payload.update(extra)
    payload = {k: v for k, v in payload.items() if v is not None}
    return _request("POST", "/api/clienti", json=payload)


def aggiorna_cliente(cliente_id: int, **fields) -> dict:
    """Update parziale di un cliente. fields = colonne da modificare."""
    return _request("PATCH", f"/api/clienti/{cliente_id}", json=fields)


# ─── Immobili ─────────────────────────────────────────────────────────

def crea_immobile(
    titolo: str,
    indirizzo: Optional[str] = None,
    zona: Optional[str] = None,
    citta: Optional[str] = "Milano",
    mq: Optional[int] = None,
    prezzo: Optional[float] = None,
    camere: Optional[int] = None,
    bagni: Optional[int] = None,
    piano: Optional[int] = None,
    origine: str = "mandato",
    proprietario_id: Optional[int] = None,
    **extra,
) -> dict:
    payload = {
        "titolo": titolo,
        "indirizzo": indirizzo,
        "zona": zona,
        "citta": citta,
        "mq": mq,
        "prezzo": str(prezzo) if prezzo is not None else None,
        "camere": camere,
        "bagni": bagni,
        "piano": piano,
        "origine": origine,
        "proprietarioId": proprietario_id,
    }
    payload.update(extra)
    payload = {k: v for k, v in payload.items() if v is not None}
    return _request("POST", "/api/immobili", json=payload)


def cerca_immobili(zona: Optional[str] = None, stato: Optional[str] = None, search: Optional[str] = None, limit: int = 50) -> dict:
    params = {"limit": limit}
    if zona:
        params["zona"] = zona
    if stato:
        params["statoVendita"] = stato
    if search:
        params["search"] = search
    return _request("GET", "/api/immobili", params=params)


# ─── Comunicazioni ────────────────────────────────────────────────────

def registra_comunicazione(
    cliente_id: Optional[int] = None,
    immobile_id: Optional[int] = None,
    tipo: str = "nota",
    testo: str = "",
    canale: str = "sistema",
    esito: Optional[str] = None,
    **extra,
) -> dict:
    """
    Registra una comunicazione (proposta/risposta/followup/auguri/nota).
    Almeno uno tra cliente_id o immobile_id deve essere valorizzato.
    esito: interessato | da_richiamare | non_interessato | in_attesa
    """
    payload = {
        "clienteId": cliente_id,
        "immobileId": immobile_id,
        "tipo": tipo,
        "testo": testo,
        "canale": canale,
        "esito": esito,
    }
    payload.update(extra)
    payload = {k: v for k, v in payload.items() if v is not None}
    return _request("POST", "/api/comunicazioni", json=payload)


def cronistoria_comunicazioni(cliente_id: Optional[int] = None, immobile_id: Optional[int] = None, limit: int = 50) -> dict:
    params = {"limit": limit}
    if cliente_id:
        params["clienteId"] = cliente_id
    if immobile_id:
        params["immobileId"] = immobile_id
    return _request("GET", "/api/comunicazioni", params=params)


# ─── Richieste (buyer requests) ───────────────────────────────────────

def crea_richiesta(
    cliente_id: int,
    descrizione_libera: Optional[str] = None,
    budget_massimo: Optional[float] = None,
    mq_minimi: Optional[int] = None,
    zona: Optional[str] = None,
    priorita: int = 2,
    **extra,
) -> dict:
    payload = {
        "clienteId": cliente_id,
        "descrizioneLibera": descrizione_libera,
        "budgetMassimo": str(budget_massimo) if budget_massimo is not None else None,
        "mqMinimi": mq_minimi,
        "zona": zona,
        "priorita": priorita,
    }
    payload.update(extra)
    payload = {k: v for k, v in payload.items() if v is not None}
    return _request("POST", "/api/richieste", json=payload)


# ─── Matching (proponi_immobile_a_cliente) ────────────────────────────

def proponi_immobile_a_cliente(immobile_id: int, limit: int = 10) -> dict:
    """
    Restituisce candidati clienti compatibili con un immobile.
    Output: { immobile: {...}, candidati: [{clienteId, clienteNome, score, reasons[]}], ... }
    """
    return _request("POST", "/api/matching/proponi-immobile-a-cliente", json={"immobileId": immobile_id, "limit": limit})


# ─── Documenti ────────────────────────────────────────────────────────

def lista_documenti_immobile(immobile_id: int, audience: str = "cliente") -> dict:
    """Restituisce i documenti di un immobile. Paolo agent vede solo audience='cliente' (forzato server-side)."""
    return _request("GET", "/api/documenti", params={"immobile_id": immobile_id, "audience": audience})


def registra_documento(
    nome: str,
    tipo: str,
    audience: str = "cliente",
    immobile_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    comunicazione_id: Optional[int] = None,
    url: Optional[str] = None,
    storage_path: Optional[str] = None,
    mime_type: Optional[str] = None,
    note: Optional[str] = None,
) -> dict:
    payload = {
        "nome": nome,
        "tipo": tipo,
        "audience": audience,
        "immobile_id": immobile_id,
        "cliente_id": cliente_id,
        "comunicazione_id": comunicazione_id,
        "url": url,
        "storage_path": storage_path,
        "mime_type": mime_type,
        "note": note,
    }
    payload = {k: v for k, v in payload.items() if v is not None}
    return _request("POST", "/api/documenti", json=payload)


# ─── Health check ─────────────────────────────────────────────────────

def health_check() -> bool:
    """Pinga /api/health (no auth richiesta). True se server up."""
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.get(f"{BASE_URL}/api/health")
        return r.status_code == 200 and r.json().get("ok") is True
    except Exception:
        return False


if __name__ == "__main__":
    # Smoke test rapido (esegui: python immogest_client.py)
    print(f"Base URL: {BASE_URL}")
    print(f"API key configured: {'yes' if API_KEY else 'NO'}")
    print(f"Health: {health_check()}")
    # Lista 3 clienti
    print("\nLista 3 clienti:")
    import json
    print(json.dumps(lista_clienti(limit=3), indent=2, ensure_ascii=False)[:1000])
