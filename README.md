# VinCheck Pro - Guida al Deployment

## Panoramica
VinCheck Pro è un'applicazione SaaS per il controllo della storia dei veicoli tramite numero VIN. Include:
- Frontend statico (HTML + CSS + JavaScript)
- Backend proxy (Cloudflare Worker)
- Integrazione pagamenti PayPal
- Integrazione API Vincario

## Passo 1 - Deploy del Cloudflare Worker

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com)
2. Naviga in **Workers & Pages** → **Create Application** → **Create Worker**
3. Incolla il contenuto del file `worker.js` nell'editor
4. Clicca **Deploy**
5. Vai in **Settings** → **Variables and Secrets**
6. Aggiungi le seguenti variabili d'ambiente:
   - `VINCARIO_API_KEY`: `f568bb2496ff`
   - `VINCARIO_SECRET_KEY`: `cf1fbc9a5c`
   - `ALLOWED_ORIGIN`: (lascia vuoto per ora, lo aggiorneremo dopo)
7. Salva e copia l'URL del Worker (es: `https://vincheck-pro.your-subdomain.workers.dev`)

## Passo 2 - Configurazione del Frontend

1. Apri il file `index.html`
2. Sostituisci `'https://your-worker.workers.dev/api/check-vin'` con il tuo URL del Worker (aggiungi `/api/check-vin` alla fine)
3. Salva il file

## Passo 3 - Connetti GitHub a Cloudflare Pages

1. Crea un nuovo repository su GitHub (es: `vincheck-pro`)
2. Inizializza git nella cartella locale:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Collega il repository remoto e pusha:
   ```bash
   git remote add origin https://github.com/nadiaa1987/vincchecker.git
   git branch -M main
   git push -u origin main
   ```
4. Vai su Cloudflare → **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
5. Seleziona il tuo repository GitHub
6. Nelle impostazioni di build:
   - Framework preset: `None`
   - Build command: (lascia vuoto)
   - Build output directory: (lascia vuoto)
7. Clicca **Save and Deploy**
8. Copia l'URL di Cloudflare Pages (es: `https://vincheck-pro.pages.dev`)

## Passo 4 - Aggiorna ALLOWED_ORIGIN nel Worker

1. Torna alle impostazioni del tuo Cloudflare Worker
2. Aggiorna la variabile `ALLOWED_ORIGIN` con il tuo URL di Cloudflare Pages (es: `https://vincheck-pro.pages.dev`)
3. Salva le modifiche

## Passo 5 - Test dell'Applicazione

1. Apri il tuo URL di Cloudflare Pages
2. Inserisci un VIN di test (es: `ZFA19900003219876`)
3. Verifica che i risultati vengano visualizzati correttamente
4. Testa i pagamenti PayPal in modalità Sandbox

## Informazioni Aggiuntive

### Crediti API Vincario
- API Key: `f568bb2496ff`
- Secret Key: `cf1fbc9a5c`

### Credenziali PayPal
- Client ID: `AVIyLzhKZE_g9wlGaBm4alnVvrxpiM17d7L0E1Y6fQILcyCCrU78Z1cvhqNgPJk2WRve0EYGJMiILXAQ`
- Sandbox: Usa per i test, poi passa a Live

### Configurazione Firebase
Se vuoi aggiungere Firebase (opzionale), usa questa configurazione:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAxr3x_y2TeWib0bb_7i3r7WuIDTr6gqbA",
  authDomain: "vin2027.firebaseapp.com",
  projectId: "vin2027",
  storageBucket: "vin2027.firebasestorage.app",
  messagingSenderId: "961517196396",
  appId: "1:961517196396:web:2f0152f05f17844153f449",
  measurementId: "G-S6KH1T9CFP"
};
```
