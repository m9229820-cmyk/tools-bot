// =====================================================================
//  بوت K الشخصي — Cloudflare Worker
//  Secrets: BOT_TOKEN, OWNER_ID, GROQ_KEY, TAVILY_KEY
//  Bindings: KV (botkv), AI (Workers AI للصور فقط)
// =====================================================================

const OFFSET = 4 * 3600 * 1000; // توقيت عُمان UTC+4
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const PALETTES = [
  ["6C5CE7", "F1F0FF"], ["E84393", "FFF0F7"], ["00B894", "EFFFFA"],
  ["0984E3", "EEF6FF"], ["2D3436", "FFFFFF"], ["F39C12", "FFF8EA"],
];

const STYLE_INFO = {
  fun: { name: "😄 مرح", prompt: "أسلوبك مرح وخفيف دم مع مزاح بسيط" },
  hype: { name: "💪 تحفيزي", prompt: "أسلوبك تحفيزي وحماسي" },
  calm: { name: "🧘 هادئ", prompt: "أسلوبك هادئ ولطيف ومختصر" },
  serious: { name: "🎯 جدّي", prompt: "أسلوبك جدّي ومباشر واحترافي" },
};

const SLOT_DEFS = {
  late: { name: "🌙 الليل المتأخر", t: "01:00" },
  morning: { name: "🌅 الصباح", t: "06:00" },
  noon: { name: "☀️ الظهر", t: "12:30" },
  asr: { name: "🌤 العصر", t: "16:00" },
  evening: { name: "🌆 المساء", t: "18:30" },
  dinner: { name: "🍽 العشاء", t: "20:30" },
  night: { name: "📋 ختام اليوم", t: "22:30" },
  random: { name: "🎲 المفاجأة", t: "auto" },
};

const ITEMS = {
  word: { label: "📖 كلمة اليوم", xp: 10 },
  challenge: { label: "🎯 تحدي اليوم", xp: 20 },
  lesson: { label: "💻 درس البرمجة", xp: 15 },
  puzzle: { label: "🧩 اللغز", xp: 15 },
  sec: { label: "🛡 معلومة الأمن", xp: 5 },
};

const IDEA_KINDS = {
  game: "فكرة لعبة (جوال أو متصفح)",
  app: "فكرة تطبيق جوال مفيد",
  money: "مشروع رقمي (لعبة أو موقع أو تطبيق) سريع الانتشار وقابل للربح",
  tiktok: "فكرة محتوى تيك توك لاستوديو ألعاب فردي",
  any: "فكرة مشروع إبداعية",
};

const BADGES = [
  { id: "first", n: "🌱 البداية", t: (p) => total(p) >= 1 },
  { id: "s3", n: "🔥 3 أيام متواصلة", t: (p) => p.best >= 3 },
  { id: "s7", n: "🔥🔥 أسبوع كامل", t: (p) => p.best >= 7 },
  { id: "s30", n: "👑 شهر متواصل", t: (p) => p.best >= 30 },
  { id: "w10", n: "📚 10 كلمات", t: (p) => p.counts.word >= 10 },
  { id: "w50", n: "📚 50 كلمة", t: (p) => p.counts.word >= 50 },
  { id: "w100", n: "🎓 100 كلمة", t: (p) => p.counts.word >= 100 },
  { id: "c10", n: "🏁 10 تحديات", t: (p) => p.counts.challenge >= 10 },
  { id: "l10", n: "💻 10 دروس", t: (p) => p.counts.lesson >= 10 },
  { id: "p10", n: "🧩 10 ألغاز", t: (p) => p.counts.puzzle >= 10 },
  { id: "i5", n: "💡 5 أفكار محفوظة", t: (p) => p.counts.idea >= 5 },
  { id: "x500", n: "⚡ 500 نقطة", t: (p) => p.xp >= 500 },
  { id: "x1000", n: "💎 1000 نقطة", t: (p) => p.xp >= 1000 },
];

