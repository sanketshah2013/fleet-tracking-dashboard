import { screen } from "@testing-library/react";
import { statisticsFixture } from "../test-utils/fixtures";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import StatsCards from "./StatsCards";

describe("StatsCards", () => {
  it("renders all four card labels", () => {
    renderWithTheme(
      <StatsCards statistics={statisticsFixture} lastUpdateTime="2m ago" />,
    );

    expect(screen.getByText("Fleet Statistics")).toBeInTheDocument();
    expect(screen.getByText("Total Fleet")).toBeInTheDocument();
    expect(screen.getByText("Avg Speed")).toBeInTheDocument();
    expect(screen.getByText("Moving")).toBeInTheDocument();
    expect(screen.getByText("Last Update")).toBeInTheDocument();
  });

  it("renders statistic values, including the mph suffix on avg speed", () => {
    renderWithTheme(
      <StatsCards statistics={statisticsFixture} lastUpdateTime="2m ago" />,
    );

    expect(
      screen.getByText(String(statisticsFixture.total)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${statisticsFixture.avgSpeed} mph`),
    ).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
  });

  it("renders em-dash placeholders when statistics is null", () => {
    renderWithTheme(<StatsCards statistics={null} lastUpdateTime={null} />);

    const dashes = screen.getAllByText("—");
    // Total, Avg Speed, Moving, Last Update all fall back to '—'.
    expect(dashes.length).toBe(4);
  });

  it("falls back to an em dash for lastUpdateTime when not provided", () => {
    renderWithTheme(<StatsCards statistics={statisticsFixture} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders 0 values distinctly from missing values (not as a dash)", () => {
    renderWithTheme(
      <StatsCards
        statistics={{
          total: 0,
          idle: 0,
          en_route: 0,
          delivered: 0,
          avgSpeed: 0,
        }}
        lastUpdateTime="just now"
      />,
    );
    // total & moving are both 0 -> two separate "0" nodes
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("0 mph")).toBeInTheDocument();
  });
});
