# DC Zone 6 Parking Checker

A small web app that answers one question: **can you get a Zone 6 residential parking permit at this address?**

Type in a DC address and it tells you which parking zone the address is in, whether that zone is 6, and whether the street the address is on actually takes part in the permit program. It also shows everything on a map.

## Why this exists

DC's Residential Permit Parking (RPP) program limits parking on residential streets to two hours unless you have a permit sticker for that zone. The zones mostly follow the city's eight wards, so Zone 6 is roughly Ward 6: Capitol Hill, Navy Yard, Southwest, H Street, NoMa and the surrounding neighborhoods.

The catch is that living inside the Zone 6 lines isn't enough. Your specific block has to be enrolled in the program, and plenty of blocks aren't. DDOT publishes all of this, but it's split across GIS layers that aren't much fun to dig through. This app puts both checks behind a single search box.

## What you'll see

After you search, you get one of four answers:

- **Yes:** the address is in Zone 6 and on (or right next to) an RPP block.
- **In Zone 6, but no RPP block nearby:** inside the boundary, but the street doesn't seem to be enrolled.
- **No, this is Zone N:** it's in a different zone.
- **Not in any zone:** the address probably isn't in DC.

The map shows the Zone 6 outline in orange, your address as a dot, and any nearby RPP blocks in blue, along with their address ranges and which side of the street is permitted. If the address search drops the pin in the wrong spot, you can click anywhere on the map to check that point instead.

## Where the data comes from

None of the parking data is stored in this app. Every search asks DC's own GIS servers in real time, using DDOT's *Residential/Visitor Parking Zones* and *Residential Parking Permit Blocks* layers. Whenever DDOT updates its data, the app picks up the change automatically.

Addresses are turned into map coordinates with OpenStreetMap's free Nominatim service. That happens on the server, through a small Netlify Function, rather than in your browser. The map tiles come from Esri, with OpenStreetMap as a fallback. Nothing in the app needs an API key.

If you want a saved copy of the Zone 6 data, for history or to compare changes over time, `npm run snapshot` downloads it into the `data/` folder as GeoJSON.

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