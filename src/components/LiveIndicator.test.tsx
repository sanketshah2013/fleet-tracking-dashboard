import { screen } from "@testing-library/react";
import { renderWithTheme } from "../test-utils/renderWithTheme";
import { WsStatus } from "../types";
import LiveIndicator from "./LiveIndicator";

describe("LiveIndicator", () => {
  describe("block variant (default)", () => {
    const cases: Array<[WsStatus, string]> = [
      ["connecting", "Connecting…"],
      ["connected", "Live Updates Active"],
      ["disconnected", "Reconnecting…"],
      ["error", "Connection Issue"],
    ];

    it.each(cases)(
      'renders the correct label for status "%s"',
      (status, expectedLabel) => {
        renderWithTheme(<LiveIndicator status={status} />);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      },
    );

    it('falls back to the "connecting" copy for an unrecognized status', () => {
      renderWithTheme(<LiveIndicator status={"bogus" as WsStatus} />);
      expect(screen.getByText("Connecting…")).toBeInTheDocument();
    });
  });

  describe("chip variant", () => {
    it('shows "Live" when connected', () => {
      renderWithTheme(<LiveIndicator status="connected" variant="chip" />);
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    const nonConnectedStatuses: WsStatus[] = [
      "connecting",
      "disconnected",
      "error",
    ];

    it.each(nonConnectedStatuses)(
      'shows "Offline" for non-connected status "%s"',
      (status) => {
        renderWithTheme(<LiveIndicator status={status} variant="chip" />);
        expect(screen.getByText("Offline")).toBeInTheDocument();
      },
    );
  });
});
