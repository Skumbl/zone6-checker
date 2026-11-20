import { error } from '@sveltejs/kit';
import { GEOCODER_CONTACT } from '$app/env/private';
import { DC_VIEWBOX } from '#lib/config.js';

// Address lookup runs on the server so the browser never talks to the geocoder directly.
// That lets us send a proper User-Agent (Nominatim's policy), cache results,
// and later swap in a keyed geocoder (DC MAR, Esri) without exposing the key.

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) error(400, 'Missing ?q= address');
	if (q.length > 200) error(400, 'Address too long');

	const params = new URLSearchParams({
		format: 'jsonv2',
		q: /washington|\bdc\b/i.test(q) ? q : `${q}, Washington, DC`,
		countrycodes: 'us',
		viewbox: DC_VIEWBOX,
		bounded: '1',
		limit: '5'
	});

	let res;
	try {
		res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
			headers: {
				'User-Agent': `dc-zone6-checker/1.0${GEOCODER_CONTACT ? ` (${GEOCODER_CONTACT})` : ''}`,
				Referer: url.origin
			}
		});
	} catch {
		error(502, 'Could not reach the geocoder');
	}
	if (!res.ok) error(502, `Geocoder returned HTTP ${res.status}`);

	/** @type {Array<{ lat: string, lon: string, display_name: string, importance?: number }>} */
	const hits = await res.json();
	const results = hits.map((h) => ({
		lat: Number(h.lat),
		lon: Number(h.lon),
		label: h.display_name,
		importance: Number(h.importance ?? 0)
	}));

	return Response.json(results, {
		headers: { 'Cache-Control': 'public, max-age=86400' }
	});
}
