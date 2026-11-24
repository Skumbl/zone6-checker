// Saves a copy of DC's RPP parking data into ./data as GeoJSON.
// The app itself always queries DC live; this is for keeping a record in git,
// diffing changes over time, or working offline.
//
//   npm run snapshot        # every zone and every RPP block in DC
//   npm run snapshot -- 6   # just Zone 6 (blocks filtered by ward 6)
//
import { mkdir, writeFile } from 'node:fs/promises';
import { GIS, ZONES_LAYER, BLOCKS_LAYER } from '../src/lib/config.js';

const arg = process.argv[2];
const ZONE = arg ? Number(arg) : null;
if (arg && !(Number.isInteger(ZONE) && ZONE >= 1 && ZONE <= 8)) {
	console.error(`Zone must be a number from 1 to 8, got "${arg}"`);
	process.exit(1);
}

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
 * @param {number} ward
 */
async function fetchBlocksForWard(layer, ward) {
	try {
		return await fetchAll(layer, `WARD_ID = '${ward}'`);
	} catch {
		return await fetchAll(layer, `WARD_ID = ${ward}`);
	}
}

await mkdir(OUT, { recursive: true });

const prefix = ZONE ? `zone${ZONE}` : 'all-zones';

const zones = await fetchAll(ZONES_LAYER, ZONE ? `RPP_ZONE = ${ZONE}` : '1=1');
await writeFile(new URL(`${prefix}-boundary.geojson`, OUT), JSON.stringify(zones, null, 1));
console.log(`${prefix}-boundary.geojson: ${zones.features.length} polygons`);

const blocks = ZONE ? await fetchBlocksForWard(BLOCKS_LAYER, ZONE) : await fetchAll(BLOCKS_LAYER, '1=1');
await writeFile(new URL(`${prefix}-rpp-blocks.geojson`, OUT), JSON.stringify(blocks, null, 1));
console.log(`${prefix}-rpp-blocks.geojson: ${blocks.features.length} blocks`);

const meta = {
	source: GIS,
	layers: { zones: ZONES_LAYER, blocks: BLOCKS_LAYER },
	zone: ZONE ?? 'all',
	fetched: new Date().toISOString()
};
await writeFile(new URL('snapshot.json', OUT), JSON.stringify(meta, null, 2) + '\n');
console.log('Done.');
