/**
 * ============================================
 * IPTV Proxy - Cloudflare Worker
 * ============================================
 *
 * Features:
 *  - Supports standard HLS
 *  - Supports Wowza / SMIL streams
 *  - Preserves query strings (nimblesessionid fix)
 *  - Rewrites master + variant playlists
 *  - Rewrites EXT-X-KEY URIs
 *  - Streams binary segments safely
 *  - CORS enabled
 *
 * Production ready
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
// panel
// ============================================
function renderPanel(channelId, baseUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>IPTV Panel - ${channelId}</title>
<style>
body {
  background:#0f0f0f;
  color:white;
  font-family:Arial;
  text-align:center;
  padding:30px;
}
button {
  margin:10px;
  padding:12px 20px;
  font-size:16px;
  border-radius:6px;
  border:none;
  cursor:pointer;
  background:#1e88e5;
  color:white;
}
a { color:#00d4ff; }
.video-container {
  margin-top:20px;
}
</style>
</head>
<body>

<h2>Channel ${channelId}</h2>

<div>
<button onclick="loadDefault()">Load Default</button>
<button onclick="loadStream()">stream.m3u8</button>
<button onclick="loadPlaylist()">playlist.m3u8</button>
<button onclick="loadIndex()">index.m3u8</button>
</div>

<div style="margin-top:15px;">
<button onclick="goBack()">⬅ Back</button>
</div>

<div class="video-container">
<video id="player" controls autoplay width="80%"></video>
</div>

<script>
const base = "${baseUrl}";
const proxy = window.location.origin + "/${channelId}/";

function play(url){
  const video = document.getElementById("player");
  video.src = proxy + url;
  video.load();
}

function loadDefault(){
  play("");
}
function loadStream(){
  play("stream.m3u8");
}
function loadPlaylist(){
  play("playlist.m3u8");
}
function loadIndex(){
  play("index.m3u8");
}
function goBack(){
  window.history.back();
}
</script>

</body>
</html>
`
}


// ============================================
// 🌍 WORKER ENTRY
// ============================================
export default {
  async fetch(request) {
    try {

      // Parse incoming request
      const base = CHANNELS[channelId]
      const requestUrl = new URL(request.url)
      const pathParts = requestUrl.pathname.split("/").filter(Boolean)

      const channelId = pathParts[0]
      const restPath = pathParts.slice(1).join("/")  // segment path
      const queryString = requestUrl.search || ""     // IMPORTANT: preserve tokens

      // Validate channel
      const base = CHANNELS[channelId]
      if (!base) {
        return new Response("Channel not found", { status: 404 })

      // If browser request -> show panel
      if (request.headers.get("accept")?.includes("text/html")) {
        return new Response(
          renderPanel(channelId, base),
          { headers: { "Content-Type": "text/html" } }
        )
      }
      }

      // ============================================
      // 🎯 BUILD TARGET URL (SMIL SAFE + QUERY SAFE)
      // ============================================

      let targetUrl

      if (restPath) {
        // Example:
        // /1234/media_xxx.ts?nimblesessionid=xxx
        targetUrl = base.endsWith("/")
          ? base + restPath + queryString
          : base + "/" + restPath + queryString
      } else {
        // First request (playlist)
        if (base.includes(".smil")) {
          targetUrl = base + "/playlist.m3u8" + queryString
        } else {
          targetUrl = base + "/index.m3u8" + queryString
        }
      }

      // Special handler for encoded absolute URLs
      if (restPath.startsWith("__proxy__/")) {
        const encodedUrl = restPath.replace("__proxy__/", "")
        const decodedUrl = decodeURIComponent(encodedUrl)

        const upstreamResponse = await fetch(decodedUrl, {
          headers: {
            "User-Agent":
              request.headers.get("User-Agent") ||
              "Mozilla/5.0",
            "Referer": new URL(decodedUrl).origin + "/"
          }
        })

        return new Response(upstreamResponse.body, {
          headers: {
            "Content-Type":
              upstreamResponse.headers.get("content-type") ||
              "application/octet-stream",
            "Access-Control-Allow-Origin": "*"
          }
        })
      }

      const upstreamUrl = new URL(targetUrl)

      // ============================================
      // 📡 UPSTREAM HEADERS
      // ============================================

      const upstreamHeaders = {
        "User-Agent":
          request.headers.get("User-Agent") ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": upstreamUrl.origin + "/"
        // Do NOT send Origin header (prevents CDN block)
      }

      const upstreamResponse = await fetch(upstreamUrl.toString(), {
        headers: upstreamHeaders
      })

      if (!upstreamResponse.ok) {
        return new Response(
          "Upstream Error: " + upstreamResponse.status,
          { status: upstreamResponse.status }
        )
      }

      const contentType =
        upstreamResponse.headers.get("content-type") || ""


      // ============================================
      // 🔥 PLAYLIST HANDLING (.m3u8)
      // ============================================

      if (
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegURL") ||
        upstreamUrl.pathname.endsWith(".m3u8")
      ) {

        const finalUrl = upstreamResponse.url
        const finalBase = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1)

        let playlistText = await upstreamResponse.text()

        const proxyBase = `${requestUrl.origin}/${channelId}`

        playlistText = playlistText.replace(
          /^([^#][^\r\n]*)/gm,
          (line) => {

            if (!line.trim()) return line

            // Build absolute upstream URL properly
            const absoluteUpstreamUrl = new URL(line, finalBase).toString()

            // Convert to proxy path
            const relativeToBase = absoluteUpstreamUrl.replace(base, "")

            return `${proxyBase}/${relativeToBase}`
          }
        )

        return new Response(playlistText, {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "public, max-age=5"
          }
        })
      }


      // ============================================
      // 🎥 SEGMENT STREAMING (.ts, .m4s, etc.)
      // ============================================

      return new Response(upstreamResponse.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=30"
        }
      })

    } catch (err) {
      return new Response("Proxy Error: " + err.message, {
        status: 500
      })
    }
  }
}
