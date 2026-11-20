// Saves a copy of DC's Zone 6 parking data into ./data as GeoJSON.
// The app itself always queries DC live; this is for keeping a record in git,
// diffing changes over time, or working offline.
//
//   npm run snapshot
//
import { mkdir, writeFile } from 'node:fs/promises';
import { ZONE, GIS, ZONES_LAYER, BLOCKS_LAYER } from '../src/lib/config.js';

const OUT = new URL('../data/', import.meta.url);

/**
 * Fetch every feature matching `where`, following ArcGIS pagination.
 * @param {number} layer
 * @param {string} where
 */
async function fetchAll(layer, where) {
	const features = [];
	for (let offset = 0; ; ) {
		const qs = new URLSearchParams({
			f: 'geojson',
			where,
			outFields: '*',
			outSR: '4326',
			returnGeometry: 'true',
			resultOffset: String(offset),
			resultRecordCount: '1000',
			orderByFields: 'OBJECTID'
		});
		const res = await fetch(`${GIS}/${layer}/query?${qs}`);
		if (!res.ok) throw new Error(`Layer ${layer}: HTTP ${res.status}`);
		const body = await res.json();
		if (body.error) throw new Error(`Layer ${layer}: ${body.error.message}`);
		features.push(...(body.features ?? []));
		const more = body.exceededTransferLimit ?? body.properties?.exceededTransferLimit;
		if (!more || !body.features?.length) break;
		offset += body.features.length;
	}
	return { type: 'FeatureCollection', features };
}

/**
 * WARD_ID is a string on some DC layers and a number on others; try both.
 * @param {number} layer
 */
async function fetchBlocksForWard(layer) {
	try {
		return await fetchAll(layer, `WARD_ID = '${ZONE}'`);
	} catch {
		return await fetchAll(layer, `WARD_ID = ${ZONE}`);
	}
}

await mkdir(OUT, { recursive: true });

const zone = await fetchAll(ZONES_LAYER, `RPP_ZONE = ${ZONE}`);
await writeFile(new URL(`zone${ZONE}-boundary.geojson`, OUT), JSON.stringify(zone, null, 1));
console.log(`zone${ZONE}-boundary.geojson: ${zone.features.length} polygons`);

const blocks = await fetchBlocksForWard(BLOCKS_LAYER);
await writeFile(new URL(`zone${ZONE}-rpp-blocks.geojson`, OUT), JSON.stringify(blocks, null, 1));
console.log(`zone${ZONE}-rpp-blocks.geojson: ${blocks.features.length} blocks`);

const meta = { source: GIS, layers: { zones: ZONES_LAYER, blocks: BLOCKS_LAYER }, fetched: new Date().toISOString() };
await writeFile(new URL('snapshot.json', OUT), JSON.stringify(meta, null, 2) + '\n');
console.log('Done.');
