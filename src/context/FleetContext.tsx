import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";
import * as api from "../api/client";
import { createFleetSocket, FleetSocket } from "../api/websocket";
import {
  isInitialDataMessage,
  RawVehicle,
  Statistics,
  Vehicle,
  WsStatus,
} from "../types";
import { normalizeStatistics, normalizeVehicle } from "../utils/formatters";

export interface FleetState {
  vehicles: Vehicle[];
  statistics: Statistics | null;
  statusFilter: string;
  loading: boolean;
  error: string | null;
  selectedVehicleId: string | null;
  vehicleDetail: Vehicle | null;
  vehicleDetailLoading: boolean;
  wsStatus: WsStatus;
  lastUpdated: string | null;
}

type FleetAction =
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      vehicles: Vehicle[];
      statistics: Statistics;
      lastUpdated: string | undefined;
    }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SET_FILTER"; status: string }
  | { type: "SELECT_VEHICLE"; id: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "VEHICLE_DETAIL_START" }
  | { type: "VEHICLE_DETAIL_SUCCESS"; vehicle: Vehicle | null }
  | { type: "VEHICLE_DETAIL_ERROR" }
  | { type: "WS_STATUS"; status: WsStatus }
  | {
      type: "WS_UPDATE";
      vehicles: Vehicle[];
      statistics: Statistics | null;
      /**
       * True for the confirmed `initial_data` snapshot (full fleet, so it
       * replaces state outright); false/omitted for an incremental push,
       * which is merged into existing vehicles by `id` instead.
       */
      replace?: boolean;
      /** Server-reported push time (`timestamp`), preferred over client time. */
      timestamp?: string;
    };

export interface FleetContextValue extends FleetState {
  fetchAll: () => Promise<void>;
  selectVehicle: (id: string) => Promise<void>;
  clearSelection: () => void;
  setFilter: (status: string) => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

// Single context carrying both state and the bound action creators. (A
// second `dispatch`-only context was considered — the usual pattern for
// letting deep, dispatch-only consumers skip state-driven re-renders — but
// with a single consumer of `useFleet()` today, splitting it would add
// indirection without a real payoff. Revisit if a deep consumer that only
// needs to dispatch shows up.)
const FleetStateContext = createContext<FleetContextValue | null>(null);

const initialState: FleetState = {
  vehicles: [],
  statistics: null,
  statusFilter: "ALL",
  loading: true,
  error: null,
  selectedVehicleId: null,
  vehicleDetail: null,
  vehicleDetailLoading: false,
  wsStatus: "connecting", // connecting | connected | disconnected | error
  lastUpdated: null,
};

const mergeVehicles = (existing: Vehicle[], incoming: Vehicle[]): Vehicle[] => {
  const byId = new Map<string, Vehicle>(existing.map((v) => [v.id, v]));
  incoming.forEach((v) => {
    if (v.id) byId.set(v.id, { ...byId.get(v.id), ...v });
  });
  return Array.from(byId.values());
};

const reducer = (state: FleetState, action: FleetAction): FleetState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicles: action.vehicles,
        statistics: action.statistics,
        lastUpdated: action.lastUpdated || new Date().toISOString(),
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SET_FILTER":
      return { ...state, statusFilter: action.status };
    case "SELECT_VEHICLE":
      return { ...state, selectedVehicleId: action.id, vehicleDetail: null };
    case "CLEAR_SELECTION":
      return { ...state, selectedVehicleId: null, vehicleDetail: null };
    case "VEHICLE_DETAIL_START":
      return { ...state, vehicleDetailLoading: true };
    case "VEHICLE_DETAIL_SUCCESS":
      return {
        ...state,
        vehicleDetailLoading: false,
        vehicleDetail: action.vehicle,
      };
    case "VEHICLE_DETAIL_ERROR":
      return { ...state, vehicleDetailLoading: false };
    case "WS_STATUS":
      return { ...state, wsStatus: action.status };
    case "WS_UPDATE": {
      const merged = action.replace
        ? action.vehicles
        : mergeVehicles(state.vehicles, action.vehicles);
      return {
        ...state,
        vehicles: merged,
        statistics: action.statistics || normalizeStatistics(null, merged),
        lastUpdated: action.timestamp || new Date().toISOString(),
      };
    }
    default:
      return state;
  }
};

export interface FleetProviderProps {
  children: ReactNode;
}

