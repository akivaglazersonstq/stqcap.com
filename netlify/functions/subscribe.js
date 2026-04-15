const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  const API_KEY = process.env.MAILERLITE_API_KEY;
  const payload = JSON.stringify({ email });

  return new Promise((resolve) => {
    const options = {
      hostname: 'connect.mailerlite.com',
      path: '/api/subscribers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ statusCode: 200, body: JSON.stringify({ success: true }) });
        } else {
          resolve({ statusCode: res.statusCode, body: JSON.stringify({ error: data }) });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: 'Server error', detail: err.message }) });
    });

    req.write(payload);
    req.end();
  });
};
