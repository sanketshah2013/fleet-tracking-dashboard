import { createTheme, Theme } from "@mui/material/styles";

// Palette derived from the provided UX mockups: violet-to-magenta brand mark,
// clean near-white canvas, status colors matched to the vehicle states.
const theme: Theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6C2BD9",
      light: "#8B5CF6",
      dark: "#4C1D95",
      contrastText: "#fff",
    },
    secondary: {
      main: "#C0246B",
    },
    background: {
      default: "#F6F5FB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1B1730",
      secondary: "#6B6580",
    },
    success: { main: "#12875B", light: "#E4F6EE" }, // delivered
    warning: { main: "#B5891A", light: "#FDF3DD" }, // idle
    info: { main: "#2563EB", light: "#E5EDFC" }, // en route
    divider: "#E9E7F3",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
    caption: { color: "#6B6580" },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E9E7F3",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: "0.72rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#6B6580",
          backgroundColor: "#FAFAFD",
        },
      },
    },
  },
});

export default theme;
