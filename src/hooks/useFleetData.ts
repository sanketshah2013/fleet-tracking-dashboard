import { useEffect } from "react";
import { useFleet } from "../context/FleetContext";

/**
 * Bootstraps the dashboard: loads the initial REST snapshot, then opens the
 * WebSocket for live push updates (server pushes roughly every 3 minutes).
 */
export const useFleetData = (): void => {
  const { fetchAll, connectSocket, disconnectSocket } = useFleet();

  useEffect(() => {
    fetchAll();
    connectSocket();
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
