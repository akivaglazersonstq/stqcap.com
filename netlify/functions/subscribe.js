exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  const API_KEY = process.env.MAILERLITE_API_KEY;

  try {
    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ email })
    });

    if (response.ok || response.status === 200 || response.status === 201) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      const data = await response.json();
      return { statusCode: response.status, body: JSON.stringify({ error: data }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
