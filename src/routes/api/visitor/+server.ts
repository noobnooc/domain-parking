import { json } from '@sveltejs/kit';
import { trackVisitorStats, type VisitorClientHints } from '$lib/server/visitor-stats';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform, request, url }) => {
	const visitorStats = await trackVisitorStats(platform, request, {
		currentHostname: url.hostname,
		currentOrigin: url.origin,
		hints: await readHints(request)
	});

	return json(
		{ visitorStats },
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};

/**
 * Client hints are optional and fully untrusted; every field is validated and
 * clamped before it reaches the database.
 */
async function readHints(request: Request): Promise<VisitorClientHints> {
	try {
		const payload: unknown = await request.json();

		return payload && typeof payload === 'object' ? (payload as VisitorClientHints) : {};
	} catch {
		return {};
	}
}
