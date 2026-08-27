const TOTAL_VISITS_COUNTER = 'total_visits';
const DEFAULT_HASH_SALT = 'domain-parking';
const BOT_USER_AGENT_PATTERN =
	/bot|crawl|spider|slurp|archiver|transcoder|facebookexternalhit|facebot|ia_archiver|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|embedly|quora link preview|curl|wget|python-requests|python\/|go-http-client|node-fetch|axios|postman|insomnia|headless|puppeteer|playwright|selenium|phantomjs|lighthouse|pingdom|uptime|monitoring/i;

const SELECT_LAST_VISITOR = `
	SELECT city, country, hostname, origin, created_at
	FROM visits
	WHERE is_bot = 0
	ORDER BY id DESC
	LIMIT 1
`;

const SELECT_TOTAL_VISITS = `SELECT value FROM visit_counters WHERE name = ?`;

const INCREMENT_TOTAL_VISITS = `
	INSERT INTO visit_counters (name, value)
	VALUES (?, 1)
	ON CONFLICT (name) DO UPDATE SET value = visit_counters.value + 1
	RETURNING value
`;

const VISIT_COLUMNS = [
	'created_at',
	'day',
	'hostname',
	'origin',
	'path',
	'referrer',
	'referrer_host',
	'country',
	'region',
	'city',
	'cf_timezone',
	'colo',
	'asn',
	'as_organization',
	'user_agent',
	'accept_language',
	'client_language',
	'client_timezone',
	'viewport',
	'visitor_hash',
	'is_bot',
	'bot_reason',
	'bot_score'
] as const;

const INSERT_VISIT = `
	INSERT INTO visits (${VISIT_COLUMNS.join(', ')})
	VALUES (${VISIT_COLUMNS.map(() => '?').join(', ')})
`;

export interface LastVisitor {
	city: string | null;
	country: string | null;
	flag: string | null;
	hostname: string | null;
	origin: string | null;
	timestamp: number;
}

export interface VisitorStatsSnapshot {
	enabled: boolean;
	totalVisits: number | null;
	lastVisitor: LastVisitor | null;
}

/** Untrusted values sent by the browser alongside the tracking beacon. */
export interface VisitorClientHints {
	path?: unknown;
	referrer?: unknown;
	language?: unknown;
	timezone?: unknown;
	viewport?: unknown;
}

export interface TrackVisitorOptions {
	currentHostname?: string;
	currentOrigin?: string;
	hints?: VisitorClientHints;
}

interface LastVisitorRow {
	city: string | null;
	country: string | null;
	hostname: string | null;
	origin: string | null;
	created_at: number;
}

const DISABLED_SNAPSHOT: VisitorStatsSnapshot = {
	enabled: false,
	totalVisits: null,
	lastVisitor: null
};

const UNAVAILABLE_SNAPSHOT: VisitorStatsSnapshot = {
	enabled: true,
	totalVisits: null,
	lastVisitor: null
};

export async function getVisitorStats(
	platform: App.Platform | undefined
): Promise<VisitorStatsSnapshot> {
	const db = platform?.env.DB;

	if (!db) {
		return DISABLED_SNAPSHOT;
	}

	try {
		const [lastVisitorResult, totalVisitsResult] = await db.batch([
			db.prepare(SELECT_LAST_VISITOR),
			db.prepare(SELECT_TOTAL_VISITS).bind(TOTAL_VISITS_COUNTER)
		]);

		return {
			enabled: true,
			totalVisits: readTotalVisits(totalVisitsResult),
			lastVisitor: readLastVisitor(lastVisitorResult)
		};
	} catch (error) {
		console.error('Failed to read visitor stats', error);

		return UNAVAILABLE_SNAPSHOT;
	}
}

/**
 * Writes one detailed row per visit and returns the snapshot to render. Bot
 * traffic is still recorded (flagged, with the reason) so it can be analysed
 * later, but it does not move the public counter.
 */
export async function trackVisitorStats(
	platform: App.Platform | undefined,
	request: Request,
	options: TrackVisitorOptions = {}
): Promise<VisitorStatsSnapshot> {
	const db = platform?.env.DB;

	if (!db) {
		return DISABLED_SNAPSHOT;
	}

	try {
		const botReason = detectBot(request, platform?.cf, options.currentOrigin);
		const values = await buildVisitValues(platform, request, options, botReason);

		// A single D1 batch runs as one transaction: the last-visitor read sees the
		// state before this visit, and the counter increment cannot race.
		const [lastVisitorResult, , totalVisitsResult] = await db.batch([
			db.prepare(SELECT_LAST_VISITOR),
			db.prepare(INSERT_VISIT).bind(...values),
			botReason
				? db.prepare(SELECT_TOTAL_VISITS).bind(TOTAL_VISITS_COUNTER)
				: db.prepare(INCREMENT_TOTAL_VISITS).bind(TOTAL_VISITS_COUNTER)
		]);

		return {
			enabled: true,
			totalVisits: readTotalVisits(totalVisitsResult),
			lastVisitor: readLastVisitor(lastVisitorResult)
		};
	} catch (error) {
		console.error('Failed to record visit', error);

		return getVisitorStats(platform);
	}
}

