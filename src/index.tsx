import { CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { FleetProvider } from "./context/FleetContext";
import "./index.css";
import theme from "./theme";

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element with id "root" was not found in the document.');
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FleetProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </FleetProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
