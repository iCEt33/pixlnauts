// api/trap.js - the bot trap.
//
// People never end up here. Robots do, in two ways:
//   - by following the invisible link in public/index.html. robots.txt tells
//     polite bots like Google to stay away, so only rude ones follow it.
//   - by asking for paths that only attack scripts try, like /wp-login.php
//     or /.env. Your site has none of those; vercel.json sends them here.
//
// They get an ACCESS DENIED page instead of your site. Nothing is saved.

function deniedPage(ip) {
  // Only digits, letters a-f, dots and colons can appear in an IP address, so
  // nothing a robot sends can sneak code into this page.
  const shownIp = String(ip || '').replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || 'UNKNOWN';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PIXL-OS // ACCESS DENIED</title>
<style>
  html, body { margin: 0; min-height: 100%; background: #000; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; min-height: 100svh; padding: 16px; box-sizing: border-box; font-family: monospace; color: #0f0; }
  .t { width: 100%; max-width: 640px; border: 2px solid #0f0; padding: 20px; box-sizing: border-box; box-shadow: 0 0 20px rgba(0, 255, 0, 0.3); text-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
  .t p { margin: 0 0 10px; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
  .red { color: #f55; text-shadow: 0 0 5px rgba(255, 85, 85, 0.6); }
  .cur { animation: blink 1s steps(1, end) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  a { display: inline-block; margin-top: 12px; padding: 10px 16px; background: #0f0; color: #000; font-weight: bold; text-decoration: none; text-shadow: none; box-shadow: 4px 4px 0 #086; }
  @media (prefers-reduced-motion: reduce) { .cur { animation: none; } }
</style>
</head>
<body>
<main class="t">
<p>PIXL-OS SECURITY MODULE v2.6.9</p>
<p>------------------------------</p>
<p class="red">&gt; UNAUTHORIZED ACCESS ATTEMPT</p>
<p>&gt; ORIGIN ...... ${shownIp}</p>
<p>&gt; STATUS ...... DENIED<span class="cur">_</span></p>
<p>&nbsp;</p>
<p>Nice try, robot. Humans never see this page.</p>
<a href="/">[ HUMAN? BACK TO PIXLNAUTS ]</a>
</main>
</body>
</html>`;
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(403).end();
  const ip = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0];
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(403).send(deniedPage(ip));
};
