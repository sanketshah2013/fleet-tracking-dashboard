import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Box, Grid, Paper, Typography } from "@mui/material";
import React from "react";
import { Statistics } from "../types";

export interface StatsCardsProps {
  statistics: Statistics | null;
  lastUpdateTime?: string | null;
}

interface StatCard {
  label: string;
  value: string | number;
}

const StatsCards = ({
  statistics,
  lastUpdateTime,
}: StatsCardsProps): JSX.Element => {
  const cards: StatCard[] = [
    { label: "Total Fleet", value: statistics?.total ?? "—" },
    {
      label: "Avg Speed",
      value: statistics?.avgSpeed != null ? `${statistics.avgSpeed} mph` : "—",
    },
    { label: "Moving", value: statistics?.en_route ?? "—" },
    { label: "Last Update", value: lastUpdateTime || "—" },
  ];

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
        <AccessTimeIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Fleet Statistics</Typography>
      </Box>
      <Grid container spacing={1}>
        {cards.map((c) => (
          <Grid item xs={6} key={c.label}>
            <Paper
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 2, textAlign: "center" }}
            >
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {c.value}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {c.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// `lastUpdated` is recomputed every second by Sidebar's ticking caption,
// so this still re-renders on that cadence — memo mainly guards against the
// unrelated re-renders (e.g. selecting a vehicle) that don't touch either prop.
export default React.memo(StatsCards);
