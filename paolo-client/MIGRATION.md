# Migrazione Paolo → ImmoGest API (v2.5.0)

Questo documento spiega come migrare `responder.py` perché Paolo, invece di parlare
direttamente al DB Supabase con `supabase-py`, chiami le **API REST di ImmoGest**
(con header `X-API-Key`).

## Vantaggi
- **Audit trail unificato**: ogni mutazione su DB viene loggata con `created_by_api_key_id` di Paolo. Nella UI ImmoGest vedi "creato da Paolo" o "creato da Ilan" per ogni record
- **Validazione centralizzata**: lo Zod schema lato ImmoGest valida i campi obbligatori — niente più errori silenti "column does not exist"
- **Decoupling**: la business logic vive in ImmoGest. Domani se cambi schema o aggiungi feature, Paolo non si accorge di niente (HTTP API stabile)
- **Documenti via storage**: Paolo può chiamare `lista_documenti_immobile()` per recuperare planimetrie da inviare ai clienti, senza vedere il mandato (audience filter automatico)

---

## Setup

### 1. Env vars su Railway (dove gira Paolo)
Aggiungi due secrets al deploy Railway di Paolo:
```
IMMOGEST_BASE_URL=https://cavour.replit.app
IMMOGEST_API_KEY=paolo_live_xxxxxxxxxxxxxxxxxx
```
(Il valore di `IMMOGEST_API_KEY` è quello in `C:\Users\info\Downloads\.paolo_api_key.txt`.)

### 2. Aggiungi il modulo a Paolo
Copia `immogest_client.py` nella cartella di `responder.py` (stesso path).

### 3. Aggiungi `httpx` ai requirements
```
echo "httpx>=0.27.0" >> requirements.txt
```

---

## Esempi di patch in responder.py

### Caso 1 — `crea_cliente_compratore` tool

**Prima** (Paolo scrive direttamente su Supabase):
```python
def _exec_crea_cliente_compratore(db, args):
    nome = args.get("nome")
    telefono = args.get("telefono")
    try:
        result = db.table("clienti").insert({
            "nome": nome,
            "cognome": args.get("cognome"),
            "telefono": telefono,
            "tipo_cliente": "compratore",
            "rating_cliente": args.get("rating", 3),
            ...
        }).execute()
        return f"Cliente {nome} creato con id {result.data[0]['id']}"
    except Exception as exc:
        return f"Errore creazione cliente: {exc}"
```

**Dopo** (Paolo chiama ImmoGest):
```python
import immogest_client as ig

def _exec_crea_cliente_compratore(db, args):
    r = ig.crea_cliente(
        nome=args.get("nome"),
        cognome=args.get("cognome"),
        telefono=args.get("telefono"),
        tipo_cliente="compratore",
        rating_cliente=args.get("rating", 3),
        note=args.get("note"),
    )
    if r.get("_error"):
        return f"Errore creazione cliente: {r['_message']} — {r.get('_details')}"
    return f"Cliente {r['nome']} {r.get('cognome') or ''} creato con id {r['id']}"
```

### Caso 2 — `registra_comunicazione_outreach` tool

**Dopo**:
```python
def _exec_registra_comunicazione_outreach(db, args):
    r = ig.registra_comunicazione(
        cliente_id=args.get("cliente_id"),
        immobile_id=args.get("immobile_id"),
        tipo=args.get("tipo", "proposta"),  # proposta | risposta | followup | nota
        testo=args["testo"],
        canale=args.get("canale", "email"),
        esito=args.get("esito"),  # interessato | da_richiamare | non_interessato | in_attesa
    )
    if r.get("_error"):
        return f"Errore registrazione comunicazione: {r['_message']}"
    return f"Comunicazione registrata (id {r['id']})"
```

### Caso 3 — `proponi_immobile_a_cliente` (era da implementare, ora pronto)

```python
def _exec_proponi_immobile_a_cliente(db, args):
    r = ig.proponi_immobile_a_cliente(
        immobile_id=args["immobile_id"],
        limit=args.get("limit", 10),
    )
    if r.get("_error"):
        return f"Errore matching: {r['_message']}"
    if not r["candidati"]:
        return f"Nessun cliente in target per immobile {r['immobile']['titolo']}."
    out = [f"Immobile: {r['immobile']['titolo']} (id {r['immobile']['id']})"]
    out.append(f"Valutate {r['tot_richieste_valutate']} richieste, trovati {r['tot_match_validi']} match validi.\n")
    for c in r["candidati"][:5]:
        out.append(f"• {c['clienteNome']} (rating {c['clienteRating']}/5) — score {c['score']}")
        for reason in c["reasons"][:3]:
            out.append(f"    – {reason}")
    return "\n".join(out)
```

### Caso 4 — `cerca_cliente_per_telefono` (dentro flow WhatsApp)

```python
def _trova_cliente_da_telefono(db, telefono):
    cliente = ig.cerca_cliente_per_telefono(telefono)
    if cliente is None:
        return None
    return cliente
```

---

## Strategia di rollout

### Fase 1 — Coabitazione (consigliata)
Mantieni il vecchio codice supabase-py per le query di **lettura** (lead, system_config,
whatsapp_log, MARCO.md) — quello non passa per ImmoGest comunque.

Migra invece a `immogest_client` solo le **scritture business**:
- crea_cliente, aggiorna_cliente
- crea_richiesta
- crea_immobile, aggiorna_immobile
- registra_comunicazione, marca_avviso_gestito
- proponi_immobile_a_cliente
- lista/registra documenti

Lascia intatte per ora:
- Lettura/scrittura `system_config` (MARCO.md)
- Lettura/scrittura `whatsapp_log`
- Lettura/scrittura `leads` (Meta Ads, congelato)
- Lettura/scrittura `reports_log`

Queste tabelle Paolo native non hanno endpoint ImmoGest (per scelta).

### Fase 2 — Test in dry-run
Per ogni tool migrato, prima di andare live:
```python
if os.getenv("PAOLO_DRY_RUN") == "1":
    print(f"[DRY-RUN] avrei chiamato ig.crea_cliente({args})")
    return "dry-run, nessuna modifica al DB"
```

### Fase 3 — Rollback rapido
Tieni un flag globale:
```python
USE_IMMOGEST_API = os.getenv("USE_IMMOGEST_API", "1") == "1"

def _exec_crea_cliente_compratore(db, args):
    if USE_IMMOGEST_API:
        return _exec_crea_cliente_via_immogest(args)
    return _exec_crea_cliente_legacy_supabase(db, args)
```
Se ImmoGest down, basta settare `USE_IMMOGEST_API=0` su Railway e Paolo torna al
percorso vecchio in 30 secondi.

---

## Test pre-deploy

Una volta integrato, lancia da locale (con env vars settate):
```bash
python -c "import immogest_client as ig; print(ig.health_check())"
# atteso: True

python -c "
import immogest_client as ig
print(ig.cerca_cliente_per_telefono('3334445566'))
# se non esiste: None
# se esiste: dict con id, nome, telefono, ecc.
"
```

---

## Quando hai migrato

Aggiorna il docstring di responder.py:
```python
"""
Sistema a due agenti WhatsApp — Cavour Immobiliare.
Versione: 2.5.0 — Paolo via ImmoGest API REST (audit trail unificato).
...
"""
```

E aggiorna il `User-Agent` HTTP a `"CavourImmobiliare/2.5 (info@cavourimmobiliare.it)"`.
