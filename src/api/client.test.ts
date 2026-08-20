import {
  getStatistics,
  getVehicleById,
  getVehicles,
  getVehiclesByStatus,
} from "./client";

function mockFetchOnce(body: unknown, init: Partial<Response> = {}): jest.Mock {
  const mockJson = jest.fn().mockResolvedValue(body);
  const response = {
    ok: true,
    status: 200,
    json: mockJson,
    ...init,
  } as unknown as Response;
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("api/client", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("getVehicles", () => {
    it("calls the vehicles endpoint with no query string when no params are given", async () => {
      const fetchMock = mockFetchOnce({ success: true, data: [], total: 0 });

      await getVehicles();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/api\/vehicles$/);
      expect(url).not.toContain("?");
    });

    it("appends status and limit as query params when provided", async () => {
      const fetchMock = mockFetchOnce({ success: true, data: [] });

      await getVehicles({ status: "idle", limit: 20 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/vehicles?");
      expect(url).toContain("status=idle");
      expect(url).toContain("limit=20");
    });

    it("omits limit from the query string when not provided", async () => {
      const fetchMock = mockFetchOnce({ success: true, data: [] });
      await getVehicles({ status: "delivered" });
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("status=delivered");
      expect(url).not.toContain("limit");
    });

    it("sends the Accept: application/json header", async () => {
      const fetchMock = mockFetchOnce({ success: true, data: [] });
      await getVehicles();
      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers).toEqual({ Accept: "application/json" });
    });

    it("resolves with the full parsed envelope on success", async () => {
      const payload = { success: true, data: [{ id: "1" }], total: 1 };
      mockFetchOnce(payload);
      const result = await getVehicles();
      expect(result).toEqual(payload);
    });
  });

  describe("getVehicleById", () => {
    it("hits /api/vehicles/{id} with the id URI-encoded", async () => {
      const fetchMock = mockFetchOnce({
        success: true,
        data: { id: "abc def/123" },
      });
      await getVehicleById("abc def/123");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain(
        `/api/vehicles/${encodeURIComponent("abc def/123")}`,
      );
    });
  });

  describe("getVehiclesByStatus", () => {
    it("hits /api/vehicles/status/{status} with the status URI-encoded", async () => {
      const fetchMock = mockFetchOnce({ success: true, data: [] });
      await getVehiclesByStatus("en_route");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/vehicles/status/en_route");
    });
  });

  describe("getStatistics", () => {
    it("hits /api/statistics and returns the envelope", async () => {
      const payload = { success: true, data: { total: 5 } };
      const fetchMock = mockFetchOnce(payload);
      const result = await getStatistics();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/api\/statistics$/);
      expect(result).toEqual(payload);
    });
  });

  describe("error handling", () => {
    it("throws using the envelope message when the HTTP status is not ok", async () => {
      mockFetchOnce(
        { success: false, message: "Vehicle not found" },
        { ok: false, status: 404 },
      );
      await expect(getVehicleById("missing")).rejects.toThrow(
        "Vehicle not found",
      );
    });

    it("throws using the envelope error field when message is absent", async () => {
      mockFetchOnce(
        { success: false, error: "Boom" },
        { ok: false, status: 500 },
      );
      await expect(getStatistics()).rejects.toThrow("Boom");
    });

    it("throws a generic status-based message when the envelope has neither message nor error", async () => {
      mockFetchOnce({}, { ok: false, status: 503 });
      await expect(getStatistics()).rejects.toThrow(/failed with status 503/);
    });

    it("throws when success:false is returned even with an HTTP 200", async () => {
      mockFetchOnce(
        { success: false, message: "Business rule violation" },
        { ok: true, status: 200 },
      );
      await expect(getVehicles()).rejects.toThrow("Business rule violation");
    });

    it("does not throw when the response body fails to parse as JSON, as long as the response is ok", async () => {
      const response = {
        ok: true,
        status: 200,
        json: jest
          .fn()
          .mockRejectedValue(new Error("Unexpected end of JSON input")),
      } as unknown as Response;
      global.fetch = jest
        .fn()
        .mockResolvedValue(response) as unknown as typeof fetch;

      const result = await getStatistics();
      expect(result).toBeNull();
    });

    it("throws a status-based message when JSON parsing fails on a non-ok response", async () => {
      const response = {
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error("bad json")),
      } as unknown as Response;
      global.fetch = jest
        .fn()
        .mockResolvedValue(response) as unknown as typeof fetch;

      await expect(getStatistics()).rejects.toThrow(/failed with status 500/);
    });

    it("propagates network-level fetch rejections (e.g. offline)", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("Network request failed"));
      await expect(getVehicles()).rejects.toThrow("Network request failed");
    });
  });

  describe("base URL configuration", () => {
    it("defaults to the production base URL when REACT_APP_API_BASE_URL is unset", async () => {
      // Note: BASE_URL is captured at module-eval time via `const`, so this
      // documents current behavior rather than re-evaluating the module per test.
      const fetchMock = mockFetchOnce({ success: true, data: [] });
      await getVehicles();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/^https?:\/\//);
    });
  });
});
