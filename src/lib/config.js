// Everything you might need to change lives here.

/** The RPP zone this checker answers for. */
export const ZONE = 6;

/** DC GIS (DDOT) parking map service. */
export const GIS =
	'https://maps2.dcgis.dc.gov/DCGIS/rest/services/DCGIS_DATA/Transportation_Parking_WebMercator/MapServer';

/** Layer ids on that service. If DC renumbers them, lookups fail: update these. */
export const ZONES_LAYER = 165; // RPP zone polygons, field RPP_ZONE
export const BLOCKS_LAYER = 79; // RPP blocks (street centerlines with address ranges)

/** How far from the address to look for RPP blocks, in meters. */
export const BLOCK_SEARCH_METERS = 45;

/** Bounding box of DC: west, north, east, south. */
export const DC_VIEWBOX = '-77.1198,38.9958,-76.9094,38.7916';

export const BLOCK_FIELDS = [
	'ROUTENAME',
	'QUADRANT',
	'WARD_ID',
	'ANC_ID',
	'RPPSIDE',
	'ADDRESS_RANGE_LEFT_LOW',
	'ADDRESS_RANGE_LEFT_HIGH',
	'ADDRESS_RANGE_RIGHT_LOW',
	'ADDRESS_RANGE_RIGHT_HIGH',
	'BLOCK_NAME'
].join(',');
