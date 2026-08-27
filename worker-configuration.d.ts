/* eslint-disable */

interface Fetcher {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Result<T = Record<string, unknown>> {
	results: T[];
	success: boolean;
	meta: Record<string, unknown>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	exec(query: string): Promise<{ count: number; duration: number }>;
}

interface IncomingRequestCfProperties {
	asn?: number;
	asOrganization?: string;
	botManagement?: {
		score?: number;
		verifiedBot?: boolean;
	};
	city?: string;
	colo?: string;
	country?: string;
	region?: string;
	timezone?: string;
	verifiedBotCategory?: string;
}

declare namespace Cloudflare {
	interface Env {
		ASSETS: Fetcher;
		DB?: D1Database;
		VISITOR_HASH_SALT?: string;
	}
}

interface Env extends Cloudflare.Env {}
