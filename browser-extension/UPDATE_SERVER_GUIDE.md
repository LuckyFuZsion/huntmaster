# Setting Up Auto-Updates with Custom Update Server

This guide explains how to set up automatic updates for your extension using a custom update server hosted on your domain.

## How It Works

Instead of users manually downloading and installing updates, the browser will:
1. Check your update server periodically
2. Download new versions automatically
3. Install updates in the background
4. Users get notified when updates are ready

## Prerequisites

- Your extension hosted at a public URL (e.g., `https://huntmaster.vercel.app/extensions/`)
- A way to serve `.crx` files and an `update.xml` file
- HTTPS enabled (required by Chrome)

## Step 1: Package Your Extension

First, you need to create a `.crx` file (Chrome Extension package):

### On Windows:
```bash
# In the browser-extension folder
chrome --pack-extension=./ --pack-extension-key=./huntmaster.pem
```

### On Mac/Linux:
```bash
google-chrome --pack-extension=./ --pack-extension-key=./huntmaster.pem
```

**Note:** First time only - generate a private key:
- Chrome will create `huntmaster.pem` automatically if it doesn't exist
- **SAVE THIS KEY FILE!** You'll need it for all future updates
- Without it, you'll need to republish with a new extension ID

## Step 2: Update manifest.json

Add the `update_url` field to your manifest:

```json
{
  "manifest_version": 3,
  "name": "HuntMaster Game Detector",
  "version": "1.0.0",
  "update_url": "https://huntmaster.vercel.app/extensions/huntmaster-updates.xml",
  ...
}
```

## Step 3: Create Update Manifest File

Create `huntmaster-updates.xml` on your server at the update_url location:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID_HERE'>
    <updatecheck codebase='https://huntmaster.vercel.app/extensions/huntmaster-extension-1.0.0.crx' version='1.0.0' />
  </app>
</gupdate>
```

**Important:** Replace `YOUR_EXTENSION_ID_HERE` with your actual extension ID (found in `chrome://extensions` after first installation).

## Step 4: Host Files on Your Server

Upload to your Vercel/public folder:
```
/extensions/
  ├── huntmaster-extension-1.0.0.crx
  ├── huntmaster-updates.xml
```

## Step 5: Install Extension

Users can:
1. Download the `.crx` file from your website
2. Drag and drop it onto `chrome://extensions/`
3. Browser will auto-check for updates from your server!

## Step 6: Publish Updates

When you release a new version:

1. **Update version in `manifest.json`:**
   ```json
   "version": "1.0.1"
   ```

2. **Package new version:**
   ```bash
   chrome --pack-extension=./ --pack-extension-key=./huntmaster.pem
   ```
   This creates `huntmaster-extension-1.0.1.crx`

3. **Update the XML file:**
   ```xml
   <updatecheck codebase='https://huntmaster.vercel.app/extensions/huntmaster-extension-1.0.1.crx' version='1.0.1' />
   ```

4. **Upload both files to server**

5. **Users will get automatic updates!** (within 5 hours, or they can click "Update" button)

## Alternative: Use Vercel API Route

Create an API route that generates the XML dynamically:

`app/api/extension-update/route.ts`:
```typescript
export async function GET() {
  const latestVersion = '1.0.1';
  const extensionId = process.env.EXTENSION_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://huntmaster.vercel.app';
  
  const xml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${extensionId}'>
    <updatecheck codebase='${baseUrl}/extensions/huntmaster-extension-${latestVersion}.crx' version='${latestVersion}' />
  </app>
</gupdate>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
```

Then point `update_url` to: `https://huntmaster.vercel.app/api/extension-update`

## Limitations

⚠️ **Important Limitations:**
- Users must still install the extension **once** (drag .crx file)
- After that, updates are automatic
- This method works for Chrome/Edge only (not Firefox)
- Requires HTTPS (already have with Vercel ✅)

## Comparison: Custom Update Server vs Chrome Web Store

| Feature | Custom Server | Chrome Web Store |
|---------|--------------|------------------|
| Auto-updates | ✅ Yes | ✅ Yes |
| One-click install | ❌ No (drag .crx) | ✅ Yes |
| Review process | ❌ No | ✅ Required |
| Distribution | Self-hosted | Google-hosted |
| Cost | Free | $5 one-time |
| Time to publish | Instant | 1-3 days review |

## Recommendation

For a small user base: **Custom update server** is fine
For public distribution: **Chrome Web Store** is better UX