const UNI = {
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

// =====================================================================
//  أدوات مساعدة
// =====================================================================
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clean = (t) => String(t ?? "").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/`/g, "").trim();
const card = (title, body) => `<b>${title}</b>\n──────────\n${body}`;
const btn = (text, data) => ({ text, callback_data: data });
const strip = (h) => h.replace(/<[^>]+>/g, "");

const nowOman = () => new Date(Date.now() + OFFSET);
const dateStr = (d = nowOman()) => d.toISOString().slice(0, 10);
const hmStr = (d = nowOman()) => d.toISOString().slice(11, 16);
const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const fmtMin = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const validHM = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || "");
const normHM = (s) => { const [h, m] = s.split(":"); return h.padStart(2, "0") + ":" + m; };

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

async function sendLongPre(env, chat, text) {
  for (let i = 0; i < text.length; i += 3500) {
    await sendHtml(env, chat, `<pre>${esc(text.slice(i, i + 3500))}</pre>`);
  }
}

// =====================================================================
//  الذكاء الاصطناعي (Groq أساسي، Workers AI احتياط)
// =====================================================================
const sys = (cfg, extra = "") =>
  `أنت "بوت K" مساعد شخصي ذكي. اكتب بالعربية البسيطة بلمسة خليجية خفيفة. ${STYLE_INFO[cfg.style].prompt}. ` +
  `كن مختصراً ومرتباً وبدون مقدمات طويلة، ولا تستخدم رموز markdown مثل * أو # أو \`. ${extra}`;

async function groqChat(env, model, messages, opts, extras) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GROQ_KEY}` },
    body: JSON.stringify({
      model, messages,
      temperature: opts.temp ?? 0.8,
      max_completion_tokens: opts.max ?? 2000,
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
  if (!t) throw new Error("الذكاء الاصطناعي ما رد، جرّب بعد شوي");
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
  throw new Error("تعذر توليد المحتوى، جرّب بعد قليل");
}

// =====================================================================
//  الإعدادات والتقدّم
// =====================================================================
const DEF_CFG = () => ({
  style: "fun",
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

const DEF_PROG = () => ({
  xp: 0, streak: 0, best: 0, last: "", badges: [],
  counts: { word: 0, challenge: 0, lesson: 0, puzzle: 0, sec: 0, idea: 0 },
  ideas: [], lastIdea: null,
});
async function getProg(env) {
  const p = await kget(env, "prog", {});
  const d = DEF_PROG();
  return { ...d, ...p, counts: { ...d.counts, ...(p.counts || {}) } };
}
const total = (p) => p.counts.word + p.counts.challenge + p.counts.lesson + p.counts.puzzle + p.counts.sec;
const level = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;
const liveStreak = (p) => {
  const y = dateStr(new Date(Date.now() + OFFSET - 86400000));
  return p.last === dateStr() || p.last === y ? p.streak : 0;
};

async function getToday(env) {
  const d = dateStr();
  const t = await kget(env, "today", null);
  return t && t.date === d ? t : { date: d, items: {}, done: [] };
}

async function markDone(env, key) {
  const today = await getToday(env);
  if (today.done.includes(key)) return null;
  today.done.push(key);
  await kput(env, "today", today);
  const p = await getProg(env);
  const gain = ITEMS[key].xp;
  p.xp += gain;
  p.counts[key]++;
  const d = dateStr();
  if (p.last !== d) {
    const y = dateStr(new Date(Date.now() + OFFSET - 86400000));
    p.streak = p.last === y ? p.streak + 1 : 1;
    p.last = d;
  }
  p.best = Math.max(p.best, p.streak);
  const fresh = [];
  for (const b of BADGES) {
    if (!p.badges.includes(b.id) && b.t(p)) { p.badges.push(b.id); fresh.push(b.n); }
  }
  await kput(env, "prog", p);
  return { gain, p, fresh };
}

// =====================================================================
//  مولّدات المحتوى
// =====================================================================
const GEN = {
  async word(env, cfg) {
    const hist = await kget(env, "hist", { words: [] });
    const j = await llmJSON(env, [
      { role: "system", content: sys(cfg, "أرجع JSON فقط بدون أي نص قبله أو بعده.") },
      { role: "user", content: `اختر كلمة إنجليزية مفيدة للمستوى المتوسط من مجال التقنية أو الألعاب أو الحياة اليومية، وغير موجودة في هذي القائمة: [${hist.words.slice(-80).join(", ")}].\nأرجع JSON بهذا الشكل بالضبط:\n{"word":"","pron":"النطق بحروف عربية","type":"noun أو verb أو adj","ar":"المعنى بالعربية","ex":"جملة إنجليزية قصيرة","ex_ar":"ترجمة الجملة","syn":"مرادف إنجليزي"}` },
    ], { temp: 1 });
    const html = card("📖 كلمة اليوم",
      `<b>${esc(j.word)}</b>  <i>${esc(j.type || "")}</i>\n🔊 ${esc(j.pron || "")}\n\n📌 ${esc(j.ar)}\n\n💬 ${esc(j.ex)}\n↳ ${esc(j.ex_ar)}\n\n🔁 ${esc(j.syn || "-")}`);
    return { html, kb: [[btn("✅ حفظتها  +10", "done:word")]], raw: { word: j.word } };
  },

  async challenge(env, cfg) {
    const kinds = [
      "تحدي ذكاء اصطناعي: برومت يجربه على أداة ذكاء اصطناعي ويقارن النتيجة",
      "تحدي برمجة صغير ينجزه في 15 دقيقة",
      "تحدي فكرة لعبة صغيرة يصممها على الورق",
      "تحدي إبداعي (تصميم أو فيديو قصير)",
      "تحدي تقني عملي على الجوال",
      "تحدي تعلّم مهارة جديدة في 20 دقيقة",
    ];
    const kind = kinds[nowOman().getUTCDate() % kinds.length];
    const t = await llm(env, [
      { role: "system", content: sys(cfg) },
      { role: "user", content: `اكتب "تحدي اليوم" من نوع: ${kind}.\nالشكل: سطر عنوان قصير، ثم 3 خطوات مرقمة قصيرة، ثم سطر يبدأ بـ "النجاح:" يوضح متى يعتبر أنجزه. بدون مقدمات.` },
    ]);
    return { html: card("🎯 تحدي اليوم", esc(clean(t))), kb: [[btn("✅ أنجزته  +20", "done:challenge")]] };
  },

  async lesson(env, cfg) {
    const j = await llmJSON(env, [
      { role: "system", content: sys(cfg, "أرجع JSON فقط بدون أي نص قبله أو بعده.") },
      { role: "user", content: `اكتب درس برمجة مصغّر لمبتدئ عن مفهوم واحد (مثل: متغير، دالة، حلقة، شرط، مصفوفة، API...). أرجع JSON بهذا الشكل:\n{"term":"اسم المفهوم","explain":"شرح بسيط بجملتين أو ثلاث","code":"مثال كود قصير جداً بحد أقصى 8 أسطر","try":"شي صغير يجربه بنفسه"}` },
    ]);
    const html = card("💻 درس البرمجة", `<b>${esc(j.term)}</b>\n${esc(j.explain)}\n\n<pre>${esc(j.code)}</pre>\n🧪 جرّب: ${esc(j.try)}`);
    return { html, kb: [[btn("✅ فهمت  +15", "done:lesson")]] };
  },

  async puzzle(env, cfg) {
    const j = await llmJSON(env, [
      { role: "system", content: sys(cfg, "أرجع JSON فقط بدون أي نص قبله أو بعده.") },
      { role: "user", content: `اكتب لغز منطق أو ذكاء ممتع بصعوبة متوسطة، له إجابة واضحة. أرجع JSON بهذا الشكل:\n{"q":"نص اللغز","hint":"تلميح قصير","a":"الإجابة مع شرح بسطر واحد"}` },
    ], { temp: 1 });
    return {
      html: card("🧩 لغز اليوم", esc(j.q)),
      kb: [[btn("💡 تلميح", "puz:h"), btn("👁 الإجابة", "puz:a")], [btn("✅ حليتها  +15", "done:puzzle")]],
      raw: { h: j.hint, a: j.a },
    };
  },

  async sec(env, cfg) {
    const j = await llmJSON(env, [
      { role: "system", content: sys(cfg, "أرجع JSON فقط بدون أي نص قبله أو بعده.") },
      { role: "user", content: `اكتب معلومة أمن سيبراني توعوية ودفاعية للمبتدئ (مثل: التصيّد، كلمات المرور، الواي فاي العام، الصلاحيات، التحقق بخطوتين). لا تكتب أي تعليمات لتنفيذ هجوم. أرجع JSON بهذا الشكل:\n{"title":"عنوان قصير","tip":"شرح بسيط","example":"مثال واقعي قصير","defense":"كيف تحمي نفسك في خطوتين"}` },
    ]);
    return {
      html: card("🛡 معلومة أمن سيبراني", `<b>${esc(j.title)}</b>\n${esc(j.tip)}\n\n📌 مثال: ${esc(j.example)}\n\n✅ الحماية: ${esc(j.defense)}`),
      kb: [[btn("✅ قرأتها  +5", "done:sec")]],
    };
  },
};

async function ensureItem(env, cfg, chat, key, { send = true, force = false } = {}) {
  const today = await getToday(env);
  let item = today.items[key];
  if (!item || force) {
    item = await GEN[key](env, cfg);
    today.items[key] = item;
    await kput(env, "today", today);
    if (key === "word" && item.raw?.word) {
      const hist = await kget(env, "hist", { words: [] });
      hist.words.push(item.raw.word);
      hist.words = hist.words.slice(-300);
      await kput(env, "hist", hist);
    }
  }
  const kb = today.done.includes(key) ? (item.kb || []).filter((r) => !r.some((b) => (b.callback_data || "").startsWith("done:"))) : item.kb;
  if (send) await sendHtml(env, chat, item.html, kb);
  return item;
}

async function greeting(env, cfg, kind) {
  const n = nowOman();
  return clean(await llm(env, [
    { role: "system", content: sys(cfg) },
    { role: "user", content: `اكتب رسالة ${kind} قصيرة جداً (سطرين بحد أقصى) ليوم ${DAYS_AR[n.getUTCDay()]} ${dateStr(n)}.` },
  ]));
}

async function simpleText(env, cfg, ask) {
  return clean(await llm(env, [{ role: "system", content: sys(cfg) }, { role: "user", content: ask }]));
}

// ---------- الأخبار ----------
const NEWS_Q = {
  morning: "latest artificial intelligence news today",
  evening: "AI model releases and announcements this week",
  dinner: "AI tools startups research news today",
  now: "artificial intelligence news today",
};
async function genNews(env, cfg, tag = "now") {
  if (!env.TAVILY_KEY) throw new Error("مفتاح Tavily غير مضاف");
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TAVILY_KEY}` },
    body: JSON.stringify({ query: NEWS_Q[tag] || NEWS_Q.now, topic: "news", days: 2, max_results: 7, search_depth: "basic" }),
  });
  if (!r.ok) throw new Error("Tavily " + r.status);
  const j = await r.json();
  const res = (j.results || []).slice(0, 6);
  if (!res.length) throw new Error("ما لقيت أخبار حالياً");
  const src = res.map((x, i) => `${i + 1}. ${x.title}\n${(x.content || "").slice(0, 380)}`).join("\n\n");
  const text = await llm(env, [
    { role: "system", content: sys(cfg, "لخّص الأخبار فقط من النص المعطى، ولا تضف معلومات من عندك.") },
    { role: "user", content: `لخّص هذي الأخبار في 4 إلى 5 نقاط بالعربية. كل نقطة بحد أقصى سطرين، وتبدأ بإيموجي مناسب ثم عنوان قصير ثم الفكرة. لا تكتب روابط.\n\n${src}` },
  ], { max: 2500 });
  const kb = res.slice(0, 3).map((x, i) => [{ text: `🔗 ${i + 1}. ${String(x.title).slice(0, 38)}`, url: x.url }]);
  return { html: card("📰 أخبار الذكاء الاصطناعي", esc(clean(text))), kb };
}

