import { json } from '@sveltejs/kit';
import { trackVisitorStats } from '$lib/server/visitor-stats';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform, request, url }) => {
	const visitorStats = await trackVisitorStats(platform, request, {
		currentHostname: url.hostname,
		currentOrigin: url.origin
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
