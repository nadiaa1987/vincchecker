You are an expert full-stack developer. Build me a complete production-ready SaaS web application called "VinCheck Pro" — a VIN vehicle history check service targeting used car buyers in Italy, France, and Germany.

## TECH STACK (STRICT — do not change)
- Frontend: Pure HTML5 + CSS3 + Vanilla JavaScript (single file: index.html)
- Deployment: Cloudflare Pages (static site — NO server-side code)
- API calls: Cloudflare Worker (acts as a secure backend proxy) — file: worker.js
- Payments: PayPal Pay Buttons (JavaScript SDK — no backend needed)
- Auth: None (credit-based system, no login required — use localStorage for credit balance)
- VIN Data: Vincario REST API v3.2

---

## VINCARIO API INTEGRATION (CRITICAL — read carefully)

Base URL: https://api.vincario.com/3.2/

Authentication method: Control Sum (SHA1-based)

Control sum calculation:
- If VIN is present: SHA1("VIN|ID|API_KEY|SECRET_KEY") → take first 10 characters
- If no VIN: SHA1("ID|API_KEY|SECRET_KEY") → take first 10 characters
- VIN must be UPPERCASE

Available endpoints (ID values):
- "decode" → Full VIN decode (make, model, year, engine, fuel type, etc.)
- "stolen-check" → Check if vehicle is reported stolen
- "vehicle-market-value" → Market price estimation
- "balance" → Check remaining API credits
- "info" → Available decode fields

Example API call URL structure:
https://api.vincario.com/3.2/{ID}/{VIN}/{API_KEY}/{CONTROL_SUM}

In the Cloudflare Worker:
- Store API_KEY and SECRET_KEY as environment variables: VINCARIO_API_KEY and VINCARIO_SECRET_KEY
- Calculate SHA1 control sum inside the Worker using SubtleCrypto (Web Crypto API — available in Cloudflare Workers)
- Expose a single endpoint: POST /api/check-vin with body: { vin: "XXXXX", type: "decode"|"stolen-check"|"vehicle-market-value" }
- Worker fetches Vincario API, returns JSON to frontend
- Add CORS headers to allow requests from Cloudflare Pages domain

SHA1 calculation in Cloudflare Worker (use this exact code):
async function sha1(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 10);
}

---

## CREDIT SYSTEM (no login required)
- Credits stored in localStorage key: "vincheck_credits"
- New visitors start with 1 FREE credit automatically
- Each VIN check costs 1 credit (deducted after successful API response)
- Show credit balance in header at all times
- If 0 credits → show "Buy Credits" modal with PayPal payment buttons

---

## PAYPAL PAYMENT INTEGRATION
Load PayPal SDK in <head>:
<script src="https://www.paypal.com/sdk/js?client-id=PAYPAL_CLIENT_ID&currency=EUR"></script>

## CREDIT PACKS PRICING (EXACT — do not change these values)

3 packs only:

- Pack Starter: 3 checks = €7.99 → after payment add 3 credits
  Badge: none
  Button div id: #paypal-button-starter

