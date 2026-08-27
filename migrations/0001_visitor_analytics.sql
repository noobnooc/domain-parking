-- Detailed visit log. One row per tracked page view, bots included so they can be
-- filtered (or analysed) later instead of being thrown away at write time.
CREATE TABLE visits (
	id INTEGER PRIMARY KEY AUTOINCREMENT,

	-- When
	created_at INTEGER NOT NULL, -- unix epoch milliseconds
	day TEXT NOT NULL,           -- 'YYYY-MM-DD' in UTC, for cheap rollups

	-- Which parked domain / page
	hostname TEXT,
	origin TEXT,
	path TEXT,

	-- Where the visit came from
	referrer TEXT,
	referrer_host TEXT,

	-- Cloudflare edge geo / network data
	country TEXT,
	region TEXT,
	city TEXT,
	cf_timezone TEXT,
	colo TEXT,
	asn INTEGER,
	as_organization TEXT,

	-- Request headers
	user_agent TEXT,
	accept_language TEXT,

	-- Client-reported hints
	client_language TEXT,
	client_timezone TEXT,
	viewport TEXT,

	-- Rotating per-day hash of ip + user agent. Lets us count unique visitors
	-- without ever storing an IP address.
	visitor_hash TEXT,

	-- Bot classification
	is_bot INTEGER NOT NULL DEFAULT 0,
	bot_reason TEXT,
	bot_score INTEGER
);

-- Newest human visit (footer "last visitor").
CREATE INDEX idx_visits_recent_human ON visits (is_bot, id DESC);
-- Time range scans.
CREATE INDEX idx_visits_created_at ON visits (created_at DESC);
-- Daily rollups.
CREATE INDEX idx_visits_day ON visits (day, is_bot);
-- Per-domain breakdowns.
CREATE INDEX idx_visits_hostname ON visits (hostname, day);
-- Unique visitors per day.
CREATE INDEX idx_visits_visitor_hash ON visits (visitor_hash, day);

-- O(1) counters so the footer never has to COUNT(*) over the whole log.
CREATE TABLE visit_counters (
	name TEXT PRIMARY KEY,
	value INTEGER NOT NULL DEFAULT 0
);

-- Seeded at 0. Run `pnpm db:seed-total-visits` once to carry over the legacy
-- KV counter so the public number does not reset.
INSERT INTO visit_counters (name, value) VALUES ('total_visits', 0);
