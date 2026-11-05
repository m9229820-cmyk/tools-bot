// =====================================================================
//  البوت الشخصي (نسخة هادئة) — Cloudflare Worker
//  Secrets: BOT_TOKEN, OWNER_ID, GROQ_KEY, TAVILY_KEY
//  Bindings: KV (botkv), AI (Workers AI للصور والاحتياط)
// =====================================================================

const OFFSET = 4 * 3600 * 1000; // توقيت عُمان UTC+4
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const PALETTES = [
  ["6C5CE7", "F1F0FF"], ["E84393", "FFF0F7"], ["00B894", "EFFFFA"],
  ["0984E3", "EEF6FF"], ["2D3436", "FFFFFF"], ["F39C12", "FFF8EA"],
];

const SLOT_DEFS = {
  morning: { name: "الصباح: كلمة اليوم والأخبار والمراقبة", short: "الصباح", t: "07:00" },
  evening: { name: "المساء: الأخبار والمراقبة", short: "المساء", t: "19:00" },
  arena: { name: "ملخص Arena الأسبوعي (الجمعة)", short: "ملخص Arena", t: "18:00" },
};

const IDEA_KINDS = {
  game: "فكرة لعبة (جوال أو متصفح)",
  app: "فكرة تطبيق جوال مفيد",
  money: "مشروع رقمي (لعبة أو موقع أو تطبيق) سريع الانتشار وقابل للربح",
  tiktok: "فكرة محتوى تيك توك لاستوديو ألعاب فردي",
  any: "فكرة مشروع إبداعية",
};

// مصادر موثوقة ورسمية للأخبار
const TRUST = [
  "reuters.com", "bloomberg.com", "apnews.com", "ft.com", "wsj.com", "nytimes.com", "theverge.com",
  "techcrunch.com", "arstechnica.com", "wired.com", "venturebeat.com", "cnbc.com", "technologyreview.com",
  "theinformation.com", "axios.com", "bbc.com", "nature.com", "science.org", "arxiv.org", "engadget.com",
  "openai.com", "anthropic.com", "blog.google", "deepmind.google", "ai.meta.com", "about.fb.com", "x.ai",
  "mistral.ai", "huggingface.co", "nvidia.com", "microsoft.com", "lmarena.ai", "arena.ai", "github.blog",
];
const OFFICIAL = [
  "openai.com", "anthropic.com", "blog.google", "deepmind.google", "ai.meta.com", "about.fb.com", "x.ai",
  "mistral.ai", "huggingface.co", "nvidia.com", "microsoft.com", "lmarena.ai", "arena.ai", "github.blog",
];

const NEWS_QUERIES = [
  "major AI model release announcement",
  "artificial intelligence breakthrough research lab announcement",
  "OpenAI Anthropic Google DeepMind Meta xAI news",
  "AI in video games and game development news",
];

const UNI = {
  bold: [0x1d400, 0x1d41a], boldItalic: [0x1d468, 0x1d482],
  script: [0x1d4d0, 0x1d4ea], fraktur: [0x1d56c, 0x1d586],
  mono: [0x1d670, 0x1d68a], sans: [0x1d5d4, 0x1d5ee],
  sansItalic: [0x1d63c, 0x1d656], circled: [0x24b6, 0x24d0],
  full: [0xff21, 0xff41],
};
const WRAPS = ["꧁ T ꧂", "★彡 T 彡★", "『 T 』", "【 T 】", "♛ T ♛", "░▒▓ T ▓▒░", "≋ T ≋"];

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

// =====================================================================
//  أدوات مساعدة
// =====================================================================
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const noEmoji = (t) => String(t ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "");
const clean = (t) => noEmoji(t).replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/`/g, "").trim();
const card = (title, body) => `<b>${title}</b>\n\n${body}`;
const btn = (text, data) => ({ text, callback_data: data });
const strip = (h) => h.replace(/<[^>]+>/g, "");

const nowOman = () => new Date(Date.now() + OFFSET);
const dateStr = (d = nowOman()) => d.toISOString().slice(0, 10);
const hmStr = (d = nowOman()) => d.toISOString().slice(11, 16);
const dateAr = (d = nowOman()) => `${DAYS_AR[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_AR[d.getUTCMonth()]}`;
const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const validHM = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || "");
const normHM = (s) => { const [h, m] = s.split(":"); return h.padStart(2, "0") + ":" + m; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const inList = (h, list) => list.some((d) => h === d || h.endsWith("." + d));

const kget = async (env, key, def) => {
  try { const v = await env.KV.get(key); return v ? JSON.parse(v) : def; } catch { return def; }
};
const kput = (env, key, val, opts) => env.KV.put(key, JSON.stringify(val), opts);

const tg = async (env, method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.log("TG", method, r.status, (await r.clone().text()).slice(0, 200));
  return r;
};
const typing = (env, chat) => tg(env, "sendChatAction", { chat_id: chat, action: "typing" });

async function sendHtml(env, chat, html, kb) {
  if (html.length > 4000) html = html.slice(0, 3990) + "…";
  const body = { chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb && kb.length) body.reply_markup = { inline_keyboard: kb };
  let r = await tg(env, "sendMessage", body);
  if (!r.ok) {
    const b2 = { chat_id: chat, text: strip(html).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") };
    if (kb && kb.length) b2.reply_markup = { inline_keyboard: kb };
    r = await tg(env, "sendMessage", b2);
  }
  return r;
}

async function sendPre(env, chat, text, header) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 3500) chunks.push(text.slice(i, i + 3500));
  for (let i = 0; i < chunks.length; i++) {
    const h = header ? `<b>${header}${chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ""}</b>\n` : "";
    await sendHtml(env, chat, `${h}<pre>${esc(chunks[i])}</pre>`);
  }
}

// =====================================================================
//  الذكاء الاصطناعي (Groq أساسي، Workers AI احتياط)
// =====================================================================
const SYS = "أنت مساعد شخصي هادئ ومختصر. اكتب بالعربية البسيطة بلمسة خليجية خفيفة. لا تستخدم أي إيموجي ولا رموز markdown مثل * أو # أو `. بدون مقدمات.";

async function groqChat(env, model, messages, opts, extras) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GROQ_KEY}` },
    body: JSON.stringify({
      model, messages,
      temperature: opts.temp ?? 0.7,
      max_completion_tokens: opts.max ?? 2500,
      ...extras,
    }),
  });
  if (!r.ok) throw new Error(`groq ${r.status} ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  const t = j.choices?.[0]?.message?.content;
  if (!t || !t.trim()) throw new Error("groq empty");
  return t.trim();
}

async function llm(env, messages, opts = {}) {
  if (env.GROQ_KEY) {
    for (const m of GROQ_MODELS) {
      for (const extras of [{ reasoning_effort: "low" }, {}]) {
        try { return await groqChat(env, m, messages, opts, extras); }
        catch (e) { console.log("LLM", m, e.message); }
      }
    }
  }
  const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages });
  const t = (r.response ?? r.choices?.[0]?.message?.content ?? "").trim();
  if (!t) throw new Error("الذكاء الاصطناعي ما رد، جرّب بعد قليل");
  return t;
}

const parseJSON = (t) => {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no json");
  return JSON.parse(m[0]);
};
async function llmJSON(env, messages, opts) {
  for (let i = 0; i < 2; i++) {
    try { return parseJSON(await llm(env, messages, opts)); }
    catch (e) { console.log("JSON", e.message); }
  }
  throw new Error("تعذر توليد النتيجة، جرّب بعد قليل");
}

