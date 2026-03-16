const KEY_LAST_VISITOR = 'last-visitor';
const KEY_TOTAL_VISITS = 'total-visits';

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

export async function trackVisitorStats(
	platform: App.Platform | undefined,
	options: {
		currentHostname?: string;
		currentOrigin?: string;
	} = {}
): Promise<VisitorStatsSnapshot> {
	const kv = platform?.env.KV;

	if (!kv) {
		return {
			enabled: false,
			totalVisits: null,
			lastVisitor: null
		};
	}

	const lastVisitor = await kv.get<LastVisitor>(KEY_LAST_VISITOR, 'json');
	const currentVisitor = createCurrentVisitor(platform.cf, options);

	if (currentVisitor) {
		await kv.put(KEY_LAST_VISITOR, JSON.stringify(currentVisitor));
	}

	const totalVisits = parseVisitCount(await kv.get(KEY_TOTAL_VISITS));
	const nextTotalVisits = totalVisits + 1;

	await kv.put(KEY_TOTAL_VISITS, String(nextTotalVisits));

	return {
		enabled: true,
		totalVisits: nextTotalVisits,
		lastVisitor
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
