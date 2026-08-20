import { screen } from "@testing-library/react";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import Header from "./Header";

describe("Header", () => {
  it("renders the dashboard title and subtitle", () => {
    renderWithTheme(<Header />);

    expect(screen.getByText("Fleet Tracking Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText(/Real-time vehicle monitoring/i),
    ).toBeInTheDocument();
  });
});
