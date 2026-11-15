-- ساختار پیشنهادی برای PostgreSQL (برای MySQL: JSONB را JSON و SERIAL را AUTO_INCREMENT بگذار)
CREATE TABLE categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort INT NOT NULL DEFAULT 0);
CREATE TABLE products (
  id VARCHAR(40) PRIMARY KEY, name TEXT NOT NULL, price BIGINT NOT NULL CHECK (price >= 0),
  category TEXT, stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes JSONB NOT NULL DEFAULT '[]', colors JSONB NOT NULL DEFAULT '[]', images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE orders (
  id BIGINT PRIMARY KEY, ts BIGINT NOT NULL, date_fa TEXT, customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
  total BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'در انتظار', paid BOOLEAN NOT NULL DEFAULT false,
  authority TEXT, ref_id TEXT, track TEXT, note TEXT
);
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(40), product_name TEXT, title TEXT NOT NULL, qty INT NOT NULL, price BIGINT NOT NULL
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);          -- tg, ig, rb, phone
CREATE TABLE pages (slug TEXT PRIMARY KEY, body TEXT NOT NULL);    -- about, terms, faq
CREATE TABLE users (role TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);     -- secret, ver, order_seq
CREATE INDEX orders_ts ON orders (ts DESC);
