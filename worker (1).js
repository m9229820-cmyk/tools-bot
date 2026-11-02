const OFFSET = 4 * 3600 * 1000; // توقيت عُمان
const PALETTES = [
  ["6C5CE7", "F1F0FF"], ["E84393", "FFF0F7"], ["00B894", "EFFFFA"],
  ["0984E3", "EEF6FF"], ["2D3436", "FFFFFF"], ["F39C12", "FFF8EA"],
];

const STYLES = {
  bold: [0x1d400, 0x1d41a], boldItalic: [0x1d468, 0x1d482],
  script: [0x1d4d0, 0x1d4ea], fraktur: [0x1d56c, 0x1d586],
  mono: [0x1d670, 0x1d68a], sans: [0x1d5d4, 0x1d5ee],
  sansItalic: [0x1d63c, 0x1d656], circled: [0x24b6, 0x24d0],
  full: [0xff21, 0xff41],
};
const WRAPS = ["꧁ T ꧂", "★彡 T 彡★", "『 T 』", "【 T 】", "♛ T ♛", "░▒▓ T ▓▒░", "⚡ T ⚡"];

const FONT = {
  " ": ["     ", "     ", "     ", "     ", "     "],
  A: [" ███ ", "█   █", "█████", "█   █", "█   █"],
  B: ["████ ", "█   █", "████ ", "█   █", "████ "],
  C: [" ████", "█    ", "█    ", "█    ", " ████"],
  D: ["████ ", "█   █", "█   █", "█   █", "████ "],
  E: ["█████", "█    ", "████ ", "█    ", "█████"],
  F: ["█████", "█    ", "████ ", "█    ", "█    "],
  G: [" ████", "█    ", "█  ██", "█   █", " ████"],
  H: ["█   █", "█   █", "█████", "█   █", "█   █"],
  I: ["█████", "  █  ", "  █  ", "  █  ", "█████"],
  J: ["█████", "   █ ", "   █ ", "█  █ ", " ██  "],
  K: ["█   █", "█  █ ", "███  ", "█  █ ", "█   █"],
  L: ["█    ", "█    ", "█    ", "█    ", "█████"],
  M: ["█   █", "██ ██", "█ █ █", "█   █", "█   █"],
  N: ["█   █", "██  █", "█ █ █", "█  ██", "█   █"],
  O: [" ███ ", "█   █", "█   █", "█   █", " ███ "],
  P: ["████ ", "█   █", "████ ", "█    ", "█    "],
  Q: [" ███ ", "█   █", "█ █ █", "█  █ ", " ██ █"],
  R: ["████ ", "█   █", "████ ", "█  █ ", "█   █"],
  S: [" ████", "█    ", " ███ ", "    █", "████ "],
  T: ["█████", "  █  ", "  █  ", "  █  ", "  █  "],
  U: ["█   █", "█   █", "█   █", "█   █", " ███ "],
  V: ["█   █", "█   █", "█   █", " █ █ ", "  █  "],
  W: ["█   █", "█   █", "█ █ █", "██ ██", "█   █"],
  X: ["█   █", " █ █ ", "  █  ", " █ █ ", "█   █"],
  Y: ["█   █", " █ █ ", "  █  ", "  █  ", "  █  "],
  Z: ["█████", "   █ ", "  █  ", " █   ", "█████"],
  0: [" ███ ", "█  ██", "█ █ █", "██  █", " ███ "],
  1: ["  █  ", " ██  ", "  █  ", "  █  ", " ███ "],
  2: [" ███ ", "█   █", "  ██ ", " █   ", "█████"],
  3: ["████ ", "    █", " ███ ", "    █", "████ "],
  4: ["█  █ ", "█  █ ", "█████", "   █ ", "   █ "],
  5: ["█████", "█    ", "████ ", "    █", "████ "],
  6: [" ███ ", "█    ", "████ ", "█   █", " ███ "],
  7: ["█████", "    █", "   █ ", "  █  ", "  █  "],
  8: [" ███ ", "█   █", " ███ ", "█   █", " ███ "],
  9: [" ███ ", "█   █", " ████", "    █", " ███ "],
};

// ---------- أدوات مساعدة ----------
const tg = async (env, method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(method, r.status, await r.clone().text());
  return r;
};
const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const aiText = async (env, messages) => {
  const r = await env.AI.run(TEXT_MODEL, { messages });
  return r.response ?? r.choices?.[0]?.message?.content ?? "";
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const loadData = async (env) => JSON.parse((await env.KV.get("data")) || '{"r":[],"d":[]}');
const saveData = (env, d) => env.KV.put("data", JSON.stringify(d));

// ---------- التشفير ----------
const te = new TextEncoder(), td = new TextDecoder();
const toB64 = (u8) => btoa(String.fromCharCode(...u8));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(pass, salt) {
  const k = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
async function encryptText(pass, text) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(pass, salt), te.encode(text))
  );
  return toB64(new Uint8Array([...salt, ...iv, ...ct]));
}
async function decryptText(pass, data) {
  const all = fromB64(data);
  const out = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: all.slice(16, 28) },
    await deriveKey(pass, all.slice(0, 16)),
    all.slice(28)
  );
  return td.decode(out);
}
async function sha256(t) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(t)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- الزخرفة و ASCII ----------
const conv = (t, [u, l]) =>
  [...t].map((c) =>
    /[A-Z]/.test(c) ? String.fromCodePoint(u + c.charCodeAt(0) - 65)
    : /[a-z]/.test(c) ? String.fromCodePoint(l + c.charCodeAt(0) - 97)
    : c
  ).join("");