// =====================================================================
//  الإعدادات والتخزين
// =====================================================================
const DEF_CFG = () => ({
  quiet: { on: false, from: "23:00", to: "06:00" },
  pausedDate: "",
  slots: Object.fromEntries(Object.entries(SLOT_DEFS).map(([k, v]) => [k, { on: true, t: v.t }])),
});
async function getCfg(env) {
  const c = await kget(env, "cfg", {});
  const d = DEF_CFG();
  return {
    ...d, ...c,
    quiet: { ...d.quiet, ...(c.quiet || {}) },
    slots: Object.fromEntries(Object.keys(d.slots).map((k) => [k, { ...d.slots[k], ...((c.slots || {})[k] || {}) }])),
  };
}
const saveCfg = (env, cfg) => kput(env, "cfg", cfg);

async function getBox(env) {
  const p = await kget(env, "prog", {});
  return { ideas: p.ideas || [], lastIdea: p.lastIdea || null };
}
const saveBox = (env, b) => kput(env, "prog", b);

const isQuiet = (cfg, hm) => {
  const q = cfg.quiet;
  if (!q.on) return false;
  const m = toMin(hm), a = toMin(q.from), b = toMin(q.to);
  return a <= b ? m >= a && m < b : m >= a || m < b;
};

// =====================================================================
//  الأخبار (بحث Tavily + تلخيص Groq)
// =====================================================================
async function tavily(env, body) {
  if (!env.TAVILY_KEY) throw new Error("مفتاح Tavily غير مضاف");
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TAVILY_KEY}` },
    body: JSON.stringify({ search_depth: "basic", ...body }),
  });
  if (!r.ok) throw new Error("Tavily " + r.status);
  return (await r.json()).results || [];
}
const safeTav = async (env, body) => { try { return await tavily(env, body); } catch (e) { console.log("TAV", e.message); return []; } };

function rank(all) {
  const seenU = new Set(), seenT = new Set(), out = [];
  for (const x of all) {
    if (!x.url || seenU.has(x.url)) continue;
    const tk = String(x.title || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "").slice(0, 45);
    if (tk && seenT.has(tk)) continue;
    seenU.add(x.url);
    if (tk) seenT.add(tk);
    const h = host(x.url);
    out.push({ ...x, host: h, score: (x.score || 0) + (inList(h, TRUST) ? 0.5 : 0) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 12);
}

async function gatherNews(env, queries, days = 1) {
  const all = [];
  for (const q of queries) all.push(...(await safeTav(env, { query: q, topic: "news", days, max_results: 6 })));
  return rank(all);
}

const SYS_NEWS = "أنت محرر أخبار تقنية دقيق. تعتمد فقط على النصوص المعطاة، ولا تضيف أي معلومة من عندك ولا تخمّن. لا تستخدم إيموجي. أرجع JSON فقط.";

async function summarize(env, items, major = false) {
  if (!items.length) return [];
  const src = items.map((x, i) => `[${i}] ${x.host} | ${x.published_date || "؟"} | ${x.title}\n${String(x.content || "").slice(0, 380)}`).join("\n\n");
  const rule = major
    ? "أبقِ فقط الأخبار الكبيرة (إصدار موديل أو منتج، استحواذ، حدث أمني أو قانوني كبير، نتيجة بحث مهمة)، وإن لم يوجد شي مهم أرجع items فاضية."
    : "إذا ما فيه شي مهم أرجع items فاضية.";
  const j = await llmJSON(env, [
    { role: "system", content: SYS_NEWS },
    { role: "user", content: `هذي نتائج بحث مرقّمة. اختر الأخبار الأهم فقط (حتى 5)، وادمج المكرر في خبر واحد، وتجاهل الإعلانات والمحتوى الضعيف. ${rule}\nأرجع JSON بهذا الشكل:\n{"items":[{"t":"عنوان عربي قصير","s":"ملخص بجملتين بالعربية من النص فقط","w":"لماذا يهم في جملة واحدة","src":[أرقام المصادر],"unsure":false}]}\nاجعل unsure=true إذا كان الخبر بصيغة شائعة أو "يُقال".\n\n${src}` },
  ], { max: 3500, temp: 0.2 });
  return (j.items || []).slice(0, 5).map((n) => ({ ...n, src: (n.src || []).filter((k) => items[k]) })).filter((n) => n.src.length && n.t);
}

function renderNews(title, news, items) {
  if (!news.length) return card(title, "ما فيه خبر مهم حالياً.");
  const body = news.map((n, i) => {
    const srcs = n.src.map((k) => items[k]);
    const hosts = [...new Set(srcs.map((x) => x.host))];
    const date = String(srcs[0].published_date || "").slice(0, 10);
    const official = hosts.some((h) => inList(h, OFFICIAL));
    const status = official ? "مصدر رسمي" : n.unsure || hosts.length < 2 ? "مصدر واحد، غير مؤكد" : `مؤكد من ${hosts.length} مصادر`;
    return `<b>${i + 1}. ${esc(clean(n.t))}</b>\n${esc(clean(n.s))}\nالأهمية: ${esc(clean(n.w))}\nالمصدر: ${esc(hosts.join("، "))}${date ? " | " + date : ""}\nالحالة: ${status}`;
  }).join("\n\n");
  return card(title, body);
}

function newsKb(news, items) {
  const btns = news.map((n, i) => ({ text: `${i + 1}. ${items[n.src[0]].host}`, url: items[n.src[0]].url }));
  const rows = [];
  for (let i = 0; i < btns.length; i += 2) rows.push(btns.slice(i, i + 2));
  return rows;
}

async function buildNews(env, title, major = false) {
  let items = await gatherNews(env, NEWS_QUERIES, 1);
  if (items.length < 4) items = rank([...items, ...(await gatherNews(env, NEWS_QUERIES.slice(0, 2), 3))]);
  if (!items.length) throw new Error("ما قدرت أجيب أخبار الحين");
  const news = await summarize(env, items, major);
  return { html: renderNews(title, news, items), kb: newsKb(news, items), count: news.length };
}

async function buildArena(env) {
  const items = rank([
    ...(await safeTav(env, { query: "LMArena arena.ai leaderboard new model ranking", topic: "news", days: 7, max_results: 6 })),
    ...(await safeTav(env, { query: "arena.ai leaderboard update new models", topic: "general", time_range: "week", max_results: 6, include_domains: ["lmarena.ai", "arena.ai", "news.lmarena.ai"] })),
    ...(await safeTav(env, { query: "Arena AI model leaderboard top ranked model this week", topic: "news", days: 7, max_results: 5 })),
  ]);
  if (!items.length) throw new Error("ما لقيت أخبار Arena حالياً");
  const news = await summarize(env, items, false);
  return { html: renderNews("أخبار Arena", news, items), kb: newsKb(news, items) };
}

// ---------- المراقبة ----------
async function checkWatch(env) {
  const w = await kget(env, "watch", { words: [], seen: [] });
  if (!w.words.length) return null;
  const parts = [];
  for (const kw of w.words) {
    const rs = rank(await safeTav(env, { query: `${kw} latest news announcement`, topic: "news", days: 1, max_results: 5 }));
    const fresh = rs.filter((x) => !w.seen.includes(x.url));
    if (!fresh.length) continue;
    fresh.forEach((x) => w.seen.push(x.url));
    try {
      const news = await summarize(env, fresh, true);
      if (news.length) parts.push({ html: renderNews(`مراقبة: ${esc(kw)}`, news, fresh), kb: newsKb(news, fresh) });
    } catch (e) { console.log("WATCH", kw, e.message); }
  }
  w.seen = w.seen.slice(-300);
  await kput(env, "watch", w);
  return parts;
}

// =====================================================================
//  كلمة اليوم والأفكار
// =====================================================================
async function sendWord(env, chat, force = false) {
  const hist = await kget(env, "hist", { words: [], today: null });
  if (!force && hist.today && hist.today.date === dateStr()) return sendHtml(env, chat, hist.today.html);
  const used = hist.words.slice(-80).map((x) => x.w || x).join(", ");
  const j = await llmJSON(env, [
    { role: "system", content: SYS + " أرجع JSON فقط بدون أي نص قبله أو بعده." },
    { role: "user", content: `اختر كلمة إنجليزية مفيدة للمستوى المتوسط من مجال التقنية أو الألعاب أو الحياة اليومية، وغير موجودة في هذي القائمة: [${used}].\nأرجع JSON بهذا الشكل بالضبط:\n{"word":"","pron":"النطق بحروف عربية","type":"noun أو verb أو adj","ar":"المعنى بالعربية","ex":"جملة إنجليزية قصيرة","ex_ar":"ترجمة الجملة","syn":"مرادف إنجليزي"}` },
  ], { temp: 1 });
  const html = card("كلمة اليوم",
    `<b>${esc(j.word)}</b>  <i>${esc(j.type || "")}</i>\nالنطق: ${esc(j.pron || "")}\n\nالمعنى: ${esc(j.ar)}\n\nمثال: ${esc(j.ex)}\n${esc(j.ex_ar)}\n\nمرادف: ${esc(j.syn || "-")}`);
  hist.words.push({ w: j.word, ar: j.ar });
  hist.words = hist.words.slice(-300);
  hist.today = { date: dateStr(), html };
  await kput(env, "hist", hist);
  return sendHtml(env, chat, html);
}

async function genIdea(env, kind = "any") {
  const j = await llmJSON(env, [
    { role: "system", content: SYS + " أرجع JSON فقط بدون أي نص قبله أو بعده." },
    { role: "user", content: `ولّد ${IDEA_KINDS[kind] || IDEA_KINDS.any}. كن احترافياً ومحدداً وقابلاً للتنفيذ من شخص واحد بمساعدة الذكاء الاصطناعي، وتجنّب الأفكار المكررة. أرجع JSON بهذا الشكل:\n{"title":"اسم الفكرة","pitch":"وصف بجملتين","hook":"الميزة الفريدة","features":["ميزة","ميزة","ميزة"],"audience":"الجمهور المستهدف","difficulty":3,"steps":["خطوة","خطوة","خطوة"],"money":"طريقة الربح"}` },
  ], { temp: 1 });
  const d = Math.max(1, Math.min(5, Number(j.difficulty) || 3));
  const html = card(esc(clean(j.title)),
    `${esc(clean(j.pitch))}\n\n<b>الميزة الفريدة:</b> ${esc(clean(j.hook))}\n\n<b>المميزات:</b>\n${(j.features || []).map((f) => "- " + esc(clean(f))).join("\n")}\n\n<b>الجمهور:</b> ${esc(clean(j.audience))}\n<b>الصعوبة:</b> ${d} من 5\n\n<b>البداية:</b>\n${(j.steps || []).map((s, i) => `${i + 1}) ${esc(clean(s))}`).join("\n")}\n\n<b>الربح:</b> ${esc(clean(j.money))}`);
  return {
    html,
    kb: [[btn("فكرة ثانية", "idea:" + kind), btn("حفظ", "idea:save")], [btn("تحويلها إلى برومت", "idea:prompt")]],
    raw: j,
  };
}

async function sendIdea(env, chat, kind) {
  await typing(env, chat);
  const idea = await genIdea(env, kind);
  const b = await getBox(env);
  b.lastIdea = idea.raw;
  await saveBox(env, b);
  return sendHtml(env, chat, idea.html, idea.kb);
}

async function genPromptFromIdea(env, idea) {
  return llm(env, [
    { role: "system", content: "You write detailed build prompts for AI coding assistants. Write in Arabic with English technical terms. Output the prompt only, no preface, no markdown, no emojis." },
    { role: "user", content: `حوّل هذي الفكرة إلى برومت شامل ومفصل جاهز يُلصق في أداة ذكاء اصطناعي لبناء المشروع كاملاً (ملف واحد يعمل مباشرة، أو APK إن كان تطبيق). يشمل: ملخص المشروع، الشاشات والواجهة، آلية العمل بالتفصيل، التصميم والألوان، التحكم باللمس للجوال، الأداء، حالات الخطأ، معايير الجودة، وطريقة تسليم الكود.\n\nالفكرة:\n${JSON.stringify(idea)}` },
  ], { max: 4000, temp: 0.6 });
}

// =====================================================================
//  أدوات البرومتات: التقسيم والتحسين والمكتبة
// =====================================================================
const MAX_PROMPT = 28000;

async function splitPrompt(env, text, n) {
  const want = n ? `إلى ${n} مراحل بالضبط` : "إلى عدد مناسب من المراحل (من 3 إلى 8 حسب الحجم)";
  const j = await llmJSON(env, [
    { role: "system", content: "You are an expert prompt engineer. Output JSON only. No emojis." },
    { role: "user", content: `قسّم هذا البرومت ${want} لتنفيذها بالتتابع بواسطة وكيل برمجة ذكاء اصطناعي له حد على عدد استدعاءات الأدوات في كل دورة. كل مرحلة صغيرة بما يكفي لتنتهي في دورة واحدة (ملف واحد أو ميزة واحدة)، ومرتبة بحيث تعتمد كل مرحلة على ما قبلها ويعمل المشروع بعد كل مرحلة. لا تحذف أي متطلب من الأصل ولا تضف متطلبات جديدة.\nأرجع JSON فقط بهذا الشكل:\n{"summary":"ملخص المشروع بسطر","global":"القيود العامة المشتركة (التقنية، الأسلوب، قواعد الجودة) باختصار","stages":[{"title":"عنوان المرحلة","tasks":"ما يُبنى في هذه المرحلة بالتفصيل مع المتطلبات الخاصة بها من الأصل","done":"معيار اكتمال المرحلة"}]}\n\nالبرومت الأصلي:\n${text}` },
  ], { max: 9000, temp: 0.3 });
  if (!Array.isArray(j.stages) || !j.stages.length) throw new Error("ما قدرت أقسم البرومت، جرّب مرة ثانية");
  const total = j.stages.length;
  return j.stages.map((s, i) => {
    const lead = i === 0 ? "ابدأ المشروع من الصفر." : "تابع على المشروع الحالي بدون إعادة بنائه من الصفر.";
    return `المرحلة ${i + 1} من ${total}: ${clean(s.title)}\n\n${lead}\n\nالمشروع: ${clean(j.summary)}\nالقيود العامة: ${clean(j.global)}\n\nالمطلوب في هذه المرحلة:\n${clean(s.tasks)}\n\nمعيار الاكتمال: ${clean(s.done)}\n\nنفّذ هذه المرحلة فقط وتأكد أنها تعمل، ولا تبدأ المرحلة التالية. عند الانتهاء قل: اكتملت المرحلة ${i + 1}.`;
  });
}

async function improvePrompt(env, text) {
  const out = await llm(env, [
    { role: "system", content: "You are an expert prompt engineer. No emojis." },
    { role: "user", content: `حسّن هذا البرومت: وضّح الهدف، رتّب الأقسام، وأضف المتطلبات الناقصة اللازمة للجودة (طريقة التسليم، العمل على الجوال، الأداء، حالات الخطأ، معايير القبول) بدون تغيير فكرة المشروع ولا حذف أي متطلب موجود. حافظ على لغته الأصلية، واكتبه بدون رموز markdown.\nالصيغة المطلوبة بالضبط:\n===PROMPT===\n(البرومت المحسّن كاملاً)\n===CHANGES===\n(من 3 إلى 6 نقاط قصيرة بما عدّلته)\n\nالبرومت الأصلي:\n${text}` },
  ], { max: 9000, temp: 0.4 });
  const m = out.match(/===PROMPT===([\s\S]*?)===CHANGES===([\s\S]*)/);
  if (!m) return { prompt: clean(out), changes: "" };
  return { prompt: m[1].trim(), changes: clean(m[2]) };
}

// ---------- المكتبة ----------
const getLib = (env) => kget(env, "lib", { n: 0, items: {} });
const norm = (s) => s.trim().toLowerCase();

async function libSave(env, name, tags, text) {
  const lib = await getLib(env);
  let id = Object.keys(lib.items).find((k) => norm(lib.items[k].name) === norm(name));
  const d = dateStr();
  if (!id) { id = String(++lib.n); lib.items[id] = { name, tags, updated: d, vc: 0 }; }
  const store = await kget(env, "p:" + id, { versions: [] });
  store.versions.unshift({ t: text, d });
  store.versions = store.versions.slice(0, 5);
  lib.items[id].vc = store.versions.length;
  lib.items[id].updated = d;
  if (tags.length) lib.items[id].tags = tags;
  await kput(env, "p:" + id, store);
  await kput(env, "lib", lib);
  return { id, versions: store.versions.length, isNew: store.versions.length === 1 };
}

function libListView(lib, tag) {
  const ids = Object.keys(lib.items).filter((k) => !tag || lib.items[k].tags.includes(tag));
  if (!ids.length) return { text: card("مكتبة البرومتات", tag ? "ما فيه برومتات بهذا الوسم." : "المكتبة فاضية.\nلحفظ برومت: /save الاسم"), kb: [] };
  const lines = ids.map((k) => { const it = lib.items[k]; return `- ${esc(it.name)} ${it.tags.map((t) => esc(t)).join(" ")}  (${it.updated})`; });
  const btns = ids.map((k) => btn(lib.items[k].name.slice(0, 28), "lp:g:" + k));
  const kb = [];
  for (let i = 0; i < btns.length; i += 2) kb.push(btns.slice(i, i + 2));
  return { text: card("مكتبة البرومتات", lines.join("\n") + "\n\nاضغط الاسم لفتحه."), kb };
}

async function libSend(env, chat, id, k = 0) {
  const lib = await getLib(env);
  const it = lib.items[id];
  const store = await kget(env, "p:" + id, { versions: [] });
  const v = store.versions[k];
  if (!it || !v) return sendHtml(env, chat, "ما لقيت هذا البرومت.");
  await sendPre(env, chat, v.t, `${esc(it.name)}${k ? ` (نسخة ${k + 1})` : ""}`);
  return sendHtml(env, chat, `${esc(it.name)}  |  ${v.d}  |  ${store.versions.length} نسخ`, [
    [btn("تقسيم", `lp:s:${id}:${k}`), btn("تحسين", `lp:i:${id}:${k}`)],
    [btn("النسخ السابقة", "lp:v:" + id), btn("حذف", "lp:d:" + id)],
  ]);
}

// ---------- جلسات استقبال النصوص الطويلة ----------
const COL_TTL = 900;
async function colStart(env, chat, tool, extra = {}) {
  await kput(env, "col", { tool, parts: [], ts: Date.now(), ...extra }, { expirationTtl: COL_TTL });
  const msgs = {
    split: "أرسل البرومت (على عدة رسائل أو كملف نصي txt). وعند الانتهاء اكتب /done",
    improve: "أرسل البرومت (على عدة رسائل أو كملف نصي txt). وعند الانتهاء اكتب /done",
    save: `أرسل البرومت الذي تريد حفظه باسم "${esc(extra.name || "")}" (على عدة رسائل أو ملف txt). وعند الانتهاء اكتب /done`,
  };
  return sendHtml(env, chat, msgs[tool] + "\nللإلغاء: /cancel");
}

async function fetchDocText(env, doc) {
  if ((doc.file_size || 0) > 1_000_000) throw new Error("الملف كبير، الحد 1 ميغابايت");
  const f = await (await tg(env, "getFile", { file_id: doc.file_id })).json();
  const r = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
  return (await r.text()).trim();
}

async function colFinish(env, chat) {
  const col = await kget(env, "col", null);
  if (!col || Date.now() - col.ts > COL_TTL * 1000) return sendHtml(env, chat, "ما فيه جلسة مفتوحة.");
  await env.KV.delete("col");
  const text = col.parts.join("\n\n").trim();
  if (!text) return sendHtml(env, chat, "ما استلمت أي نص.");
  return runPromptTool(env, chat, col.tool, text, col);
}

async function runPromptTool(env, chat, tool, text, col = {}) {
  if (text.length > MAX_PROMPT) text = text.slice(0, MAX_PROMPT);
  await typing(env, chat);
  if (tool === "split") {
    const stages = await splitPrompt(env, text, col.n);
    await sendHtml(env, chat, `قسّمت البرومت إلى ${stages.length} مراحل. انسخ كل مرحلة وأرسلها للوكيل بالترتيب، وانتظر اكتمالها قبل التالية.`);
    for (let i = 0; i < stages.length; i++) await sendPre(env, chat, stages[i], `المرحلة ${i + 1} من ${stages.length}`);
    return;
  }
  if (tool === "improve") {
    const r = await improvePrompt(env, text);
    await sendPre(env, chat, r.prompt, "البرومت المحسّن");
    if (r.changes) await sendHtml(env, chat, card("ما الذي تغيّر", esc(r.changes)));
    return;
  }
  if (tool === "save") {
    const r = await libSave(env, col.name, col.tags || [], text);
    return sendHtml(env, chat, r.isNew ? `انحفظ في المكتبة: ${esc(col.name)}` : `تم تحديث "${esc(col.name)}" (${r.versions} نسخ محفوظة)`);
  }
}

// =====================================================================
//  الخلفية والتشفير والزخرفة
// =====================================================================
async function makeWall(env, chat, desc, caption = "") {
  let p = desc;
  if (/[\u0600-\u06FF]/.test(p)) {
    try {
      p = await llm(env, [
        { role: "system", content: "Translate to English as a short image prompt. Output only the translation." },
        { role: "user", content: p },
      ], { temp: 0.2, max: 600 });
    } catch (e) { console.log("translate", e.message); }
  }
  const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
    prompt: "vertical phone wallpaper, 9:16, ultra detailed, " + p,
    steps: 6,
  });
  const bytes = Uint8Array.from(atob(r.image), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("chat_id", String(chat));
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([bytes], { type: "image/jpeg" }), "wallpaper.jpg");
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
}

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
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(pass, salt), te.encode(text)));
  return toB64(new Uint8Array([...salt, ...iv, ...ct]));
}
async function decryptText(pass, data) {
  const all = fromB64(data);
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(16, 28) }, await deriveKey(pass, all.slice(0, 16)), all.slice(28));
  return td.decode(out);
}
async function sha256(t) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(t)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const conv = (t, [u, l]) =>
  [...t].map((c) =>
    /[A-Z]/.test(c) ? String.fromCodePoint(u + c.charCodeAt(0) - 65)
    : /[a-z]/.test(c) ? String.fromCodePoint(l + c.charCodeAt(0) - 97)
    : c).join("");
const NON_JOIN = "اأإآدذرزوؤةى";
const isAr = (c) => /[\u0621-\u064A]/.test(c || "");
const tatweel = (t) => [...t].map((c, i, a) => (isAr(c) && isAr(a[i + 1]) && !NON_JOIN.includes(c) ? c + "ـ" : c)).join("");
function decorate(t) {
  const out = [];
  const hasAr = /[\u0600-\u06FF]/.test(t);
  const hasEn = /[A-Za-z]/.test(t);
  const base = hasAr ? tatweel(t) : t;
  if (hasAr) out.push(base, [...t].join(" "));
  if (hasEn) Object.values(UNI).forEach((s) => out.push(conv(t, s)));
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

// =====================================================================
//  القوائم
// =====================================================================
const BACK = [btn("القائمة الرئيسية", "m:main")];
const MAIN_KB = [
  [btn("الأخبار", "act:news"), btn("أخبار Arena", "act:arena")],
  [btn("المراقبة", "m:watch"), btn("البرومتات", "m:prompts")],
  [btn("الأفكار", "m:ideas"), btn("الأدوات", "m:tools")],
  [btn("التذكيرات", "m:rem"), btn("الإعدادات", "m:set")],
];

const MENUS = {
  main: () => ({ text: card("القائمة الرئيسية", "اختر ما تريد، أو اكتب سؤالك مباشرة."), kb: MAIN_KB }),
  prompts: () => ({
    text: card("البرومتات", "تقسيم برومت طويل إلى مراحل، تحسينه، أو حفظه في مكتبتك."),
    kb: [
      [btn("تقسيم برومت", "go:split"), btn("تحسين برومت", "go:improve")],
      [btn("حفظ برومت", "go:savename"), btn("مكتبتي", "act:lib")],
      BACK,
    ],
  }),
  ideas: () => ({
    text: card("الأفكار", "ولّد فكرة، أو افتح صندوق أفكارك."),
    kb: [
      [btn("لعبة", "idea:game"), btn("تطبيق", "idea:app")],
      [btn("مشروع ربح", "idea:money"), btn("تيك توك", "idea:tiktok")],
      [btn("أي فكرة", "idea:any"), btn("صندوق أفكاري", "act:box")],
      BACK,
    ],
  }),
  tools: () => ({
    text: card("الأدوات", "اضغط الأداة ثم اكتب النص."),
    kb: [
      [btn("خلفية", "go:wall"), btn("QR", "go:qr")],
      [btn("QR واي فاي", "go:wifi"), btn("زخرفة", "go:zk")],
      [btn("حروف كبيرة", "go:ascii"), btn("رسمة ASCII", "go:art")],
      [btn("تشفير", "go:enc"), btn("فك تشفير", "go:dec")],
      [btn("Hash", "go:hash"), btn("Base64", "go:b64")],
      [btn("فك Base64", "go:unb64"), btn("كلمة اليوم", "act:word")],
      [btn("اسأل البوت", "go:ask")],
      BACK,
    ],
  }),
  rem: () => ({
    text: card("التذكيرات", "أضف تذكيراً أو اعرض قائمتك."),
    kb: [
      [btn("تذكير جديد", "go:remind"), btn("تذكير يومي", "go:daily")],
      [btn("قائمتي", "act:list")],
      BACK,
    ],
  }),
};

async function watchView(env) {
  const w = await kget(env, "watch", { words: [], seen: [] });
  const text = card("المراقبة",
    w.words.length
      ? `الكلمات الحالية:\n${w.words.map((x, i) => `${i + 1}) ${esc(x)}`).join("\n")}\n\nيفحصها البوت صباحاً ومساءً، وينبهك فقط إذا نزل خبر كبير عنها.`
      : "ما عندك كلمات مراقبة.\nأضف اسماً مثل Grok أو Godot، وينبهك البوت عند أي خبر كبير عنه.");
  const kb = w.words.map((x, i) => [btn("حذف: " + x.slice(0, 24), "wd:" + i)]);
  kb.push([btn("إضافة كلمة", "go:watchadd"), btn("افحص الآن", "act:watchnow")]);
  kb.push(BACK);
  return { text, kb };
}

function settingsView(cfg) {
  const q = cfg.quiet;
  const today = dateStr();
  return {
    text: card("الإعدادات",
      `وضع الهدوء: ${q.on ? `شغّال من ${q.from} إلى ${q.to}` : "مطفي"}\nالرسائل التلقائية اليوم: ${cfg.pausedDate === today ? "متوقفة" : "شغّالة"}`),
    kb: [
      [btn(q.on ? "إيقاف وضع الهدوء" : "تشغيل وضع الهدوء", "set:quiet")],
      [btn(cfg.pausedDate === today ? "استئناف رسائل اليوم" : "إيقاف رسائل اليوم", "set:pause")],
      [btn("مواعيد الرسائل", "act:sched")],
      BACK,
    ],
  };
}

function scheduleView(cfg) {
  const lines = Object.entries(SLOT_DEFS).map(([k, v]) => `${cfg.slots[k].on ? "شغّال" : "مطفي"}  |  ${v.name}: ${cfg.slots[k].t}  (<code>${k}</code>)`);
  const kb = Object.keys(SLOT_DEFS).map((k) => [btn(`${cfg.slots[k].on ? "إيقاف" : "تشغيل"}: ${SLOT_DEFS[k].short}`, "slot:" + k)]);
  kb.push([btn("رجوع", "m:set")]);
  return { text: card("مواعيد الرسائل", lines.join("\n") + "\n\nلتغيير الوقت:\n<code>/time morning 07:30</code>"), kb };
}

function boxText(b) {
  const list = b.ideas.map((i, n) => `${n + 1}) ${esc(i.t)}  (${i.d})`).slice(-20);
  return list.length ? list.join("\n") : null;
}

// =====================================================================
//  الأدوات النصية
// =====================================================================
const ASKS = {
  wall: "اكتب وصف الخلفية.\nمثال: سيارة رياضية بليل ممطر",
  qr: "اكتب النص أو الرابط.",
  wifi: "اكتب اسم الشبكة ثم كلمة السر.\nمثال: Home 12345678",
  zk: "اكتب الاسم أو الجملة.",
  ascii: "اكتب كلمة بالإنجليزي.\nمثال: KING",
  art: "اكتب ما تريد رسمه.\nمثال: قطة",
  ask: "اكتب سؤالك.",
  box: "اكتب فكرتك وسأحفظها.",
  remind: "اكتب المدة والنص.\nمثال: 30m اشرب ماء\n(m دقائق، h ساعات، d أيام)",
  daily: "اكتب الوقت والنص.\nمثال: 08:00 صباح الخير",
  enc: "اكتب كلمة السر ثم النص.\nمثال: 1234 مرحبا",
  dec: "اكتب كلمة السر ثم النص المشفر.",
  hash: "اكتب النص.",
  b64: "اكتب النص.",
  unb64: "اكتب نص Base64.",
  watchadd: "اكتب الكلمة أو الاسم الذي تريد مراقبته.\nمثال: Grok",
  savename: "اكتب اسم البرومت، ويمكن إضافة وسوم بعده.\nمثال: لعبة الحياة #godot #لعبة",
};

function parseNameTags(s) {
  const tags = (s.match(/#[^\s#]+/g) || []).map((t) => t.toLowerCase());
  const name = s.replace(/#[^\s#]+/g, "").trim();
  return { name, tags };
}

async function runTool(env, cfg, chat, tool, args, msg) {
  const say = (html, kb) => sendHtml(env, chat, html, kb);
  const need = () => say(esc(ASKS[tool] || "اكتب النص."));
  switch (tool) {
    case "qr":
    case "wifi": {
      if (!args) return need();
      let content = args;
      if (tool === "wifi") {
        const [ssid, ...p] = args.split(/\s+/);
        content = `WIFI:T:WPA;S:${ssid};P:${p.join(" ")};;`;
      }
      const [fg, bg] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&margin=25&color=${fg}&bgcolor=${bg}&data=${encodeURIComponent(content)}`;
      await tg(env, "sendPhoto", { chat_id: chat, photo: url });
      return;
    }
    case "remind": {
      const m = args.match(/^(\d+)\s*(m|h|d)?\s+([\s\S]+)$/i);
      if (!m) return need();
      const u = (m[2] || "m").toLowerCase();
      const unit = { m: 60e3, h: 3600e3, d: 86400e3 }[u];
      const data = await kget(env, "data", { r: [], d: [] });
      data.r.push({ chat_id: chat, text: m[3], due: Date.now() + Number(m[1]) * unit });
      await kput(env, "data", data);
      return say(`تم، سأذكّرك بعد ${m[1]}${u}.`);
    }
    case "daily": {
      const m = args.match(/^(\d{1,2}):(\d{2})\s+([\s\S]+)$/);
      if (!m) return need();
      const time = m[1].padStart(2, "0") + ":" + m[2];
      const data = await kget(env, "data", { r: [], d: [] });
      data.d.push({ chat_id: chat, text: m[3], time });
      await kput(env, "data", data);
      return say(`تم، تذكير يومي الساعة ${time} (توقيت عُمان).`);
    }
    case "enc":
    case "dec": {
      const sp = args.indexOf(" ");
      if (sp < 0) return need();
      const pass = args.slice(0, sp), body = args.slice(sp + 1).trim();
      let res = null;
      try { res = tool === "enc" ? await encryptText(pass, body) : await decryptText(pass, body); } catch { res = null; }
      if (msg) await tg(env, "deleteMessage", { chat_id: chat, message_id: msg.message_id });
      return say(res ? `<code>${esc(res)}</code>` : "كلمة السر غلط أو النص تالف.");
    }
    case "b64":
      if (!args) return need();
      return say(`<code>${esc(toB64(te.encode(args)))}</code>`);
    case "unb64":
      if (!args) return need();
      try { return say(esc(td.decode(fromB64(args)))); } catch { return say("النص غير صالح."); }
    case "hash":
      if (!args) return need();
      return say(`<code>${await sha256(args)}</code>`);
    case "wall":
      if (!args) return need();
      await typing(env, chat);
      return makeWall(env, chat, args);
    case "zk":
      if (!args) return need();
      return say(decorate(args).map((s) => `<code>${esc(s)}</code>`).join("\n\n"));
    case "ascii": {
      if (!args) return need();
      const art = bigText(args);
      return say(art ? `<pre>${esc(art)}</pre>` : "اكتب حروفاً إنجليزية أو أرقاماً، مثال: KING");
    }
    case "art": {
      if (!args) return need();
      await typing(env, chat);
      const art = await llm(env, [
        { role: "system", content: "You draw ASCII art. Output ONLY the art, max 20 lines, max 40 columns, no explanation, no code fences." },
        { role: "user", content: args },
      ], { temp: 0.7 });
      return say(`<pre>${esc(art.replace(/```/g, ""))}</pre>`);
    }
    case "ask": {
      if (!args) return need();
      await typing(env, chat);
      const t = await llm(env, [
        { role: "system", content: SYS + " أجب مباشرة وبإيجاز (حتى 10 أسطر) إلا إذا طُلب التفصيل." },
        { role: "user", content: args },
      ], { max: 3000 });
      return say(esc(clean(t)));
    }
    case "box": {
      const b = await getBox(env);
      if (!args) {
        const t = boxText(b);
        return say(card("صندوق الأفكار", t ? t + "\n\nللإضافة: <code>/box فكرتك</code>\nللحذف: <code>/box del 3</code>" : "فاضي. أرسل <code>/box فكرتك</code> لحفظ فكرة."));
      }
      const del = args.match(/^del\s+(\d+)$/i);
      if (del) {
        const i = Number(del[1]) - 1;
        if (!b.ideas[i]) return say("ما لقيت هذي الفكرة.");
        b.ideas.splice(i, 1);
        await saveBox(env, b);
        return say("انحذفت.");
      }
      b.ideas.push({ t: args.slice(0, 500), d: dateStr() });
      await saveBox(env, b);
      return say(`انحفظت في الصندوق (${b.ideas.length}).`);
    }
    case "watchadd": {
      if (!args) return need();
      const w = await kget(env, "watch", { words: [], seen: [] });
      const kw = args.trim().slice(0, 40);
      if (w.words.some((x) => norm(x) === norm(kw))) return say("هذه الكلمة موجودة.");
      if (w.words.length >= 6) return say("الحد الأقصى 6 كلمات. احذف واحدة أولاً.");
      w.words.push(kw);
      await kput(env, "watch", w);
      return say(`أضفت "${esc(kw)}" للمراقبة.`);
    }
    case "savename": {
      const { name, tags } = parseNameTags(args);
      if (!name) return need();
      return colStart(env, chat, "save", { name, tags });
    }
  }
}

// =====================================================================
//  التذكيرات والمواعيد التلقائية
// =====================================================================
async function tickReminders(env) {
  const data = await kget(env, "data", { r: [], d: [] });
  const now = Date.now();
  const hm = hmStr();
  const keep = [];
  let changed = false;
  for (const r of data.r) {
    if (r.due <= now) {
      await tg(env, "sendMessage", { chat_id: r.chat_id, text: "تذكير:\n" + r.text });
      changed = true;
    } else keep.push(r);
  }
  for (const d of data.d) {
    if (d.time === hm) await tg(env, "sendMessage", { chat_id: d.chat_id, text: "تذكير يومي:\n" + d.text });
  }
  if (changed) { data.r = keep; await kput(env, "data", data); }
}

async function safe(label, fn) {
  try { await fn(); } catch (e) { console.log("ERR", label, e.message); }
}

async function runSlot(env, k) {
  const chat = env.OWNER_ID;
  const send = (html, kb) => sendHtml(env, chat, html, kb);
  const day = dateAr();

  if (k === "morning") {
    await safe("word", () => sendWord(env, chat));
    await safe("news", async () => { const n = await buildNews(env, `أخبار الذكاء الاصطناعي | ${day} صباحاً`); await send(n.html, n.kb); });
    await safe("watch", async () => { for (const p of (await checkWatch(env)) || []) await send(p.html, p.kb); });
  }
  if (k === "evening") {
    await safe("news", async () => { const n = await buildNews(env, `أخبار الذكاء الاصطناعي | ${day} مساءً`); await send(n.html, n.kb); });
    await safe("watch", async () => { for (const p of (await checkWatch(env)) || []) await send(p.html, p.kb); });
  }
  if (k === "arena") {
    await safe("arena", async () => { const a = await buildArena(env); await send(a.html, a.kb); });
  }
}

async function tickSlots(env) {
  const cfg = await getCfg(env);
  const n = nowOman();
  const d = dateStr(n), hm = hmStr(n);
  let sent = await kget(env, "sent", {});
  let fresh = false;
  if (sent.date !== d) { sent = { date: d, slots: {} }; fresh = true; }
  if (cfg.pausedDate === d) { if (fresh) await kput(env, "sent", sent); return; }

  const nowM = toMin(hm);
  const due = [];
  for (const [k, s] of Object.entries(cfg.slots)) {
    if (!s.on || sent.slots[k]) continue;
    if (k === "arena" && n.getUTCDay() !== 5) continue;
    const diff = nowM - toMin(s.t);
    if (diff >= 0 && diff <= 20) due.push(k);
  }
  if (!due.length) { if (fresh) await kput(env, "sent", sent); return; }
  for (const k of due) sent.slots[k] = 1;
  await kput(env, "sent", sent);
  if (isQuiet(cfg, hm)) return;
  for (const k of due) await runSlot(env, k);
}

// =====================================================================
//  الأوامر والأزرار
// =====================================================================
const COMMANDS = [
  ["menu", "القائمة الرئيسية"], ["news", "أخبار الذكاء الاصطناعي"], ["arena", "أخبار Arena"],
  ["watch", "قائمة المراقبة"], ["split", "تقسيم برومت إلى مراحل"], ["improve", "تحسين برومت"],
  ["save", "حفظ برومت في المكتبة"], ["lib", "مكتبة البرومتات"], ["idea", "ولّد فكرة"],
  ["ask", "اسأل البوت"], ["word", "كلمة اليوم"], ["wall", "خلفية بالذكاء الاصطناعي"],
  ["qr", "إنشاء QR"], ["zk", "زخرفة النصوص"], ["remind", "تذكير جديد"],
  ["list", "قائمة التذكيرات"], ["box", "صندوق الأفكار"], ["schedule", "مواعيد الرسائل"],
  ["settings", "الإعدادات"], ["quiet", "وضع الهدوء"], ["pause", "إيقاف رسائل اليوم"],
];

const HELP_TEXT = card("المساعدة",
  `اضغط /menu لكل شي بالأزرار، أو اكتب سؤالك مباشرة.\n\n<b>البرومتات</b>\n/split ثم أرسل البرومت ثم /done\n/improve ثم أرسل البرومت ثم /done\n/save الاسم #وسم ثم أرسل البرومت ثم /done\n/lib  وفتح برومت بالاسم: /get الاسم\nيمكن الرد على أي رسالة بـ /save الاسم لحفظها مباشرة\n\n<b>الأخبار</b>\n/news  /arena  /watch\n/watch add كلمة  |  /watch del 2\n\n<b>أخرى</b>\n/idea game|app|money|tiktok|any\n/word  /words  /box فكرة  /ask سؤال\n/wall وصف  /qr نص  /zk اسم  /ascii /art\n/remind 30m نص  /daily 08:00 نص  /list\n/enc كلمة_السر نص  /dec  /b64  /unb64  /hash\n\n<b>الرسائل التلقائية</b>\n/schedule  /time morning 07:30\n/quiet 23:00 06:00  /pause  /resume`);

