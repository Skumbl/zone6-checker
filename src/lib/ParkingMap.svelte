<script>
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';

	/** @typedef {{ lat: number, lon: number, label: string, blocks: any }} MapResult */

	/** @type {{ boundary: any, result: MapResult | null, onpick: (lat: number, lon: number) => void }} */
	let { boundary, result, onpick } = $props();

	/** @type {HTMLDivElement} */
	let el;
	/** @type {typeof import('leaflet')} */
	let L;
	/** @type {import('leaflet').Map} */
	let map;
	/** @type {import('leaflet').GeoJSON | undefined} */
	let boundaryLayer;
	/** @type {import('leaflet').LayerGroup} */
	let resultLayer;
	let ready = $state(false);

	onMount(() => {
		let cancelled = false;
		// Leaflet touches `window`, so load it only in the browser.
		import('leaflet').then((mod) => {
			if (cancelled) return;
			L = mod.default ?? mod;
			map = L.map(el).setView([38.885, -76.995], 13);

			// Keyless basemaps. Switch in the top-right control if one stops loading.
			const esri = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
				{ maxZoom: 19, attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' }
			);
			const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			});
			esri.addTo(map);
			L.control.layers({ 'Esri streets': esri, OpenStreetMap: osm }, undefined, { position: 'topright' }).addTo(map);

			resultLayer = L.layerGroup().addTo(map);
			map.on('click', (/** @type {import('leaflet').LeafletMouseEvent} */ e) => onpick(e.latlng.lat, e.latlng.lng));
			ready = true;
		});
		return () => {
			cancelled = true;
			map?.remove();
		};
	});

	$effect(() => {
		if (!ready || !boundary) return;
		boundaryLayer?.remove();
		boundaryLayer = L.geoJSON(boundary, {
			style: { color: '#d94f00', weight: 2, fillOpacity: 0.08 }
		}).addTo(map);
		if (!result && boundaryLayer.getBounds().isValid()) {
			map.fitBounds(boundaryLayer.getBounds(), { padding: [10, 10] });
		}
	});

	$effect(() => {
		if (!ready) return;
		resultLayer.clearLayers();
		if (!result) return;
		if (result.blocks) {
			L.geoJSON(result.blocks, { style: { color: '#1f6feb', weight: 6, opacity: 0.75 } }).addTo(resultLayer);
		}
		// circleMarker avoids Leaflet's default icon images, which bundlers break.
		L.circleMarker([result.lat, result.lon], {
			radius: 9,
			color: '#fff',
			weight: 3,
			fillColor: '#d94f00',
			fillOpacity: 1
		})
			.bindPopup(result.label)
			.addTo(resultLayer)
			.openPopup();
		map.setView([result.lat, result.lon], 17);
	});
</script>

<div class="map" bind:this={el}></div>

<style>
	.map {
		height: min(72vh, 640px);
		border-radius: 10px;
		border: 1px solid var(--line);
	}
	@media (max-width: 760px) {
		.map {
			height: 55vh;
		}
	}
</style>
