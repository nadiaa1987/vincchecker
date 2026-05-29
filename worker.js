// Cloudflare Worker for VinCheck Pro - Vincario API Proxy
// Handles CORS, authentication, and API requests

async function sha1(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 10);
}

function validateVin(vin) {
  if (!vin || vin.length !== 17) return false;
  const invalidChars = /[IOQ]/i;
  const alphanumeric = /^[A-Z0-9]+$/i;
  return !invalidChars.test(vin) && alphanumeric.test(vin);
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo non consentito' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        },
      });
    }

    try {
      const { vin, type } = await request.json();

      // Validate input
      if (!type) {
        return new Response(JSON.stringify({ error: 'Tipo di controllo mancante' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          },
        });
      }

      if (type !== 'balance' && type !== 'info') {
        if (!validateVin(vin)) {
          return new Response(JSON.stringify({ error: 'Il numero VIN inserito non è valido' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
            },
          });
        }
      }

      const apiKey = env.VINCARIO_API_KEY;
      const secretKey = env.VINCARIO_SECRET_KEY;
      const upperVin = vin ? vin.toUpperCase() : '';

      // Calculate control sum
      let controlSumMessage;
      if (upperVin) {
        controlSumMessage = `${upperVin}|${type}|${apiKey}|${secretKey}`;
      } else {
        controlSumMessage = `${type}|${apiKey}|${secretKey}`;
      }
      const controlSum = await sha1(controlSumMessage);

      // Build Vincario API URL
      let apiUrl;
      if (upperVin) {
        apiUrl = `https://api.vincario.com/3.2/${type}/${upperVin}/${apiKey}/${controlSum}`;
      } else {
        apiUrl = `https://api.vincario.com/3.2/${type}/${apiKey}/${controlSum}`;
      }

      // Fetch from Vincario API
      const vincarioResponse = await fetch(apiUrl);
      
      if (!vincarioResponse.ok) {
        const errorText = await vincarioResponse.text();
        let errorMessage = 'Errore nel recupero dei dati. Riprova tra qualche secondo.';
        
        if (vincarioResponse.status === 404) {
          errorMessage = 'Nessun dato trovato per questo VIN';
        } else if (vincarioResponse.status === 402 || errorText.toLowerCase().includes('balance')) {
          errorMessage = 'Crediti API esauriti. Contattare il supporto.';
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: vincarioResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          },
        });
      }

      const data = await vincarioResponse.json();

      // Return successful response
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Errore nel recupero dei dati. Riprova tra qualche secondo.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        },
      });
    }
  },
};
