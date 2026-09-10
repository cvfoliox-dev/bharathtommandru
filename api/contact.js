function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false });
  }

  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ success: false });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  try {
    const response = await fetch('https://api.resend.com/emails', {
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
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#222;border-bottom:1px solid #eee;padding-bottom:10px;">New Portfolio Contact</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
            <p style="white-space:pre-wrap;line-height:1.6;">${safeMessage}</p>
          </div>
        `,
        text: `New Portfolio Contact\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    }

    const error = await response.text();
    console.error('Resend API error:', error);
    return res.status(502).json({ success: false });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ success: false });
  }
}
