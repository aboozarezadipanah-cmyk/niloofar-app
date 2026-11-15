'use strict';
// سرور فروشگاه بانویِ خاص: بدون پکیج اضافه، فقط Node.js نسخه ۱۸ به بالا
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(function (l) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) {}

const PORT = +process.env.PORT || 3000;
const BASE = (process.env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const ZP = process.env.ZARINPAL_MERCHANT || '';
const SANDBOX = process.env.ZARINPAL_SANDBOX === '1';
const ZP_API = process.env.ZARINPAL_API || (SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com');
const ZP_PAY = process.env.ZARINPAL_PAY || (SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com');
const TG = process.env.TELEGRAM_BOT_TOKEN || '';
const TGC = (process.env.TELEGRAM_CHAT_ID || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
const TGA = (process.env.TELEGRAM_API || 'https://api.telegram.org').replace(/\/$/, '');
const SECURE = process.env.COOKIE_SECURE === '1';
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UP = path.join(DIR, 'uploads');
const PUB = path.join(__dirname, 'public');
const ST = ['در انتظار', 'در حال آماده‌سازی', 'ارسال شد', 'تحویل شد', 'لغو شد'];

fs.mkdirSync(UP, { recursive: true });
const store = require('./db')(DIR);
let A = null; // کش کاربران، نسخه‌ی نشست و کلید امضا

// ---------- رمز و نشست ----------
function hashPw(pw) { const salt = crypto.randomBytes(16).toString('hex'); return { salt: salt, h: crypto.scryptSync(pw, salt, 32).toString('hex') }; }
function checkPw(pw, u) {
  if (!u) return false;
  const a = Buffer.from(crypto.scryptSync(String(pw), u.salt, 32).toString('hex')), b = Buffer.from(u.h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sign(s) { return crypto.createHmac('sha256', A.secret).update(s).digest('base64url'); }
function mkToken(role) { const b = Buffer.from(JSON.stringify({ r: role, v: A.ver, e: Date.now() + 7 * 864e5 })).toString('base64url'); return b + '.' + sign(b); }
function session(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)bk=([^;]+)/);
  if (!m) return null;
  const p = m[1].split('.');
  if (p.length !== 2) return null;
  const a = Buffer.from(sign(p[0])), b = Buffer.from(p[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p[0], 'base64url').toString());
    if (d.e < Date.now() || d.v !== A.ver) return null;
    return (d.r === 'owner' || d.r === 'staff') ? d.r : null;
  } catch (e) { return null; }
}
function cookie(v, age) { return 'bk=' + v + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + age + (SECURE ? '; Secure' : ''); }
const fails = new Map(), looks = new Map();
function hit(map, ip, max) { const f = map.get(ip); if (!f || Date.now() - f.t > 600000) { map.set(ip, { n: 1, t: Date.now() }); return false; } f.n++; return f.n > max; }
function blocked(map, ip, max) { const f = map.get(ip); return !!f && f.n >= max && Date.now() - f.t < 600000; }

// ---------- کمکی ----------
function send(res, code, obj, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, extra || {}));
  res.end(JSON.stringify(obj));
}
function readBody(req, max, raw) {
  return new Promise(function (ok, no) {
    let n = 0; const c = [];
    req.on('data', function (d) { n += d.length; if (n > max) { no(new Error('حجم درخواست زیاد است')); req.destroy(); } else c.push(d); });
    req.on('end', function () {
      const b = Buffer.concat(c);
      if (raw) return ok(b);
      try { ok(b.length ? JSON.parse(b.toString()) : {}); } catch (e) { no(new Error('درخواست نامعتبر')); }
    });
    req.on('error', no);
  });
}
const body = function (req, max) { return readBody(req, max, false); };
function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
function num(v) { v = +v; return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
function uid() { return Date.now().toString(36) + crypto.randomBytes(2).toString('hex'); }
function digits(s) { return String(s).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/\D/g, ''); }
function list(a, n) { return (Array.isArray(a) ? a : []).slice(0, 30).map(function (x) { return str(x, n); }).filter(Boolean); }
function cleanProducts(arr) {
  if (!Array.isArray(arr)) throw new Error('داده‌ی محصولات نامعتبر است');
  return arr.slice(0, 500).map(function (p) {
    const images = (Array.isArray(p.images) ? p.images : []).filter(function (u) { return typeof u === 'string' && /^\/uploads\/[a-f0-9]{16,}\.(jpg|png|webp)$/.test(u); }).slice(0, 8);
    return { id: str(p.id, 40).replace(/[^a-z0-9]/gi, '') || uid(), name: str(p.name, 120), price: num(p.price), cat: str(p.cat, 60), sizes: list(p.sizes, 20), colors: list(p.colors, 30), stock: num(p.stock), images: images, img: images[0] || '' };
  }).filter(function (p) { return p.name; });
}
function cleanPages(b) { const o = {}; ['about', 'terms', 'faq'].forEach(function (k) { o[k] = str(b[k], 20000); }); return o; }

// ---------- عکس‌ها ----------
function imgType(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (b.slice(0, 4).toString('hex') === '89504e47') return 'png';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
function gcUploads(products) { // عکس‌های بی‌استفاده‌ی قدیمی‌تر از یک ساعت پاک می‌شوند
  const keep = new Set(); products.forEach(function (p) { p.images.forEach(function (u) { keep.add(path.basename(u)); }); });
  fs.readdir(UP, function (e, fl) {
    if (e) return;
    fl.forEach(function (f) {
      if (keep.has(f)) return;
      const fp = path.join(UP, f);
      fs.stat(fp, function (e2, s) { if (!e2 && Date.now() - s.mtimeMs > 3600000) fs.unlink(fp, function () {}); });
    });
  });
}

// ---------- اعلان تلگرام ----------
function notify(text) {
  if (!TG || !TGC.length) return;
  TGC.forEach(function (c) {
    fetch(TGA + '/bot' + TG + '/sendMessage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: c, text: text }), signal: AbortSignal.timeout(8000) })
      .then(function (r) { if (!r.ok) console.log('تلگرام: خطا', r.status); })
      .catch(function (e) { console.log('تلگرام: ارسال نشد', e.message); });
  });
}

// ---------- آمار (تاریخ شمسی، منطقه‌ی تهران) ----------
const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric' });
function jk(ts) { const p = {}; fmt.formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; }); return { m: p.year + '/' + p.month, d: p.year + '/' + p.month + '/' + p.day }; }
function stats(orders) {
  const now = jk(Date.now()), s = { today: { sales: 0, orders: 0, paid: 0 }, month: { sales: 0, orders: 0, paid: 0 }, counts: ST.map(function () { return 0; }), top: [] }, tp = {};
  orders.forEach(function (o) {
    const i = ST.indexOf(o.status); if (i >= 0) s.counts[i]++;
    if (o.status === ST[4]) return;
    const k = jk(o.ts || Date.now());
    if (k.m === now.m) { s.month.sales += o.total; s.month.orders++; if (o.paid) s.month.paid += o.total; }
    if (k.d === now.d) { s.today.sales += o.total; s.today.orders++; if (o.paid) s.today.paid += o.total; }
    o.items.forEach(function (it) { const key = it.pid || it.n, t = tp[key] || (tp[key] = { name: it.pn || it.n, q: 0, rev: 0 }); t.q += it.q; t.rev += it.p * it.q; });
  });
  s.top = Object.keys(tp).map(function (k) { return tp[k]; }).sort(function (a, b) { return b.q - a.q; }).slice(0, 5);
  return s;
}

// ---------- زرین‌پال ----------
async function zp(ep, data) {
  const r = await fetch(ZP_API + '/pg/v4/payment/' + ep + '.json', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ merchant_id: ZP }, data)) });
  return r.json();
}
async function startPay(o) {
  const meta = {}, d = digits(o.phone);
  if (/^09\d{9}$/.test(d)) meta.mobile = d;
  const j = await zp('request', { amount: o.total * 10, description: 'سفارش ' + o.id + ' بانویِ خاص', callback_url: BASE + '/api/pay/callback?o=' + o.id, metadata: meta });
  if (j && j.data && j.data.code === 100 && j.data.authority) { await store.updateOrder(o.id, { authority: j.data.authority }); return ZP_PAY + '/pg/StartPay/' + j.data.authority; }
  throw new Error('خطای درگاه');
}

