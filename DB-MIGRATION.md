# مهاجرت از JSON به PostgreSQL یا MySQL

## وضعیت فعلی
سرور (`server.js`) هیچ‌جا مستقیم به فایل JSON دست نمی‌زند. همه‌چیز از لایه‌ی `db/` رد می‌شود.
برای رفتن به SQL **فقط یک فایل جدید** لازم است و `server.js` عوض نمی‌شود.

> آداپتر PostgreSQL/MySQL **هنوز نوشته نشده و تست نشده است.** ساختار جدول‌ها (`db/schema.sql`) و رابط آماده‌اند.

## رابط (همه async)
| متد | کار |
|---|---|
| `init()` | اتصال و ساخت جدول‌ها |
| `getCatalog()` | `{cats, products, settings, pages}` |
| `saveCatalog({cats, products, settings})` | جایگزینی کامل دسته‌ها، محصولات و تنظیمات |
| `savePages(pages)` | `{about, terms, faq}` |
| `listOrders()` | همه‌ی سفارش‌ها، جدیدترین اول |
| `getOrder(id)` | یک سفارش یا `null` |
| `createOrder(order, need)` | **داخل یک تراکنش:** موجودی را چک و کم کن، شماره‌ی سفارش بده، ذخیره کن. کم بود: خطا با `code: 'STOCK'` |
| `updateOrder(id, patch)` | ویرایش فیلدهای سفارش |
| `getAuth()` / `setUser(role, rec)` / `bumpVer()` | کاربران، رمزها، نسخه‌ی نشست و کلید امضا |
| `exportAll()` | خروجی کامل بدون رمزها |
| `backup(force)` | بکاپ در سرور (برای SQL می‌تواند `pg_dump` باشد) |

## مراحل
1. `npm i pg` (یا `mysql2`)
2. فایل `db/postgres.js` را با همین متدها بنویس. (`getCatalog` از جدول‌های categories, products, settings, pages می‌خواند؛ `createOrder` با `SELECT ... FOR UPDATE` موجودی را قفل می‌کند.)
3. در `db/index.js` یک خط اضافه کن: `if (d === 'postgres') return require('./postgres')(dir);`
4. جدول‌ها را با `db/schema.sql` بساز.
5. داده‌ی قدیمی: با نسخه‌ی JSON سرور را اجرا کن، از پنل «دانلود فایل بکاپ» بگیر و با یک اسکریپت یک‌بارمصرف داخل جدول‌ها بریز. (`exportAll` همین ساختار را می‌دهد.)
6. `DB_DRIVER=postgres` و `DATABASE_URL=...` را در `.env` بگذار.

## نکته
عکس‌ها از قبل بیرون دیتابیس و در پوشه‌ی `data/uploads` هستند؛ به SQL ربطی ندارند و فقط آدرسشان (`/uploads/...`) ذخیره می‌شود. برای فضای ابری (S3 و مشابه) فقط تابع ذخیره‌ی عکس در `server.js` عوض می‌شود.
