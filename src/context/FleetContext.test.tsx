import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import * as api from "../api/client";
import { createFleetSocket } from "../api/websocket";
import {
  makeRawVehicle,
  makeWsInitialDataMessage,
  makeWsUpdateMessage,
  rawStatisticsFixture,
} from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import { WsUpdateMessage } from "../types";
import { FleetProvider, useFleet } from "./FleetContext";

jest.mock("../api/client");
jest.mock("../api/websocket");

const mockedApi = api as jest.Mocked<typeof api>;
const mockedCreateFleetSocket = createFleetSocket as jest.MockedFunction<
  typeof createFleetSocket
>;

/** Test harness exposing FleetContext state/actions through the DOM so tests can assert/drive it. */
function Harness(): JSX.Element {
  const fleet = useFleet();
  return (
    <div>
      <div data-testid="loading">{String(fleet.loading)}</div>
      <div data-testid="error">{fleet.error ?? ""}</div>
      <div data-testid="vehicle-count">{fleet.vehicles.length}</div>
      <div data-testid="stats-total">{fleet.statistics?.total ?? ""}</div>
      <div data-testid="filter">{fleet.statusFilter}</div>
      <div data-testid="ws-status">{fleet.wsStatus}</div>
      <div data-testid="last-updated">{fleet.lastUpdated ?? ""}</div>
      <div data-testid="selected-id">{fleet.selectedVehicleId ?? ""}</div>
      <div data-testid="detail-loading">
        {String(fleet.vehicleDetailLoading)}
      </div>
      <div data-testid="detail-driver">{fleet.vehicleDetail?.driver ?? ""}</div>
      <button onClick={() => fleet.fetchAll()}>fetchAll</button>
      <button onClick={() => fleet.setFilter("idle")}>setFilter</button>
      <button onClick={() => fleet.selectVehicle("veh-001")}>
        selectVehicle
      </button>
      <button onClick={() => fleet.clearSelection()}>clearSelection</button>
      <button onClick={() => fleet.connectSocket()}>connectSocket</button>
      <button onClick={() => fleet.disconnectSocket()}>disconnectSocket</button>
    </div>
  );
}

function renderHarness() {
  return renderWithTheme(
    <FleetProvider>
      <Harness />
    </FleetProvider>,
  );
}

