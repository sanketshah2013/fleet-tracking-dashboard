import { renderHook } from "@testing-library/react";
import { useFleet } from "../context/FleetContext";
import { useFleetData } from "./useFleetData";

jest.mock("../context/FleetContext");

const mockedUseFleet = useFleet as jest.MockedFunction<typeof useFleet>;

describe("useFleetData", () => {
  const fetchAll = jest.fn();
  const connectSocket = jest.fn();
  const disconnectSocket = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseFleet.mockReturnValue({
      fetchAll,
      connectSocket,
      disconnectSocket,
    } as unknown as ReturnType<typeof useFleet>);
  });

  it("calls fetchAll and connectSocket exactly once on mount", () => {
    renderHook(() => useFleetData());

    expect(fetchAll).toHaveBeenCalledTimes(1);
    expect(connectSocket).toHaveBeenCalledTimes(1);
    expect(disconnectSocket).not.toHaveBeenCalled();
  });

  it("calls disconnectSocket on unmount", () => {
    const { unmount } = renderHook(() => useFleetData());

    unmount();

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("does not re-run fetchAll/connectSocket on re-render (empty dependency array)", () => {
    const { rerender } = renderHook(() => useFleetData());

    rerender();
    rerender();

    expect(fetchAll).toHaveBeenCalledTimes(1);
    expect(connectSocket).toHaveBeenCalledTimes(1);
  });
});
