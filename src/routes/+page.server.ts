import { getVisitorStats } from '$lib/server/visitor-stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => ({
	hostname: url.hostname,
	visitorStats: await getVisitorStats(platform)
});