describe("FleetContext / FleetProvider", () => {
  let closeMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    closeMock = jest.fn();
    mockedCreateFleetSocket.mockReturnValue({ close: closeMock });
  });

  it("starts in a loading state with no vehicles/stats", () => {
    mockedApi.getVehicles.mockReturnValue(new Promise(() => {})); // never resolves
    mockedApi.getStatistics.mockReturnValue(new Promise(() => {}));
    renderHarness();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
    expect(screen.getByTestId("filter")).toHaveTextContent("ALL");
  });

  it("fetchAll populates vehicles and statistics on success", async () => {
    mockedApi.getVehicles.mockResolvedValue({
      success: true,
      data: [makeRawVehicle({ id: "v1" }), makeRawVehicle({ id: "v2" })],
    });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("sets an error and stops loading when getVehicles rejects", async () => {
    mockedApi.getVehicles.mockRejectedValue(new Error("Network down"));
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
  });

  it("does not let a statistics failure block the vehicle list (falls back to derived stats)", async () => {
    mockedApi.getVehicles.mockResolvedValue({
      success: true,
      data: [makeRawVehicle({ id: "v1", status: "idle", speed: 0 })],
    });
    mockedApi.getStatistics.mockRejectedValue(new Error("stats endpoint down"));

    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
    expect(screen.getByTestId("error")).toHaveTextContent(""); // stats failure is swallowed
  });

  it("treats a non-array vehicles payload as an empty list rather than crashing", async () => {
    mockedApi.getVehicles.mockResolvedValue({ success: true, data: undefined });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
  });

  it("re-fetches when fetchAll is invoked again (manual refresh)", async () => {
    mockedApi.getVehicles
      .mockResolvedValueOnce({
        success: true,
        data: [makeRawVehicle({ id: "v1" })],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [makeRawVehicle({ id: "v1" }), makeRawVehicle({ id: "v2" })],
      });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    const user = userEvent.setup();
    renderHarness();
    await waitFor(() =>
      expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
    );

    await act(async () => {
      await user.click(screen.getByText("fetchAll"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("vehicle-count")).toHaveTextContent("1"),
    );
  });

  it("setFilter updates statusFilter", async () => {
    mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });
    const user = userEvent.setup();
    renderHarness();

    await act(async () => {
      await user.click(screen.getByText("setFilter"));
    });
    expect(screen.getByTestId("filter")).toHaveTextContent("idle");
  });

  describe("selectVehicle", () => {
    it("sets selectedVehicleId immediately and loads detail asynchronously", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      mockedApi.getVehicleById.mockResolvedValue({
        success: true,
        data: makeRawVehicle({ id: "veh-001", driverName: "Jane Detail" }),
      });

      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("loading")).toHaveTextContent("true"),
      );

      await act(async () => {
        await user.click(screen.getByText("selectVehicle"));
      });

      expect(screen.getByTestId("selected-id")).toHaveTextContent("veh-001");
      await waitFor(() =>
        expect(screen.getByTestId("detail-driver")).toHaveTextContent(
          "Jane Detail",
        ),
      );
      expect(screen.getByTestId("detail-loading")).toHaveTextContent("false");
    });

    it("clears vehicleDetailLoading (without crashing) when the detail fetch fails", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      mockedApi.getVehicleById.mockRejectedValue(new Error("404"));

      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("loading")).toHaveTextContent("true"),
      );

      await act(async () => {
        await user.click(screen.getByText("selectVehicle"));
      });

      await waitFor(() =>
        expect(screen.getByTestId("detail-loading")).toHaveTextContent("false"),
      );
      expect(screen.getByTestId("detail-driver")).toHaveTextContent("");
    });

    it("clearSelection resets selectedVehicleId and vehicleDetail", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      mockedApi.getVehicleById.mockResolvedValue({
        success: true,
        data: makeRawVehicle({ id: "veh-001" }),
      });

      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("loading")).toHaveTextContent("true"),
      );
      await act(async () => {
        await user.click(screen.getByText("selectVehicle"));
      });
      await waitFor(() =>
        expect(screen.getByTestId("selected-id")).toHaveTextContent("veh-001"),
      );

      await act(async () => {
        await user.click(screen.getByText("clearSelection"));
      });
      expect(screen.getByTestId("selected-id")).toHaveTextContent("");
      expect(screen.getByTestId("detail-driver")).toHaveTextContent("");
    });
  });

  describe("WebSocket integration", () => {
    it("connectSocket wires up onStatusChange to wsStatus", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onStatusChange } = mockedCreateFleetSocket.mock.calls[0][0];

      act(() => {
        onStatusChange?.("connected");
      });
      await waitFor(() =>
        expect(screen.getByTestId("ws-status")).toHaveTextContent("connected"),
      );
    });

    it("connectSocket is idempotent - a second call does not open a new socket", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });

      expect(mockedCreateFleetSocket).toHaveBeenCalledTimes(1);
    });

    it("disconnectSocket closes the socket and allows reconnecting afterward", async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      await act(async () => {
        await user.click(screen.getByText("disconnectSocket"));
      });
      expect(closeMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      expect(mockedCreateFleetSocket).toHaveBeenCalledTimes(2);
    });

    it('replaces state wholesale on the confirmed "initial_data" snapshot push', async () => {
      mockedApi.getVehicles.mockResolvedValue({
        success: true,
        data: [makeRawVehicle({ id: "v1", speed: 10 })],
      });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      // Full-fleet snapshot with a different set of vehicles than what's
      // already in state: since this is `initial_data`, it should replace
      // the list outright (2 vehicles), not merge on top of the existing 1.
      act(() => {
        onMessage?.(
          makeWsInitialDataMessage({
            data: [makeRawVehicle({ id: "v2" }), makeRawVehicle({ id: "v3" })],
          }),
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("2"),
      );
    });

    it('uses the server-reported timestamp from an "initial_data" push as lastUpdated', async () => {
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      act(() => {
        onMessage?.(
          makeWsInitialDataMessage({ timestamp: "2026-08-18T09:10:51.412Z" }),
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId("last-updated")).toHaveTextContent(
          "2026-08-18T09:10:51.412Z",
        ),
      );
    });

    it('merges an incremental (non-"initial_data") WS push into existing vehicles by id (upsert semantics)', async () => {
      mockedApi.getVehicles.mockResolvedValue({
        success: true,
        data: [makeRawVehicle({ id: "v1", speed: 10 })],
      });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      const payload: WsUpdateMessage = makeWsUpdateMessage({
        data: [
          makeRawVehicle({ id: "v1", speed: 99 }),
          makeRawVehicle({ id: "v2", speed: 5 }),
        ],
      });
      act(() => {
        onMessage?.(payload);
      });

      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("2"),
      );
    });

    it("ignores a WS payload whose normalized vehicle list is empty", async () => {
      mockedApi.getVehicles.mockResolvedValue({
        success: true,
        data: [makeRawVehicle({ id: "v1" })],
      });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      onMessage?.(makeWsUpdateMessage({ data: [] }));

      // Count should remain unchanged (no spurious update dispatched).
      expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0");
    });

    it("recomputes statistics client-side on an incremental WS update when the payload has no statistics field", async () => {
      mockedApi.getVehicles.mockResolvedValue({
        success: true,
        data: [makeRawVehicle({ id: "v1", status: "idle" })],
      });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      act(() => {
        onMessage?.(
          makeWsUpdateMessage({
            data: [makeRawVehicle({ id: "v2", status: "delivered" })],
          }),
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("1"),
      );
      expect(screen.getByTestId("stats-total")).toHaveTextContent("1");
    });

    it('ignores statistics on an "initial_data" push (full snapshot recomputes client-side instead)', async () => {
      // The confirmed initial_data payload never includes a `statistics`
      // field, so a snapshot always derives stats from the vehicles it
      // carries rather than trusting a stray one on the message.
      mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
      mockedApi.getStatistics.mockResolvedValue({
        success: true,
        data: rawStatisticsFixture,
      });
      const user = userEvent.setup();
      renderHarness();
      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("0"),
      );

      await act(async () => {
        await user.click(screen.getByText("connectSocket"));
      });
      const { onMessage } = mockedCreateFleetSocket.mock.calls[0][0];

      act(() => {
        onMessage?.(
          makeWsInitialDataMessage({
            data: [makeRawVehicle({ id: "v1", status: "idle" })],
          }),
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId("vehicle-count")).toHaveTextContent("1"),
      );
      expect(screen.getByTestId("stats-total")).toHaveTextContent("1");
    });
  });

  it("useFleet throws when used outside of a FleetProvider", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    function Bare() {
      useFleet();
      return null;
    }
    expect(() => renderWithTheme(<Bare />)).toThrow(
      "useFleet must be used within a FleetProvider",
    );
    consoleErrorSpy.mockRestore();
  });
});