- Pack Popular: 10 checks = €19.99 → after payment add 10 credits
  Badge: "⭐ Più Popolare" — highlighted with teal background (#00D4AA), shown above card
  This pack must be visually larger/elevated compared to the other two (scale or border highlight)
  Button div id: #paypal-button-popular

- Pack Pro: 25 checks = €39.99 → after payment add 25 credits
  Badge: "🔥 Miglior Valore" — shown above card in orange (#FF6B35)
  Button div id: #paypal-button-pro

For each pack card show:
- Pack name (bold)
- Number of checks (large font)
- Total price (very large, prominent)
- Price per check (small muted text): Starter €2.66/check | Popular €2.00/check | Pro €1.60/check
- Savings text (green): Popular "Risparmi €3.99" | Pro "Risparmi €26.76"
- Comparison line (small italic): "autoDNA: €24.99 a controllo — Tu paghi €X.XX"
- PayPal button below

In the pricing section header add this tagline:
"Fino all'89% più economico di autoDNA e carVertical"

PayPal button implementation for each pack:
paypal.Buttons({
  createOrder: function(data, actions) {
    return actions.order.create({
      purchase_units: [{
        amount: { value: 'PRICE', currency_code: 'EUR' },
        description: 'VinCheck Pro — PACK_NAME'
      }]
    });
  },
  onApprove: function(data, actions) {
    return actions.order.capture().then(function(details) {
      let current = parseInt(localStorage.getItem('vincheck_credits') || '0');
      localStorage.setItem('vincheck_credits', current + CREDITS_AMOUNT);
      showSuccessMessage('Pagamento completato! Crediti aggiunti: CREDITS_AMOUNT');
      updateCreditDisplay();
      closeModal();
    });
  },
  onError: function(err) {
    showErrorMessage('Errore nel pagamento. Riprova o contatta il supporto.');
  },
  style: {
    layout: 'vertical',
    color: 'blue',
    shape: 'rect',
    label: 'pay'
  }
}).render('#paypal-button-PACK_NAME');

---

## PAGES & FEATURES

### Page 1 — Home (index.html)
- Hero section: headline "Controlla la storia della tua auto prima di comprarla" with subtitle in Italian
- Sub-headline: "Fino all'89% più economico di autoDNA e carVertical"
- VIN input field (17 characters, uppercase auto-format, real-time validation)
- "Controlla VIN" CTA button (teal #00D4AA, solid — no gradients)
- How it works: 3 steps (Inserisci VIN → Ottieni Report → Compra in Sicurezza)
- Trust badges: "26+ Paesi Europei", "Database Ufficiali", "Risultati Istantanei", "Verificato in 5 secondi"
- Pricing section with 3 credit packs (as described above)
- FAQ section with 5 questions in Italian:
  1. Come funziona il controllo VIN?
  2. Quali paesi sono supportati?
  3. I miei dati sono al sicuro?
  4. Quanto tempo ci vuole per ricevere il report?
  5. Posso usare i crediti quando voglio?
- Footer with Privacy Policy and Terms of Service links

### Page 2 — Results (shown on same page, hidden div revealed after check)
Display sections:
  1. Vehicle Identity: Make, Model, Year, Body Type, Color
  2. Engine & Technical: Engine size, Fuel type, Transmission, Power (HP/kW)
  3. History Status: Stolen check badge (GREEN "✅ Veicolo Pulito" / RED "⚠️ ATTENZIONE: Veicolo Segnalato")
  4. Market Value: price range bar showing min/avg/max using Chart.js
  5. Full raw data table (all returned fields from Vincario)
- "Controlla un altro VIN" button to reset
- "Acquista più crediti" button if credits < 2

---

## DESIGN REQUIREMENTS
- Professional and trustworthy — think Carfax meets Stripe
- Color palette:
  Primary background: Deep navy #0A1628
  Accent: Electric teal #00D4AA
  Secondary accent: Orange #FF6B35 (Pro badge only)
  Text on dark: #FFFFFF
  Text on light: #1A1A2E
  Light sections background: #F8F9FA
  Cards background: #FFFFFF
  Muted text: #6B7280
  Success green: #10B981
  Error red: #EF4444
- Font: Inter from Google Fonts (weights: 400, 500, 600, 700)
- Mobile-first, fully responsive (375px to 1440px)
- Dark header and hero, light body sections, dark footer
- Loading spinner during API call (teal animated spinner)
- Smooth CSS transitions on all hover effects
- No purple gradients, no gradient buttons — solid colors only
- Cards with subtle box-shadow, border-radius 12px
- Popular pack card: scale(1.05) + teal border 2px + elevated shadow

---

## CLOUDFLARE WORKER (worker.js) — FULL FILE
Create a complete worker.js that:
1. Handles CORS preflight (OPTIONS request)
2. Accepts POST /api/check-vin with JSON body {vin, type}
3. Validates VIN (17 chars, alphanumeric, no I/O/Q letters)
4. Calculates Vincario control sum using SubtleCrypto SHA-1
5. Fetches from https://api.vincario.com/3.2/{type}/{VIN}/{API_KEY}/{CONTROL_SUM}
6. Returns Vincario JSON response to frontend
7. Handles errors gracefully with Italian error messages:
   - Invalid VIN → "Il numero VIN inserito non è valido"
   - API error → "Errore nel recupero dei dati. Riprova tra qualche secondo."
   - VIN not found → "Nessun dato trovato per questo VIN"
   - No balance → "Crediti API esauriti. Contattare il supporto."
8. Environment variables: VINCARIO_API_KEY, VINCARIO_SECRET_KEY, ALLOWED_ORIGIN

---

## GITHUB REPO STRUCTURE
/index.html        ← full frontend
/worker.js         ← Cloudflare Worker backend proxy
/README.md         ← deployment guide

---

## DELIVERABLES — produce ALL of these in order:

### 1. worker.js
Complete Cloudflare Worker with SHA1 auth, CORS, error handling.

### 2. index.html
Complete frontend — no placeholders except:
- WORKER_URL (replace with actual Worker URL after deploy)
- PAYPAL_CLIENT_ID (replace with actual PayPal Client ID)

### 3. README.md
Step-by-step deployment guide:
Step 1 — Deploy Cloudflare Worker:
  - Go to dash.cloudflare.com → Workers & Pages → Create Worker
  - Paste worker.js content
  - Go to Settings → Variables → add: VINCARIO_API_KEY, VINCARIO_SECRET_KEY, ALLOWED_ORIGIN
  - Save and deploy → copy Worker URL

Step 2 — Connect GitHub to Cloudflare Pages:
  - Create GitHub repo, push index.html
  - Cloudflare Pages → Create project → Connect GitHub repo
  - Build settings: none (static HTML)
  - Deploy → copy Pages URL
  - Update ALLOWED_ORIGIN in Worker with Pages URL

Step 3 — Get PayPal Client ID:
  - Go to developer.paypal.com
  - Create App → copy Sandbox Client ID for testing
  - Replace PAYPAL_CLIENT_ID in index.html
  - Switch to Live Client ID before launch

Step 4 — Final test:
  - Open Pages URL
  - Enter a real VIN (Italian car example: ZFA19900003219876)
  - Verify results display correctly
  - Test PayPal Sandbox payment
  - Verify credits added after payment

---

## IMPORTANT RULES
- ZERO placeholder content except WORKER_URL and PAYPAL_CLIENT_ID
- All UI text in Italian
- Use fetch() only — no jQuery, no Axios, no external JS libraries except Chart.js CDN and PayPal SDK
- No npm, no build tools — pure static files
- All CSS and JS inline inside index.html
- Comments in English explaining key logic
- SHA1 control sum must be calculated exactly as specified — double-check the formula
- PayPal credits added immediately in onApprove callback — no webhook
- Test SHA1 logic mentally before writing to ensure correctness
- The Popular pack must be the most visually prominent element in the pricing section

Start output with worker.js, then index.html, then README.md.

firebase info:
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxr3x_y2TeWib0bb_7i3r7WuIDTr6gqbA",
  authDomain: "vin2027.firebaseapp.com",
  projectId: "vin2027",
  storageBucket: "vin2027.firebasestorage.app",
  messagingSenderId: "961517196396",
  appId: "1:961517196396:web:2f0152f05f17844153f449",
  measurementId: "G-S6KH1T9CFP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

github bach ndiro puch : https://github.com/nadiaa1987/vincchecker.git


info paypal
Client ID:AVIyLzhKZE_g9wlGaBm4alnVvrxpiM17d7L0E1Y6fQILcyCCrU78Z1cvhqNgPJk2WRve0EYGJMiILXAQ

Secret key 1:EDwpc0W-JMnSui0BTvnAfF3YE0XdkRgoJFJe5qwnuLGfdhjeIK6o9YZUUuorgUfsHcuTA0yRwIikvrxs

vincario info:
Your API key: f568bb2496ff

Your Secret key:cf1fbc9a5c