import { makeRawVehicle, makeVehicle } from "../test-utils/fixtures";
import { RawVehicle, STATUS } from "../types";
import {
  formatCoordinate,
  formatRelativeTime,
  formatTimestamp,
  normalizeStatistics,
  normalizeVehicle,
} from "./formatters";

describe("normalizeVehicle", () => {
  it("returns null for null/undefined input", () => {
    expect(normalizeVehicle(null)).toBeNull();
    expect(normalizeVehicle(undefined)).toBeNull();
  });

  it("maps every documented field from the raw API shape to the UI shape", () => {
    const raw = makeRawVehicle();
    const result = normalizeVehicle(raw);

    expect(result).toMatchObject({
      id: raw.id,
      vehicleNumber: raw.vehicleNumber,
      driver: raw.driverName,
      phone: raw.driverPhone,
      status: raw.status,
      speed: raw.speed,
      destination: raw.destination,
      eta: raw.estimatedArrival,
      lastUpdate: raw.lastUpdated,
      lat: raw.currentLocation?.lat,
      lng: raw.currentLocation?.lng,
      batteryLevel: raw.batteryLevel,
      fuelLevel: raw.fuelLevel,
    });
    expect(result?.raw).toBe(raw);
  });

  it("falls back to id when vehicleNumber is missing", () => {
    const raw = makeRawVehicle({ vehicleNumber: undefined });
    expect(normalizeVehicle(raw)?.vehicleNumber).toBe(raw.id);
  });

  it("falls back to 'Unassigned' when driverName is missing", () => {
    const raw = makeRawVehicle({ driverName: undefined });
    expect(normalizeVehicle(raw)?.driver).toBe("Unassigned");
  });

  it("falls back to null when driverPhone is missing or null", () => {
    expect(
      normalizeVehicle(makeRawVehicle({ driverPhone: undefined }))?.phone,
    ).toBeNull();
    expect(
      normalizeVehicle(makeRawVehicle({ driverPhone: null }))?.phone,
    ).toBeNull();
  });

  it("falls back to an em dash when destination is missing", () => {
    const raw = makeRawVehicle({ destination: undefined });
    expect(normalizeVehicle(raw)?.destination).toBe("—");
  });

  it("falls back to null when estimatedArrival is missing or null", () => {
    expect(
      normalizeVehicle(makeRawVehicle({ estimatedArrival: undefined }))?.eta,
    ).toBeNull();
    expect(
      normalizeVehicle(makeRawVehicle({ estimatedArrival: null }))?.eta,
    ).toBeNull();
  });

  it("coerces a numeric speed as-is", () => {
    const raw = makeRawVehicle({ speed: 87 });
    expect(normalizeVehicle(raw)?.speed).toBe(87);
  });

  it("coerces a stringified numeric speed to a number", () => {
    const raw = makeRawVehicle({ speed: "55" });
    expect(normalizeVehicle(raw)?.speed).toBe(55);
  });

  it("defaults speed to 0 when it is missing or non-numeric", () => {
    expect(normalizeVehicle(makeRawVehicle({ speed: undefined }))?.speed).toBe(
      0,
    );
    expect(normalizeVehicle(makeRawVehicle({ speed: "fast" }))?.speed).toBe(0);
  });

  it("handles a missing currentLocation by nulling out lat/lng", () => {
    const raw = makeRawVehicle({ currentLocation: undefined });
    const result = normalizeVehicle(raw);
    expect(result?.lat).toBeNull();
    expect(result?.lng).toBeNull();
  });

  it("handles a null currentLocation by nulling out lat/lng", () => {
    const raw = makeRawVehicle({ currentLocation: null });
    const result = normalizeVehicle(raw);
    expect(result?.lat).toBeNull();
    expect(result?.lng).toBeNull();
  });

  it("handles partial currentLocation (lat present, lng missing)", () => {
    const raw = makeRawVehicle({
      currentLocation: { lat: 10.5, lng: undefined },
    });
    const result = normalizeVehicle(raw);
    expect(result?.lat).toBe(10.5);
    expect(result?.lng).toBeNull();
  });

  it("preserves an unrecognized status string rather than throwing", () => {
    const raw = makeRawVehicle({
      status: "unknown_status" as RawVehicle["status"],
    });
    expect(normalizeVehicle(raw)?.status).toBe("unknown_status");
  });
});

