# Testing Guide

This project uses **Jest** + **React Testing Library**, both provided out of the box by
`react-scripts` (Create React App). No custom Jest config is required — CRA auto-detects
`src/setupTests.ts` and any `*.test.ts` / `*.test.tsx` file.

## Setup

```bash
npm install
```

This pulls in the added dev dependencies:

- `@testing-library/react` — render components and query the DOM the way a user would
- `@testing-library/jest-dom` — extra matchers (`toBeInTheDocument`, `toHaveTextContent`, …)
- `@testing-library/user-event` — realistic user interaction simulation (click, type, …)
- `@types/jest` — TypeScript types for Jest globals

## Running tests

```bash
npm test               # watch mode (default CRA behavior)
npm run test:ci        # single run, no watch — use this in CI
npm run test:coverage  # coverage report
```

## Suite layout

Tests live next to the file they cover (`Foo.ts` → `Foo.test.ts`), which is the CRA/Jest
convention and keeps a module and its tests moving together during refactors.

| Layer            | File(s)                             | What's covered                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure transforms  | `src/utils/formatters.test.ts`      | `normalizeVehicle`, `normalizeStatistics`, `formatTimestamp`, `formatCoordinate`, `formatRelativeTime` — every fallback/edge case in the API → UI mapping layer                                                                        |
| REST client      | `src/api/client.test.ts`            | Envelope unwrapping, query-string building, URI-encoding, every error path (`success:false`, non-200, malformed JSON, network failure)                                                                                                 |
| WebSocket client | `src/api/websocket.test.ts`         | Connect/open/close/error lifecycle, JSON parsing + malformed-payload handling, exponential backoff reconnect (incl. cap and reset), manual `close()` semantics                                                                         |
| State layer      | `src/context/FleetContext.test.tsx` | `FleetProvider`'s full public API (`fetchAll`, `selectVehicle`, `setFilter`, `connectSocket`/`disconnectSocket`) exercised through `useFleet`, including the WS `merge-by-id` reducer logic and graceful `/api/statistics` degradation |
| Hook             | `src/hooks/useFleetData.test.ts`    | Bootstrap-on-mount / cleanup-on-unmount contract                                                                                                                                                                                       |
| Components       | `src/components/*.test.tsx`         | Each component in isolation: rendered output, prop-driven states (loading/empty/error), and user interactions (clicks)                                                                                                                 |
| Integration      | `src/App.test.tsx`                  | Real `FleetProvider` + mocked API/WebSocket, exercising the full loading → table → filter → modal user flow                                                                                                                            |

## Conventions used throughout the suite

- **Mock at the network boundary, not the business logic.** `client.ts` mocks `global.fetch`;
  `websocket.ts` mocks `global.WebSocket`; `FleetContext`/`App` tests mock the `api/client` and
  `api/websocket` _modules_ (`jest.mock(...)`) rather than reimplementing reducer logic in the
  test. This keeps tests resilient to internal refactors and only breaks when real behavior changes.
- **Test the public API, not internals.** The reducer in `FleetContext.tsx` isn't exported —
  it's exercised exclusively through `useFleet()`'s public actions, the same way components use it.
- **Shared fixtures** live in `src/test-utils/fixtures.ts` (`makeRawVehicle`, `makeVehicle`,
  `makeVehicleList`, `statistics` fixtures) so every suite builds on the same realistic shapes
  instead of ad hoc inline objects.
- **Shared render helper** (`src/test-utils/renderWithTheme.tsx`) wraps components in the app's
  real MUI `ThemeProvider`, so `sx` color tokens (`success.light`, etc.) resolve exactly as they
  do in production.
- **Fake timers** are used for anything time-dependent (`formatRelativeTime`, the WebSocket
  backoff, `Sidebar`'s 1s ticker) so tests are deterministic and instant rather than sleeping.
