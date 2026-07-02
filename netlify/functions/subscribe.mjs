// Server-side MailerLite subscribe endpoint.
// Keeps the API key out of the public page source. Requires the
// MAILERLITE_KEY environment variable to be set in Netlify
// (Site settings -> Environment variables).

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  const key = process.env.MAILERLITE_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'Subscription service not configured' }), { status: 503 });
  }
  let email, groups;
  try {
    const body = await req.json();
    email = String(body.email || '').trim();
    groups = Array.isArray(body.groups) ? body.groups.slice(0, 3).map(String) : undefined;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
  }
  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(groups ? { email, groups } : { email }),
  });
  // MailerLite returns 200/201 on success (201 created, 200 already exists)
  const ok = res.status === 200 || res.status === 201;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/subscribe' };
