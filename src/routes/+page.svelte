<script>
	import { onMount } from 'svelte';
	import ParkingMap from '#lib/ParkingMap.svelte';
	import { ZONE, BLOCK_SEARCH_METERS } from '#lib/config.js';
	import { loadZoneBoundary, checkPoint, geocode, blockRow } from '#lib/gis.js';

	let query = $state('');
	/** @type {'idle' | 'loading' | 'choose' | 'done' | 'error'} */
	let status = $state('idle');
	let message = $state('');
	let boundary = $state(null);
	let boundaryError = $state('');
	/** @type {Array<{ lat: number, lon: number, label: string, importance: number }>} */
	let candidates = $state([]);
	/** @type {any} */
	let result = $state(null);

	let rows = $derived(result?.blocks?.features?.map(blockRow) ?? []);
	let mapResult = $derived(
		result ? { lat: result.lat, lon: result.lon, label: result.label, blocks: result.blocks } : null
	);

	onMount(() => {
		loadZoneBoundary()
			.then((gj) => (boundary = gj))
			.catch((e) => (boundaryError = e.message));
	});

	/**
	 * @param {number} lat
	 * @param {number} lon
	 * @param {string} label
	 */
	async function check(lat, lon, label) {
		status = 'loading';
		message = 'Checking zone…';
		try {
			const r = await checkPoint(lat, lon);
			result = { ...r, lat, lon, label };
			status = 'done';
		} catch (e) {
			fail(e);
		}
	}

	/** @param {unknown} e */
	function fail(e) {
		status = 'error';
		message = e instanceof Error ? e.message : String(e);
	}

	/** @param {SubmitEvent} event */
	async function onsubmit(event) {
		event.preventDefault();
		const q = query.trim();
		if (!q) return;
		status = 'loading';
		message = 'Finding address…';
		try {
			const hits = await geocode(q);
			if (!hits.length) {
				status = 'error';
				message = 'Address not found. Try adding the quadrant (NW/NE/SE/SW), or click the map at the location.';
				return;
			}
			if (hits.length === 1 || hits[0].importance > hits[1].importance + 0.15) {
				const h = hits[0];
				return check(h.lat, h.lon, h.label);
			}
			candidates = hits;
			status = 'choose';
		} catch (e) {
			fail(e);
		}
	}

	/**
	 * @param {number} lat
	 * @param {number} lon
	 */
	function onpick(lat, lon) {
		check(lat, lon, `Map point ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
	}
</script>

<header>
	<h1>Is this address in DC parking Zone {ZONE}?</h1>
	<p>Checks the address against DDOT's Residential Permit Parking zones and RPP blocks.</p>
</header>

<form {onsubmit}>
	<label class="sr-only" for="q">DC street address</label>
	<input id="q" bind:value={query} placeholder="e.g. 700 Pennsylvania Ave SE" autocomplete="street-address" required />
	<button type="submit" disabled={status === 'loading'}>Check</button>
</form>

<main>
	<section aria-live="polite">
		{#if boundaryError}
			<div class="verdict maybe"><b>Couldn't load the zone map</b>{boundaryError}</div>
		{/if}

		{#if status === 'idle'}
			<small>Enter a DC street address with its quadrant (NW, NE, SE, SW) for best results.</small>
		{:else if status === 'loading'}
			<small>{message}</small>
		{:else if status === 'error'}
			<div class="verdict maybe"><b>Lookup failed</b>{message}</div>
		{:else if status === 'choose'}
			<p><small>Several matches. Pick one:</small></p>
			<div class="cands">
				{#each candidates as c (c.label)}
					<button type="button" onclick={() => check(c.lat, c.lon, c.label)}>{c.label}</button>
				{/each}
			</div>
		{:else if status === 'done' && result}
			<div class="verdict {result.verdict.kind}">
				<b>{result.verdict.head}</b>{result.verdict.body}
			</div>
			<p><small>Matched location:</small><br />{result.label}</p>
			{#if result.zone}
				<p>
					<small>Zone polygon:</small>
					{result.zone.NAME ?? ''} · RPP zone {result.zone.RPP_ZONE}{result.zone.ANC_ID ? ` · ANC ${result.zone.ANC_ID}` : ''}
				</p>
			{/if}
			{#if rows.length}
				<p><small>RPP blocks within ~{BLOCK_SEARCH_METERS} m</small></p>
				<table>
					<thead><tr><th>Block</th><th>Addresses</th><th>Ward</th><th>RPP side</th></tr></thead>
					<tbody>
						{#each rows as r, i (i)}
							<tr><td>{r.name}</td><td class="num">{r.range}</td><td>{r.ward}</td><td>{r.side}</td></tr>
						{/each}
					</tbody>
				</table>
			{/if}
			<p><small>Wrong spot? Click the map to check a different point.</small></p>
		{/if}
	</section>

	<ParkingMap {boundary} result={mapResult} {onpick} />
</main>

<footer>
	<small>
		Data: DDOT via DC GIS (Residential/Visitor Parking Zones, RPP Blocks), queried live. Geocoding: OpenStreetMap
		Nominatim. This is not an official eligibility determination: check the posted signs and DC DMV.
	</small>
	<div></div>
	<small>
		Site managed by Scumble, to contact you can reach me via my <a href="https://scumble.dev">blog</a> or via my <a href="https://github.com/Skumbl">Github</a>
	</small>
</footer>

<style>
	:global(:root) {
		color-scheme: light dark;
		--bg: light-dark(#ffffff, #141414);
		--ink: light-dark(#111, #eee);
		--mute: light-dark(#666, #aaa);
		--line: light-dark(#ddd, #333);
		--panel: light-dark(#fafafa, #1c1c1c);
		--yes: #1f8a4c;
		--no: #b3261e;
		--maybe: #b26a00;
		--zone: #d94f00;
	}
	:global(*) {
		box-sizing: border-box;
		min-width: 0;
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
	header {
		padding: 20px max(4vw, 16px) 8px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 4vw, 34px);
		line-height: 1.1;
	}
	header p {
		margin: 4px 0 0;
		color: var(--mute);
	}
	form {
		display: flex;
		gap: 8px;
		padding: 12px max(4vw, 16px);
		flex-wrap: wrap;
	}
	input {
		flex: 1 1 280px;
		font: inherit;
		font-size: 16px;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: transparent;
		color: inherit;
	}
	button {
		font: inherit;
		padding: 10px 18px;
		border: 0;
		border-radius: 8px;
		background: var(--zone);
		color: #fff;
		cursor: pointer;
		min-height: 44px;
	}
	button:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	button:focus-visible,
	input:focus-visible {
		outline: 3px solid var(--zone);
		outline-offset: 2px;
	}
	main {
		display: grid;
		grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
		gap: 16px;
		padding: 0 max(4vw, 16px) 24px;
	}
	.verdict {
		border-left: 6px solid var(--line);
		padding: 10px 14px;
		margin-bottom: 12px;
		background: var(--panel);
		border-radius: 6px;
	}
	.verdict.yes {
		border-color: var(--yes);
	}
	.verdict.no {
		border-color: var(--no);
	}
	.verdict.maybe {
		border-color: var(--maybe);
	}
	.verdict b {
		display: block;
		font-size: 20px;
	}
	.cands button {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		color: inherit;
		border: 1px solid var(--line);
		margin-bottom: 6px;
		font-size: 14px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	th,
	td {
		text-align: left;
		padding: 4px 6px;
		border-bottom: 1px solid var(--line);
		vertical-align: top;
	}
	td.num {
		white-space: nowrap;
	}
	small {
		color: var(--mute);
	}
	footer {
		padding: 0 max(4vw, 16px) 24px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	@media (max-width: 760px) {
		main {
			grid-template-columns: 1fr;
		}
	}
</style>