// ---------- الأفكار ----------
async function genIdea(env, cfg, kind = "any") {
  const j = await llmJSON(env, [
    { role: "system", content: sys(cfg, "أرجع JSON فقط بدون أي نص قبله أو بعده.") },
    { role: "user", content: `ولّد ${IDEA_KINDS[kind] || IDEA_KINDS.any}. كن احترافياً ومحدداً وقابلاً للتنفيذ من شخص واحد بمساعدة الذكاء الاصطناعي، وتجنّب الأفكار المكررة والمبتذلة. أرجع JSON بهذا الشكل:\n{"title":"اسم الفكرة","pitch":"وصف بجملتين","hook":"الميزة الفريدة اللي تميّزها","features":["ميزة","ميزة","ميزة"],"audience":"الجمهور المستهدف","difficulty":3,"steps":["خطوة","خطوة","خطوة"],"money":"طريقة الربح"}` },
  ], { temp: 1 });
  const d = Math.max(1, Math.min(5, Number(j.difficulty) || 3));
  const html = card("💡 " + esc(j.title),
    `${esc(j.pitch)}\n\n🔥 <b>الميزة الفريدة:</b> ${esc(j.hook)}\n\n🧩 <b>المميزات:</b>\n${(j.features || []).map((f) => "• " + esc(f)).join("\n")}\n\n👥 <b>الجمهور:</b> ${esc(j.audience)}\n⚙️ <b>الصعوبة:</b> ${"●".repeat(d)}${"○".repeat(5 - d)}\n\n🚀 <b>البداية:</b>\n${(j.steps || []).map((s, i) => `${i + 1}) ${esc(s)}`).join("\n")}\n\n💰 <b>الربح:</b> ${esc(j.money)}`);
  return {
    html,
    kb: [[btn("🔄 فكرة ثانية", "idea:" + kind), btn("💾 احفظها", "idea:save")], [btn("📝 حوّلها لبرومت جاهز", "idea:prompt")]],
    raw: j,
  };
}

async function genPrompt(env, cfg, idea) {
  return llm(env, [
    { role: "system", content: "You write detailed build prompts for AI coding assistants. Write the prompt in Arabic with English technical terms. Output the prompt only, no preface." },
    { role: "user", content: `حوّل هذي الفكرة إلى برومت شامل ومفصل جاهز يُلصق في أداة ذكاء اصطناعي لبناء المشروع كاملاً (ملف واحد يعمل مباشرة، أو APK إن كان تطبيق). يشمل: ملخص المشروع، الشاشات والواجهة، آلية العمل بالتفصيل، التصميم والألوان، التحكم باللمس للجوال، الأداء، حالات الخطأ، معايير الجودة، وطريقة تسليم الكود. اكتبه بدون رموز markdown.\n\nالفكرة:\n${JSON.stringify(idea)}` },
  ], { max: 3500, temp: 0.6 });
}

// ---------- الخلفية ----------
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

