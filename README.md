📡 IPTV Proxy & Manager (Cloudflare Workers)
A high-performance IPTV proxy and management panel built on Cloudflare Workers. This project allows you to bypass CORS restrictions, manage your HLS streams, and customize your channel list with an easy-to-use web interface.

🚀 Features
HLS Proxying: Bypasses CORS and Referer restrictions for seamless playback.
Visual Panel: Add, Edit, and Remove channels directly from the browser.
Drag & Drop Reordering: Organize your channels visually; the order is saved permanently.
Adaptive Stream Support: Automatically tests various suffixes (index.m3u8, playlist.m3u8, etc.) to find the working stream.
KV Storage: All data is securely stored in your Cloudflare KV Namespace.
🛠 Installation Guide
Step 1: Create KV Namespace
Log in to your Cloudflare Dashboard.
Go to Workers & Pages > KV.
Click Create Namespace and name it CUSTOM_CHANNELS.
Note down the ID of the created namespace.
Step 2: Deploy the Worker
Go to Workers & Pages > Create application > Create Worker.
Give your worker a name (e.g., my-iptv-proxy).
Click Deploy.
After deployment, click Edit Code and paste the content of worker.js.
Step 3: Bind KV to Worker
Inside your Worker's dashboard, go to the Settings tab.
Select Variables.
Under KV Namespace Bindings, click Add binding.
Set Variable name to CUSTOM_CHANNELS.
Select the namespace you created in Step 1.
Click Save and Deploy.
🖥 How to Use
Open your Worker URL (e.g., https://my-iptv-proxy.workers.dev).
Use the + button to add a new channel (Name, HLS URL, and Logo).
Drag and Drop the channel cards to change their display order.
Click on any channel card to start the web player.
Use the Edit (Pencil) icon to modify or delete existing channels.
📄 License
MIT License - Feel free to use and contribute!
1. Reads the channel ID from the URL path
2. Matches it against the `CHANNELS` object
3. Proxies the request to the real IPTV source
4. Rewrites `.m3u8` playlists to pass back through your Worker
5. Streams video segments directly

---

## ➕ Adding an IPTV Channel

Open `worker.js` and locate:

```js
// IPTV Channels
const CHANNELS = {
  "2342": "https://live.livetvstream.co.uk/LS-63503-4",
  // "1001": "https://example.com/live/stream1"
}
```

To add a new IPTV stream:

1. Find the base stream URL
   Example:

```
https://live.livetvstream.co.uk/LS-63503-4/index.m3u8
```

2. Remove `/index.m3u8`
   Keep only the base path:

```
https://live.livetvstream.co.uk/LS-63503-4
```

3. Add it to `CHANNELS`:

```js
const CHANNELS = {
  "2342": "https://live.livetvstream.co.uk/LS-63503-4",
  "1001": "https://example.com/live/channel"
}
```

---

## 🔗 Accessing a Channel

After deploying your Worker, access streams like this:

```
https://workername.username.workers.dev/{id}/index.m3u8
```

### Example

If your Worker URL is:

```
https://tv-proxy.frank.workers.dev
```

And your channel ID is:

```
2342
```

Stream URL:

```
https://tv-proxy.frank.workers.dev/2342/index.m3u8
```

---

## ☁️ Deploy to Cloudflare Workers

### 1️⃣ Install Wrangler

```bash
npm install -g wrangler
```

### 2️⃣ Login

```bash
wrangler login
```

### 3️⃣ Deploy

```bash
wrangler deploy
```

After deployment, Cloudflare will provide:

```
https://your-worker-name.your-username.workers.dev
```

---

## 📡 Example Channel Configuration

Source:

```
https://live.livetvstream.co.uk/LS-63503-4/index.m3u8
```

Worker config:

```js
"2342": "https://live.livetvstream.co.uk/LS-63503-4",
```

Worker stream URL:

```
https://workername.username.workers.dev/2342/index.m3u8
```

---

## ⚠️ Notes

* Only use streams you have permission to proxy.
* Some IPTV providers may block proxy usage.
* Adjust cache settings if needed.
* Ensure the base URL does NOT include `index.m3u8`.

---

## 📜 License

[MIT License](./LICENSE)
