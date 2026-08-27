# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.12.6 create --template minimal --types ts --add prettier sveltekit-adapter="adapter:cloudflare+cfTarget:workers" mcp="ide:claude-code,other,gemini,opencode,vscode+setup:remote" --install pnpm domain-parking
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Visitor analytics

Visits are recorded in Cloudflare D1 (binding `DB`, database `domain-parking`),
one detailed row per page view.

### How a visit is recorded

1. `+page.server.ts` reads the current snapshot on SSR — it never writes.
2. The browser POSTs `/api/visitor` from `onMount` with a few client hints
   (`path`, `referrer`, `language`, `timezone`, `viewport`).
3. `trackVisitorStats()` classifies the request, then runs a single D1 batch
   (one transaction): read the previous human visitor, insert this visit, and
   atomically bump the `total_visits` counter.

Bot traffic is still written to `visits` with `is_bot = 1` and a `bot_reason`
(`user-agent-pattern`, `verified-bot`, `bot-score`, `prefetch`,
`cross-site-fetch`, `unexpected-fetch-dest`, `foreign-origin`,
`missing-user-agent`) so it can be analysed or excluded later. Only non-bot
visits increment the public counter.

No IP address is stored. `visitor_hash` is a per-day
`SHA-256(salt + day + ip + user-agent)` truncated to 128 bits, so unique
visitors can be counted within a day without persisting anything identifying.
Set a `VISITOR_HASH_SALT` secret to make those hashes unguessable:

```sh
pnpm wrangler secret put VISITOR_HASH_SALT
```

### Setup

```sh
# local (miniflare) database
pnpm db:migrate:local

# production database
pnpm db:migrate

# one-time: carry the old KV counter over so the number does not reset
pnpm db:seed-total-visits
```

### Example queries

```sh
# visits per day, humans only
pnpm wrangler d1 execute domain-parking --remote --command \
  "SELECT day, COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS uniques
   FROM visits WHERE is_bot = 0 GROUP BY day ORDER BY day DESC LIMIT 30"

# which parked domains get traffic
pnpm wrangler d1 execute domain-parking --remote --command \
  "SELECT hostname, COUNT(*) AS visits FROM visits
   WHERE is_bot = 0 GROUP BY hostname ORDER BY visits DESC"

# top countries
pnpm wrangler d1 execute domain-parking --remote --command \
  "SELECT country, COUNT(*) AS visits FROM visits
   WHERE is_bot = 0 GROUP BY country ORDER BY visits DESC LIMIT 20"

# where visitors came from
pnpm wrangler d1 execute domain-parking --remote --command \
  "SELECT referrer_host, COUNT(*) AS visits FROM visits
   WHERE is_bot = 0 AND referrer_host IS NOT NULL
   GROUP BY referrer_host ORDER BY visits DESC LIMIT 20"

# what is being filtered as automated traffic
pnpm wrangler d1 execute domain-parking --remote --command \
  "SELECT bot_reason, COUNT(*) AS hits FROM visits
   WHERE is_bot = 1 GROUP BY bot_reason ORDER BY hits DESC"
```