const WALL_THEMES = [
  "cyberpunk city at dawn, neon reflections",
  "anime style sunrise sky over mountains",
  "supercar on a mountain road at sunrise",
  "deep space nebula with glowing stars",
  "martial arts warrior with glowing energy aura, dramatic sky",
  "futuristic gaming room, soft morning light",
  "misty forest at sunrise, cinematic",
];

// =====================================================================
//  التشفير والزخرفة
// =====================================================================
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
//  الواجهات (القوائم)
// =====================================================================
const MAIN_KB = [
  [btn("📅 اليوم", "act:today"), btn("💡 أفكار", "m:ideas")],
  [btn("🎨 إبداع", "m:create"), btn("🛠 أدوات", "m:tools")],
  [btn("⏰ تذكيراتي", "m:rem"), btn("📰 الأخبار", "act:news")],
  [btn("🏆 تقدّمي", "act:stats"), btn("⚙️ الإعدادات", "m:set")],
];
const BACK = [btn("🔙 القائمة", "m:main")];

const MENUS = {
  main: () => ({ text: card("🏠 القائمة الرئيسية", "اختر اللي تبيه 👇\nأو اكتب أي سؤال وأجاوبك مباشرة 🤖"), kb: MAIN_KB }),
  ideas: () => ({
    text: card("💡 الأفكار", "ولّد فكرة احترافية أو افتح صندوق أفكارك"),
    kb: [
      [btn("🎮 لعبة", "idea:game"), btn("📱 تطبيق", "idea:app")],
      [btn("💰 مشروع ربح", "idea:money"), btn("🎬 تيك توك", "idea:tiktok")],
      [btn("🎲 أي فكرة", "idea:any"), btn("📥 صندوق أفكاري", "act:box")],
      BACK,
    ],
  }),
  create: () => ({
    text: card("🎨 الإبداع", "اضغط الأداة ثم اكتب النص"),
    kb: [
      [btn("🖼 خلفية", "go:wall"), btn("🔳 QR", "go:qr")],
      [btn("✨ زخرفة", "go:zk"), btn("🔠 حروف كبيرة", "go:ascii")],
      [btn("🎭 رسمة ASCII", "go:art"), btn("📶 QR واي فاي", "go:wifi")],
      BACK,
    ],
  }),
  tools: () => ({
    text: card("🛠 الأدوات", "اضغط الأداة ثم اكتب النص"),
    kb: [
      [btn("🔐 تشفير", "go:enc"), btn("🔓 فك تشفير", "go:dec")],
      [btn("#️⃣ Hash", "go:hash"), btn("🔤 Base64", "go:b64")],
      [btn("🔡 فك Base64", "go:unb64"), btn("🤖 اسأل البوت", "go:ask")],
      BACK,
    ],
  }),
  rem: () => ({
    text: card("⏰ التذكيرات", "أضف تذكير أو شوف قائمتك"),
    kb: [
      [btn("➕ تذكير جديد", "go:remind"), btn("🔔 تذكير يومي", "go:daily")],
      [btn("📋 قائمتي", "act:list")],
      BACK,
    ],
  }),
};

function settingsView(cfg) {
  const q = cfg.quiet;
  const today = dateStr();
  const text = card("⚙️ الإعدادات",
    `🎭 الأسلوب: ${STYLE_INFO[cfg.style].name}\n🤫 الهدوء: ${q.on ? `🟢 من ${q.from} إلى ${q.to}` : "⚪ مطفي"}\n⏸ اليوم: ${cfg.pausedDate === today ? "متوقف" : "شغّال"}`);
  const sty = Object.entries(STYLE_INFO).map(([k, v]) => btn((cfg.style === k ? "✓ " : "") + v.name, "set:style:" + k));
  return {
    text,
    kb: [
      [sty[0], sty[1]], [sty[2], sty[3]],
      [btn(q.on ? "🤫 إيقاف الهدوء" : "🤫 تشغيل الهدوء", "set:quiet"), btn(cfg.pausedDate === today ? "▶️ استئناف اليوم" : "⏸ إيقاف اليوم", "set:pause")],
      [btn("🗓 مواعيد الرسائل", "act:sched")],
      BACK,
    ],
  };
}

function scheduleView(cfg, sent) {
  const lines = Object.entries(SLOT_DEFS).map(([k, v]) => {
    const s = cfg.slots[k];
    const t = k === "random" ? (sent && sent.date === dateStr() ? sent.rnd.t : "عشوائي") : s.t;
    return `${s.on ? "🟢" : "⚪"} ${v.name}: ${t}${k === "random" ? "" : `  (<code>${k}</code>)`}`;
  });
  const keys = Object.keys(SLOT_DEFS);
  const kb = [];
  for (let i = 0; i < keys.length; i += 2) {
    kb.push(keys.slice(i, i + 2).map((k) => btn((cfg.slots[k].on ? "🟢 " : "⚪ ") + SLOT_DEFS[k].name, "slot:" + k)));
  }
  kb.push([btn("🔙 الإعدادات", "m:set")]);
  return { text: card("🗓 المواعيد", lines.join("\n") + "\n\nاضغط الموعد لتشغيله أو إيقافه.\nلتغيير الوقت:\n<code>/time morning 06:30</code>"), kb };
}

async function statsView(env) {
  const p = await getProg(env);
  const lvl = level(p.xp);
  const base = 40 * (lvl - 1) ** 2, next = 40 * lvl ** 2;
  const filled = Math.round(((p.xp - base) / (next - base)) * 10);
  const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
  const owned = BADGES.filter((b) => p.badges.includes(b.id)).map((b) => b.n);
  const locked = BADGES.filter((b) => !p.badges.includes(b.id)).slice(0, 2).map((b) => b.n);
  return card("🏆 تقدّمك",
    `⭐ المستوى: <b>${lvl}</b>\n⚡ النقاط: ${p.xp}  (باقي ${next - p.xp} للمستوى الجاي)\n${bar}\n\n🔥 السلسلة: <b>${liveStreak(p)}</b> يوم   (أفضل: ${p.best})\n\n📖 كلمات: ${p.counts.word}   🎯 تحديات: ${p.counts.challenge}\n💻 دروس: ${p.counts.lesson}   🧩 ألغاز: ${p.counts.puzzle}\n\n🏅 <b>الشارات:</b>\n${owned.length ? owned.join("\n") : "ما فتحت شارات بعد، أنجز أول مهمة اليوم 💪"}\n\n🔒 القادمة: ${locked.join(" ، ") || "—"}`);
}

