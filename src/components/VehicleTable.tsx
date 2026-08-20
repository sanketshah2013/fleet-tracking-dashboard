import {
  Box,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { memo } from "react";
import { StatusMeta, Vehicle, VehicleStatus, WsStatus } from "../types";
import {
  STATUS_META,
  formatCoordinate,
  formatTimestamp,
} from "../utils/formatters";
import LiveIndicator from "./LiveIndicator";

const COLUMNS: string[] = [
  "Vehicle",
  "Driver",
  "Status",
  "Speed",
  "Destination",
  "ETA",
  "Last Update",
  "Location",
];

interface VehicleRowProps {
  vehicle: Vehicle;
  onSelect: (id: string) => void;
}

/**
 * One table row, isolated so an incremental WebSocket update that only
 * touches a handful of vehicles doesn't force a re-render (and MUI Table
 * reconciliation cost) across the whole list. `FleetContext`'s merge keeps
 * untouched vehicles' object references stable, so this memo actually pays
 * off rather than always missing.
 */
const VehicleRow = memo(function VehicleRow({
  vehicle,
  onSelect,
}: VehicleRowProps) {
  const meta: StatusMeta = STATUS_META[vehicle.status as VehicleStatus] || {
    label: vehicle.status,
    color: "default",
  };
  return (
    <TableRow
      hover
      sx={{ cursor: "pointer" }}
      onClick={() => onSelect(vehicle.id)}
    >
      <TableCell>
        <Link
          component="button"
          underline="always"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onSelect(vehicle.id);
          }}
          sx={{ fontWeight: 700 }}
        >
          {vehicle.vehicleNumber}
        </Link>
      </TableCell>
      <TableCell>{vehicle.driver}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={meta.label}
          color={meta.color}
          sx={{ fontSize: "0.7rem" }}
        />
      </TableCell>
      <TableCell>{vehicle.speed} mph</TableCell>
      <TableCell>{vehicle.destination}</TableCell>
      <TableCell>{vehicle.eta ? formatTimestamp(vehicle.eta) : "-"}</TableCell>
      <TableCell>{formatTimestamp(vehicle.lastUpdate)}</TableCell>
      <TableCell>{formatCoordinate(vehicle.lat, vehicle.lng)}</TableCell>
    </TableRow>
  );
});

export interface VehicleTableProps {
  vehicles: Vehicle[];
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  wsStatus: WsStatus;
}

const VehicleTable = ({
  vehicles,
  onSelect,
  loading,
  error,
  wsStatus,
}: VehicleTableProps): JSX.Element => {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, overflow: "hidden", height: "calc(100vh-60px)" }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 1.75 }}
      >
        <Typography variant="subtitle1">
          Vehicles ({vehicles.length})
        </Typography>
        <LiveIndicator status={wsStatus} variant="chip" />
      </Stack>

      <TableContainer sx={{ maxHeight: 640 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((v) => (
              <VehicleRow key={v.id} vehicle={v} onSelect={onSelect} />
            ))}

            {!loading && !error && vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length}>
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No vehicles match this filter.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// Props are the filtered vehicle list, a stable onSelect (from FleetContext's
// useCallback), and primitives — so this bails out cleanly on renders driven
// by unrelated state (e.g. the sidebar's ticking clock, opening the modal).
export default memo(VehicleTable);
