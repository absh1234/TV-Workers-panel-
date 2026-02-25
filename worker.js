/**
 * ============================================
 * IPTV Proxy - Cloudflare Worker
 * ============================================
 * Updated with Panel Support
 */

// ============================================
// 📡 CHANNEL LIST
// ============================================
const CHANNELS = {
  "1111": "https://live.livetvstream.co.uk/LS-63503-4",
  "1112": "https://avaserieshls.wns.live/hls",  
  "1113": "https://familyhls.avatv.live/hls",
  "1114": "https://voa-ingest.akamaized.net/hls/live/2033876/tvmc07",
  "1115": "https://hls.247box.live/hls",
  "1116": "https://cafefhls.wns.live/hls",
  "1117": "https://fxtvhls.wns.live/hls",
  "1118": "https://toonixhls.wns.live/hls",
  "1119": "https://newfhls.wns.live/hls",
  "1120": "https://hls.oxir.live/hls",
  "9999": "https://www.hlsrundle-stream-iptv.gq/api/hls"
}

// ============================================
// 🎨 HTML PANEL (اختیاری)
// ============================================
const PANEL_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📺 انتخاب شبکه</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 30px;
        }
        h1 { color: #333; margin-bottom: 25px; }
        .channels { display: grid; gap: 10px; margin-bottom: 20px; }
        .channel {
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }
        .channel:hover { border-color: #667eea; background: #f5f7ff; }
        .channel.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📺 انتخاب شبکه IPTV</h1>
        <div class="channels" id="ch"></div>
    </div>
    <script>
        const channels = ${JSON.stringify(CHANNELS)};
        const ch = document.getElementById('ch');
        Object.keys(channels).forEach(id => {
            const div = document.createElement('div');
            div.className = 'channel';
            div.textContent = 'شبکه ' + id;
            div.onclick = () => {
                document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
                const url = window.location.origin + '/' + id + '/index.m3u8';
                alert('آدرس:\n' + url);
            };
            ch.appendChild(div);
        });
    </script>
</body>
</html>`;

// ============================================
// 🌍 WORKER ENTRY
// ============================================
export default {
  async fetch(request) {
    try {
      const requestUrl = new URL(request.url);
      const pathParts = requestUrl.pathname.split("/").filter(Boolean);
      const channelId = pathParts[0];
      const restPath = pathParts.slice(1).join("/");
      const queryString = requestUrl.search || "";

      // ============================================
      // 🎨 PANEL ROUTE
      // ============================================
      if (channelId === "panel" || channelId === "") {
        return new Response(PANEL_HTML, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }

      // Validate channel
      const base = CHANNELS[channelId];
      if (!base) {
        return new Response("Channel not found", { status: 404 });
      }

      // ============================================
      // 🎯 BUILD TARGET URL
      // ============================================
      let targetUrl;

      if (restPath) {
        targetUrl = base.endsWith("/")
          ? base + restPath + queryString
          : base + "/" + restPath + queryString;
      } else {
        if (base.includes(".smil")) {
          targetUrl = base + "/playlist.m3u8" + queryString;
        } else {
          targetUrl = base + "/index.m3u8" + queryString;
        }
      }

      // Special handler for encoded URLs
      if (restPath.startsWith("__proxy__/")) {
        const encodedUrl = restPath.replace("__proxy__/", "");
        const decodedUrl = decodeURIComponent(encodedUrl);

        const upstreamResponse = await fetch(decodedUrl, {
          headers: {
            "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
            "Referer": new URL(decodedUrl).origin + "/"
          }
        });

        return new Response(upstreamResponse.body, {
          headers: {
            "Content-Type": upstreamResponse.headers.get("content-type") || "application/octet-stream",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      const upstreamUrl = new URL(targetUrl);
      const upstreamHeaders = {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Referer": new URL(targetUrl).origin + "/"
      };

      const upstreamResponse = await fetch(upstreamUrl, {
        headers: upstreamHeaders
      });

      // ============================================
      // 🔄 REWRITE PLAYLIST
      // ============================================
      let body = await upstreamResponse.text();

      if (body.includes("#EXTM3U")) {
        const lines = body.split("\n");
        const rewrittenLines = lines.map((line, idx) => {
          if (line.startsWith("http") && !line.startsWith("https://")) {
            return "http://" + line;
          }
          if (line.startsWith("http") && !line.includes(request.url.split(channelId)[0])) {
            const encodedUrl = encodeURIComponent(line);
            return request.url.split(channelId)[0] + channelId + "/__proxy__/" + encodedUrl;
          }
          return line;
        });
        body = rewrittenLines.join("\n");
      }

      return new Response(body, {
        headers: {
          "Content-Type": upstreamResponse.headers.get("content-type") || "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300"
        }
      });

    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
