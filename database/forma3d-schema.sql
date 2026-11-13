-- FORMA3D test-only D1 schema. Run manually against a dedicated preview database.
CREATE TABLE IF NOT EXISTS forma3d_orders (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 status TEXT NOT NULL DEFAULT 'Nieuw' CHECK(status IN ('Nieuw','In productie','Gereed','Verzonden','Afgerond')),
 items_json TEXT NOT NULL,
 total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
 note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_forma3d_orders_created ON forma3d_orders(created_at DESC);
