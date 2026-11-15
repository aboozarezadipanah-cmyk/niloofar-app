'use strict';
// آداپتر JSON. همه‌ی متدها async هستند و پشت یک صف اجرا می‌شوند (هر لحظه فقط یک عملیات).
// آداپتر SQL هم باید دقیقاً همین متدها را با همین ورودی و خروجی بدهد.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function (DIR) {
  const FILE = path.join(DIR, 'data.json'), BK = path.join(DIR, 'backups');
  let db = null, q = Promise.resolve();
  const clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  const persist = function () { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(db)); fs.renameSync(t, FILE); };
  const run = function (fn) { const r = q.then(fn); q = r.catch(function () {}); return r; };
  const find = function (id) { return db.orders.find(function (o) { return o.id === +id; }); };

  return {
    kind: 'json',
    init: function () {
      return run(function () {
        try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = null; }
        if (!db) db = { cats: ['شال', 'روسری', 'شلوار', 'شومیز'], products: [], orders: [], settings: {}, pages: {}, seq: 1000, ver: 1, users: {}, secret: crypto.randomBytes(32).toString('hex') };
        db.pages = db.pages || {}; db.users = db.users || {};
        persist();
      });
    },
    // --- کاتالوگ ---
    getCatalog: function () { return run(function () { return clone({ cats: db.cats, products: db.products, settings: db.settings, pages: db.pages }); }); },
    saveCatalog: function (c) { return run(function () { db.cats = c.cats; db.products = c.products; db.settings = c.settings; persist(); }); },
    savePages: function (p) { return run(function () { db.pages = p; persist(); }); },
    // --- سفارش‌ها (جدیدترین اول) ---
    listOrders: function () { return run(function () { return clone(db.orders); }); },
    getOrder: function (id) { return run(function () { const o = find(id); return o ? clone(o) : null; }); },
    // کم کردن موجودی و ثبت سفارش باید یکجا (اتمی) باشد. need = { productId: تعداد }
    createOrder: function (order, need) {
      return run(function () {
        Object.keys(need).forEach(function (id) {
          const p = db.products.find(function (x) { return x.id === id; });
          if (!p || p.stock < need[id]) throw Object.assign(new Error('موجودی «' + (p ? p.name : '') + '» کافی نیست.'), { code: 'STOCK' });
        });
        Object.keys(need).forEach(function (id) { db.products.find(function (x) { return x.id === id; }).stock -= need[id]; });
        order.id = ++db.seq; db.orders.unshift(order); persist();
        return clone(order);
      });
    },
    updateOrder: function (id, patch) { return run(function () { const o = find(id); if (!o) return null; Object.assign(o, patch); persist(); return clone(o); }); },
    // --- کاربران و نشست ---
    getAuth: function () { return run(function () { return clone({ users: db.users, ver: db.ver, secret: db.secret }); }); },
    setUser: function (role, rec) { return run(function () { if (rec) db.users[role] = rec; else delete db.users[role]; persist(); }); },
    bumpVer: function () { return run(function () { db.ver++; persist(); }); },
    // --- بکاپ ---
    exportAll: function () { return run(function () { const d = clone(db); delete d.users; delete d.secret; return d; }); },
    backup: function (force) {
      return run(function () {
        fs.mkdirSync(BK, { recursive: true });
        const n = 'data-' + new Date().toISOString().slice(0, 10) + '.json', f = path.join(BK, n);
        if (force || !fs.existsSync(f)) fs.copyFileSync(FILE, f);
        fs.readdirSync(BK).filter(function (x) { return /^data-.*\.json$/.test(x); }).sort().slice(0, -30).forEach(function (x) { fs.unlinkSync(path.join(BK, x)); });
        return n;
      });
    }
  };
};
