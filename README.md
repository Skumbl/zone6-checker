# DC Parking Zone Checker

A small web app that answers one question: **which residential parking zone is this DC address in, and can you get a permit there?**

Type in a DC address and it tells you which Residential Permit Parking (RPP) zone the address is in (1 through 8), and whether the street the address is on actually takes part in the permit program. It also shows everything on a map.

## Why this exists

DC's Residential Permit Parking program limits parking on residential streets to two hours unless you have a permit sticker for that zone. The zones mostly follow the city's eight wards, so Zone 6 is roughly Ward 6, Zone 1 is roughly Ward 1, and so on, but the lines don't match exactly.

The catch is that living inside a zone's lines isn't enough. Your specific block has to be enrolled in the program, and plenty of blocks aren't. DDOT publishes all of this, but it's split across GIS layers that aren't much fun to dig through. This app puts both checks behind a single search box.

## What you'll see

After you search, you get one of three answers:

- **Zone N, on an RPP block:** the address is in Zone N and on (or right next to) an RPP block, so residents can generally get a Zone N permit.
- **Zone N, but no RPP block nearby:** inside the Zone N boundary, but the street doesn't seem to be enrolled.
- **Not in any zone:** the address probably isn't in DC.

The map outlines every zone in gray (hover one to see its number) and highlights the address's zone in orange. Your address shows as a dot, and any nearby RPP blocks show in blue, along with their address ranges and which side of the street is permitted. If the address search drops the pin in the wrong spot, you can click anywhere on the map to check that point instead.

## Where the data comes from

None of the parking data is stored in this app. Every search asks DC's own GIS servers in real time, using DDOT's *Residential/Visitor Parking Zones* and *Residential Parking Permit Blocks* layers. Whenever DDOT updates its data, the app picks up the change automatically.

Addresses are turned into map coordinates with OpenStreetMap's free Nominatim service. That happens on the server, through a small Netlify Function, rather than in your browser. The map tiles come from Esri, with OpenStreetMap as a fallback. Nothing in the app needs an API key.

If you want a saved copy of the data, for history or to compare changes over time, `npm run snapshot` downloads every zone and RPP block into the `data/` folder as GeoJSON. Pass a zone number (`npm run snapshot -- 6`) to save just one zone.

## A word of caution

This is a convenience tool, not an official ruling. DDOT's data can lag behind what's posted on the street, and address matching isn't perfect. Before you count on a permit, check the signs on the block and confirm with DC DMV.

## Running it

It's built with SvelteKit and Leaflet and hosted on Netlify.

```sh
npm install
npm run dev
```

You'll need Node 22.17 or newer. Pushing to the connected repo redeploys the site on Netlify.

## Credits

Parking data from DDOT via DC GIS, licensed CC BY 4.0. Geocoding and map data © OpenStreetMap contributors. Map tiles © Esri.