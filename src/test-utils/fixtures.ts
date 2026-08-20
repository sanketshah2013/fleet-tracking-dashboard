import {
  RawStatistics,
  RawVehicle,
  Statistics,
  Vehicle,
  WsInitialDataMessage,
  WsUpdateMessage,
} from "../types";

export const rawVehicleFixture: RawVehicle = {
  id: "veh-001",
  vehicleNumber: "FL-001",
  driverName: "John Doe",
  driverPhone: "+1-555-0100",
  status: "en_route",
  speed: 42,
  destination: "Warehouse A",
  estimatedArrival: "2026-08-19T15:30:00.000Z",
  lastUpdated: "2026-08-19T14:00:00.000Z",
  currentLocation: { lat: 19.076, lng: 72.8777 },
  batteryLevel: 78,
  fuelLevel: 55,
};

export const normalizedVehicleFixture: Vehicle = {
  id: "veh-001",
  vehicleNumber: "FL-001",
  driver: "John Doe",
  phone: "+1-555-0100",
  status: "en_route",
  speed: 42,
  destination: "Warehouse A",
  eta: "2026-08-19T15:30:00.000Z",
  lastUpdate: "2026-08-19T14:00:00.000Z",
  lat: 19.076,
  lng: 72.8777,
  batteryLevel: 78,
  fuelLevel: 55,
  raw: rawVehicleFixture,
};

export function makeRawVehicle(
  overrides: Partial<RawVehicle> = {},
): RawVehicle {
  return { ...rawVehicleFixture, ...overrides };
}

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return { ...normalizedVehicleFixture, ...overrides };
}

export const rawStatisticsFixture: RawStatistics = {
  total: 10,
  idle: 3,
  en_route: 5,
  delivered: 2,
  average_speed: 38.4,
  timestamp: "2026-08-19T14:00:00.000Z",
};

export const statisticsFixture: Statistics = {
  total: 10,
  idle: 3,
  en_route: 5,
  delivered: 2,
  avgSpeed: 38.4,
};

export function makeVehicleList(): Vehicle[] {
  return [
    makeVehicle({
      id: "v1",
      vehicleNumber: "FL-001",
      status: "idle",
      speed: 0,
    }),
    makeVehicle({
      id: "v2",
      vehicleNumber: "FL-002",
      status: "en_route",
      speed: 55,
    }),
    makeVehicle({
      id: "v3",
      vehicleNumber: "FL-003",
      status: "delivered",
      speed: 0,
    }),
  ];
}

/**
 * Full-snapshot WS push, matching the confirmed `type: "initial_data"`
 * payload shape.
 */
export function makeWsInitialDataMessage(
  overrides: Partial<WsInitialDataMessage> = {},
): WsInitialDataMessage {
  return {
    type: "initial_data",
    data: [makeRawVehicle()],
    timestamp: "2026-08-18T09:10:51.412Z",
    message: "Connected to Fleet Tracking WebSocket. Updates every 3 minutes.",
    ...overrides,
  };
}

/**
 * Incremental WS push fixture. The server hasn't confirmed a `type` for
 * these (see `WsUpdateMessage` doc comment), so tests use an arbitrary
 * non-`initial_data` value to exercise the merge-by-id path.
 */
export function makeWsUpdateMessage(
  overrides: Partial<WsUpdateMessage> = {},
): WsUpdateMessage {
  return {
    type: "vehicle_update",
    data: [makeRawVehicle()],
    ...overrides,
  };
}