const NON_JOIN = "اأإآدذرزوؤةى";
const isAr = (c) => /[\u0621-\u064A]/.test(c || "");
const tatweel = (t) =>
  [...t].map((c, i, a) => (isAr(c) && isAr(a[i + 1]) && !NON_JOIN.includes(c) ? c + "ـ" : c)).join("");

function decorate(t) {
  const out = [];
  const hasAr = /[\u0600-\u06FF]/.test(t);
  const hasEn = /[A-Za-z]/.test(t);
  const base = hasAr ? tatweel(t) : t;
  if (hasAr) out.push(base, [...t].join(" "));
  if (hasEn) Object.values(STYLES).forEach((s) => out.push(conv(t, s)));
  WRAPS.forEach((w) => out.push(w.replace("T", () => base)));
  return out;
}
function bigText(t) {
  const chars = [...t.toUpperCase()].filter((c) => FONT[c]);
  const blocks = [];
  for (let i = 0; i < chars.length; i += 5) {
    const part = chars.slice(i, i + 5);
    blocks.push([0, 1, 2, 3, 4].map((r) => part.map((c) => FONT[c][r]).join(" ")).join("\n"));
  }
  return blocks.join("\n\n");
}

const HELP = `أهلاً 👋 الأوامر:

🔳 QR
/qr نص أو رابط
/wifi اسم_الشبكة كلمة_السر
(أرسل صورة فيها QR وأقرأها لك)

⏰ التذكيرات
/remind 30m نص  (m دقائق، h ساعات، d أيام)
/daily 08:00 نص  (توقيت عُمان)
/list
/del r1  أو  /del d1

🔐 التشفير
/enc كلمة_السر النص
/dec كلمة_السر النص_المشفر
/b64 نص  و  /unb64 نص
/hash نص

🎨 الجمال
/wall وصف الخلفية
/zk نص  (زخرفة)
/ascii TEXT  (حروف كبيرة)
/art وصف  (رسمة ASCII)`;

