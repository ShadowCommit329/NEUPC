/**
 * One-time script to get a Google Drive OAuth2 refresh token.
 *
 * Usage:
 *   node scripts/get-drive-token.mjs
 *
 * Then copy the printed GDRIVE_REFRESH_TOKEN into your .env.local
 */

import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';

// ── Fill these in (same values as AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) ──────
const CLIENT_ID = process.env.GDRIVE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const CLIENT_SECRET =
  process.env.GDRIVE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';
// ─────────────────────────────────────────────────────────────────────────────

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Run with env vars set:\n' +
      '  GDRIVE_CLIENT_ID=... GDRIVE_CLIENT_SECRET=... node scripts/get-drive-token.mjs\n' +
      'Or ensure AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are in your shell environment.'
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces refresh_token to be returned every time
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\n──────────────────────────────────────────────────────────────');
console.log('1. Open this URL in your browser and authorise the app:');
console.log('\n' + authUrl + '\n');
console.log('2. You will be redirected to localhost:3001 – this script');
console.log('   will capture the code automatically.');
console.log('──────────────────────────────────────────────────────────────\n');

// Start a local server to catch the redirect
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) return;

  const params = new URL(req.url, 'http://localhost:3001').searchParams;
  const code = params.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<h2>Success! You can close this tab and go back to the terminal.</h2>'
    );

    console.log(
      '──────────────────────────────────────────────────────────────'
    );
    console.log('Add these lines to your .env.local:\n');
    console.log(`GDRIVE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GDRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GDRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(
      '──────────────────────────────────────────────────────────────\n'
    );
  } catch (err) {
    res.writeHead(500);
    res.end('Error exchanging code: ' + err.message);
    console.error('Error:', err.message);
  } finally {
    server.close();
  }
});

server.listen(3001, () => {
  console.log('Waiting for OAuth2 callback on http://localhost:3001 ...\n');
});