async function handleCommand(env, cfg, chat, cmd, args, msg) {
  const say = (html, kb) => sendHtml(env, chat, html, kb);
  switch (cmd) {
    case "start": {
      await tg(env, "setMyCommands", { commands: COMMANDS.map(([command, description]) => ({ command, description })) });
      const m = MENUS.main();
      return say("أهلاً. البوت جاهز.\n\n" + m.text, m.kb);
    }
    case "menu": { const m = MENUS.main(); return say(m.text, m.kb); }
    case "help": return say(HELP_TEXT);
    case "done": return colFinish(env, chat);
    case "cancel": await env.KV.delete("col"); await env.KV.delete("pend"); return say("تم الإلغاء.");
    case "word": await typing(env, chat); return sendWord(env, chat);
    case "words": {
      const h = await kget(env, "hist", { words: [] });
      const list = h.words.slice(-25).map((x) => (x.w ? `${esc(x.w)} : ${esc(x.ar || "")}` : esc(x)));
      return say(card("كلماتك السابقة", list.length ? list.join("\n") : "ما فيه كلمات بعد."));
    }
    case "idea": {
      const kind = IDEA_KINDS[args] ? args : "any";
      return sendIdea(env, chat, kind);
    }
    case "news": {
      await typing(env, chat);
      const n = await buildNews(env, `أخبار الذكاء الاصطناعي | ${dateAr()}`);
      return say(n.html, n.kb);
    }
    case "arena": {
      await typing(env, chat);
      const a = await buildArena(env);
      return say(a.html, a.kb);
    }
    case "watch": {
      const m = args.match(/^(add|del)\s+([\s\S]+)$/i);
      if (m && m[1].toLowerCase() === "add") return runTool(env, cfg, chat, "watchadd", m[2], msg);
      if (m) {
        const w = await kget(env, "watch", { words: [], seen: [] });
        const i = Number(m[2]) - 1;
        if (!w.words[i]) return say("ما لقيت هذي الكلمة.");
        w.words.splice(i, 1);
        await kput(env, "watch", w);
        return say("انحذفت من المراقبة.");
      }
      const v = await watchView(env);
      return say(v.text, v.kb);
    }
    case "split": {
      const m = args.match(/^(\d+)?\s*([\s\S]*)$/);
      const n = m[1] ? Math.min(10, Math.max(2, Number(m[1]))) : undefined;
      if (m[2].trim()) return runPromptTool(env, chat, "split", m[2].trim(), { n });
      if (msg?.reply_to_message?.text) return runPromptTool(env, chat, "split", msg.reply_to_message.text, { n });
      return colStart(env, chat, "split", { n });
    }
    case "improve": {
      if (args) return runPromptTool(env, chat, "improve", args);
      if (msg?.reply_to_message?.text) return runPromptTool(env, chat, "improve", msg.reply_to_message.text);
      return colStart(env, chat, "improve");
    }
    case "save": {
      const { name, tags } = parseNameTags(args);
      if (!name) return runTool(env, cfg, chat, "savename", "", msg);
      if (msg?.reply_to_message?.text) return runPromptTool(env, chat, "save", msg.reply_to_message.text, { name, tags });
      return colStart(env, chat, "save", { name, tags });
    }
    case "lib": {
      const lib = await getLib(env);
      const v = libListView(lib, args.startsWith("#") ? args.toLowerCase() : "");
      return say(v.text, v.kb);
    }
    case "get": {
      const lib = await getLib(env);
      const id = Object.keys(lib.items).find((k) => norm(lib.items[k].name) === norm(args));
      if (!id) return say("ما لقيت برومت بهذا الاسم. اعرض المكتبة بـ /lib");
      return libSend(env, chat, id);
    }
    case "settings": { const v = settingsView(cfg); return say(v.text, v.kb); }
    case "schedule": { const v = scheduleView(cfg); return say(v.text, v.kb); }
    case "list": {
      const data = await kget(env, "data", { r: [], d: [] });
      const now = Date.now();
      let out = "";
      data.r.forEach((r, i) => (out += `r${i + 1}) بعد ${Math.max(1, Math.round((r.due - now) / 60000))} دقيقة: ${esc(r.text)}\n`));
      data.d.forEach((d, i) => (out += `d${i + 1}) يومياً ${d.time}: ${esc(d.text)}\n`));
      return say(card("تذكيراتك", out ? out + "\nللحذف: <code>/del r1</code>" : "ما عندك تذكيرات."));
    }
    case "del": {
      const m = args.match(/^([rd])(\d+)$/i);
      if (!m) return say("مثال: <code>/del r1</code>");
      const data = await kget(env, "data", { r: [], d: [] });
      const arr = data[m[1].toLowerCase()];
      const i = Number(m[2]) - 1;
      if (!arr[i]) return say("ما لقيته.");
      arr.splice(i, 1);
      await kput(env, "data", data);
      return say("انحذف.");
    }
    case "time": {
      const [k, t] = args.split(/\s+/);
      if (!SLOT_DEFS[k]) return say("الموعد غلط. الأسماء: morning, evening, arena");
      if (!validHM(t)) return say("الوقت غلط. مثال: <code>/time morning 07:30</code>");
      cfg.slots[k].t = normHM(t);
      await saveCfg(env, cfg);
      return say(`تم. ${SLOT_DEFS[k].short} صار الساعة ${cfg.slots[k].t}.`);
    }
    case "quiet": {
      const a = args.trim().toLowerCase();
      if (a === "off") cfg.quiet.on = false;
      else if (a === "on" || !a) cfg.quiet.on = true;
      else {
        const [f, t] = a.split(/\s+/);
        if (!validHM(f) || !validHM(t)) return say("مثال: <code>/quiet 23:00 06:00</code>");
        cfg.quiet = { on: true, from: normHM(f), to: normHM(t) };
      }
      await saveCfg(env, cfg);
      return say(cfg.quiet.on ? `وضع الهدوء شغّال من ${cfg.quiet.from} إلى ${cfg.quiet.to}.` : "وضع الهدوء مطفي.");
    }
    case "pause": cfg.pausedDate = dateStr(); await saveCfg(env, cfg); return say("أوقفت الرسائل التلقائية لباقي اليوم. للاستئناف: /resume");
    case "resume": cfg.pausedDate = ""; await saveCfg(env, cfg); return say("رجعت الرسائل التلقائية.");
    default:
      if (ASKS[cmd]) return runTool(env, cfg, chat, cmd, args, msg);
      return say(HELP_TEXT);
  }
}

