/* eslint-disable */

interface Fetcher {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface KVNamespaceListKey<KeyName extends string = string> {
	name: KeyName;
	expiration?: number;
	metadata?: unknown;
}

interface KVNamespaceListResult<KeyName extends string = string> {
	keys: KVNamespaceListKey<KeyName>[];
	list_complete: boolean;
	cursor?: string;
}

interface KVNamespace {
	get(key: string): Promise<string | null>;
	get(key: string, type: 'text'): Promise<string | null>;
	get<T>(key: string, type: 'json'): Promise<T | null>;
	put(
		key: string,
		value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
		options?: {
			expiration?: number;
			expirationTtl?: number;
			metadata?: unknown;
		}
	): Promise<void>;
	list(options?: {
		prefix?: string;
		limit?: number;
		cursor?: string;
	}): Promise<KVNamespaceListResult>;
}

interface IncomingRequestCfProperties {
	city?: string;
	country?: string;
}

declare namespace Cloudflare {
	interface Env {
		ASSETS: Fetcher;
		KV?: KVNamespace;
	}
}

interface Env extends Cloudflare.Env {}
