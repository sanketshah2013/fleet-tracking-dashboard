// Normalizers map the confirmed API schema onto the shape the UI components use. Kept as a thin mapping
// layer (rather than using raw API field names throughout) so a future API
// change only needs updating here.

import {
  RawStatistics,
  RawVehicle,
  Statistics,
  STATUS,
  Vehicle,
} from "../types";

export { STATUS, STATUS_META } from "../types";

export const normalizeVehicle = (
  raw: RawVehicle | null | undefined,
): Vehicle | null => {
  if (!raw) return null;

  return {
    // `id` is the UUID used for GET /api/vehicles/{id} lookups.
    id: raw.id,
    // `vehicleNumber` (e.g. "FL-001") is the human-facing label shown in the UI.
    vehicleNumber: raw.vehicleNumber || raw.id,
    driver: raw.driverName || "Unassigned",
    phone: raw.driverPhone || null,
    status: raw.status,
    speed: typeof raw.speed === "number" ? raw.speed : Number(raw.speed) || 0,
    destination: raw.destination || "—",
    eta: raw.estimatedArrival || null,
    lastUpdate: raw.lastUpdated,
    lat: raw.currentLocation?.lat ?? null,
    lng: raw.currentLocation?.lng ?? null,
    batteryLevel: raw.batteryLevel,
    fuelLevel: raw.fuelLevel,
    raw,
  };
};

export const normalizeStatistics = (
  raw: RawStatistics | null | undefined,
  vehicles: Vehicle[] = [],
): Statistics => {
  // Client-side fallback, used if /api/statistics is unreachable
  const fallback = {
    total: vehicles.length,
    idle: vehicles.filter((v) => v.status === STATUS.IDLE).length,
    en_route: vehicles.filter((v) => v.status === STATUS.EN_ROUTE).length,
    delivered: vehicles.filter((v) => v.status === STATUS.DELIVERED).length,
    avgSpeed: vehicles.length
      ? Math.round(
          (vehicles.reduce((sum, v) => sum + (v.speed || 0), 0) /
            vehicles.length) *
            10,
        ) / 10
      : 0,
  };

  if (!raw) {
    return fallback;
  }

  return {
    total: raw.total ?? fallback.total,
    idle: raw.idle ?? fallback.idle,
    en_route: raw.en_route ?? fallback.en_route,
    delivered: raw.delivered ?? fallback.delivered,
    avgSpeed: raw.average_speed ?? fallback.avgSpeed,
    lastUpdated: raw.timestamp,
  };
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const formatCoordinate = (
  lat: number | null | undefined,
  lng: number | null | undefined,
): string => {
  if (lat == null || lng == null) return "—";
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

export const formatRelativeTime = (
  value: string | null | undefined,
): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
};
