# NeuPC Solution Auto-Fetcher Browser Extension

A Chrome/Edge browser extension that automatically fetches your accepted Codeforces solutions and syncs them to your NeuPC account.

## Features

- ✅ Automatically detects when you view an accepted Codeforces submission
- ✅ Extracts source code, language, problem details, and tags
- ✅ Sends solutions to your NeuPC account in the background
- ✅ Works with both local development and production environments
- ✅ Respects user preferences (can be enabled/disabled)
- ✅ Shows visual notifications on success/failure

## Installation

### For Development

1. **Clone the repository** (if not already done):

   ```bash
   git clone https://github.com/eyasir329/neupc.git
   cd neupc
   ```

2. **Load the extension in Chrome/Edge**:
   - Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `browser-extension` folder from this repository

3. **The extension should now appear** in your extensions bar with the NeuPC icon

### For Production

A packaged `.crx` or `.zip` file will be provided for easy installation.

## Setup

1. **Click the extension icon** in your browser toolbar
2. **Enable "Auto-Fetch Solutions"** toggle
3. **Select your API endpoint**:
   - `Local Development`: for testing (http://localhost:3000)
   - `Production`: for live site (https://neupc.vercel.app)
4. **Get your session token**:
   - Open NeuPC in your browser and log in
   - Press `F12` to open Developer Tools
   - Go to `Application` tab → `Cookies` → Select your domain
   - Find and copy the `auth-token` cookie value
5. **Paste the token** in the extension popup
6. **Click "Save Settings"**
7. **Click "Test Connection"** to verify everything works

## Usage

Once set up, the extension works automatically:

1. **Navigate to any Codeforces submission page** that shows your accepted solution
2. **The extension will automatically**:
   - Detect the page
   - Extract your source code and problem details
   - Send it to NeuPC
   - Show a notification (success/error)

### Supported URL Patterns

- `https://codeforces.com/contest/*/submission/*`
- `https://codeforces.com/problemset/submission/*`

### Manual Trigger

You can also manually trigger the fetch:

- Right-click the extension icon
- Select "Fetch Current Solution" (if implemented)

## How It Works

### Architecture

```
Codeforces Page → Content Script → Background Worker → NeuPC API
                   (extract data)   (manage state)     (store solution)
```

### Files

- `manifest.json` - Extension configuration
- `content.js` - Extracts data from Codeforces pages
- `background.js` - Background service worker
- `popup.html` - Settings UI
- `popup.js` - Settings logic
- `icons/` - Extension icons

### Data Flow

1. **Content script** runs on Codeforces submission pages
2. Extracts submission details (code, language, problem, verdict)
3. Checks if auto-fetch is enabled in storage
4. Sends data to NeuPC API endpoint
5. Shows notification with result

## Security

- ✅ API token is stored locally in Chrome's secure storage
- ✅ Token is never logged or exposed
- ✅ HTTPS connections for production
- ✅ Only runs on Codeforces domains
- ✅ Respects CORS and security policies

## Troubleshooting

### Extension doesn't work

1. **Check if auto-fetch is enabled** in the popup
2. **Verify your API token is correct**:
   - Re-copy from browser cookies
   - Make sure you're logged into NeuPC
3. **Check the endpoint** matches your environment
4. **Open browser console** (F12) and look for `[NeuPC]` logs

### Connection test fails

- Make sure NeuPC is running (for local development)
- Check your API token hasn't expired
- Verify you have internet connection
- Check browser console for specific errors

### Solutions not appearing in NeuPC

1. **Check the verdict** - only AC (Accepted) solutions are auto-fetched
2. **Verify the submission exists** in your NeuPC submissions list
3. **Check NeuPC dashboard** - may take a few seconds to appear
4. **Look at notifications** on the Codeforces page

### Manual solutions being overwritten

The extension will NOT overwrite solutions with `manual_upload` type. If you manually uploaded a solution, it will be preserved.

## Development

### File Structure

```
browser-extension/
├── manifest.json       # Extension manifest (v3)
├── content.js          # Content script for Codeforces pages
├── background.js       # Background service worker
├── popup.html          # Settings UI
├── popup.js            # Settings logic
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

### Testing

1. Make changes to extension files
2. Click "Reload" in `chrome://extensions/`
3. Navigate to a Codeforces submission page
4. Check browser console for logs

### Building for Production

```bash
cd browser-extension
zip -r neupc-extension.zip * -x "*.git*" -x "README.md"
```

## Privacy Policy

This extension:

- Only accesses Codeforces submission pages you visit
- Only sends data to your configured NeuPC endpoint
- Does not collect or share any personal information
- Does not track your browsing activity
- Stores settings locally in your browser

## Support

For issues or questions:

- Open an issue on [GitHub](https://github.com/eyasir329/neupc/issues)
- Contact the NeuPC team
- Check the main NeuPC documentation

## License

Same as the main NeuPC project.

## Changelog

### v1.0.0 (Initial Release)

- Auto-fetch for Codeforces submissions
- Support for local and production environments
- Visual notifications
- Settings management UI
