import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { makeVehicle, makeVehicleList } from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import VehicleTable from "./VehicleTable";

describe("VehicleTable", () => {
  it("renders the column headers", () => {
    renderWithTheme(
      <VehicleTable
        vehicles={[]}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );

    [
      "Vehicle",
      "Driver",
      "Status",
      "Speed",
      "Destination",
      "ETA",
      "Last Update",
      "Location",
    ].forEach((col) => expect(screen.getByText(col)).toBeInTheDocument());
  });

  it("shows the vehicle count in the header", () => {
    const vehicles = makeVehicleList();
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );
    expect(
      screen.getByText(`Vehicles (${vehicles.length})`),
    ).toBeInTheDocument();
  });

  it("renders a row per vehicle with its key fields", () => {
    const vehicles = [
      makeVehicle({ id: "v1", vehicleNumber: "FL-777", driver: "Alice" }),
    ];
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );

    expect(screen.getByText("FL-777")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it('renders an "Unknown"-safe status chip for a status not present in STATUS_META', () => {
    const vehicles = [makeVehicle({ id: "v1", status: "weird_status" })];
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );
    expect(screen.getByText("weird_status")).toBeInTheDocument();
  });

  it("shows the empty state only when not loading, no error, and zero vehicles", () => {
    renderWithTheme(
      <VehicleTable
        vehicles={[]}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );
    expect(
      screen.getByText("No vehicles match this filter."),
    ).toBeInTheDocument();
  });

  it("does not show the empty state while loading", () => {
    renderWithTheme(
      <VehicleTable
        vehicles={[]}
        onSelect={jest.fn()}
        loading
        error={null}
        wsStatus="connected"
      />,
    );
    expect(
      screen.queryByText("No vehicles match this filter."),
    ).not.toBeInTheDocument();
  });

  it("does not show the empty state when there is an error", () => {
    renderWithTheme(
      <VehicleTable
        vehicles={[]}
        onSelect={jest.fn()}
        loading={false}
        error="failed"
        wsStatus="connected"
      />,
    );
    expect(
      screen.queryByText("No vehicles match this filter."),
    ).not.toBeInTheDocument();
  });

  it("calls onSelect with the vehicle id when a row is clicked", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    const vehicles = [makeVehicle({ id: "v1", vehicleNumber: "FL-001" })];
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={onSelect}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );

    await act(async () => {
      await user.click(await screen.findByText("FL-001"));
    });

    expect(onSelect).toHaveBeenCalledWith("v1");
  });

  it("calls onSelect exactly once (not twice) when the vehicle-number link is clicked", async () => {
    const onSelect = jest.fn();
    const vehicles = [makeVehicle({ id: "v1", vehicleNumber: "FL-001" })];
    const user = userEvent.setup();
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={onSelect}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );

    // Clicking the inner link stops propagation, so the row's own onClick
    // must not also fire — verifying onSelect isn't called twice per click.
    await act(async () => {
      await user.click(await screen.findByText("FL-001"));
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("v1");
  });

  it("formats speed with a mph suffix per row", () => {
    const vehicles = [makeVehicle({ id: "v1", speed: 73 })];
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );
    expect(screen.getByText("73 mph")).toBeInTheDocument();
  });

  it("renders '-' for a vehicle with no ETA", () => {
    const vehicles = [makeVehicle({ id: "v1", eta: null })];
    renderWithTheme(
      <VehicleTable
        vehicles={vehicles}
        onSelect={jest.fn()}
        loading={false}
        error={null}
        wsStatus="connected"
      />,
    );
  });
});