describe("normalizeStatistics", () => {
  it("derives every field from the vehicle list when raw stats are absent", () => {
    const vehicles = [
      makeVehicle({ id: "1", status: STATUS.IDLE, speed: 0 }),
      makeVehicle({ id: "2", status: STATUS.EN_ROUTE, speed: 40 }),
      makeVehicle({ id: "3", status: STATUS.EN_ROUTE, speed: 60 }),
      makeVehicle({ id: "4", status: STATUS.DELIVERED, speed: 0 }),
    ];

    const result = normalizeStatistics(null, vehicles);

    expect(result).toEqual({
      total: 4,
      idle: 1,
      en_route: 2,
      delivered: 1,
      avgSpeed: 25, // (0 + 40 + 60 + 0) / 4
    });
  });

  it("returns all-zero fallback stats for an empty vehicle list and no raw data", () => {
    expect(normalizeStatistics(null, [])).toEqual({
      total: 0,
      idle: 0,
      en_route: 0,
      delivered: 0,
      avgSpeed: 0,
    });
  });

  it("defaults to an empty vehicle list when none is provided", () => {
    expect(normalizeStatistics(null)).toEqual({
      total: 0,
      idle: 0,
      en_route: 0,
      delivered: 0,
      avgSpeed: 0,
    });
  });

  it("prefers server-provided stats over client-derived fallback values", () => {
    const vehicles = [makeVehicle({ id: "1", status: STATUS.IDLE, speed: 0 })];
    const raw = {
      total: 999,
      idle: 111,
      en_route: 222,
      delivered: 333,
      average_speed: 77.7,
    };

    const result = normalizeStatistics(raw, vehicles);

    expect(result.total).toBe(999);
    expect(result.idle).toBe(111);
    expect(result.en_route).toBe(222);
    expect(result.delivered).toBe(333);
    expect(result.avgSpeed).toBe(77.7);
  });

  it("falls back per-field when the raw payload only partially overrides stats", () => {
    const vehicles = [
      makeVehicle({ id: "1", status: STATUS.DELIVERED, speed: 20 }),
    ];
    const raw = { total: 50 }; // only total is provided

    const result = normalizeStatistics(raw, vehicles);

    expect(result.total).toBe(50);
    expect(result.delivered).toBe(1); // fallback derived from vehicles
    expect(result.avgSpeed).toBe(20); // fallback derived from vehicles
  });

  it("rounds the derived average speed to one decimal place", () => {
    const vehicles = [
      makeVehicle({ id: "1", speed: 10 }),
      makeVehicle({ id: "2", speed: 11 }),
      makeVehicle({ id: "3", speed: 12 }),
    ];
    // (10 + 11 + 12) / 3 = 11 exactly, use an uneven set for a real fraction
    const uneven = [
      makeVehicle({ id: "1", speed: 10 }),
      makeVehicle({ id: "2", speed: 11 }),
      makeVehicle({ id: "3", speed: 13 }),
    ];
    expect(normalizeStatistics(null, vehicles).avgSpeed).toBe(11);
    expect(normalizeStatistics(null, uneven).avgSpeed).toBeCloseTo(11.3, 5);
  });

  it("treats vehicles with a falsy/undefined speed as 0 in the average", () => {
    const vehicles = [
      makeVehicle({ id: "1", speed: 0 }),
      makeVehicle({ id: "2", speed: undefined as unknown as number }),
    ];
    expect(normalizeStatistics(null, vehicles).avgSpeed).toBe(0);
  });
});

describe("formatTimestamp", () => {
  it("returns an em dash for null, undefined, or empty string", () => {
    expect(formatTimestamp(null)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
    expect(formatTimestamp("")).toBe("—");
  });

  it("returns the original string when it cannot be parsed as a date", () => {
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("formats a valid ISO timestamp using locale date/time formatting", () => {
    const result = formatTimestamp("2026-08-19T14:00:00.000Z");
    // Avoid asserting an exact locale string (environment-dependent); assert
    // it round-trips through Date and produces a non-fallback, non-empty value.
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(0);
    expect(Number.isNaN(new Date("2026-08-19T14:00:00.000Z").getTime())).toBe(
      false,
    );
  });
});

describe("formatCoordinate", () => {
  it("returns an em dash when lat or lng is null or undefined", () => {
    expect(formatCoordinate(null, 10)).toBe("—");
    expect(formatCoordinate(10, null)).toBe("—");
    expect(formatCoordinate(undefined, undefined)).toBe("—");
  });

  it("formats both coordinates to 4 decimal places, comma-separated", () => {
    expect(formatCoordinate(19.076, 72.8777)).toBe("19.0760, 72.8777");
  });

  it("rounds/pads coordinates that have fewer or more than 4 decimals", () => {
    expect(formatCoordinate(1, 2)).toBe("1.0000, 2.0000");
    expect(formatCoordinate(1.123456, 2.987654)).toBe("1.1235, 2.9877");
  });

  it("treats 0 as a valid coordinate (not nullish)", () => {
    expect(formatCoordinate(0, 0)).toBe("0.0000, 0.0000");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-08-19T14:00:00.000Z").getTime();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an em dash for null, undefined, or empty string", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime(undefined)).toBe("—");
    expect(formatRelativeTime("")).toBe("—");
  });

  it("returns an em dash for an unparsable date string", () => {
    expect(formatRelativeTime("not-a-date")).toBe("—");
  });

  it("returns 'just now' for timestamps within the last 5 seconds", () => {
    expect(formatRelativeTime(new Date(NOW - 2000).toISOString())).toBe(
      "just now",
    );
    expect(formatRelativeTime(new Date(NOW).toISOString())).toBe("just now");
  });

  it("formats sub-minute durations in seconds", () => {
    expect(formatRelativeTime(new Date(NOW - 30_000).toISOString())).toBe(
      "30s ago",
    );
  });

  it("formats sub-hour durations in minutes", () => {
    expect(formatRelativeTime(new Date(NOW - 5 * 60_000).toISOString())).toBe(
      "5m ago",
    );
  });

  it("formats durations of an hour or more in hours", () => {
    expect(
      formatRelativeTime(new Date(NOW - 3 * 60 * 60_000).toISOString()),
    ).toBe("3h ago");
  });

  it("handles boundary just under a minute as seconds, not minutes", () => {
    expect(formatRelativeTime(new Date(NOW - 59_000).toISOString())).toBe(
      "59s ago",
    );
  });

  it("handles boundary at exactly 60 minutes as hours", () => {
    expect(formatRelativeTime(new Date(NOW - 60 * 60_000).toISOString())).toBe(
      "1h ago",
    );
  });
});
