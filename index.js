'use strict';
// انتخاب لایه‌ی ذخیره‌سازی. سرور فقط از همین رابط استفاده می‌کند.
// برای PostgreSQL/MySQL یک فایل db/postgres.js با همان متدها بنویس (docs/DB-MIGRATION.md) و DB_DRIVER=postgres بگذار.
module.exports = function (dir) {
  const d = (process.env.DB_DRIVER || 'json').toLowerCase();
  if (d === 'json') return require('./json')(dir);
  throw new Error('DB_DRIVER=' + d + ' هنوز نوشته نشده. راهنما: docs/DB-MIGRATION.md');
};
