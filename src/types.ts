// Shared domain types for the Fleet Tracking Dashboard.
// These mirror the confirmed API schema (Swagger
// docs) as well as the normalized shape the UI components consume.

/** Vehicle status values as reported by the API. */
export type VehicleStatus = "idle" | "en_route" | "delivered";

/** WebSocket connection lifecycle state. */
export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

/** Raw lat/lng pair as nested in the API's `currentLocation` field. */
export interface RawLocation {
  lat?: number | null;
  lng?: number | null;
}

/**
 * Shape of a vehicle record as returned by the REST/WebSocket API, before
 * normalization. Optional/nullable fields reflect the API's documented
 * (and occasionally inconsistent) contract.
 */
export interface RawVehicle {
  id: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string | null;
  status: VehicleStatus | string;
  speed?: number | string;
  destination?: string;
  estimatedArrival?: string | null;
  lastUpdated?: string;
  currentLocation?: RawLocation | null;
  batteryLevel?: number;
  fuelLevel?: number;
  [key: string]: unknown;
}

/** UI-facing, normalized vehicle shape used throughout the app. */
export interface Vehicle {
  id: string;
  vehicleNumber: string;
  driver: string;
  phone: string | null;
  status: VehicleStatus | string;
  speed: number;
  destination: string;
  eta: string | null;
  lastUpdate?: string;
  lat: number | null;
  lng: number | null;
  batteryLevel?: number;
  fuelLevel?: number;
  /** The original, un-normalized API record, kept for debugging/fallback. */
  raw: RawVehicle;
}

/** Raw statistics payload as returned by GET /api/statistics. */
export interface RawStatistics {
  total?: number;
  idle?: number;
  en_route?: number;
  delivered?: number;
  average_speed?: number;
  timestamp?: string;
  [key: string]: unknown;
}

/** UI-facing, normalized fleet statistics. */
export interface Statistics {
  total: number;
  idle: number;
  en_route: number;
  delivered: number;
  avgSpeed: number;
  /** Optional precomputed "updated X ago" label, if ever supplied upstream. */
  lastUpdated?: string;
}

/** Standard success/error envelope used by every REST endpoint. */
export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  total?: number;
  status?: string;
  timestamp?: string;
  error?: string;
  message?: string;
}

/**
 * Shape of an inbound WebSocket push message.
 *
 * Confirmed against a real server payload:
 * on connect, the server sends a `type: "initial_data"` message carrying the
 * *full* current fleet as `data: RawVehicle[]`, plus a `timestamp` and a
 * human-readable `message` ("Connected to Fleet Tracking WebSocket. Updates
 * every 3 minutes."). That confirmed shape is `WsInitialDataMessage` below.
 *
 * The periodic ~3-minute pushes the server promises in that `message` are
 * NOT covered by the sample payload, so their `type` isn't confirmed. Rather
 * than guess a specific literal (e.g. `"vehicle_update"`) and risk silently
 * dropping real traffic if the server uses a different one, `WsUpdateMessage`
 * accepts any `type` other than `"initial_data"` and treats it as an
 * incremental push: `data` may be a single vehicle or a list, and it's
 * merged into existing state by `id` rather than replacing it outright (see
 * `FleetContext`'s `WS_UPDATE` reducer case). This is the one deliberately
 * "best guess" part of the WS contract; if the live update shape differs,
 * only that merge path needs adjusting.
 */
export interface WsMessageBase {
  type: string;
  timestamp?: string;
  message?: string;
}

/** The confirmed initial-snapshot push: full vehicle list, sent on connect. */
export interface WsInitialDataMessage extends WsMessageBase {
  type: "initial_data";
  data: RawVehicle[];
}

/** Best-guess shape for any subsequent incremental push (see note above). */
export interface WsUpdateMessage extends WsMessageBase {
  data?: RawVehicle | RawVehicle[];
  statistics?: RawStatistics;
}

export type WsMessage = WsInitialDataMessage | WsUpdateMessage;

/** Narrows a `WsMessage` to the confirmed full-snapshot variant. */
export function isInitialDataMessage(
  msg: WsMessage,
): msg is WsInitialDataMessage {
  return (
    msg.type === "initial_data" &&
    Array.isArray((msg as WsInitialDataMessage).data)
  );
}

export const STATUS: {
  IDLE: VehicleStatus;
  EN_ROUTE: VehicleStatus;
  DELIVERED: VehicleStatus;
} = {
  IDLE: "idle",
  EN_ROUTE: "en_route",
  DELIVERED: "delivered",
};

/** MUI Chip `color` values used for status badges. */
export type StatusChipColor = "warning" | "info" | "success" | "default";

export interface StatusMeta {
  label: string;
  color: StatusChipColor;
}

export const STATUS_META: Record<VehicleStatus, StatusMeta> = {
  idle: { label: "Idle", color: "warning" },
  en_route: { label: "En Route", color: "info" },
  delivered: { label: "Delivered", color: "success" },
};
