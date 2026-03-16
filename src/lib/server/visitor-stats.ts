const KEY_LAST_VISITOR = 'last-visitor';
const KEY_TOTAL_VISITS = 'total-visits';
const BOT_USER_AGENT_PATTERN =
	/bot|crawl|spider|slurp|archiver|transcoder|facebookexternalhit|facebot|ia_archiver|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|embedly|quora link preview|curl|wget|python-requests|python\/|go-http-client|node-fetch|axios|postman|insomnia|headless|puppeteer|playwright|selenium|phantomjs|lighthouse|pingdom|uptime|monitoring/i;

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

interface BotAwareCfProperties extends IncomingRequestCfProperties {
	botManagement?: {
		score?: number;
		verifiedBot?: boolean;
	};
	verifiedBotCategory?: string;
}

export async function getVisitorStats(
	platform: App.Platform | undefined
): Promise<VisitorStatsSnapshot> {
	const kv = platform?.env.KV;

	if (!kv) {
		return {
			enabled: false,
			totalVisits: null,
			lastVisitor: null
		};
	}

	const [lastVisitor, totalVisitsValue] = await Promise.all([
		kv.get<LastVisitor>(KEY_LAST_VISITOR, 'json'),
		kv.get(KEY_TOTAL_VISITS)
	]);

	return {
		enabled: true,
		totalVisits: parseVisitCount(totalVisitsValue),
		lastVisitor
	};
}

export async function trackVisitorStats(
	platform: App.Platform | undefined,
	request: Request,
	options: {
		currentHostname?: string;
		currentOrigin?: string;
	} = {}
): Promise<VisitorStatsSnapshot> {
	const snapshot = await getVisitorStats(platform);
	const kv = platform?.env.KV;

	if (!kv || isBotRequest(request, platform?.cf, options.currentOrigin)) {
		return snapshot;
	}

	const currentVisitor = createCurrentVisitor(platform?.cf, options);
	const nextTotalVisits = (snapshot.totalVisits ?? 0) + 1;

	if (currentVisitor) {
		await kv.put(KEY_LAST_VISITOR, JSON.stringify(currentVisitor));
	}
	await kv.put(KEY_TOTAL_VISITS, String(nextTotalVisits));

	return {
		enabled: true,
		totalVisits: nextTotalVisits,
		lastVisitor: snapshot.lastVisitor
	};
}

function createCurrentVisitor(
	cf: IncomingRequestCfProperties | undefined,
	options: {
		currentHostname?: string;
		currentOrigin?: string;
	}
): LastVisitor | null {
	const country = normalizeLocation(cf?.country)?.toUpperCase() ?? null;
	const city = normalizeLocation(cf?.city);
	const hostname = normalizeHostname(options.currentHostname);
	const origin = normalizeOrigin(options.currentOrigin);

	if (!country && !city && !hostname) {
		return null;
	}

	return {
		city,
		country,
		flag: toFlagEmoji(country),
		hostname,
		origin,
		timestamp: Date.now()
	};
}

function normalizeLocation(value: string | undefined): string | null {
	const normalized = value?.trim();

	return normalized ? normalized : null;
}

function parseVisitCount(value: string | null): number {
	const parsed = Number.parseInt(value ?? '', 10);

	return Number.isFinite(parsed) ? parsed : 0;
}

function isBotRequest(
	request: Request,
	cf: IncomingRequestCfProperties | undefined,
	currentOrigin?: string
): boolean {
	const userAgent = request.headers.get('user-agent');

	if (!userAgent || BOT_USER_AGENT_PATTERN.test(userAgent)) {
		return true;
	}

	const botAwareCf = cf as BotAwareCfProperties | undefined;

	if (botAwareCf?.botManagement?.verifiedBot || botAwareCf?.verifiedBotCategory) {
		return true;
	}

	if (typeof botAwareCf?.botManagement?.score === 'number' && botAwareCf.botManagement.score < 30) {
		return true;
	}

	const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');

	if (purpose?.toLowerCase().includes('prefetch')) {
		return true;
	}

	const secFetchSite = request.headers.get('sec-fetch-site');

	if (secFetchSite && secFetchSite !== 'same-origin') {
		return true;
	}

	const secFetchDest = request.headers.get('sec-fetch-dest');

	if (secFetchDest && secFetchDest !== 'empty') {
		return true;
	}

	const origin = request.headers.get('origin');

	if (origin && currentOrigin && origin !== currentOrigin) {
		return true;
	}

	return false;
}

function normalizeHostname(value: string | undefined): string | null {
	const normalized = value?.trim().toLowerCase();

	return normalized ? normalized : null;
}

function normalizeOrigin(value: string | undefined): string | null {
	const normalized = value?.trim();

	if (!normalized) {
		return null;
	}

	try {
		return new URL(normalized).origin;
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