export const FleetProvider = ({ children }: FleetProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<FleetSocket | null>(null);
  // Guards against out-of-order responses: if the user selects vehicle A
  // then quickly selects vehicle B, A's `getVehicleById` may resolve after
  // B's. Each call captures the token current at call time and only commits
  // its result if it's still the latest, so a slow, stale response can never
  // clobber a newer selection.
  const selectionTokenRef = useRef(0);

  const fetchAll = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const [vehiclesRes, statsRes] = await Promise.all([
        api.getVehicles(),
        api.getStatistics().catch(() => null), // stats endpoint failure shouldn't block the list
      ]);
      const vehiclesData = vehiclesRes?.data;
      const rawList: RawVehicle[] = Array.isArray(vehiclesData)
        ? vehiclesData
        : [];
      const vehicles = rawList
        .map(normalizeVehicle)
        .filter((v): v is Vehicle => Boolean(v));
      const statistics = normalizeStatistics(statsRes?.data, vehicles);
      dispatch({
        type: "FETCH_SUCCESS",
        vehicles,
        statistics,
        lastUpdated: vehiclesRes?.timestamp,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load fleet data";
      dispatch({ type: "FETCH_ERROR", error: message });
    }
  }, []);

  const selectVehicle = useCallback(async (id: string) => {
    const token = ++selectionTokenRef.current;
    dispatch({ type: "SELECT_VEHICLE", id });
    dispatch({ type: "VEHICLE_DETAIL_START" });
    try {
      const res = await api.getVehicleById(id);
      if (selectionTokenRef.current !== token) return; // superseded by a newer selection
      dispatch({
        type: "VEHICLE_DETAIL_SUCCESS",
        vehicle: normalizeVehicle(res?.data),
      });
    } catch (err) {
      if (selectionTokenRef.current !== token) return; // superseded by a newer selection
      // Fall back silently to the row's already-known data (set below by caller)
      dispatch({ type: "VEHICLE_DETAIL_ERROR" });
    }
  }, []);

  const clearSelection = useCallback(() => {
    // Invalidate any in-flight detail fetch so it can't repopulate the
    // modal after the user has already closed/cleared it.
    selectionTokenRef.current += 1;
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const setFilter = useCallback(
    (status: string) => dispatch({ type: "SET_FILTER", status }),
    [],
  );

  const connectSocket = useCallback(() => {
    if (socketRef.current) return;
    socketRef.current = createFleetSocket({
      onStatusChange: (status) => dispatch({ type: "WS_STATUS", status }),
      onMessage: (payload) => {
        const isSnapshot = isInitialDataMessage(payload);
        let rawList: RawVehicle[];
        let statistics: Statistics | null = null;
        if (isInitialDataMessage(payload)) {
          rawList = payload.data;
        } else {
          const { data } = payload;
          rawList = Array.isArray(data) ? data : data ? [data] : [];
          statistics = payload.statistics
            ? normalizeStatistics(payload.statistics)
            : null;
        }
        const vehicles = rawList
          .map(normalizeVehicle)
          .filter((v): v is Vehicle => Boolean(v && v.id));
        if (vehicles.length) {
          dispatch({
            type: "WS_UPDATE",
            vehicles,
            statistics,
            replace: isSnapshot,
            timestamp: payload.timestamp,
          });
        }
      },
    });
  }, []);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  // All the action creators above are stable (empty-deps `useCallback`s), so
  // this only needs to change identity when `state` itself changes —
  // otherwise every FleetProvider re-render (e.g. from an unrelated parent
  // update) would hand consumers a brand-new object and defeat any
  // `React.memo`/selector-based bailout downstream.
  const value: FleetContextValue = useMemo(
    () => ({
      ...state,
      fetchAll,
      selectVehicle,
      clearSelection,
      setFilter,
      connectSocket,
      disconnectSocket,
    }),
    [
      state,
      fetchAll,
      selectVehicle,
      clearSelection,
      setFilter,
      connectSocket,
      disconnectSocket,
    ],
  );

  return (
    <FleetStateContext.Provider value={value}>
      {children}
    </FleetStateContext.Provider>
  );
};

export const useFleet = (): FleetContextValue => {
  const ctx = useContext(FleetStateContext);
  if (!ctx) throw new Error("useFleet must be used within a FleetProvider");
  return ctx;
};
