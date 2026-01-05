# ImmoGest - Estensione Browser per Acquisizione Immobili

Questa estensione Chrome/Edge permette di importare annunci immobiliari direttamente in ImmoGest CRM con un solo click.

## Siti Supportati

- **Immobiliare.it** - Pagine `/annunci/...`
- **Idealista.it** - Pagine `/immobile/...`
- **Subito.it** - Pagine `/annunci/...`
- **Casa.it** - Pagine `/vendita/...` e `/affitto/...`

## Installazione

### Chrome / Edge / Brave

1. Apri il browser e vai a `chrome://extensions/` (o `edge://extensions/` per Edge)
2. Attiva la **Modalità sviluppatore** (toggle in alto a destra)
3. Clicca **Carica estensione non pacchettizzata**
4. Seleziona la cartella `browser-extension` di questo progetto
5. L'estensione apparirà nella barra degli strumenti

## Utilizzo

1. Vai su un annuncio immobiliare (es. `https://www.immobiliare.it/annunci/123456/`)
2. Clicca l'icona dell'estensione **ImmoGest** nella barra degli strumenti
3. Inserisci l'URL del tuo ImmoGest (es. `https://tuo-progetto.replit.app`)
4. Clicca **Estrai dati** per leggere i dati dalla pagina
5. Clicca **Invia a ImmoGest** per importare l'annuncio

## Note

- L'URL di ImmoGest viene salvato automaticamente per le prossime sessioni
- L'estrazione è **istantanea** (nessuna attesa come con gli scraper cloud)
- I dati estratti vengono arricchiti con l'AI di ImmoGest per completezza

## Icone

Le icone sono placeholder. Puoi sostituirle con icone personalizzate:
- `icons/icon16.png` - 16x16 pixel
- `icons/icon48.png` - 48x48 pixel
- `icons/icon128.png` - 128x128 pixel
