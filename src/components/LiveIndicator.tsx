import { Box, Stack, Typography, keyframes } from "@mui/material";
import React from "react";
import { WsStatus } from "../types";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(18, 135, 91, 0.45); }
  70% { box-shadow: 0 0 0 6px rgba(18, 135, 91, 0); }
  100% { box-shadow: 0 0 0 0 rgba(18, 135, 91, 0); }
`;

interface StatusCopy {
  label: string;
  color: string;
}

const STATUS_COPY: Record<WsStatus, StatusCopy> = {
  connecting: { label: "Connecting…", color: "#B5891A" },
  connected: { label: "Live Updates Active", color: "#12875B" },
  disconnected: { label: "Reconnecting…", color: "#B5891A" },
  error: { label: "Connection Issue", color: "#C0246B" },
};

export interface LiveIndicatorProps {
  status: WsStatus;
  variant?: "block" | "chip";
}

const LiveIndicator = ({
  status,
  variant = "block",
}: LiveIndicatorProps): JSX.Element => {
  const meta = STATUS_COPY[status] || STATUS_COPY.connecting;
  const dot = (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: meta.color,
        animation: status === "connected" ? `${pulse} 2s infinite` : "none",
      }}
    />
  );

  if (variant === "chip") {
    const isLive = status === "connected";
    return (
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          bgcolor: isLive ? "success.light" : "warning.light",
          color: isLive ? "success.main" : "warning.main",
        }}
      >
        {dot}
        <Typography variant="caption" fontWeight={700}>
          {isLive ? "Live" : "Offline"}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        py: 1,
        mb: 2.5,
      }}
    >
      {dot}
      <Typography variant="body2" fontWeight={600} color={meta.color}>
        {meta.label}
      </Typography>
    </Stack>
  );
};

// Only `status`/`variant` (both primitives) drive output, so a shallow-prop
// memo cleanly skips re-renders from unrelated parent updates (e.g.
// Sidebar's 1s "updated Xs ago" tick).
export default React.memo(LiveIndicator);
