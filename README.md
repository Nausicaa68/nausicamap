<p align="center">
  <img src="public/logo.svg" width="200" alt="NausicaMap logo: a chibi girl flying around the globe with a map pin">
</p>

<h1 align="center">NausicaMap</h1>

<p align="center">
  <strong>Relive your travels on an interactive map, right in your browser.</strong><br>
  Load your Google Maps Timeline export (or any JSON file with coordinates) and explore every place you have been: visits, trips, means of transport, timelapse replay and downloadable map screenshots. The file never leaves your device.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white">
  <img alt="OpenStreetMap" src="https://img.shields.io/badge/OpenStreetMap-tiles-7EBC6F?logo=openstreetmap&logoColor=white">
  <img alt="Vitest" src="https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/deploy-GitHub_Pages-222222?logo=githubpages&logoColor=white">
  <img alt="No backend" src="https://img.shields.io/badge/backend-none-success">
  <img alt="Privacy first" src="https://img.shields.io/badge/privacy-100%25_local-success">
  <img alt="Languages" src="https://img.shields.io/badge/i18n-EN_%7C_FR_%7C_JA-informational">
</p>

---

## Contents

- [How it works](#how-it-works)
- [Get your timeline file](#get-your-timeline-file)
- [Run the project locally](#run-the-project-locally)
- [Supported JSON formats](#supported-json-formats)
- [Information shown when you click a point](#information-shown-when-you-click-a-point)
- [Display modes](#display-modes)
- [Map screenshot](#map-screenshot)
- [Architecture](#architecture)
- [Privacy](#privacy)

---

## How it works

NausicaMap is a static website: there is no account, no server and no upload. Everything happens in your browser.

1. **Open NausicaMap.** The home page explains what the app does and how to get your file.
2. **Import your file.** Click **Choose a JSON file**, or drag and drop a `.json` file anywhere on the page. No file at hand? Click **Try with an example** to load a fictional two-day trip across Japan, whose points spell a giant "HI" between Nagoya and Tokyo.
3. **Explore the map.** Every position appears as a point. The map zooms to fit your data, and points get bigger and more contrasted as you zoom in. A message confirms how many positions were found, which format was recognised, and how many invalid entries were skipped.
4. **Click a point** to see everything the file says about it, in plain words: place visited, time spent, means of transport, distance, speed, local time, and more.
5. **Switch modes** in the **Display** panel (top right): trajectories with arrows, a timelapse replay, and a date filter that applies to everything.
6. **Take a screenshot** of the current view with the **📷 Screenshot** button, then download it.

Other handy things:

- **Home button:** the **NausicaMap** logo at the top left of the map brings you back to the home page. If a file is already loaded, **Back to the map** shows it again without re-importing it.
- **Languages:** the interface is available in **English** (default), **French** and **Japanese**. The **EN | FR | JA** switch, on the home page and in the map bar, changes the language instantly. Texts, popups, legend, dates and numbers all follow, and the choice is remembered in your browser.
- **Mobile friendly:** the layout, file picker, and screenshot work on phones too.

### Get your timeline file

Google Maps Timeline is now stored **on your phone**, not in your Google account, so the export is done from the phone itself. Google Takeout no longer contains it. Both Android and iPhone exports are supported.

#### Android

The export lives in the phone's system settings, not in the Google Maps app:

1. Open your phone's **Settings**.
2. Go to **Location** → **Location services** → **Timeline**.
3. Tap **Export Timeline data**, then **Continue**.
4. Save the file somewhere easy to find, for example **Downloads**. It is usually called `Timeline.json` (the name can be translated on phones set to another language).
5. Open NausicaMap on the phone, or move the file to your computer (USB cable, cloud drive, email to yourself…), then import it.

Menu names can vary slightly depending on the phone brand and its language.

#### iPhone

On iPhone, the export is done from the Google Maps app:

1. Open **Google Maps** and tap your **profile picture** (top right).
2. Go to **Settings** → **Personal content**.
3. Tap **Export Timeline data**.
4. Save the file, for example in the **Files** app or on iCloud Drive. It is usually called `location-history.json`.
5. Open NausicaMap on the iPhone, or move the file to your computer (AirDrop, iCloud Drive, email to yourself…), then import it.

Menu names can vary slightly depending on the app version and its language. To see what such a file looks like, open [`examples/location-history.json`](examples/location-history.json), a fictional iPhone export (a weekend in Nagoya, Japan).

> **Timeline empty after changing phones or reinstalling Google Maps?** Google may keep an encrypted backup of your Timeline. In Google Maps, open **Your Timeline**, then look for the backup or restore option (cloud icon) to bring your history back before exporting.

> 🔒 Your Timeline file is very personal. Keep it on your devices.

---

## Run the project locally

You only need this to work on the code or run NausicaMap on your own computer. Visitors of the published site do not need any of it.

### 1. Install Node.js

NausicaMap needs **Node.js 20.19+ or 22.12+** (the current LTS version is recommended), which includes **npm**.

1. Go to <https://nodejs.org> and download the **LTS** version.
   - **Windows:** choose the **Windows Installer (.msi)**, 64-bit, and keep the default options (make sure *Add to PATH* stays checked).
   - **macOS:** choose the **macOS Installer (.pkg)**.
   - **Linux:** use your package manager or [nvm](https://github.com/nvm-sh/nvm). The `.nvmrc` file lets you run `nvm use`.
2. **Close and reopen** your terminal (on Windows: Command Prompt or PowerShell), so it picks up the new installation.
3. Check that it works:

   ```bash
   node -v   # e.g. v24.x.x
   npm -v    # e.g. 11.x.x
   ```

> **`'npm' is not recognized as an internal or external command`?** The terminal was opened before Node.js was installed. Close every terminal window and open a new one. If it still fails, restart the computer or reinstall Node.js with *Add to PATH* checked.

### 2. Get the code

Either clone the repository:

```bash
git clone <repository-url> nausicamap
cd nausicamap
```

Or download it as a ZIP (on GitHub: **Code** → **Download ZIP**), extract it, and open a terminal in the extracted folder. On Windows, you can type `cmd` in the File Explorer address bar of that folder and press Enter.

### 3. Install the dependencies

```bash
npm install
```

This creates a `node_modules/` folder. It only needs to be run once, and again after `package.json` changes.

### 4. Start the development server

```bash
npm run dev
```

Open the address shown in the terminal, by default <http://localhost:5173>. The page reloads automatically when you edit the code. To stop the server, press `Ctrl + C` in the terminal.

### 5. Build and preview the production site

```bash
npm run build     # type-check + build the static site into dist/
npm run preview   # serve dist/ locally (http://localhost:4173) to test the build
```

`dist/` is a fully static website: any HTTP server can host it, without Node.js. The production build also adds the strict security policy described in [Privacy](#privacy).

### Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the unit tests once (Vitest) |
| `npm run test:watch` | Re-run the tests on every change |
| `npm run typecheck` | TypeScript check only |

---

## Supported JSON formats

The format is detected automatically. Its name is shown after the import.

### Google Maps Timeline export (Android phone)

This is the Android file described in [Get your timeline file](#get-your-timeline-file). Its root contains `semanticSegments`, `rawSignals` and `userLocationProfile`, and coordinates are written as text, for example `"35.1709°, 136.8815°"`.

| Location in the file | Shown on the map as | Date used |
| --- | --- | --- |
| `semanticSegments[].timelinePath[].point` | Path point | the point's `time` |
| `semanticSegments[].visit.topCandidate.placeLocation.latLng` | Place visited (home, work…) | segment start and end |
| `semanticSegments[].activity.start.latLng` / `end.latLng` | Start / end of a journey (with means of transport) | segment start / end |
| `semanticSegments[].activity.parking.location.latLng` | Parking | `parking.startTime` |
| `rawSignals[].position.LatLng` | Measured position (accuracy, source) | `position.timestamp` |
| `userLocationProfile.frequentPlaces[].placeLocation` | Frequent place | none |

All the other data in the file is used to enrich each point (see the next section).

### Google Maps Timeline export (iPhone)

This is the iPhone file described in [Get your timeline file](#get-your-timeline-file), usually called `location-history.json`. Its root is an **array of segments**, and it differs from the Android export in a few ways:

- coordinates are written as `"geo:35.170900,136.881500"`;
- numbers are written as text (`"0.931396"`, `"61234.5"`);
- codes are written in plain words (`"in passenger vehicle"`, `"Inferred Home"`);
- path points are dated by a number of minutes since the start of the segment (`durationMinutesOffsetFromStartTime`);
- there are no raw measurements (`rawSignals`) and no frequent places.

| Location in the file | Shown on the map as | Date used |
| --- | --- | --- |
| `[].timelinePath[].point` | Path point | segment start + `durationMinutesOffsetFromStartTime` |
| `[].visit.topCandidate.placeLocation` | Place visited (home, work…) | segment start and end |
| `[].activity.start` / `end` | Start / end of a journey (with means of transport) | segment start / end |

Each segment is converted to the Android structure and then read by the same code, so popups, statistics, trajectories and timelapse work exactly the same way. A fictional example is included: [`examples/location-history.json`](examples/location-history.json), a weekend in Nagoya, Japan (subway to Sakae and Osu Kannon, Atsuta Shrine, train to Nagoya Station, a bike ride to Higashiyama Zoo, a drive to Nagoya Castle and the Port of Nagoya Aquarium). Excerpt from that file (the path is shortened to its first two points):

```json
[
  {
    "endTime": "2026-05-16T15:20:00.000+09:00",
    "startTime": "2026-05-16T13:36:00.000+09:00",
    "visit": {
      "hierarchyLevel": "0",
      "topCandidate": {
        "probability": "0.901967",
        "semanticType": "Unknown",
        "placeID": "example-atsuta-jingu",
        "placeLocation": "geo:35.128300,136.908700"
      },
      "probability": "0.793374"
    }
  },
  {
    "endTime": "2026-05-16T15:44:00.000+09:00",
    "startTime": "2026-05-16T15:34:00.000+09:00",
    "activity": {
      "probability": "0.954227",
      "end": "geo:35.170900,136.881500",
      "topCandidate": {
        "type": "in train",
        "probability": "0.717581"
      },
      "distanceMeters": "5822.132086",
      "start": "geo:35.127000,136.911000"
    }
  },
  {
    "endTime": "2026-05-16T15:44:00.000+09:00",
    "startTime": "2026-05-16T15:34:00.000+09:00",
    "timelinePath": [
      {
        "point": "geo:35.127000,136.911000",
        "durationMinutesOffsetFromStartTime": "0"
      },
      {
        "point": "geo:35.132500,136.907667",
        "durationMinutesOffsetFromStartTime": "1"
      }
    ]
  }
]
```

### Generic JSON

For any other file, the parser walks the whole JSON (arrays and nested objects, at any depth) and keeps every object that contains one of these key pairs:

| Keys | Example |
| --- | --- |
| `latitude` / `longitude` | `{ "latitude": 35.17, "longitude": 136.88 }` |
| `lat` / `lng` | `{ "lat": 35.17, "lng": 136.88 }` |
| `lat` / `lon` | `{ "lat": 35.17, "lon": 136.88 }` |
| `latitudeE7` / `longitudeE7` | `{ "latitudeE7": 351700000, "longitudeE7": 1368800000 }` (divided by 10,000,000) |

Values can be numbers or numeric strings. If the same object also has `timestamp`, `time`, `datetime`, `date` or `timestampMs` (ISO 8601 or epoch), or `accuracy` / `accuracyMeters`, that information is kept.

### Validation and errors

A position is valid when its latitude is between -90 and 90 and its longitude between -180 and 180. Invalid entries are skipped and counted, without blocking the others.

| Situation | Message |
| --- | --- |
| The browser cannot read the file | Unreadable file |
| JSON syntax error | Invalid JSON |
| The JSON root is neither an object nor an array | Unrecognised JSON structure |
| No object with recognised coordinate keys | No positions found |
| A Google Maps Timeline export with no data at all (Timeline turned off, history deleted, or backup not restored on that phone) | Empty Timeline export |
| Positions found, but all invalid | Invalid coordinates |
| At least one valid position | File analysed successfully (+ number of skipped entries) |

### Not supported yet

- Legacy Google Takeout `Records.json`
- GeoJSON

To add a format, see [Adding a format](#adding-a-format).

---

## Information shown when you click a point

Clicking a point opens a popup with everything the file says about it. Google codes such as `IN_PASSENGER_VEHICLE`, `INFERRED_HOME` or `WIFI` are never shown raw: they are translated into plain words ("By car", "Home (inferred by Google)", "Nearby Wi-Fi networks"…). Unknown codes are turned into readable text as well.

To do this, the Google file is analysed in two passes: the first gathers the context (visits, journeys, trips, notes, statistics), the second links that context to each position.

| Information | Source in the file | Points concerned |
| --- | --- | --- |
| Type of place, arrival, departure, time spent, confidence, place nested in a larger one | `visit` | Places visited, and points recorded during a visit |
| Number of visits, total time spent, first and last visit | every `visit` with the same `placeId` (`placeID` on iPhone) | Places visited, frequent places |
| Means of transport, start, end, duration, distance, average speed, confidence, parking | `activity` | Journey starts, ends, parkings, and points recorded during a journey |
| Trip period, duration, number of destinations, maximum distance from home | `timelineMemory.trip` (`timelineMemory` on iPhone) | Every dated point during a trip |
| Personal note | `timelineMemory.note` | Every dated point in the period |
| Accuracy, measurement source, altitude, speed (Android only) | `rawSignals[].position` | Measured positions |
| Wi-Fi networks detected (Android only) | `rawSignals[].wifiScan` (same moment, ± 1 min) | Measured positions |
| Activity detected by the phone's sensors, with percentages (Android only) | `rawSignals[].activityRecord` (± 3 min) | Measured positions |
| Local time of the place (time zone shown if it differs from yours) | `…TimezoneUtcOffsetMinutes` (Android), time zone of the dates (iPhone) | Every dated point |
| Coordinates | all formats | Every point |

Altitude and speed are hidden when they were not actually measured (for example a Wi-Fi position reporting `0`).

The file does not contain place names. For identified places, the popup offers a **See the place name in Google Maps** link. It only opens if you click it, and then sends the place ID to Google.

For the generic format, the popup shows what is available: date, accuracy and coordinates.

---

## Display modes

The **Display** panel, at the top right of the map, offers three settings that can be combined:

| Setting | Effect |
| --- | --- |
| **Trajectories** | Links dated positions in chronological order. Arrows show the direction of travel, and the colour shows the means of transport: walking, cycling, road, rail, plane (dashed), boat, other. A legend is shown in the panel. Positions separated by more than 12 hours without any data are not linked. |
| **Timelapse** | Replays your travels over time. Positions appear as playback progresses, the most recent ones highlighted, the current one in orange. The player bar has play/pause (also with the space bar), a slider to move through time, and a speed setting (from 1 hour to 1 year per second, adjusted automatically to the period until you pick one). Long periods without data are skipped automatically. Combined with **Trajectories**, journeys are drawn progressively. |
| **Filter by date** | Keeps only the positions between two dates (inclusive). The filter applies to points, trajectories and timelapse at the same time, and can be changed at any moment, even during playback. **Centre the map** zooms to the period, **Whole period** goes back to the full file. Undated points (frequent places) are hidden while the filter is active. |

## Map screenshot

The **📷 Screenshot** button, below the zoom buttons, saves the map exactly as displayed: zoom, position, filtered period, trajectories, timelapse moment.

The PNG image carries a caption with the NausicaMap logo and name, the number of positions shown and their period (plus the site address once published), along with the "© OpenStreetMap contributors" attribution required by the map tiles' licence.

A dialog then offers:

- **Download (PNG)**;
- **Copy the image** to the clipboard, when the browser allows it.

The image is created entirely in your browser. Be careful: a map of your travels can reveal personal places such as your home or workplace.

---

## Architecture

Vite + strict TypeScript, Leaflet with the Canvas renderer, OpenStreetMap tiles, no frontend framework.

### Data flow

```
Local JSON file (chosen by the user)
   ↓  browser File API (no network request)
read the file                   src/file/readFile.ts
   ↓
parse JSON                      src/file/readFile.ts
   ↓
detect the format               src/parser/parseLocationHistory.ts
   ↓
extract coordinates + context   src/parser/formats/*.ts
   ↓
validate                        src/validation/validation.ts
   ↓
LocationPoint[]                 src/types/location.ts
   ↓
period filter → visible points  src/app/viewController.ts
   ↓
points, trajectories, timelapse src/map/map.ts, src/map/trackLayer.ts
   ↓
map
```

The rest of the application only handles `LocationPoint` objects. Only `src/parser/` knows the structure of the original JSON.

### Project structure

```
nausicamap/
├── index.html                  page structure (texts tagged with data-i18n)
├── vite.config.ts              relative base, production CSP, test config
├── src/
│   ├── main.ts                      orchestration: file → analysis → map
│   ├── style.css
│   ├── app/
│   │   └── viewController.ts        period → visible points → modes
│   ├── analysis/
│   │   └── analyzeLocationFile.ts   full pipeline + error codes
│   ├── file/
│   │   └── readFile.ts              local read + JSON.parse
│   ├── parser/
│   │   ├── parseLocationHistory.ts  format choice, validation, counting
│   │   ├── formats/
│   │   │   ├── locationFormat.ts        common interface of a format
│   │   │   ├── googleTimelineDevice.ts  Google Maps Timeline (Android export)
│   │   │   ├── googleTimelineIos.ts     Google Maps Timeline (iPhone export), converted to the Android structure
│   │   │   ├── googleTimelineIndex.ts   1st pass: visits, journeys, trips, statistics
│   │   │   └── generic.ts               generic JSON walk
│   │   ├── extractors.ts            key pairs of the generic format
│   │   ├── timeIndex.ts             search by date (interval, nearest moment)
│   │   └── values.ts                safe value reading (dates, "lat°, lng°", time zones)
│   ├── validation/
│   │   └── validation.ts            lat/lng bounds, conversions
│   ├── timeline/
│   │   ├── period.ts                covered period, date filter
│   │   ├── track.ts                 chronological track, transport families
│   │   └── timelapse.ts             player (speed, skipping empty periods)
│   ├── map/
│   │   ├── map.ts                   Leaflet map, batched rendering, zoom styles
│   │   ├── trackLayer.ts            Canvas layer for trajectories and timelapse
│   │   └── popup.ts                 content shown when clicking a point
│   ├── photo/
│   │   ├── capture.ts               map screenshot (tiles + layers + caption)
│   │   └── save.ts                  download, copy to clipboard
│   ├── i18n/
│   │   ├── i18n.ts                  available languages, active language, t()
│   │   ├── dom.ts                   translation of index.html texts
│   │   ├── labels.ts                plain-language translation of file codes
│   │   └── locales/
│   │       ├── en.ts                English texts (reference)
│   │       ├── fr.ts                French texts
│   │       └── ja.ts                Japanese texts
│   ├── ui/
│   │   ├── view.ts                  DOM elements, status messages
│   │   ├── controls.ts              display panel and player bar
│   │   ├── photoDialog.ts           screenshot dialog
│   │   ├── languageSwitch.ts        language switch
│   │   └── format.ts                dates, durations, distances, speeds
│   └── types/
│       └── location.ts              LocationPoint and common types
├── tests/                      unit tests (Vitest)
├── public/
│   ├── logo.svg                logo (home page)
│   └── favicon.svg             tab icon, map bar and screenshot caption
├── examples/
│   ├── demo-timeline.json      fictional trip drawing "HI" between Nagoya and Tokyo
│   └── location-history.json   fictional iPhone export (weekend in Nagoya)
└── .github/workflows/
    └── deploy-pages.yml        GitHub Pages deployment (optional)
```

### Adding a format

- **A new simple key pair:** add it to `COORDINATE_KEY_PAIRS` in `src/parser/extractors.ts`.
- **A new kind of file:** create a module in `src/parser/formats/` that implements `LocationFormat` (`matches` to recognise the file, `candidates` to produce raw positions), then add it to `KNOWN_FORMATS` in `src/parser/parseLocationHistory.ts`. Validation and display do not need to change.

### Adding a language

1. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/xx.ts` and translate the texts. The file is typed, so TypeScript reports any missing key.
2. Add the language to `LOCALES` in `src/i18n/i18n.ts` (code, name, short label, Intl locale).

The switch updates itself (it becomes a drop-down list beyond three languages, so a fourth language turns EN | FR | JA into a list). Japanese text uses the system's Japanese fonts (`:root:lang(ja)` in `src/style.css`). A test checks that every language has exactly the same keys as English, and that every key used in `index.html` exists.

### Known limits

- The whole file is loaded in memory and analysed on the main thread: files of several hundred MB can freeze the page for a few seconds. The analysis does not touch the DOM, so it can later move to a Web Worker.
- Beyond roughly 100,000 points, panning can become less smooth (one Canvas marker per point). Clustering, a heatmap or WebGL rendering would help.
- OpenStreetMap tiles need an internet connection, and their [usage policy](https://operations.osmfoundation.org/policies/tiles/) applies.

---

## Privacy

**Your location data never leaves your device.**

- The file is read with the browser's `File` API and only exists in memory, in the open tab. Nothing is kept after the tab is closed.
- There is no backend, no API, no database, no account, no upload, no analytics and no cloud storage. The code contains no `fetch` or `XMLHttpRequest` call.
- The production build adds a Content Security Policy with `connect-src 'none'`: the browser itself blocks any `fetch`, XHR or WebSocket request from the page. The only network requests allowed are the site's own files and the OpenStreetMap tile images (`img-src`). Tiles are loaded with CORS so they can be included in map screenshots.
- Loading tiles tells the OpenStreetMap server which areas are on screen (like any online map), but the coordinates from your file are never sent as data.
- The only thing stored in your browser is your language choice.
- The **See the place name in Google Maps** link only opens when you click it yourself.
- Do not commit your real history files: the `private-data/` folder is git-ignored for your personal test files.