async function handleMessage(env, msg) {
  const chat = msg.chat.id;
  const cfg = await getCfg(env);

  // ملف نصي (لجلسة برومت)
  if (msg.document) {
    const col = await kget(env, "col", null);
    if (col && Date.now() - col.ts < COL_TTL * 1000) {
      const t = await fetchDocText(env, msg.document);
      col.parts.push(t);
      await kput(env, "col", col, { expirationTtl: COL_TTL });
      const total = col.parts.join("").length;
      return sendHtml(env, chat, `استلمت الملف. الإجمالي ${total} حرف. أرسل المزيد أو اكتب /done`);
    }
    return sendHtml(env, chat, "لاستقبال ملف، ابدأ أولاً بـ /split أو /improve أو /save.");
  }

  // قراءة QR من صورة
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const f = await (await tg(env, "getFile", { file_id: fileId })).json();
    const img = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
    const form = new FormData();
    form.append("file", await img.blob(), "qr.jpg");
    const r = await (await fetch("https://api.qrserver.com/v1/read-qr-code/", { method: "POST", body: form })).json();
    const val = r[0]?.symbol?.[0]?.data;
    return sendHtml(env, chat, val ? card("قيمة الـ QR", esc(val)) : "ما لقيت QR في الصورة.");
  }

  const text = (msg.text || "").trim();
  if (!text) return;

  if (text.startsWith("/")) {
    const first = text.split(/\s+/)[0];
    const cmd = first.slice(1).split("@")[0].toLowerCase();
    const args = text.slice(first.length).trim();
    return handleCommand(env, cfg, chat, cmd, args, msg);
  }

  // جلسة استقبال برومت
  const col = await kget(env, "col", null);
  if (col && Date.now() - col.ts < COL_TTL * 1000) {
    col.parts.push(text);
    await kput(env, "col", col, { expirationTtl: COL_TTL });
    const total = col.parts.join("").length;
    return sendHtml(env, chat, `تم (الجزء ${col.parts.length}، الإجمالي ${total} حرف). أرسل المزيد أو اكتب /done`);
  }

  // أداة معلّقة أو سؤال للبوت
  const pend = await kget(env, "pend", null);
  if (pend && Date.now() - pend.ts < 120000) {
    await env.KV.delete("pend");
    return runTool(env, cfg, chat, pend.tool, text, msg);
  }
  return runTool(env, cfg, chat, "ask", text, msg);
}

