import { ZONE, GIS, ZONES_LAYER, BLOCKS_LAYER, BLOCK_SEARCH_METERS, BLOCK_FIELDS } from './config.js';

/**
 * @param {string} url
 * @returns {Promise<any>}
 */
async function getJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url, location.href).host}`);
	const body = await res.json();
	if (body?.error) throw new Error(body.error.message || 'GIS query failed');
	return body;
}

/**
 * Query a layer on the DC GIS parking service, returning GeoJSON in WGS84.
 * @param {number} layer
 * @param {Record<string, string>} params
 */
export function gisQuery(layer, params) {
	const qs = new URLSearchParams({ f: 'geojson', outSR: '4326', ...params });
	return getJson(`${GIS}/${layer}/query?${qs}`);
}

/** The Zone polygons, for drawing the boundary. */
export function loadZoneBoundary() {
	return gisQuery(ZONES_LAYER, { where: `RPP_ZONE=${ZONE}`, outFields: 'NAME,RPP_ZONE,ANC_ID' });
}

/**
 * Which zone a point is in, plus RPP blocks near it.
 * @param {number} lat
 * @param {number} lon
 */
export async function checkPoint(lat, lon) {
	const point = {
		geometry: `${lon},${lat}`,
		geometryType: 'esriGeometryPoint',
		inSR: '4326',
		spatialRel: 'esriSpatialRelIntersects'
	};
	const [zones, blocks] = await Promise.all([
		gisQuery(ZONES_LAYER, { ...point, outFields: 'NAME,RPP_ZONE,ANC_ID', returnGeometry: 'false' }),
		gisQuery(BLOCKS_LAYER, {
			...point,
			distance: String(BLOCK_SEARCH_METERS),
			units: 'esriSRUnit_Meter',
			outFields: BLOCK_FIELDS,
			returnGeometry: 'true'
		})
	]);
	const zone = zones.features?.[0]?.properties ?? null;
	return { zone, blocks, verdict: verdictFor(zone ? Number(zone.RPP_ZONE) : null, blocks.features?.length ?? 0) };
}

/**
 * @param {number | null} zoneNum
 * @param {number} blockCount
 * @returns {{ kind: 'yes' | 'maybe' | 'no', head: string, body: string }}
 */
export function verdictFor(zoneNum, blockCount) {
	if (zoneNum === ZONE && blockCount > 0) {
		return {
			kind: 'yes',
			head: `Yes, Zone ${ZONE}, on an RPP block`,
			body: `The address is inside Zone ${ZONE} and sits on or next to a block in the RPP program (shown in blue).`
		};
	}
	if (zoneNum === ZONE) {
		return {
			kind: 'maybe',
			head: `In Zone ${ZONE}, but no RPP block nearby`,
			body: `The address is inside the Zone ${ZONE} boundary, but its block does not appear to be in the RPP program. Residents can generally only get a permit if their own block is RPP-designated.`
		};
	}
	if (zoneNum) {
		return { kind: 'no', head: `No, this is Zone ${zoneNum}`, body: `The address falls in RPP Zone ${zoneNum}, not Zone ${ZONE}.` };
	}
	return {
		kind: 'no',
		head: 'Not in any DC RPP zone',
		body: 'The point did not fall inside a DC residential parking zone. Check that the address is in DC.'
	};
}

const SIDES = /** @type {Record<string, string>} */ ({ B: 'Both', N: 'North', S: 'South', E: 'East', W: 'West' });

/**
 * Flatten an RPP block feature into a table row.
 * @param {any} feature
 */
export function blockRow(feature) {
	const p = feature.properties;
	const nums = [p.ADDRESS_RANGE_LEFT_LOW, p.ADDRESS_RANGE_LEFT_HIGH, p.ADDRESS_RANGE_RIGHT_LOW, p.ADDRESS_RANGE_RIGHT_HIGH]
		.map(Number)
		.filter((n) => n > 0);
	return {
		name: p.BLOCK_NAME || `${p.ROUTENAME ?? ''} ${p.QUADRANT ?? ''}`.trim(),
		range: nums.length ? `${Math.min(...nums)}–${Math.max(...nums)}` : '',
		ward: p.WARD_ID ?? '',
		side: SIDES[p.RPPSIDE] ?? p.RPPSIDE ?? ''
	};
}

/**
 * Look up an address via this app's own /api/geocode route.
 * @param {string} q
 * @returns {Promise<Array<{ lat: number, lon: number, label: string, importance: number }>>}
 */
export function geocode(q) {
	return getJson(`/api/geocode?${new URLSearchParams({ q })}`);
}
