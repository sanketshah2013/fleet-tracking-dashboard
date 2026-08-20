import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, ButtonBase, Grid, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { Vehicle } from "../types";
import { STATUS, STATUS_META } from "../utils/formatters";

interface FilterDef {
  key: string;
  label: string;
  color: string;
}

const FILTERS: FilterDef[] = [
  { key: "ALL", label: "All", color: "primary.main" },
  { key: STATUS.IDLE, label: "Idle", color: "warning.main" },
  { key: STATUS.EN_ROUTE, label: "En Route", color: "info.main" },
  { key: STATUS.DELIVERED, label: "Delivered", color: "success.main" },
];

export interface StatusFiltersProps {
  vehicles: Vehicle[];
  activeFilter: string;
  onChange: (status: string) => void;
}

const StatusFilters = ({
  vehicles,
  activeFilter,
  onChange,
}: StatusFiltersProps): JSX.Element => {
  const counts = useMemo(() => {
    const base: Record<string, number> = { ALL: vehicles.length };
    Object.keys(STATUS_META).forEach((s) => {
      base[s] = vehicles.filter((v) => v.status === s).length;
    });
    return base;
  }, [vehicles]);

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
        <TuneRoundedIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Filter by Status</Typography>
      </Box>
      <Grid container spacing={1}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <Grid item xs={6} key={f.key}>
              <ButtonBase
                onClick={() => onChange(f.key)}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1,
                  px: 1.25,
                  py: 0.9,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "divider",
                  bgcolor: active ? "rgba(108,43,217,0.06)" : "transparent",
                  transition: "all .15s ease",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: f.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" fontWeight={600} noWrap>
                  {f.label}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: "auto" }}
                >
                  {counts[f.key] ?? 0}
                </Typography>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

// `vehicles` and `onChange` keep stable references from FleetContext/App
// unless they actually change, so memoizing lets this bail out on renders
// triggered only by unrelated state (e.g. selecting a vehicle, Sidebar's
// 1s tick).
export default React.memo(StatusFilters);
