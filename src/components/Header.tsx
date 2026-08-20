import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import { Box, Stack, Typography } from "@mui/material";
import React from "react";

const Header = (): JSX.Element => {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #7C3AED 0%, #C0246B 100%)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <LocalShippingRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            Fleet Tracking Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Real-time vehicle monitoring
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

// Takes no props, so this never has a legitimate reason to re-render outside
// of a parent update — memoize so it's skipped entirely on Sidebar's 1s tick.
export default React.memo(Header);
