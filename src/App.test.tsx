import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import * as api from "./api/client";
import { createFleetSocket } from "./api/websocket";
import App from "./App";
import { FleetProvider } from "./context/FleetContext";
import { makeRawVehicle, rawStatisticsFixture } from "./test-utils/fixtures";
import { renderWithTheme } from "./test-utils/renderWithTheme";
import { ApiEnvelope, RawVehicle } from "./types";

jest.mock("./api/client");
jest.mock("./api/websocket");

const mockedApi = api as jest.Mocked<typeof api>;
const mockedCreateFleetSocket = createFleetSocket as jest.MockedFunction<
  typeof createFleetSocket
>;

function renderApp() {
  return renderWithTheme(
    <FleetProvider>
      <App />
    </FleetProvider>,
  );
}

describe("App (integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateFleetSocket.mockReturnValue({ close: jest.fn() });
  });

  it("shows loading skeletons before data arrives, then renders the vehicle table", async () => {
    // Typed to match `getVehicles`' real resolved type (`ApiEnvelope<RawVehicle[]>`),
    // not `unknown` — a `Promise` executor's `resolve` only accepts the promise's
    // own resolved type (or a thenable of it), so assigning it into a variable
    // declared to accept `unknown` doesn't type-check under `strict`.
    let resolveVehicles: (value: ApiEnvelope<RawVehicle[]>) => void = () => {};
    mockedApi.getVehicles.mockReturnValue(
      new Promise<ApiEnvelope<RawVehicle[]>>((resolve) => {
        resolveVehicles = resolve;
      }),
    );
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    renderApp();

    // While pending, the table (with its distinctive header) should not be present yet.
    expect(screen.queryByText(/Vehicles \(/)).not.toBeInTheDocument();

    resolveVehicles({
      success: true,
      data: [makeRawVehicle({ id: "v1", vehicleNumber: "FL-001" })],
    });

    const vehicleText = await screen.findByText("Vehicles (1)");
    expect(vehicleText).toBeInTheDocument();
    expect(screen.getByText("FL-001")).toBeInTheDocument();
  });

  it("shows an error alert when the initial fetch fails, without crashing the rest of the UI", async () => {
    mockedApi.getVehicles.mockRejectedValue(new Error("Server unreachable"));
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });

    renderApp();

    const serverText = await screen.findByText(
      /Couldn't load fleet data: Server unreachable/,
    );
    expect(serverText).toBeInTheDocument();

    // Sidebar should still render even when the fetch failed.
    expect(screen.getByText("Fleet Tracking Dashboard")).toBeInTheDocument();
  });

  it("opens the detail modal with the correct vehicle when a row is clicked, and closes it", async () => {
    mockedApi.getVehicles.mockResolvedValue({
      success: true,
      data: [
        makeRawVehicle({
          id: "v1",
          vehicleNumber: "FL-001",
          driverName: "Alex Rider",
        }),
      ],
    });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });
    mockedApi.getVehicleById.mockResolvedValue({
      success: true,
      data: makeRawVehicle({
        id: "v1",
        vehicleNumber: "FL-001",
        driverName: "Alex Rider",
      }),
    });

    const user = userEvent.setup();
    renderApp();

    const fleetText = await screen.findByText("FL-001");
    expect(fleetText).toBeInTheDocument();
    await act(() => {
      user.click(screen.getByText("FL-001"));
    });

    await waitFor(() =>
      expect(screen.getAllByText("Alex Rider").length).toBeGreaterThan(0),
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Vehicle details unavailable."),
      ).not.toBeInTheDocument(),
    );
  });

  it("falls back to the already-known row data in the modal if the detail fetch fails", async () => {
    mockedApi.getVehicles.mockResolvedValue({
      success: true,
      data: [
        makeRawVehicle({
          id: "v1",
          vehicleNumber: "FL-999",
          driverName: "Fallback Driver",
        }),
      ],
    });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });
    mockedApi.getVehicleById.mockRejectedValue(new Error("not found"));

    const user = userEvent.setup();
    renderApp();

    const fleetText = await screen.findByText("FL-999");
    expect(fleetText).toBeInTheDocument();

    await (async () => {
      user.click(screen.getByText("FL-999"));
    });

    // vehicleDetail stays null on error, so App falls back to the row already in `vehicles`.
    await waitFor(() =>
      expect(screen.getAllByText("Fallback Driver").length).toBeGreaterThan(0),
    );
  });

  it("connects the WebSocket on mount and disconnects it on unmount", async () => {
    mockedApi.getVehicles.mockResolvedValue({ success: true, data: [] });
    mockedApi.getStatistics.mockResolvedValue({
      success: true,
      data: rawStatisticsFixture,
    });
    const closeSpy = jest.fn();
    mockedCreateFleetSocket.mockReturnValue({ close: closeSpy });

    const { unmount } = renderApp();

    await waitFor(() =>
      expect(mockedCreateFleetSocket).toHaveBeenCalledTimes(1),
    );

    unmount();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