async function todayView(env) {
  const today = await getToday(env);
  const lines = Object.entries(ITEMS).map(([k, v]) => {
    const has = today.items[k];
    const mark = today.done.includes(k) ? "✅" : has ? "⬜" : "▫️";
    return `${mark} ${v.label}${has ? "" : "  (ما وصلت)"}`;
  });
  const kb = [];
  const keys = Object.keys(ITEMS);
  for (let i = 0; i < keys.length; i += 2) {
    kb.push(keys.slice(i, i + 2).map((k) => btn((today.items[k] ? "📂 " : "⚡ ") + ITEMS[k].label, (today.items[k] ? "show:" : "gen:") + k)));
  }
  const n = nowOman();
  return { text: card(`📅 ${DAYS_AR[n.getUTCDay()]} ${dateStr(n)}`, lines.join("\n") + "\n\n📂 افتح  |  ⚡ ولّدها الحين"), kb };
}

async function summaryText(env, cfg) {
  const today = await getToday(env);
  const p = await getProg(env);
  const data = await kget(env, "data", { r: [], d: [] });
  const d = dateStr();
  const done = Object.entries(ITEMS).filter(([k]) => today.done.includes(k)).map(([, v]) => "✅ " + v.label);
  const miss = Object.entries(ITEMS).filter(([k]) => !today.done.includes(k)).map(([, v]) => "⬜ " + v.label);
  const ideasToday = p.ideas.filter((i) => i.d === d).length;
  const gained = today.done.reduce((s, k) => s + ITEMS[k].xp, 0);
  const endings = {
    fun: "ارتاح وبكرة نكمل 😎",
    hype: "يوم قوي! بكرة نرفعها أكثر 💪",
    calm: "يوم هادئ وجميل، نوم هنيء 🌙",
    serious: "تم. نراك غداً.",
  };
  return card("📋 ختام اليوم",
    `${done.length ? done.join("\n") : "ما أنجزت مهام اليوم"}\n${miss.length ? "\n" + miss.join("\n") : ""}\n\n⚡ نقاط اليوم: +${gained}\n🔥 السلسلة: ${liveStreak(p)} يوم   ⭐ مستوى ${level(p.xp)}\n💡 أفكار محفوظة اليوم: ${ideasToday}\n⏰ تذكيرات قادمة: ${data.r.length + data.d.length}\n\n${endings[cfg.style]}`);
}

function boxText(p, onlyWeek = false) {
  const cut = dateStr(new Date(Date.now() + OFFSET - 7 * 86400000));
  const list = p.ideas.map((i, n) => ({ ...i, n: n + 1 })).filter((i) => !onlyWeek || i.d >= cut).slice(-20);
  if (!list.length) return null;
  return list.map((i) => `${i.n}) ${esc(i.t)}  <i>(${i.d})</i>`).join("\n");
}

// =====================================================================
//  الأدوات النصية
// =====================================================================
const ASKS = {
  wall: "🖼 اكتب وصف الخلفية:\nمثال: سيارة رياضية بليل ممطر",
  qr: "🔳 اكتب النص أو الرابط:",
  wifi: "📶 اكتب اسم الشبكة ثم كلمة السر:\nمثال: Home 12345678",
  zk: "✨ اكتب الاسم أو الجملة:",
  ascii: "🔠 اكتب كلمة بالإنجليزي:\nمثال: KING",
  art: "🎭 اكتب وش ترسم لك:\nمثال: قطة",
  ask: "🤖 اكتب سؤالك:",
  box: "📥 اكتب فكرتك وأحفظها لك:",
  remind: "⏰ اكتب المدة والنص:\nمثال: 30m اشرب ماء\n(m دقائق، h ساعات، d أيام)",
  daily: "🔔 اكتب الوقت والنص:\nمثال: 08:00 صباح الخير",
  enc: "🔐 اكتب كلمة السر ثم النص:\nمثال: 1234 مرحبا",
  dec: "🔓 اكتب كلمة السر ثم النص المشفر:\nمثال: 1234 AbCd...",
  hash: "#️⃣ اكتب النص:",
  b64: "🔤 اكتب النص:",
  unb64: "🔡 اكتب نص Base64:",
};

