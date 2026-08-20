import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { makeVehicleList } from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import StatusFilters from "./StatusFilters";

describe("StatusFilters", () => {
  it("renders all four filter buttons with correct labels", () => {
    renderWithTheme(
      <StatusFilters vehicles={[]} activeFilter="ALL" onChange={jest.fn()} />,
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("En Route")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("computes and displays the correct count per status from the vehicle list", () => {
    const vehicles = makeVehicleList(); // 1 idle, 1 en_route, 1 delivered
    renderWithTheme(
      <StatusFilters
        vehicles={vehicles}
        activeFilter="ALL"
        onChange={jest.fn()}
      />,
    );

    // "All" count == total vehicles
    expect(screen.getByText(String(vehicles.length))).toBeInTheDocument();
    // Each status count should be exactly 1 for this fixture
    const ones = screen.getAllByText("1");
    expect(ones.length).toBe(3);
  });

  it("shows 0 for statuses with no matching vehicles", () => {
    renderWithTheme(
      <StatusFilters vehicles={[]} activeFilter="ALL" onChange={jest.fn()} />,
    );
    // ALL=0, idle=0, en_route=0, delivered=0 => four independent "0" labels
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("calls onChange with the clicked filter key", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(
      <StatusFilters vehicles={[]} activeFilter="ALL" onChange={onChange} />,
    );

    await act(async () => {
      await user.click(screen.getByText("Idle"));
    });
    expect(onChange).toHaveBeenCalledWith("idle");

    await act(async () => {
      await user.click(screen.getByText("En Route"));
    });
    expect(onChange).toHaveBeenCalledWith("en_route");

    await act(async () => {
      await user.click(screen.getByText("Delivered"));
    });
    expect(onChange).toHaveBeenCalledWith("delivered");

    await act(async () => {
      await user.click(screen.getByText("All"));
    });
    expect(onChange).toHaveBeenCalledWith("ALL");
  });

  it("calls onChange even when the clicked filter is already active", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(
      <StatusFilters vehicles={[]} activeFilter="idle" onChange={onChange} />,
    );

    await act(async () => {
      await user.click(screen.getByText("Idle"));
    });
    expect(onChange).toHaveBeenCalledWith("idle");
  });
});
