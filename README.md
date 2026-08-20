# Fleet Tracking Dashboard

A real-time fleet monitoring dashboard built with **React** + **Material UI**.

Built against the UX mockups: a status/statistics sidebar on the left, a live-updating vehicle table on the right, and a detail modal on row click.

## Engineering approach

- **Separation of concerns** — API access (`src/api/`), state (`src/context/`), presentation (`src/components/`), and pure data transforms (`src/utils/formatters.js`) are isolated layers. A schema change on the backend only touches the normalization layer, not the components.
- **Single source of truth** — all fleet state (vehicles, statistics, filters, selection, connection status) lives in one `useReducer`-backed context, with predictable action types rather than scattered `useState` calls across components.
- **Resilience by design** — the WebSocket client (`src/api/websocket.js`) auto-reconnects with exponential backoff; REST failures on `/api/statistics` degrade gracefully to client-derived stats rather than breaking the UI; malformed WS payloads are swallowed, not fatal.
- **Modularity & reuse** — small, single-responsibility components (`StatusFilters`, `StatsCards`, `VehicleTable`, `VehicleDetailModal`, `LiveIndicator`) each take plain props and contain no data-fetching logic of their own, making them straightforward to test, reuse, or swap.
- **Performance-conscious rendering** — filtering and derived counts are memoized (`useMemo`); WebSocket updates are merged by `id` rather than triggering a full list refetch, and preserve the object reference of any vehicle that didn't change; the context value handed to consumers is itself memoized so an unrelated provider re-render can't force a new object identity on everything below it; every presentational component (`Header`, `LiveIndicator`, `StatusFilters`, `StatsCards`, `Sidebar`, `VehicleTable`, `VehicleDetailModal`) is wrapped in `React.memo`, and each table row is its own memoized component — so selecting a vehicle, an unrelated WS tick, or the sidebar's 1s "updated Xs ago" clock only re-renders the piece of the tree that actually changed, not the whole dashboard.
- **Correctness under concurrency** — `selectVehicle` tracks a request token so that if a user clicks two vehicles in quick succession, a slower, now-stale `GET /api/vehicles/{id}` response can't overwrite a newer selection.
- **Fails safely, not silently** — a top-level `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) catches unexpected render errors (e.g. a malformed payload slipping past normalization) and shows a recoverable message instead of an unmounted, blank screen.
- **Documented assumptions, not silent guesses** — every place the code fills a gap in the API contract (e.g. the WebSocket push payload shape) is called out explicitly below, so it's an intentional, reviewable decision rather than hidden behavior.

For fleets large enough that even memoized row rendering becomes a bottleneck (many hundreds of concurrently visible vehicles), the natural next step is row virtualization (e.g. `react-window`) inside `VehicleTable`; not added here since it's an extra dependency this case study's fleet size doesn't yet justify, but the row is already isolated into `VehicleRow` specifically to make that swap contained later.

## Features

- **Vehicle list** — all vehicles with driver, status, speed, destination, ETA, last update time, and coordinates.
- **Fleet statistics** — total fleet size, average speed, moving count, and last update time, refreshed live.
- **Status filters** — All / Idle / En Route / Delivered, each with a live count, filters the table in place.
- **Vehicle detail modal** — click any row (or the vehicle ID link) to see full detail: status, current speed, driver, phone, destination, coordinates, battery level, fuel level, last updated.
- **WebSocket live updates** — connects to the fleet WebSocket on load and merges pushed updates into state as they arrive (the API pushes roughly every 3 minutes), with automatic reconnect and a connection-status indicator.
- **State management** — React Context API + `useReducer`, no external state library required.

## Tech stack

- React 18 (Create React App / `react-scripts`)
- Material UI v5 (`@mui/material`, `@mui/icons-material`)
- Native `fetch` + native `WebSocket` (no extra HTTP/WS libraries)
- Typescript 4 (Create React App / `react-scripts` doesnt support 5+ versions)

## Getting started

```bash
npm install
npm start
```

The app runs at `http://localhost:3000`.

To build a production bundle:

```bash
npm run build
```

## Testing

Unit tests (Jest + React Testing Library) cover the normalization layer, the REST/WebSocket
clients, the `FleetContext` state layer, and every component. See [TESTING.md](./TESTING.md)
for the full breakdown and conventions.

```bash
npm install
npm run test:ci        # single run
npm run test:coverage  # coverage report
```

## Configuration

API endpoints are read from environment variables (see `.env`):

```
REACT_APP_API_BASE_URL=https://case-study-26cf.onrender.com
REACT_APP_WS_URL=wss://case-study-26cf.onrender.com
```

## API integration

Verified against the project's Swagger documentation.

| Purpose            | Endpoint                            | Notes                                                                 |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| List vehicles      | `GET /api/vehicles`                 | Supports optional `status` and `limit` query params                   |
| Single vehicle     | `GET /api/vehicles/{id}`            | `{id}` is the vehicle's UUID, not its `vehicleNumber` (e.g. `FL-001`) |
| Vehicles by status | `GET /api/vehicles/status/{status}` | `status` is one of `idle`, `en_route`, `delivered`                    |
| Fleet statistics   | `GET /api/statistics`               | Returns `total`, `idle`, `en_route`, `delivered`, `average_speed`     |
| Live updates       | `WSS /` (fleet WebSocket)           | Pushes roughly every 3 minutes                                        |

Every REST response is wrapped in an envelope: `{ success, data, total?, status?, timestamp }` on success, or `{ success: false, error, message }` on failure. `src/api/client.js` unwraps this and throws using the API's own `message` on failure.

REST calls live in `src/api/client.js`; the WebSocket client (with reconnect/backoff) is in `src/api/websocket.js`. `src/utils/formatters.js` maps the API's field names (`vehicleNumber`, `driverName`, `currentLocation.lat/lng`, `estimatedArrival`, etc.) onto the flatter shape the components use. All wired into global state in `src/context/FleetContext.js`.

## Project structure

```
src/
  api/
    client.js          REST calls to the 4 documented endpoints
    websocket.js        WebSocket client with auto-reconnect
  context/
    FleetContext.js     Context + useReducer global state
  hooks/
    useFleetData.js      Bootstraps fetch + socket lifecycle
  components/
    Header.js
    Sidebar.js
    LiveIndicator.js
    StatusFilters.js
    StatsCards.js
    VehicleTable.js
    VehicleDetailModal.js
  utils/
    formatters.js        Normalization + display formatting
  theme.js               MUI theme (palette/typography)
  App.js
  index.js
```

## Assumptions & notes

- Speed is reported by the API in **mph** (per the schema description "Current speed in mph"), so the UI labels it accordingly.
- The API's three vehicle statuses are `idle`, `en_route`, `delivered`.
- If `GET /api/statistics` is unavailable or errors, statistics are derived client-side from the vehicle list as a fallback so the sidebar never goes blank.
- **WebSocket payload — confirmed on connect, best-guess for later pushes.** A captured live payload confirms the on-connect message: `{ type: "initial_data", data: Vehicle[], timestamp, message }`, a full fleet snapshot. `FleetContext` treats `type: "initial_data"` as authoritative and replaces state outright. The server's own `message` field says it "pushes updates every 3 minutes", but a sample of that periodic push wasn't available, so its `type` isn't confirmed — any message where `type !== "initial_data"` is handled as an update message.
- Vehicle rows link/select using the vehicle's UUID `id` (required by `GET /api/vehicles/{id}`), while the table and modal display the human-facing `vehicleNumber` (e.g. `FL-001`).
- No routing library is used since the app is a single view with a modal, per the mockups.
