#!/usr/bin/env node
// One-time carry-over of the legacy KV visit counter into D1.
//
// Before D1, the public visit count lived in a Cloudflare KV namespace under
// the `total-visits` key. This script reads that value and adds it to the D1
// `total_visits` counter so the number on the page does not reset.
//
// It is idempotent: a `legacy_kv_visits` marker row is written on the first
// successful run and blocks any later run from adding the baseline twice.
// Once it has been run against production, this script can be deleted.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LEGACY_KV_NAMESPACE_ID = '864ee0bc5e7844679278f13f65f334b2';
const LEGACY_KV_KEY = 'total-visits';
const DATABASE_NAME = 'domain-parking';

const target = process.argv.includes('--local') ? '--local' : '--remote';

function wrangler(args, { capture = false } = {}) {
	return execFileSync('wrangler', args, {
		encoding: 'utf8',
		stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit'
	});
}

function readLegacyCount() {
	const output = wrangler(
		['kv', 'key', 'get', LEGACY_KV_KEY, `--namespace-id=${LEGACY_KV_NAMESPACE_ID}`, '--remote'],
		{ capture: true }
	);

	const lastLine = output.trim().split('\n').at(-1)?.trim() ?? '';
	const parsed = Number.parseInt(lastLine, 10);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`Could not read a visit count from KV. Got: ${JSON.stringify(lastLine)}`);
	}

	return parsed;
}

const legacyCount = readLegacyCount();

console.log(`Legacy KV count: ${legacyCount}`);

if (legacyCount === 0) {
	console.log('Nothing to carry over.');
	process.exit(0);
}

const directory = mkdtempSync(join(tmpdir(), 'seed-total-visits-'));
const file = join(directory, 'seed.sql');

writeFileSync(
	file,
	`UPDATE visit_counters
SET value = value + ${legacyCount}
WHERE name = 'total_visits'
  AND NOT EXISTS (SELECT 1 FROM visit_counters WHERE name = 'legacy_kv_visits');

INSERT OR IGNORE INTO visit_counters (name, value) VALUES ('legacy_kv_visits', ${legacyCount});
`
);

try {
	wrangler(['d1', 'execute', DATABASE_NAME, target, `--file=${file}`, '--yes']);
	console.log(`Carried ${legacyCount} legacy visits into D1 (${target}).`);
} finally {
	rmSync(directory, { recursive: true, force: true });
}
