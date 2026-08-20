import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { makeVehicle } from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import VehicleDetailModal from "./VehicleDetailModal";

describe("VehicleDetailModal", () => {
  it("renders nothing meaningful when closed (Dialog unmounts content)", () => {
    renderWithTheme(
      <VehicleDetailModal
        open={false}
        onClose={jest.fn()}
        vehicle={null}
        loading={false}
      />,
    );
    expect(
      screen.queryByText("Vehicle details unavailable."),
    ).not.toBeInTheDocument();
  });

  it("shows a spinner while loading and no vehicle is available yet", () => {
    renderWithTheme(
      <VehicleDetailModal open onClose={jest.fn()} vehicle={null} loading />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it('shows an "unavailable" message when not loading and there is no vehicle', () => {
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={null}
        loading={false}
      />,
    );
    expect(
      screen.getByText("Vehicle details unavailable."),
    ).toBeInTheDocument();
  });

  it("renders full vehicle details when a vehicle is provided", () => {
    const vehicle = makeVehicle({
      vehicleNumber: "FL-042",
      driver: "Sam Carter",
      phone: "+1-555-1234",
      status: "en_route",
      speed: 65,
      destination: "Port Terminal",
      batteryLevel: 80,
      fuelLevel: 40,
    });

    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={vehicle}
        loading={false}
      />,
    );

    expect(screen.getByText("FL-042")).toBeInTheDocument();
    expect(screen.getAllByText("Sam Carter").length).toBeGreaterThan(0);
    expect(screen.getByText("+1-555-1234")).toBeInTheDocument();
    expect(screen.getByText("Port Terminal")).toBeInTheDocument();
    expect(screen.getByText("65 mph")).toBeInTheDocument();
    expect(screen.getByText("En Route")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders an em dash for phone when the vehicle has none", () => {
    const vehicle = makeVehicle({ phone: null });
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={vehicle}
        loading={false}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it('renders "—" for the battery/fuel bar when the level is not a finite number', () => {
    const vehicle = makeVehicle({
      batteryLevel: undefined,
      fuelLevel: undefined,
    });
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={vehicle}
        loading={false}
      />,
    );
    // Two independent LevelBar fallbacks (battery + fuel), plus possibly others.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("clamps out-of-range level values into the 0-100 display range", () => {
    const vehicle = makeVehicle({ batteryLevel: 150, fuelLevel: -20 });
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={vehicle}
        loading={false}
      />,
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("calls onClose when the close icon button is clicked", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    const vehicle = makeVehicle();
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={onClose}
        vehicle={vehicle}
        loading={false}
      />,
    );

    await act(async () => {
      await user.click(await screen.findByRole("button"));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an em dash for ETA when the vehicle has none", () => {
    const vehicle = makeVehicle({ eta: null });
    renderWithTheme(
      <VehicleDetailModal
        open
        onClose={jest.fn()}
        vehicle={vehicle}
        loading={false}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
