/**
 * ============================================
 * IPTV Proxy - Cloudflare Worker
 * ============================================
 */

const DEFAULT_CHANNELS = {
  "1111": { url: "https://live.livetvstream.co.uk/LS-63503-4", name: "لایو تی‌وی استریم", logo: 'https://img.freepik.com/free-vector/webinar-live-stream-broadcast-label-design_1017-59935.jpg?semt=ais_hybrid&w=740&q=80' },
  "1112": { url: "https://avaserieshls.wns.live/hls", name: "آوا سریال", logo: 'http://www.persianity.com/thumb.php?w=900&h=506&src=https://www.irtv.website/index_files/channels/avaseries.png' },
  "1113": { url: "https://familyhls.avatv.live/hls", name: "فمیلی تی‌وی", logo: 'https://cdn.vectorstock.com/i/500p/77/23/cute-family-media-channel-logo-template-digital-vector-42567723.jpg' },
  "1114": { url: "https://voa-ingest.akamaized.net/hls/live/2033876/tvmc07", name: "صدای آمریکا", logo: 'https://gdb.voanews.com/01000000-0aff-0242-0f3b-08db0f7b7a54_cx0_cy3_cw0_w408_r1_s.png' },
  "1115": { url: "https://hls.247box.live/hls", name: "۲۴۷ باکس", logo: 'https://cdn.myportfolio.com/5dff5785-d1c7-4ff5-bb0a-fca07c2b0453/c7e47864-2ad8-4892-b597-3f0adc63de84_rwc_0x0x2494x1667x2494.png?h=7096b8188eede6dc0a6477a988790096' },
  "1116": { url: "https://cafefhls.wns.live/hls", name: "کافه تی‌وی", logo: 'https://mir-s3-cdn-cf.behance.net/project_modules/1400/8f05fc103686335.6103c30009896.gif' },
  "1117": { url: "https://fxtvhls.wns.live/hls", name: "اف‌ایکس تی‌وی", logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/FX_2016.svg/512px-FX_2016.svg.png' },
  "1118": { url: "https://toonixhls.wns.live/hls", name: "تونکس", logo: 'https://static.wikia.nocookie.net/logofanon2/images/0/0e/Toonix_TV_UK_Logo_%282002-2004%29.png/revision/latest/scale-to-width-down/1056?cb=20240613124424' },
  "1119": { url: "https://newfhls.wns.live/hls", name: "نیو اف", logo: 'https://thumbs.dreamstime.com/b/ftv-creative-logo-design-vector-illustration-logos-427507208.jpg' },
  "1120": { url: "https://hls.oxir.live/hls", name: "اکسیر", logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Oxir_logo.svg/512px-Oxir_logo.svg.png' }
};

const COMMON_SUFFIXES = ["", "/index.m3u8", "/playlist.m3u8", "/stream.m3u8", "/master.m3u8", "/live.m3u8"];

// ============================================
// KV Functions
// ============================================
async function getChannels(env) {
  let channels = await env.CUSTOM_CHANNELS.get('channels');
  if (!channels) {
    channels = JSON.stringify(DEFAULT_CHANNELS);
    await env.CUSTOM_CHANNELS.put('channels', channels);
  }
  return JSON.parse(channels);
}

async function saveChannel(env, id, data) {
  let channels = await getChannels(env);
  channels[id] = data;
  await env.CUSTOM_CHANNELS.put('channels', JSON.stringify(channels));
}

async function deleteChannel(env, id) {
  let channels = await getChannels(env);
  delete channels[id];
  await env.CUSTOM_CHANNELS.put('channels', JSON.stringify(channels));
}

// ============================================
// 📺 UI Templates
// ============================================
const FAVICON_TAG = `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📺</text></svg>">`;

function getChannelsListHTML(channelsJson) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  ${FAVICON_TAG}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>پنل IPTV پروکسی</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
    body { font-family: 'Vazirmatn', sans-serif; }
    .modal { display: none; position: fixed; z-index: 50; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); backdrop-filter: blur(4px); }
    .modal-content { background-color: #18181b; margin: 10% auto; padding: 24px; border: 1px solid #3f3f46; width: 90%; max-width: 500px; border-radius: 24px; }
  </style>
</head>
<body class="bg-zinc-950 text-white">
  <div class="max-w-6xl mx-auto p-8">
    <div class="flex justify-between items-center mb-12">
      <button id="editListBtn" class="text-2xl w-12 h-12 flex items-center justify-center bg-zinc-900 rounded-full hover:bg-zinc-800 transition shadow-lg border border-zinc-800">✏️</button>
      <h1 class="text-3xl font-bold text-center">📡 پنل پخش شبکه‌ها</h1>
      <button id="addBtn" class="text-2xl w-12 h-12 flex items-center justify-center text-emerald-500 bg-zinc-900 rounded-full hover:bg-zinc-800 transition shadow-lg border border-zinc-800">+</button>
    </div>
    <div id="channelsGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
  </div>

  <div id="channelModal" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle" class="text-2xl font-bold mb-6 text-center text-emerald-400"></h2>
      <form id="channelForm" class="space-y-4">
        <input type="hidden" id="editId">
        <div>
          <label class="block text-xs text-zinc-500 mb-1">ID شبکه</label>
          <input id="channelId" type="text" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" required>
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">نام شبکه</label>
          <input id="channelName" type="text" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" required>
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">لینک مستقیم HLS</label>
          <input id="channelUrl" type="url" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-left" dir="ltr" required>
        </div>
        <div>
          <label class="block text-xs text-zinc-500 mb-1">لینک لوگو (اختیاری)</label>
          <input id="channelLogo" type="url" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-left" dir="ltr">
        </div>
        <div class="flex gap-2 pt-4">
          <button type="submit" class="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold transition">ذخیره</button>
          <button type="button" onclick="closeModal('channelModal')" class="flex-1 bg-zinc-800 py-3 rounded-xl font-bold">لغو</button>
        </div>
      </form>
    </div>
  </div>

  <div id="editListModal" class="modal">
    <div class="modal-content">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold">مدیریت شبکه‌ها</h2>
        <button onclick="closeModal('editListModal')" class="text-zinc-500 hover:text-white transition">✕</button>
      </div>
      <div id="editList" class="space-y-2 max-h-96 overflow-y-auto pr-2"></div>
    </div>
  </div>

  <script>
    const channels = ${channelsJson};

    function renderChannels() {
      const grid = document.getElementById('channelsGrid');
      grid.innerHTML = '';
      Object.entries(channels).forEach(([id, ch]) => {
        const card = document.createElement('a');
        card.className = 'group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all text-center shadow-lg';
        card.href = '/' + id;
        card.innerHTML = \`
          <div class="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-zinc-800 rounded-2xl overflow-hidden shadow-inner">
            \${ch.logo ? '<img src="' + ch.logo + '" class="w-full h-full object-contain p-2">' : '<span class="text-4xl">📺</span>'}
          </div>
          <div class="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">\${ch.name}</div>
        \`;
        grid.appendChild(card);
      });
    }

    function openModal(mode, id = '') {
      const modal = document.getElementById('channelModal');
      document.getElementById('modalTitle').textContent = mode === 'add' ? 'افزودن شبکه جدید' : 'ویرایش شبکه';
      document.getElementById('channelForm').reset();
      document.getElementById('editId').value = id;
      if (mode === 'edit') {
        const ch = channels[id];
        document.getElementById('channelId').value = id;
        document.getElementById('channelId').readOnly = true;
        document.getElementById('channelName').value = ch.name;
        document.getElementById('channelUrl').value = ch.url;
        document.getElementById('channelLogo').value = ch.logo || '';
      } else {
        document.getElementById('channelId').readOnly = false;
      }
      modal.style.display = 'block';
    }

    function openEditList() {
      const modal = document.getElementById('editListModal');
      const list = document.getElementById('editList');
      list.innerHTML = '';
      Object.entries(channels).forEach(([id, ch]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm';
        div.innerHTML = \`
          <span class="font-medium text-zinc-200">\${ch.name}</span>
          <div class="flex gap-3">
            <button onclick="editChannel('\${id}')" class="text-emerald-500 hover:text-emerald-400 font-bold transition">ویرایش</button>
            <button onclick="removeChannel('\${id}')" class="text-red-500 hover:text-red-400 font-bold transition">حذف</button>
          </div>
        \`;
        list.appendChild(div);
      });
      modal.style.display = 'block';
    }

    window.editChannel = (id) => { closeModal('editListModal'); openModal('edit', id); };
    
    window.removeChannel = async (id) => {
      if (confirm('آیا از حذف شبکه "' + channels[id].name + '" مطمئن هستید؟')) {
        await fetch('/delete-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        location.reload();
      }
    };

    window.closeModal = (id) => document.getElementById(id).style.display = 'none';

    document.getElementById('addBtn').onclick = () => openModal('add');
    document.getElementById('editListBtn').onclick = openEditList;

    document.getElementById('channelForm').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        id: document.getElementById('channelId').value.trim(),
        name: document.getElementById('channelName').value.trim(),
        url: document.getElementById('channelUrl').value.trim(),
        logo: document.getElementById('channelLogo').value.trim()
      };
      await fetch('/save-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      location.reload();
    };

    renderChannels();
  </script>
</body>
</html>`;
}

function getPlayerHTML(channelId, ch) {
  const name = ch.name || 'Channel ' + channelId;
  const isSmil = ch.url.includes(".smil");
  const defaultSuffix = isSmil ? "/playlist.m3u8" : "/index.m3u8";

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  ${FAVICON_TAG}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | پخش زنده</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { background: #000; font-family: system-ui, sans-serif; }</style>
</head>
<body class="text-white min-h-screen flex flex-col p-6">
  <div class="max-w-5xl mx-auto w-full">
    <div class="flex justify-between items-center mb-6">
       <a href="/" class="text-zinc-400 hover:text-white transition">← بازگشت به لیست</a>
       <h1 class="text-xl font-bold">${name}</h1>
    </div>
    <div class="bg-zinc-900 rounded-3xl overflow-hidden aspect-video border border-zinc-800 shadow-2xl">
      <video id="video" class="w-full h-full" controls autoplay playsinline></video>
    </div>
    <div id="status" class="mt-4 text-center text-sm font-medium h-6"></div>
    <div class="mt-8 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
      <h3 class="text-zinc-500 text-xs mb-4 uppercase tracking-widest text-right">تست پسوندها</h3>
      <div id="suffixButtons" class="flex flex-wrap gap-2 flex-row-reverse"></div>
    </div>
  </div>

  <script>
    let hls = null;
    const origin = window.location.origin;
    const channelId = "${channelId}";
    const suffixes = ${JSON.stringify(COMMON_SUFFIXES)};

    function play(sfx) {
      const url = origin + "/" + channelId + sfx;
      const video = document.getElementById("video");
      const status = document.getElementById("status");
      status.textContent = "در حال اتصال...";
      status.className = "mt-4 text-center text-sm font-medium text-blue-400";

      document.querySelectorAll('.sfx-btn').forEach(b => {
        b.className = b.dataset.sfx === sfx ? "sfx-btn px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 transition shadow-md" : "sfx-btn px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 transition";
      });

      if (hls) hls.destroy();
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          status.textContent = "✅ در حال پخش زنده";
          status.className = "mt-4 text-center text-sm font-medium text-emerald-400";
        });
        hls.on(Hls.Events.ERROR, (_, d) => { if(d.fatal) status.textContent = "❌ خطا در این پسوند - گزینه دیگر را امتحان کنید"; });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.play();
      }
    }

    const container = document.getElementById("suffixButtons");
    suffixes.forEach(s => {
      const btn = document.createElement("button");
      btn.dataset.sfx = s;
      btn.className = "sfx-btn px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 transition";
      btn.textContent = s === "" ? "اصلی" : s.replace('/', '');
      btn.onclick = () => play(s);
      container.appendChild(btn);
    });
    window.onload = () => play("${defaultSuffix}");
  </script>
</body>
</html>`;
}

// ============================================
// 🌍 WORKER ENTRY
// ============================================
export default {
  async fetch(request, env) {
    try {
      const requestUrl = new URL(request.url);
      const pathParts = requestUrl.pathname.split("/").filter(Boolean);

      // --- 1. لیست اصلی ---
      if (pathParts.length === 0) {
        const channels = await getChannels(env);
        return new Response(getChannelsListHTML(JSON.stringify(channels)), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // --- 2. ذخیره شبکه ---
      if (request.method === 'POST' && pathParts[0] === 'save-channel') {
        const data = await request.json();
        await saveChannel(env, data.id, { url: data.url, name: data.name, logo: data.logo });
        return new Response('Saved', { status: 200 });
      }

      // --- 3. حذف شبکه (قابلیت جدید) ---
      if (request.method === 'POST' && pathParts[0] === 'delete-channel') {
        const data = await request.json();
        await deleteChannel(env, data.id);
        return new Response('Deleted', { status: 200 });
      }

      const channelId = pathParts[0];
      const channels = await getChannels(env);
      const ch = channels[channelId];
      if (!ch) return new Response("Channel Not Found", { status: 404 });

      const base = ch.url;

      // --- 4. پخش کننده HTML ---
      if (pathParts.length === 1 && (request.headers.get("Accept") || "").includes("text/html")) {
        return new Response(getPlayerHTML(channelId, ch), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // --- 5. هسته پروکسی اصلی ---
      const restPath = pathParts.slice(1).join("/");
      const queryString = requestUrl.search || "";
      let targetUrl;

      if (restPath) {
        targetUrl = base.endsWith("/") ? base + restPath + queryString : base + "/" + restPath + queryString;
      } else {
        targetUrl = base.includes(".smil") ? base + "/playlist.m3u8" + queryString : base + "/index.m3u8" + queryString;
      }

      if (restPath.startsWith("__proxy__/")) {
        const decodedUrl = decodeURIComponent(restPath.replace("__proxy__/", ""));
        const upRes = await fetch(decodedUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": new URL(decodedUrl).origin + "/" } });
        return new Response(upRes.body, { headers: { "Content-Type": upRes.headers.get("content-type") || "application/octet-stream", "Access-Control-Allow-Origin": "*" } });
      }

      const upUrl = new URL(targetUrl);
      const upRes = await fetch(upUrl.toString(), { 
        headers: { "User-Agent": "Mozilla/5.0", "Referer": upUrl.origin + "/" } 
      });

      if (!upRes.ok) return new Response("Upstream Error", { status: upRes.status });

      const cType = upRes.headers.get("content-type") || "";
      if (cType.includes("mpegurl") || cType.includes("x-mpegURL") || upUrl.pathname.endsWith(".m3u8")) {
        const finalUrl = upRes.url;
        const finalBase = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
        let text = await upRes.text();
        const proxyBase = `${requestUrl.origin}/${channelId}`;

        text = text.replace(/^([^#][^\r\n]*)/gm, (line) => {
          if (!line.trim()) return line;
          const absUrl = new URL(line, finalBase).toString();
          const rel = absUrl.replace(base, "");
          return `${proxyBase}/${rel.startsWith("/") ? rel.substring(1) : rel}`;
        });

        return new Response(text, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": "*" } });
      }

      return new Response(upRes.body, { headers: { "Content-Type": cType, "Access-Control-Allow-Origin": "*" } });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};