export default {
  // ---------- المؤقّت (كل دقيقة) ----------
  async scheduled(event, env) {
    const data = await loadData(env);
    const now = Date.now();
    const hm = new Date(now + OFFSET).toISOString().slice(11, 16);
    const keep = [];
    let changed = false;
    for (const r of data.r) {
      if (r.due <= now) {
        await tg(env, "sendMessage", { chat_id: r.chat_id, text: "⏰ تذكير:\n" + r.text });
        changed = true;
      } else keep.push(r);
    }
    for (const d of data.d) {
      if (d.time === hm) await tg(env, "sendMessage", { chat_id: d.chat_id, text: "🔔 تذكير يومي:\n" + d.text });
    }
    if (changed) {
      data.r = keep;
      await saveData(env, data);
    }
  },

  // ---------- الرسائل ----------
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Bot is running ✅");
    const update = await request.json();
    const msg = update.message;
    if (!msg || String(msg.from.id) !== env.OWNER_ID) return new Response("ok");

    const chat_id = msg.chat.id;
    const reply = (text) => tg(env, "sendMessage", { chat_id, text });
    const replyHtml = (html) => tg(env, "sendMessage", { chat_id, text: html, parse_mode: "HTML" });

    try {
      // قراءة QR من صورة
      if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const f = await (await tg(env, "getFile", { file_id: fileId })).json();
        const img = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
        const form = new FormData();
        form.append("file", await img.blob(), "qr.jpg");
        const r = await (await fetch("https://api.qrserver.com/v1/read-qr-code/", { method: "POST", body: form })).json();
        const val = r[0]?.symbol?.[0]?.data;
        await reply(val ? "📖 القيمة:\n" + val : "ما لقيت QR في الصورة ❌");
        return new Response("ok");
      }

      const text = (msg.text || "").trim();
      if (!text.startsWith("/")) { await reply(HELP); return new Response("ok"); }

      const first = text.split(/\s+/)[0];
      const cmd = first.split("@")[0].toLowerCase();
      const args = text.slice(first.length).trim();

      switch (cmd) {
        case "/start":
        case "/help":
          await reply(HELP);
          break;

        case "/qr":
        case "/wifi": {
          let content = args;
          if (cmd === "/wifi") {
            const [ssid, ...p] = args.split(/\s+/);
            content = `WIFI:T:WPA;S:${ssid};P:${p.join(" ")};;`;
          }
          if (!args) { await reply("مثال:\n/qr https://google.com"); break; }
          const [fg, bg] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
          const url = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&margin=25&color=${fg}&bgcolor=${bg}&data=${encodeURIComponent(content)}`;
          await tg(env, "sendPhoto", { chat_id, photo: url, caption: "✨ جاهز" });
          break;
        }

        case "/remind": {
          const m = args.match(/^(\d+)\s*(m|h|d)?\s+([\s\S]+)$/i);
          if (!m) { await reply("مثال:\n/remind 30m اشرب ماء"); break; }
          const unit = { m: 60e3, h: 3600e3, d: 86400e3 }[(m[2] || "m").toLowerCase()];
          const data = await loadData(env);
          data.r.push({ chat_id, text: m[3], due: Date.now() + Number(m[1]) * unit });
          await saveData(env, data);
          await reply(`تمام ⏰ بذكرك بعد ${m[1]}${(m[2] || "m").toLowerCase()}`);
          break;
        }

        case "/daily": {
          const m = args.match(/^(\d{1,2}):(\d{2})\s+([\s\S]+)$/);
          if (!m) { await reply("مثال:\n/daily 08:00 صباح الخير"); break; }
          const time = m[1].padStart(2, "0") + ":" + m[2];
          const data = await loadData(env);
          data.d.push({ chat_id, text: m[3], time });
          await saveData(env, data);
          await reply(`تمام 🔔 كل يوم الساعة ${time} (توقيت عُمان)`);
          break;
        }

        case "/list": {
          const data = await loadData(env);
          const now = Date.now();
          let out = "";
          data.r.forEach((r, i) => (out += `r${i + 1}) بعد ${Math.max(1, Math.round((r.due - now) / 60000))} دقيقة: ${r.text}\n`));
          data.d.forEach((d, i) => (out += `d${i + 1}) يومياً ${d.time}: ${d.text}\n`));
          await reply(out || "ما عندك تذكيرات");
          break;
        }

        case "/del": {
          const m = args.match(/^([rd])(\d+)$/i);
          if (!m) { await reply("مثال:\n/del r1"); break; }
          const data = await loadData(env);
          const arr = data[m[1].toLowerCase()];
          const i = Number(m[2]) - 1;
          if (!arr[i]) { await reply("ما لقيته ❌"); break; }
          arr.splice(i, 1);
          await saveData(env, data);
          await reply("انحذف ✅");
          break;
        }

        case "/enc":
        case "/dec": {
          const sp = args.indexOf(" ");
          if (sp < 0) { await reply(`مثال:\n${cmd} كلمة_السر النص`); break; }
          const pass = args.slice(0, sp), body = args.slice(sp + 1).trim();
          let res;
          try {
            res = cmd === "/enc" ? await encryptText(pass, body) : await decryptText(pass, body);
          } catch { res = null; }
          await tg(env, "deleteMessage", { chat_id, message_id: msg.message_id }); // نحذف رسالتك عشان كلمة السر
          await replyHtml(res ? `<code>${esc(res)}</code>` : "❌ كلمة السر غلط أو النص تالف");
          break;
        }

        case "/b64":
          await replyHtml(`<code>${esc(toB64(te.encode(args)))}</code>`);
          break;
        case "/unb64":
          try { await reply(td.decode(fromB64(args))); } catch { await reply("❌ نص غير صالح"); }
          break;
        case "/hash":
          await replyHtml(`<code>${await sha256(args)}</code>`);
          break;

        case "/wall": {
          if (!args) { await reply("مثال:\n/wall ليل بمطر وسيارة رياضية"); break; }
          await reply("🎨 جاري الرسم...");
          let p = args;
          if (/[\u0600-\u06FF]/.test(p)) {
            p = await aiText(env, [
              { role: "system", content: "Translate to English as a short image prompt. Output only the translation." },
              { role: "user", content: p },
            ]);
          }
          const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
            prompt: "vertical phone wallpaper, 9:16, ultra detailed, " + p,
            steps: 6,
          });
          const bytes = Uint8Array.from(atob(r.image), (c) => c.charCodeAt(0));
          const form = new FormData();
          form.append("chat_id", String(chat_id));
          form.append("document", new Blob([bytes], { type: "image/jpeg" }), "wallpaper.jpg");
          await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
          break;
        }

        case "/zk":
          if (!args) { await reply("مثال:\n/zk K"); break; }
          await replyHtml(decorate(args).map((s) => `<code>${esc(s)}</code>`).join("\n\n"));
          break;

        case "/ascii": {
          const art = bigText(args);
          await replyHtml(art ? `<pre>${esc(art)}</pre>` : "اكتب حروف إنجليزية أو أرقام، مثال:\n/ascii HELLO");
          break;
        }

        case "/art": {
          if (!args) { await reply("مثال:\n/art قطة"); break; }
          const art = await aiText(env, [
            { role: "system", content: "You draw ASCII art. Output ONLY the art, max 20 lines, max 40 columns, no explanation." },
            { role: "user", content: args },
          ]);
          await replyHtml(`<pre>${esc(art)}</pre>`);
          break;
        }

        default:
          await reply(HELP);
      }
    } catch (e) {
      console.log("ERROR", e && e.message);
      await reply("⚠️ صار خطأ: " + (e && e.message));
    }
    return new Response("ok");
  },
};
