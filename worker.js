// Cloudflare Worker for VinCheck Pro - GlobalVIN API Proxy
// Handles CORS and API requests for VIN and license plate lookups

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
      const { identifier, inputType } = await request.json();
      const apiKey = env.GLOBALVIN_API_KEY;

      // Prepare request body for GlobalVIN
      let requestBody;
      if (inputType === 'vin') {
        requestBody = { vin: identifier };
      } else if (inputType === 'targa') {
        // For license plates, we need country code; default to Italy (IT) for now
        requestBody = { plate: identifier, country: 'IT' };
      } else {
        return new Response(JSON.stringify({ error: 'Tipo di input non valido' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          },
        });
      }

      // Call GlobalVIN API
      const response = await fetch('https://api.globalvin.co/v1/api/vin/basic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Errore nel recupero dei dati' }));
        return new Response(JSON.stringify({ error: errorData.message || 'Errore nel recupero dei dati' }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          },
        });
      }

      const data = await response.json();

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
