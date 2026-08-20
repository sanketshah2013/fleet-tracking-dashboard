import { screen } from "@testing-library/react";
import { act } from "react";
import { makeVehicleList, statisticsFixture } from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("composes LiveIndicator, StatusFilters, and StatsCards", () => {
    renderWithTheme(
      <Sidebar
        vehicles={[]}
        statistics={statisticsFixture}
        wsStatus="connected"
        statusFilter="ALL"
        onFilterChange={jest.fn()}
        lastUpdated={null}
      />,
    );

    expect(screen.getByText("Live Updates Active")).toBeInTheDocument(); // LiveIndicator
    expect(screen.getByText("Filter by Status")).toBeInTheDocument(); // StatusFilters
    expect(screen.getByText("Fleet Statistics")).toBeInTheDocument(); // StatsCards
  });

  it("shows an em dash for the update caption when there is no lastUpdated and no vehicles", () => {
    renderWithTheme(
      <Sidebar
        vehicles={[]}
        statistics={null}
        wsStatus="connecting"
        statusFilter="ALL"
        onFilterChange={jest.fn()}
        lastUpdated={null}
      />,
    );
    expect(
      screen.getByText(/Updated — • Next update in ~3 minutes/),
    ).toBeInTheDocument();
  });

  it('shows a relative "time ago" caption when lastUpdated is set', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    renderWithTheme(
      <Sidebar
        vehicles={makeVehicleList()}
        statistics={statisticsFixture}
        wsStatus="connected"
        statusFilter="ALL"
        onFilterChange={jest.fn()}
        lastUpdated={fiveMinAgo}
      />,
    );
    expect(screen.getByText(/Updated 5m ago/)).toBeInTheDocument();
  });

  it("re-renders the caption on its internal 1s tick without requiring new props", () => {
    jest.useFakeTimers();
    const fixedNow = new Date("2026-08-19T14:00:00.000Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(fixedNow);

    renderWithTheme(
      <Sidebar
        vehicles={makeVehicleList()}
        statistics={statisticsFixture}
        wsStatus="connected"
        statusFilter="ALL"
        onFilterChange={jest.fn()}
        lastUpdated={new Date(fixedNow - 30_000).toISOString()}
      />,
    );
    expect(screen.getByText(/Updated 30s ago/)).toBeInTheDocument();

    // Advance real elapsed time by 40s and let the 1s ticker re-render.
    jest.spyOn(Date, "now").mockReturnValue(fixedNow + 40_000);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/Updated 1m ago/)).toBeInTheDocument();

    jest.useRealTimers();
    jest.restoreAllMocks();
  });
});