async function handleCallback(env, cq) {
  const chat = cq.message.chat.id;
  const mid = cq.message.message_id;
  const data = cq.data || "";
  const [a, b, c, e4] = data.split(":");
  const cfg = await getCfg(env);
  const answer = (text) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, ...(text ? { text } : {}) });
  const edit = (v) => tg(env, "editMessageText", { chat_id: chat, message_id: mid, text: v.text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: v.kb } });
  const say = (html, kb) => sendHtml(env, chat, html, kb);

  try {
    if (a === "m") {
      await answer();
      if (b === "set") return edit(settingsView(cfg));
      if (b === "watch") return edit(await watchView(env));
      return MENUS[b] && edit(MENUS[b]());
    }

    if (a === "go") {
      await answer();
      if (b === "split" || b === "improve") return colStart(env, chat, b);
      await kput(env, "pend", { tool: b, ts: Date.now() }, { expirationTtl: 120 });
      return say(esc(ASKS[b] || "اكتب النص."));
    }

    if (a === "set") {
      if (b === "quiet") cfg.quiet.on = !cfg.quiet.on;
      if (b === "pause") cfg.pausedDate = cfg.pausedDate === dateStr() ? "" : dateStr();
      await saveCfg(env, cfg);
      await answer();
      return edit(settingsView(cfg));
    }

    if (a === "slot") {
      cfg.slots[b].on = !cfg.slots[b].on;
      await saveCfg(env, cfg);
      await answer();
      return edit(scheduleView(cfg));
    }

    if (a === "wd") {
      const w = await kget(env, "watch", { words: [], seen: [] });
      w.words.splice(Number(b), 1);
      await kput(env, "watch", w);
      await answer("تم الحذف");
      return edit(await watchView(env));
    }

    if (a === "act") {
      await answer();
      if (b === "news") { await typing(env, chat); const n = await buildNews(env, `أخبار الذكاء الاصطناعي | ${dateAr()}`); return say(n.html, n.kb); }
      if (b === "arena") { await typing(env, chat); const r = await buildArena(env); return say(r.html, r.kb); }
      if (b === "watchnow") {
        await typing(env, chat);
        const parts = await checkWatch(env);
        if (parts === null) return say("ما عندك كلمات مراقبة.");
        if (!parts.length) return say("ما فيه أخبار كبيرة جديدة عن كلماتك.");
        for (const p of parts) await say(p.html, p.kb);
        return;
      }
      if (b === "word") { await typing(env, chat); return sendWord(env, chat); }
      if (b === "lib") { const v = libListView(await getLib(env), ""); return say(v.text, v.kb); }
      if (b === "box") return handleCommand(env, cfg, chat, "box", "", null);
      if (b === "list") return handleCommand(env, cfg, chat, "list", "", null);
      if (b === "sched") return edit(scheduleView(cfg));
    }

    if (a === "lp") {
      await answer();
      const lib = await getLib(env);
      const it = lib.items[c];
      if (!it) return say("ما لقيت هذا البرومت.");
      if (b === "g") return libSend(env, chat, c);
      if (b === "s" || b === "i") {
        const store = await kget(env, "p:" + c, { versions: [] });
        const v = store.versions[Number(e4) || 0];
        if (!v) return say("ما لقيت النسخة.");
        return runPromptTool(env, chat, b === "s" ? "split" : "improve", v.t);
      }
      if (b === "v") {
        const store = await kget(env, "p:" + c, { versions: [] });
        const lines = store.versions.map((v, k) => `${k + 1}) ${v.d}  (${v.t.length} حرف)`);
        const kb = store.versions.map((v, k) => [btn(`فتح النسخة ${k + 1}`, `lp:o:${c}:${k}`)]);
        return say(card(esc(it.name), lines.join("\n")), kb);
      }
      if (b === "o") return libSend(env, chat, c, Number(e4) || 0);
      if (b === "d") return say(`تأكيد حذف "${esc(it.name)}"؟`, [[btn("نعم، احذف", "lp:y:" + c), btn("إلغاء", "m:prompts")]]);
      if (b === "y") {
        delete lib.items[c];
        await env.KV.delete("p:" + c);
        await kput(env, "lib", lib);
        return say("انحذف من المكتبة.");
      }
    }

    if (a === "idea") {
      if (b === "save") {
        const bx = await getBox(env);
        if (!bx.lastIdea) return answer("ما فيه فكرة");
        bx.ideas.push({ t: `${bx.lastIdea.title} - ${bx.lastIdea.pitch}`.slice(0, 500), d: dateStr() });
        await saveBox(env, bx);
        return answer("انحفظت في صندوق أفكارك");
      }
      if (b === "prompt") {
        await answer("جاري كتابة البرومت");
        const bx = await getBox(env);
        if (!bx.lastIdea) return say("ولّد فكرة أولاً.");
        await typing(env, chat);
        const t = await genPromptFromIdea(env, bx.lastIdea);
        return sendPre(env, chat, clean(t), "البرومت");
      }
      await answer();
      return sendIdea(env, chat, b);
    }

    await answer();
  } catch (e) {
    console.log("CB", data, e.message);
    await say("صار خطأ: " + esc(e.message));
  }
}

// =====================================================================
//  نقطة الدخول
// =====================================================================
export default {
  async scheduled(event, env) {
    await safe("reminders", () => tickReminders(env));
    await safe("slots", () => tickSlots(env));
  },

  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Bot is running");
    let update;
    try { update = await request.json(); } catch { return new Response("ok"); }

    const from = update.message?.from?.id ?? update.callback_query?.from?.id;
    if (String(from) !== String(env.OWNER_ID)) return new Response("ok");

    try {
      if (update.callback_query) await handleCallback(env, update.callback_query);
      else if (update.message) await handleMessage(env, update.message);
    } catch (e) {
      console.log("ERROR", e && e.message);
      const chat = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
      if (chat) await sendHtml(env, chat, "صار خطأ: " + esc(e && e.message));
    }
    return new Response("ok");
  },
};
