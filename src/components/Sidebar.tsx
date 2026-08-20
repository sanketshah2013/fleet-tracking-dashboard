import { Box, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Statistics, Vehicle, WsStatus } from "../types";
import { formatRelativeTime } from "../utils/formatters";
import LiveIndicator from "./LiveIndicator";
import StatsCards from "./StatsCards";
import StatusFilters from "./StatusFilters";

const REFRESH_INTERVAL_LABEL = "~3 minutes";

export interface SidebarProps {
  vehicles: Vehicle[];
  statistics: Statistics | null;
  wsStatus: WsStatus;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  lastUpdated: string | null;
}

const Sidebar = ({
  vehicles,
  statistics,
  wsStatus,
  statusFilter,
  onFilterChange,
  lastUpdated,
}: SidebarProps): JSX.Element => {
  const [, forceTick] = useState(0);

  // Re-render every second so the "updated Xs ago" caption stays fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n: number) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
      <LiveIndicator status={wsStatus} />
      <StatusFilters
        vehicles={vehicles}
        activeFilter={statusFilter}
        onChange={onFilterChange}
      />
      <StatsCards
        statistics={statistics}
        lastUpdateTime={
          statistics?.lastUpdated
            ? formatRelativeTime(statistics.lastUpdated)
            : formatRelativeTime(lastUpdated)
        }
      />
      <Typography variant="caption" color="text.secondary">
        Updated {formatRelativeTime(lastUpdated)} &bull; Next update in{" "}
        {REFRESH_INTERVAL_LABEL}
      </Typography>
    </Box>
  );
};

// App re-renders on every FleetContext change, including selection/modal
// state that Sidebar doesn't use — memo lets it bail out on those, so its
// children (and their own re-render cost) aren't touched when e.g. a row is
// clicked. Its own 1s tick is untouched: that's internal state, not a prop
// change, so React.memo doesn't affect it.
export default React.memo(Sidebar);
