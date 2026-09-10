function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false });
    }

    let parsed;
    try {
      parsed = req.body;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    } catch (e) {
      console.error('Body parse error:', e.message);
      return res.status(400).json({ success: false, error: 'Invalid JSON' });
    }

    const name = parsed && parsed.name;
    const email = parsed && parsed.email;
    const message = parsed && parsed.message;

    if (!name || !email || !message) {
      console.error('Missing fields:', { hasName: !!name, hasEmail: !!email, hasMessage: !!message });
      return res.status(400).json({ success: false });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      return res.status(500).json({ success: false, error: 'Email not configured' });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    let resendResponse;
    try {
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: ['bharathtommandru1@gmail.com'],
          reply_to: email,
          subject: `New Portfolio Contact — ${name}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#222;border-bottom:1px solid #eee;padding-bottom:10px;">New Portfolio Contact</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><hr style="border:none;border-top:1px solid #eee;margin:16px 0;"><p style="white-space:pre-wrap;line-height:1.6;">${safeMessage}</p></div>`,
          text: `New Portfolio Contact\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
        }),
      });
    } catch (fetchErr) {
      console.error('Fetch to Resend failed:', fetchErr.message);
      return res.status(502).json({ success: false });
    }

    if (resendResponse.ok) {
      return res.status(200).json({ success: true });
    }

    let errorBody;
    try {
      errorBody = await resendResponse.text();
    } catch (e) {
      errorBody = 'could not read error body';
    }
    console.error('Resend API error:', resendResponse.status, errorBody);
    return res.status(502).json({ success: false, resendStatus: resendResponse.status, resendError: errorBody });

  } catch (err) {
    console.error('Unhandled error in contact handler:', err.message, err.stack);
    try {
      return res.status(500).json({ success: false });
    } catch (_) {
      return new Response(JSON.stringify({ success: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}
