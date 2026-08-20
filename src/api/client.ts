// Thin REST client for the Fleet Tracking API.
// Base URL: https://case-study-26cf.onrender.com
// Swagger docs: https://case-study-26cf.onrender.com/docs/
//
// Every endpoint responds with an envelope: { success, data, total?, status?, timestamp }
// on success, or { success: false, error, message } on failure (per
// Swagger doc). This client unwraps that envelope so callers just get the
// full body back (with `.data`), and throws using the API's own `message` on
// both HTTP-level and success:false failures.

import {
  ApiEnvelope,
  RawStatistics,
  RawVehicle,
  VehicleStatus,
} from "../types";

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://case-study-26cf.onrender.com";

async function request<T>(path: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });

  let body: ApiEnvelope<T> | null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch (err) {
    body = null;
  }

  if (!res.ok || body?.success === false) {
    const message =
      body?.message ||
      body?.error ||
      `Request to ${path} failed with status ${res.status}`;
    throw new Error(message);
  }

  return body as ApiEnvelope<T>;
}

export interface GetVehiclesParams {
  status?: VehicleStatus | string;
  limit?: number;
}

/**
 * GET /api/vehicles – fetch list of vehicles with status and details.
 * Optional query params per the schema: status (filter), limit (cap results).
 * Returns { data: Vehicle[], total, timestamp }.
 */
export const getVehicles = ({ status, limit }: GetVehiclesParams = {}): Promise<
  ApiEnvelope<RawVehicle[]>
> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return request<RawVehicle[]>(`/api/vehicles${qs ? `?${qs}` : ""}`);
};

/** GET /api/vehicles/{id} – fetch single vehicle detail by its UUID `id`. Returns { data: Vehicle }. */
export const getVehicleById = (
  id: string,
): Promise<ApiEnvelope<RawVehicle>> => {
  return request<RawVehicle>(`/api/vehicles/${encodeURIComponent(id)}`);
};

/**
 * GET /api/vehicles/status/{status} – fetch vehicles filtered by status.
 * status must be one of: idle, en_route, delivered.
 * Returns { data: Vehicle[], total, status }.
 */
export const getVehiclesByStatus = (
  status: VehicleStatus | string,
): Promise<ApiEnvelope<RawVehicle[]>> => {
  return request<RawVehicle[]>(
    `/api/vehicles/status/${encodeURIComponent(status)}`,
  );
};

/**
 * GET /api/statistics – fetch overall fleet statistics.
 * Returns { data: { total, idle, en_route, delivered, average_speed, timestamp } }.
 */
export const getStatistics = (): Promise<ApiEnvelope<RawStatistics>> => {
  return request<RawStatistics>("/api/statistics");
};