async function buildVisitValues(
	platform: App.Platform | undefined,
	request: Request,
	options: TrackVisitorOptions,
	botReason: string | null
): Promise<unknown[]> {
	const cf = platform?.cf;
	const hints = options.hints ?? {};
	const timestamp = Date.now();
	const day = new Date(timestamp).toISOString().slice(0, 10);
	const referrer = clampText(hints.referrer, 1024);

	return [
		timestamp,
		day,
		normalizeHostname(options.currentHostname),
		normalizeOrigin(options.currentOrigin),
		normalizePath(hints.path),
		referrer,
		toHost(referrer),
		normalizeLocation(cf?.country)?.toUpperCase() ?? null,
		normalizeLocation(cf?.region),
		normalizeLocation(cf?.city),
		clampText(cf?.timezone, 64),
		clampText(cf?.colo, 16),
		typeof cf?.asn === 'number' ? cf.asn : null,
		clampText(cf?.asOrganization, 128),
		clampText(request.headers.get('user-agent'), 512),
		clampText(request.headers.get('accept-language'), 256),
		clampText(hints.language, 64),
		clampText(hints.timezone, 64),
		normalizeViewport(hints.viewport),
		await hashVisitor(platform, request, day),
		botReason ? 1 : 0,
		botReason,
		typeof cf?.botManagement?.score === 'number' ? cf.botManagement.score : null
	];
}

function readTotalVisits(result: D1Result | undefined): number | null {
	const value = result?.results?.[0]?.value;

	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readLastVisitor(result: D1Result | undefined): LastVisitor | null {
	const row = result?.results?.[0] as LastVisitorRow | undefined;

	if (!row) {
		return null;
	}

	return {
		city: row.city,
		country: row.country,
		flag: toFlagEmoji(row.country),
		hostname: row.hostname,
		origin: row.origin,
		timestamp: row.created_at
	};
}

/**
 * Builds a per-day rotating fingerprint so unique visitors can be counted
 * without ever persisting an IP address.
 */
async function hashVisitor(
	platform: App.Platform | undefined,
	request: Request,
	day: string
): Promise<string | null> {
	const ip = request.headers.get('cf-connecting-ip');

	if (!ip) {
		return null;
	}

	const salt = platform?.env.VISITOR_HASH_SALT || DEFAULT_HASH_SALT;
	const material = [salt, day, ip, request.headers.get('user-agent') ?? ''].join('|');
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));

	return Array.from(new Uint8Array(digest).slice(0, 16))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/** Returns a short reason string when the request looks automated, else null. */
function detectBot(
	request: Request,
	cf: IncomingRequestCfProperties | undefined,
	currentOrigin?: string
): string | null {
	const userAgent = request.headers.get('user-agent');

	if (!userAgent) {
		return 'missing-user-agent';
	}

	if (BOT_USER_AGENT_PATTERN.test(userAgent)) {
		return 'user-agent-pattern';
	}

	if (cf?.botManagement?.verifiedBot || cf?.verifiedBotCategory) {
		return 'verified-bot';
	}

	if (typeof cf?.botManagement?.score === 'number' && cf.botManagement.score < 30) {
		return 'bot-score';
	}

	const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');

	if (purpose?.toLowerCase().includes('prefetch')) {
		return 'prefetch';
	}

	const secFetchSite = request.headers.get('sec-fetch-site');

	if (secFetchSite && secFetchSite !== 'same-origin') {
		return 'cross-site-fetch';
	}

	const secFetchDest = request.headers.get('sec-fetch-dest');

	if (secFetchDest && secFetchDest !== 'empty') {
		return 'unexpected-fetch-dest';
	}

	const origin = request.headers.get('origin');

	if (origin && currentOrigin && origin !== currentOrigin) {
		return 'foreign-origin';
	}

	return null;
}

function clampText(value: unknown, maxLength: number): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();

	return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeLocation(value: string | undefined): string | null {
	const normalized = value?.trim();

	return normalized ? normalized : null;
}

function normalizeHostname(value: string | undefined): string | null {
	const normalized = value?.trim().toLowerCase();

	return normalized ? normalized : null;
}

function normalizeOrigin(value: string | undefined): string | null {
	const normalized = clampText(value, 256);

	if (!normalized) {
		return null;
	}

	try {
		return new URL(normalized).origin;
	} catch {
		return null;
	}
}

function normalizePath(value: unknown): string | null {
	const normalized = clampText(value, 512);

	return normalized?.startsWith('/') ? normalized : null;
}

function normalizeViewport(value: unknown): string | null {
	const normalized = clampText(value, 16);

	return normalized && /^\d{1,5}x\d{1,5}$/.test(normalized) ? normalized : null;
}

function toHost(value: string | null): string | null {
	if (!value) {
		return null;
	}

	try {
		return new URL(value).hostname.toLowerCase();
	} catch {
		return null;
	}
}

function toFlagEmoji(country: string | null): string | null {
	if (!country || !/^[A-Z]{2}$/.test(country)) {
		return null;
	}

	return String.fromCodePoint(
		...country.split('').map((character) => 127397 + character.charCodeAt(0))
	);
}