// ---------- API ----------
async function api(req, res, u) {
  const p = u.pathname, m = req.method, ip = req.socket.remoteAddress || '';
  if (p === '/api/store' && m === 'GET') return send(res, 200, await store.getCatalog());
  if (p === '/api/me' && m === 'GET') return send(res, 200, { role: session(req) });
  if (p === '/api/login' && m === 'POST') {
    if (blocked(fails, ip, 8)) return send(res, 429, { error: 'تلاش زیاد. چند دقیقه بعد دوباره امتحان کنید.' });
    const b = await body(req, 1e4), pw = String(b.password || '');
    const role = checkPw(pw, A.users.owner) ? 'owner' : (checkPw(pw, A.users.staff) ? 'staff' : null);
    if (!role) { hit(fails, ip, 8); return send(res, 401, { error: 'رمز اشتباه است.' }); }
    return send(res, 200, { role: role }, { 'Set-Cookie': cookie(mkToken(role), 604800) });
  }
  if (p === '/api/logout' && m === 'POST') return send(res, 200, {}, { 'Set-Cookie': cookie('', 0) });

  if (p === '/api/track' && m === 'GET') { // پیگیری سفارش برای مشتری
    if (hit(looks, ip, 20)) return send(res, 429, { error: 'تلاش زیاد. چند دقیقه بعد دوباره امتحان کنید.' });
    const o = await store.getOrder(digits(u.searchParams.get('id') || '0'));
    const ph = digits(u.searchParams.get('phone') || '');
    if (!o || ph.length < 10 || digits(o.phone).slice(-10) !== ph.slice(-10)) return send(res, 404, { error: 'سفارشی با این مشخصات پیدا نشد.' });
    return send(res, 200, { status: o.status, paid: !!o.paid, track: o.track || '' });
  }

  if (p === '/api/orders' && m === 'POST') {
    const b = await body(req, 2e5);
    const name = str(b.name, 80), address = str(b.address, 500), phone = str(b.phone, 20), d = digits(phone);
    if (name.length < 2 || address.length < 5 || d.length < 10 || d.length > 13) return send(res, 400, { error: 'نام، شماره‌ی تماس معتبر و آدرس را کامل وارد کنید.' });
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return send(res, 400, { error: 'سبد خرید خالی است.' });
    const cat = await store.getCatalog(), need = {}, items = []; let total = 0;
    for (const it of b.items) {
      const pr = cat.products.find(function (x) { return x.id === it.id; }), q = Math.floor(+it.q);
      if (!pr || !(q >= 1 && q <= 20)) return send(res, 400, { error: 'یکی از محصولات سبد معتبر نیست.' });
      const sz = str(it.sz, 20), cl = str(it.cl, 30);
      if ((pr.sizes.length && pr.sizes.indexOf(sz) < 0) || (pr.colors.length && pr.colors.indexOf(cl) < 0)) return send(res, 400, { error: 'سایز یا رنگ «' + pr.name + '» انتخاب نشده است.' });
      need[pr.id] = (need[pr.id] || 0) + q;
      const v = [sz, cl].filter(Boolean).join('، ');
      items.push({ pid: pr.id, pn: pr.name, n: pr.name + (v ? ' (' + v + ')' : ''), q: q, p: pr.price });
      total += pr.price * q;
    }
    let o;
    try { o = await store.createOrder({ date: new Date().toLocaleDateString('fa-IR'), ts: Date.now(), name: name, phone: phone, address: address, items: items, total: total, status: ST[0], paid: false, track: '', note: '' }, need); }
    catch (e) { if (e.code === 'STOCK') return send(res, 400, { error: e.message }); throw e; }
    notify('🛍 سفارش جدید #' + o.id + '\nمشتری: ' + name + '\nتلفن: ' + phone + '\nمبلغ: ' + total.toLocaleString('fa-IR') + ' تومان\n' + items.map(function (i) { return '• ' + i.n + ' × ' + i.q; }).join('\n'));
    const out = { id: o.id, total: total };
    if (ZP) { try { out.payUrl = await startPay(o); } catch (e) { out.payError = true; } }
    return send(res, 200, out);
  }
  if (p === '/api/pay/callback' && m === 'GET') {
    const o = await store.getOrder(u.searchParams.get('o') || '0');
    const au = u.searchParams.get('Authority'), ok = u.searchParams.get('Status') === 'OK';
    let to = '/#failed-' + (o ? o.id : 0);
    if (o && ZP && au && au === o.authority) {
      if (o.paid) to = '/#paid-' + o.id;
      else if (ok) {
        try {
          const j = await zp('verify', { amount: o.total * 10, authority: au });
          if (j && j.data && (j.data.code === 100 || j.data.code === 101)) { await store.updateOrder(o.id, { paid: true, ref: j.data.ref_id }); to = '/#paid-' + o.id; notify('✅ پرداخت سفارش #' + o.id + ' انجام شد (' + o.total.toLocaleString('fa-IR') + ' تومان)'); }
        } catch (e) {}
      }
    }
    res.writeHead(302, { Location: to }); return res.end();
  }

  const role = session(req);
  if (!p.startsWith('/api/admin/')) return send(res, 404, { error: 'پیدا نشد' });
  if (!role) return send(res, 401, { error: 'ابتدا وارد شوید.' });
  if (p === '/api/admin/state' && m === 'GET') {
    const c = await store.getCatalog(), orders = await store.listOrders();
    return send(res, 200, Object.assign(c, { orders: orders.slice(0, 500), stats: stats(orders), role: role }));
  }
  if (p === '/api/admin/catalog' && m === 'PUT') {
    const b = await body(req, 2e6);
    if (!Array.isArray(b.cats)) return send(res, 400, { error: 'دسته‌ها نامعتبر است' });
    const s = b.settings || {}, products = cleanProducts(b.products);
    await store.saveCatalog({ cats: b.cats.slice(0, 50).map(function (c) { return str(c, 40); }).filter(Boolean), products: products, settings: { tg: str(s.tg, 80), ig: str(s.ig, 80), rb: str(s.rb, 80), phone: str(s.phone, 20) } });
    gcUploads(products);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/admin/pages' && m === 'PUT') { await store.savePages(cleanPages(await body(req, 1e5))); return send(res, 200, { ok: true }); }
  if (p === '/api/admin/upload' && m === 'POST') {
    const b = await readBody(req, 3e6, true), t = imgType(b);
    if (!t) return send(res, 400, { error: 'فقط عکس JPG، PNG یا WebP مجاز است.' });
    const name = crypto.randomBytes(12).toString('hex') + '.' + t;
    fs.writeFileSync(path.join(UP, name), b);
    return send(res, 200, { url: '/uploads/' + name });
  }
  const mm = p.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (mm && m === 'PUT') {
    const b = await body(req, 2e4), patch = {};
    if (b.status !== undefined) { if (ST.indexOf(b.status) < 0) return send(res, 400, { error: 'وضعیت نامعتبر' }); patch.status = b.status; }
    if (b.track !== undefined) patch.track = str(b.track, 40);
    if (b.note !== undefined) patch.note = str(b.note, 500);
    if (b.name !== undefined) { patch.name = str(b.name, 80); if (patch.name.length < 2) return send(res, 400, { error: 'نام کوتاه است' }); }
    if (b.address !== undefined) { patch.address = str(b.address, 500); if (patch.address.length < 5) return send(res, 400, { error: 'آدرس کوتاه است' }); }
    if (b.phone !== undefined) { patch.phone = str(b.phone, 20); if (digits(patch.phone).length < 10) return send(res, 400, { error: 'شماره‌ی تماس نامعتبر است' }); }
    const o = await store.updateOrder(mm[1], patch);
    return o ? send(res, 200, { ok: true }) : send(res, 404, { error: 'سفارش پیدا نشد' });
  }
  if (p === '/api/admin/passwords' && m === 'POST') {
    if (role !== 'owner') return send(res, 403, { error: 'فقط مدیر می‌تواند رمزها را عوض کند.' });
    const b = await body(req, 1e4), o = String(b.owner || ''), s = String(b.staff || '');
    if ((o && o.length < 6) || (s && s.length < 6)) return send(res, 400, { error: 'هر رمز باید حداقل ۶ نویسه باشد.' });
    if (o) await store.setUser('owner', hashPw(o));
    await store.setUser('staff', s ? hashPw(s) : null);
    await store.bumpVer(); A = await store.getAuth();
    return send(res, 200, { ok: true }, { 'Set-Cookie': cookie(mkToken('owner'), 604800) });
  }
  if (p === '/api/admin/backup' && m === 'POST') {
    if (role !== 'owner') return send(res, 403, { error: 'فقط مدیر می‌تواند بکاپ بگیرد.' });
    return send(res, 200, { name: await store.backup(true) });
  }
  if (p === '/api/admin/export' && m === 'GET') {
    if (role !== 'owner') return send(res, 403, { error: 'فقط مدیر می‌تواند بکاپ بگیرد.' });
    return send(res, 200, await store.exportAll(), { 'Content-Disposition': 'attachment; filename="banuye-khas-backup-' + new Date().toISOString().slice(0, 10) + '.json"' });
  }
  return send(res, 404, { error: 'پیدا نشد' });
}

// ---------- فایل‌های سایت و عکس‌ها ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
function serve(req, res, root, rel, long) {
  let f;
  try { f = path.normalize(path.join(root, decodeURIComponent(rel))); } catch (e) { res.writeHead(400); return res.end(); }
  if (f.indexOf(root) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (e, d) {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('پیدا نشد'); }
    const ext = path.extname(f).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ['.html', '.css', '.js'].indexOf(ext) >= 0 ? 'no-cache' : (long ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'), 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
    res.end(d);
  });
}

(async function () {
  await store.init();
  A = await store.getAuth();
  if (!A.users.owner) {
    const pw = process.env.OWNER_PASSWORD || crypto.randomBytes(5).toString('hex');
    await store.setUser('owner', hashPw(pw));
    if (!process.env.OWNER_PASSWORD) console.log('رمز اولیه‌ی مدیر:', pw, '(بعد از ورود عوضش کن)');
    A = await store.getAuth();
  }
  // بکاپ خودکار: روزی یک بار
  const bk = function () { store.backup(false).catch(function (e) { console.log('بکاپ خودکار ناموفق:', e.message); }); };
  bk(); setInterval(bk, 6 * 3600 * 1000).unref();

  http.createServer(function (req, res) {
    let u;
    try { u = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
    if (u.pathname.startsWith('/api/')) api(req, res, u).catch(function (e) { if (!res.headersSent) send(res, 400, { error: e.message || 'خطا' }); });
    else if (req.method === 'GET' || req.method === 'HEAD') {
      if (u.pathname.startsWith('/uploads/')) serve(req, res, UP, u.pathname.slice(9), true);
      else serve(req, res, PUB, u.pathname === '/' ? '/index.html' : u.pathname, false);
    } else { res.writeHead(405); res.end(); }
  }).listen(PORT, function () { console.log('سایت روی http://localhost:' + PORT + ' اجرا شد'); });
})().catch(function (e) { console.error(e); process.exit(1); });