async function runTool(env, cfg, chat, tool, args, msg) {
  const say = (html, kb) => sendHtml(env, chat, html, kb);
  const need = async () => { await say(esc(ASKS[tool] || "اكتب النص:")); };
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
      await tg(env, "sendPhoto", { chat_id: chat, photo: url, caption: "✨ جاهز" });
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
      return say(`⏰ تمام، بذكرك بعد ${m[1]}${u}`);
    }
    case "daily": {
      const m = args.match(/^(\d{1,2}):(\d{2})\s+([\s\S]+)$/);
      if (!m) return need();
      const time = m[1].padStart(2, "0") + ":" + m[2];
      const data = await kget(env, "data", { r: [], d: [] });
      data.d.push({ chat_id: chat, text: m[3], time });
      await kput(env, "data", data);
      return say(`🔔 تمام، كل يوم الساعة ${time} (توقيت عُمان)`);
    }
    case "enc":
    case "dec": {
      const sp = args.indexOf(" ");
      if (sp < 0) return need();
      const pass = args.slice(0, sp), body = args.slice(sp + 1).trim();
      let res = null;
      try { res = tool === "enc" ? await encryptText(pass, body) : await decryptText(pass, body); } catch { res = null; }
      if (msg) await tg(env, "deleteMessage", { chat_id: chat, message_id: msg.message_id });
      return say(res ? `<code>${esc(res)}</code>` : "❌ كلمة السر غلط أو النص تالف");
    }
    case "b64":
      if (!args) return need();
      return say(`<code>${esc(toB64(te.encode(args)))}</code>`);
    case "unb64":
      if (!args) return need();
      try { return say(esc(td.decode(fromB64(args)))); } catch { return say("❌ نص غير صالح"); }
    case "hash":
      if (!args) return need();
      return say(`<code>${await sha256(args)}</code>`);
    case "wall":
      if (!args) return need();
      await say("🎨 جاري الرسم...");
      return makeWall(env, chat, args);
    case "zk":
      if (!args) return need();
      return say(decorate(args).map((s) => `<code>${esc(s)}</code>`).join("\n\n"));
    case "ascii": {
      if (!args) return need();
      const art = bigText(args);
      return say(art ? `<pre>${esc(art)}</pre>` : "اكتب حروف إنجليزية أو أرقام، مثال: KING");
    }
    case "art": {
      if (!args) return need();
      const art = await llm(env, [
        { role: "system", content: "You draw ASCII art. Output ONLY the art, max 20 lines, max 40 columns, no explanation, no code fences." },
        { role: "user", content: args },
      ], { temp: 0.7 });
      return say(`<pre>${esc(art.replace(/```/g, ""))}</pre>`);
    }
    case "ask": {
      if (!args) return need();
      const t = await llm(env, [
        { role: "system", content: sys(cfg, "أجب مباشرة وبإيجاز (حتى 10 أسطر) إلا إذا طلب التفصيل.") },
        { role: "user", content: args },
      ], { max: 3000 });
      return say(esc(clean(t)));
    }
    case "box": {
      const p = await getProg(env);
      if (!args) {
        const t = boxText(p);
        return say(t ? card("📥 صندوق الأفكار", t + "\n\nللإضافة: <code>/box فكرتك</code>\nللحذف: <code>/box del 3</code>") : card("📥 صندوق الأفكار", "فاضي. أرسل <code>/box فكرتك</code> وأحفظها."));
      }
      const del = args.match(/^del\s+(\d+)$/i);
      if (del) {
        const i = Number(del[1]) - 1;
        if (!p.ideas[i]) return say("ما لقيت هذي الفكرة ❌");
        p.ideas.splice(i, 1);
        await kput(env, "prog", p);
        return say("🗑 انحذفت");
      }
      p.ideas.push({ t: args.slice(0, 500), d: dateStr() });
      p.counts.idea++;
      const fresh = [];
      for (const b of BADGES) if (!p.badges.includes(b.id) && b.t(p)) { p.badges.push(b.id); fresh.push(b.n); }
      await kput(env, "prog", p);
      await say(`💾 انحفظت في صندوق أفكارك (${p.ideas.length})`);
      if (fresh.length) await say("🏅 شارة جديدة: " + fresh.join(" ، "));
      return;
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
      await tg(env, "sendMessage", { chat_id: r.chat_id, text: "⏰ تذكير:\n" + r.text });
      changed = true;
    } else keep.push(r);
  }
  for (const d of data.d) {
    if (d.time === hm) await tg(env, "sendMessage", { chat_id: d.chat_id, text: "🔔 تذكير يومي:\n" + d.text });
  }
  if (changed) { data.r = keep; await kput(env, "data", data); }
}

const isQuiet = (cfg, hm) => {
  const q = cfg.quiet;
  if (!q.on) return false;
  const m = toMin(hm), a = toMin(q.from), b = toMin(q.to);
  return a <= b ? m >= a && m < b : m >= a || m < b;
};

async function safe(label, fn) {
  try { await fn(); } catch (e) { console.log("ERR", label, e.message); }
}

async function runSlot(env, cfg, k, sent) {
  const chat = env.OWNER_ID;
  const send = (html, kb) => sendHtml(env, chat, html, kb);
  const isFriday = nowOman().getUTCDay() === 5;

  switch (k) {
    case "late":
      await safe("late", async () => send(card("🌙 قبل النوم", esc(await simpleText(env, cfg, "اكتب فكرة هادئة أو معلومة غريبة قصيرة تفتح الذهن قبل النوم.")))));
      break;

    case "morning": {
      await safe("greet+word", async () => {
        const g = await greeting(env, cfg, "صباحية");
        await send(`🌅 <b>صباح الخير</b>\n${esc(g)}`);
        await ensureItem(env, cfg, chat, "word");
      });
      await safe("challenge", () => ensureItem(env, cfg, chat, "challenge"));
      await safe("wallpaper", async () => {
        const theme = WALL_THEMES[nowOman().getUTCDate() % WALL_THEMES.length];
        await makeWall(env, chat, theme, "🖼 خلفية اليوم");
      });
      await safe("news", async () => { const n = await genNews(env, cfg, "morning"); await send(n.html.replace("📰 أخبار", "📰 صباح الأخبار | أخبار"), n.kb); });
      break;
    }

    case "noon":
      await safe("lesson", () => ensureItem(env, cfg, chat, "lesson"));
      break;

    case "asr":
      await safe("puzzle", () => ensureItem(env, cfg, chat, "puzzle"));
      break;

    case "evening":
      await safe("evening", async () => {
        const g = await greeting(env, cfg, "مسائية");
        const q = await simpleText(env, cfg, "اكتب اقتباساً ملهماً أو نصيحة قصيرة وعملية في سطرين.");
        await send(`🌆 <b>مساء الخير</b>\n${esc(g)}\n\n💬 ${esc(q)}`);
      });
      await safe("news", async () => { const n = await genNews(env, cfg, "evening"); await send(n.html, n.kb); });
      break;

    case "dinner":
      await safe("sec", () => ensureItem(env, cfg, chat, "sec"));
      await safe("news", async () => { const n = await genNews(env, cfg, "dinner"); await send(n.html, n.kb); });
      if (isFriday) {
        await safe("box", async () => {
          const t = boxText(await getProg(env), true);
          if (t) await send(card("📥 أفكارك هذا الأسبوع", t));
        });
      }
      break;

    case "night":
      await safe("summary", async () => send(await summaryText(env, cfg)));
      break;

    case "random": {
      const type = sent.rnd.type;
      await safe("random", async () => {
        if (type === "fact") await send(card("🎲 مفاجأة", esc(await simpleText(env, cfg, "اكتب معلومة غريبة وممتعة في سطرين."))));
        else if (type === "joke") await send(card("🎲 مفاجأة", esc(await simpleText(env, cfg, "اكتب نكتة خفيفة ونظيفة قصيرة."))));
        else if (type === "quote") await send(card("🎲 مفاجأة", esc(await simpleText(env, cfg, "اكتب اقتباساً قصيراً ملهماً."))));
        else { const i = await genIdea(env, cfg, "any"); await send(i.html, i.kb); }
      });
      break;
    }
  }
}

async function tickSlots(env) {
  const cfg = await getCfg(env);
  const n = nowOman();
  const d = dateStr(n), hm = hmStr(n);
  let sent = await kget(env, "sent", {});
  let fresh = false;
  if (sent.date !== d) {
    const types = ["fact", "joke", "quote", "idea"];
    sent = { date: d, slots: {}, rnd: { t: fmtMin(600 + Math.floor(Math.random() * 691)), type: types[Math.floor(Math.random() * types.length)] } };
    fresh = true;
  }
  if (cfg.pausedDate === d) { if (fresh) await kput(env, "sent", sent); return; }

  const nowM = toMin(hm);
  const due = [];
  for (const [k, s] of Object.entries(cfg.slots)) {
    if (!s.on || sent.slots[k]) continue;
    const t = k === "random" ? sent.rnd.t : s.t;
    const diff = nowM - toMin(t);
    if (diff >= 0 && diff <= 20) due.push(k);
  }
  if (!due.length) { if (fresh) await kput(env, "sent", sent); return; }
  for (const k of due) sent.slots[k] = 1;
  await kput(env, "sent", sent);
  if (isQuiet(cfg, hm)) return;
  for (const k of due) await runSlot(env, cfg, k, sent);
}

// =====================================================================
//  معالجة الرسائل والأزرار
// =====================================================================
const COMMANDS = [
  ["menu", "القائمة الرئيسية"], ["today", "لوحة اليوم"], ["idea", "ولّد فكرة احترافية"],
  ["ask", "اسأل البوت"], ["news", "أخبار الذكاء الاصطناعي"], ["word", "كلمة اليوم"],
  ["wall", "خلفية بالذكاء الاصطناعي"], ["qr", "إنشاء QR جميل"], ["zk", "زخرفة النصوص"],
  ["remind", "تذكير جديد"], ["list", "قائمة التذكيرات"], ["box", "صندوق الأفكار"],
  ["stats", "تقدّمي وسلسلتي"], ["summary", "ختام اليوم"], ["schedule", "مواعيد الرسائل"],
  ["settings", "الإعدادات"], ["quiet", "وضع الهدوء"], ["pause", "إيقاف رسائل اليوم"],
];

const HELP_TEXT = card("📖 المساعدة",
  `اضغط /menu وكل شي بالأزرار 👌\nأو اكتب أي سؤال مباشرة.\n\n<b>أوامر سريعة:</b>\n/today /idea /news /word /stats\n/wall وصف  •  /qr نص  •  /zk اسم\n/remind 30m نص  •  /daily 08:00 نص\n/box فكرة  •  /ask سؤال\n/enc كلمة_السر نص  •  /dec كلمة_السر نص\n/b64  /unb64  /hash  /ascii  /art\n\n<b>الرسائل التلقائية:</b>\n/schedule  /time morning 06:30\n/quiet 23:00 06:00  •  /pause  •  /resume\n/style fun|hype|calm|serious`);

async function handleCommand(env, cfg, chat, cmd, args, msg) {
  const say = (html, kb) => sendHtml(env, chat, html, kb);
  switch (cmd) {
    case "start": {
      await tg(env, "setMyCommands", { commands: COMMANDS.map(([command, description]) => ({ command, description })) });
      const m = MENUS.main();
      return say("👋 <b>أهلاً K</b>\nبوتك الشخصي جاهز.\n\n" + m.text, m.kb);
    }
    case "menu": { const m = MENUS.main(); return say(m.text, m.kb); }
    case "help": return say(HELP_TEXT);
    case "today": { const v = await todayView(env); return say(v.text, v.kb); }
    case "word": case "challenge": case "lesson": case "puzzle": case "sec":
      return ensureItem(env, cfg, chat, cmd);
    case "idea": {
      const kind = IDEA_KINDS[args] ? args : "any";
      await say("💡 جاري توليد الفكرة...");
      return sendIdea(env, cfg, chat, kind);
    }
    case "news": await say("📰 جاري جمع الأخبار..."); { const n = await genNews(env, cfg, "now"); return say(n.html, n.kb); }
    case "stats": return say(await statsView(env));
    case "summary": return say(await summaryText(env, cfg));
    case "settings": { const v = settingsView(cfg); return say(v.text, v.kb); }
    case "schedule": { const v = scheduleView(cfg, await kget(env, "sent", {})); return say(v.text, v.kb); }
    case "list": {
      const data = await kget(env, "data", { r: [], d: [] });
      const now = Date.now();
      let out = "";
      data.r.forEach((r, i) => (out += `r${i + 1}) بعد ${Math.max(1, Math.round((r.due - now) / 60000))} دقيقة: ${esc(r.text)}\n`));
      data.d.forEach((d, i) => (out += `d${i + 1}) يومياً ${d.time}: ${esc(d.text)}\n`));
      return say(card("⏰ تذكيراتك", out ? out + "\nللحذف: <code>/del r1</code>" : "ما عندك تذكيرات"));
    }
    case "del": {
      const m = args.match(/^([rd])(\d+)$/i);
      if (!m) return say("مثال: <code>/del r1</code>");
      const data = await kget(env, "data", { r: [], d: [] });
      const arr = data[m[1].toLowerCase()];
      const i = Number(m[2]) - 1;
      if (!arr[i]) return say("ما لقيته ❌");
      arr.splice(i, 1);
      await kput(env, "data", data);
      return say("🗑 انحذف");
    }
    case "time": {
      const [k, t] = args.split(/\s+/);
      if (!SLOT_DEFS[k] || k === "random") return say("الموعد غلط. الأسماء: late, morning, noon, asr, evening, dinner, night");
      if (!validHM(t)) return say("الوقت غلط. مثال: <code>/time morning 06:30</code>");
      cfg.slots[k].t = normHM(t);
      await saveCfg(env, cfg);
      return say(`✅ ${SLOT_DEFS[k].name} صار الساعة ${cfg.slots[k].t}`);
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
      return say(cfg.quiet.on ? `🤫 الهدوء شغّال من ${cfg.quiet.from} إلى ${cfg.quiet.to}` : "🔔 وضع الهدوء مطفي");
    }
    case "pause": cfg.pausedDate = dateStr(); await saveCfg(env, cfg); return say("⏸ أوقفت الرسائل التلقائية لباقي اليوم. للاستئناف: /resume");
    case "resume": cfg.pausedDate = ""; await saveCfg(env, cfg); return say("▶️ رجعت الرسائل التلقائية");
    case "style": {
      if (!STYLE_INFO[args]) return say("الأساليب: fun, hype, calm, serious");
      cfg.style = args;
      await saveCfg(env, cfg);
      return say(`🎭 الأسلوب صار ${STYLE_INFO[args].name}`);
    }
    default:
      if (ASKS[cmd]) return runTool(env, cfg, chat, cmd, args, msg);
      return say(HELP_TEXT);
  }
}

async function sendIdea(env, cfg, chat, kind) {
  const idea = await genIdea(env, cfg, kind);
  const p = await getProg(env);
  p.lastIdea = idea.raw;
  await kput(env, "prog", p);
  return sendHtml(env, chat, idea.html, idea.kb);
}

async function handleMessage(env, msg) {
  const chat = msg.chat.id;
  const cfg = await getCfg(env);

  // قراءة QR من صورة
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const f = await (await tg(env, "getFile", { file_id: fileId })).json();
    const img = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
    const form = new FormData();
    form.append("file", await img.blob(), "qr.jpg");
    const r = await (await fetch("https://api.qrserver.com/v1/read-qr-code/", { method: "POST", body: form })).json();
    const val = r[0]?.symbol?.[0]?.data;
    return sendHtml(env, chat, val ? card("📖 قيمة الـ QR", esc(val)) : "ما لقيت QR في الصورة ❌");
  }

  const text = (msg.text || "").trim();
  if (!text) return;

  if (text.startsWith("/")) {
    const first = text.split(/\s+/)[0];
    const cmd = first.slice(1).split("@")[0].toLowerCase();
    const args = text.slice(first.length).trim();
    return handleCommand(env, cfg, chat, cmd, args, msg);
  }

  // نص عادي: إما أداة معلّقة أو سؤال للبوت
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
  const [a, b, c] = data.split(":");
  const cfg = await getCfg(env);
  const answer = (text) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, ...(text ? { text } : {}) });
  const edit = async (v) => {
    const r = await tg(env, "editMessageText", { chat_id: chat, message_id: mid, text: v.text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: v.kb } });
    return r;
  };
  const say = (html, kb) => sendHtml(env, chat, html, kb);

  try {
    if (a === "m") { await answer(); const v = b === "set" ? settingsView(cfg) : MENUS[b]?.(); return v && edit(v); }

    if (a === "go") {
      await answer();
      await kput(env, "pend", { tool: b, ts: Date.now() }, { expirationTtl: 120 });
      return say(esc(ASKS[b] || "اكتب النص:"));
    }

    if (a === "set") {
      if (b === "style") cfg.style = c;
      if (b === "quiet") cfg.quiet.on = !cfg.quiet.on;
      if (b === "pause") cfg.pausedDate = cfg.pausedDate === dateStr() ? "" : dateStr();
      await saveCfg(env, cfg);
      await answer("✅");
      return edit(settingsView(cfg));
    }

    if (a === "slot") {
      cfg.slots[b].on = !cfg.slots[b].on;
      await saveCfg(env, cfg);
      await answer(cfg.slots[b].on ? "🟢 شغّال" : "⚪ مطفي");
      return edit(scheduleView(cfg, await kget(env, "sent", {})));
    }

    if (a === "act") {
      await answer();
      if (b === "today") { const v = await todayView(env); return say(v.text, v.kb); }
      if (b === "stats") return say(await statsView(env));
      if (b === "news") { await say("📰 جاري جمع الأخبار..."); const n = await genNews(env, cfg, "now"); return say(n.html, n.kb); }
      if (b === "box") return handleCommand(env, cfg, chat, "box", "", null);
      if (b === "list") return handleCommand(env, cfg, chat, "list", "", null);
      if (b === "sched") { const v = scheduleView(cfg, await kget(env, "sent", {})); return edit(v); }
    }

    if (a === "show" || a === "gen") {
      await answer(a === "gen" ? "⚡ جاري التوليد..." : undefined);
      return ensureItem(env, cfg, chat, b);
    }

    if (a === "done") {
      const r = await markDone(env, b);
      if (!r) return answer("سبق وسجلتها ✅");
      await answer(`✅ +${r.gain} نقطة`);
      const today = await getToday(env);
      const item = today.items[b];
      if (item) {
        const kb = (item.kb || []).filter((row) => !row.some((x) => (x.callback_data || "").startsWith("done:")));
        await tg(env, "editMessageReplyMarkup", { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: kb } });
      }
      await say(`🔥 السلسلة: <b>${liveStreak(r.p)}</b> يوم   ⭐ مستوى ${level(r.p.xp)}   ⚡ ${r.p.xp}`);
      if (r.fresh.length) await say("🏅 <b>شارة جديدة:</b> " + r.fresh.join(" ، "));
      return;
    }

    if (a === "puz") {
      const today = await getToday(env);
      const raw = today.items.puzzle?.raw;
      await answer();
      if (!raw) return say("اللغز انتهى، جرّب لغز اليوم الجديد.");
      return b === "h" ? say("💡 " + esc(raw.h)) : say(`👁 <tg-spoiler>${esc(raw.a)}</tg-spoiler>`);
    }

    if (a === "idea") {
      if (b === "save") {
        const p = await getProg(env);
        if (!p.lastIdea) return answer("ما فيه فكرة");
        p.ideas.push({ t: `${p.lastIdea.title} — ${p.lastIdea.pitch}`.slice(0, 500), d: dateStr() });
        p.counts.idea++;
        for (const bd of BADGES) if (!p.badges.includes(bd.id) && bd.t(p)) p.badges.push(bd.id);
        await kput(env, "prog", p);
        return answer("💾 انحفظت في صندوق أفكارك");
      }
      if (b === "prompt") {
        const p = await getProg(env);
        await answer("📝 جاري كتابة البرومت...");
        if (!p.lastIdea) return say("ولّد فكرة أول.");
        const t = await genPrompt(env, cfg, p.lastIdea);
        await say("📝 <b>البرومت جاهز</b> (اضغط على النص لنسخه):");
        return sendLongPre(env, chat, clean(t));
      }
      await answer("💡 جاري التوليد...");
      return sendIdea(env, cfg, chat, b);
    }

    await answer();
  } catch (e) {
    console.log("CB", data, e.message);
    await say("⚠️ " + esc(e.message));
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
    if (request.method !== "POST") return new Response("Bot is running ✅");
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
      if (chat) await sendHtml(env, chat, "⚠️ صار خطأ: " + esc(e && e.message));
    }
    return new Response("ok");
  },
};
