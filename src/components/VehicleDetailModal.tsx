import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ReactNode, memo } from "react";
import { StatusMeta, Vehicle, VehicleStatus } from "../types";
import {
  STATUS_META,
  formatCoordinate,
  formatTimestamp,
} from "../utils/formatters";

interface FieldProps {
  label: string;
  children: ReactNode;
}

interface StripePaperProps {
  children: ReactNode;
}

const StripePaper = ({ children }: StripePaperProps) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: "8px 16px",
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
        position: "relative",
        overflow: "hidden",
        height: "74px",
        "&::before": {
          content: '""',
          position: "absolute",
          left: "0px",
          top: "0px", // Vertical offset to make it look like a floating strip segment
          bottom: "0px", // Vertical offset from bottom to round off cleanly
          width: "4px", // Width profile matching the sleek accent indicator
          bgcolor: "#2b52cd", // Vibrant blue matching the screenshot
          borderRadius: "4px", // Curved caps on both ends of the vertical strip
        },
      }}
    >
      {children}
    </Paper>
  );
};

const Field = ({ label, children }: FieldProps): JSX.Element => {
  return (
    <Grid item xs={6}>
      <StripePaper>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          {label}
        </Typography>
        <Box fontWeight={700}>{children}</Box>
      </StripePaper>
    </Grid>
  );
};

interface LevelBarProps {
  value: number | string | null | undefined;
  colorAbove50?:
    | "success"
    | "warning"
    | "error"
    | "info"
    | "primary"
    | "secondary";
  colorBelow50?:
    | "success"
    | "warning"
    | "error"
    | "info"
    | "primary"
    | "secondary";
}

const LevelBar = ({
  value,
  colorAbove50 = "success",
  colorBelow50 = "warning",
}: LevelBarProps): JSX.Element => {
  const numeric =
    typeof value === "number" ? value : parseFloat(value as string);
  const safe = Number.isFinite(numeric)
    ? Math.max(0, Math.min(100, numeric))
    : null;
  if (safe == null) return <Typography variant="body2">—</Typography>;
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
        {safe}%
      </Typography>
      <LinearProgress
        variant="determinate"
        value={safe}
        color={safe >= 50 ? colorAbove50 : colorBelow50}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
};

export interface VehicleDetailModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  loading: boolean;
}

const VehicleDetailModal = ({
  open,
  onClose,
  vehicle,
  loading,
}: VehicleDetailModalProps): JSX.Element => {
  const meta: Partial<StatusMeta> = vehicle
    ? STATUS_META[vehicle.status as VehicleStatus] || {}
    : {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingRoundedIcon color="primary" fontSize="small" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              {vehicle?.vehicleNumber || "—"}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PersonRoundedIcon sx={{ fontSize: 14 }} color="disabled" />
              <Typography variant="caption" color="text.secondary">
                {vehicle?.driver} &bull; {meta.label}
              </Typography>
            </Stack>
          </Box>
          <IconButton size="small" onClick={onClose} role="button">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !vehicle ? (
          <Typography color="text.secondary">
            Vehicle details unavailable.
          </Typography>
        ) : (
          <Grid container spacing={2.5}>
            <Field label="Status">
              <Chip size="small" label={meta.label} color={meta.color} />
            </Field>
            <Field label="Current Speed">{vehicle.speed} mph</Field>
            <Field label="Driver">{vehicle.driver}</Field>
            <Field label="Phone">{vehicle.phone || "—"}</Field>
            <Field label="Destination">{vehicle.destination}</Field>
            <Field label="ETA">
              {vehicle.eta ? formatTimestamp(vehicle.eta) : "—"}
            </Field>
            <Field label="Location">
              {formatCoordinate(vehicle.lat, vehicle.lng)}
            </Field>
            <Grid item xs={6}>
              <StripePaper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  Battery Level
                </Typography>
                <LevelBar value={vehicle.batteryLevel} />
              </StripePaper>
            </Grid>
            <Grid item xs={6}>
              <StripePaper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  Fuel Level
                </Typography>
                <LevelBar value={vehicle.fuelLevel} />
              </StripePaper>
            </Grid>
            <Field label="Last Updated">
              {formatTimestamp(vehicle.lastUpdate)}
            </Field>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

// `vehicle`/`loading` do change whenever a new row is selected, so this
// won't skip renders on its own primary use case — memoized mainly so it
// doesn't do wasted work on renders driven by unrelated FleetContext state
// (e.g. an incoming WebSocket vehicle-list update while the modal is closed).
export default memo(VehicleDetailModal);
