import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { Component, ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defense for the dashboard: catches render/lifecycle errors
 * anywhere below it (e.g. an unexpected API payload shape slipping past
 * normalization) and shows a recoverable message instead of an unmounted,
 * blank white screen. Does NOT catch errors from async code (rejected
 * promises, event handlers) — those are handled where they occur (see
 * `FleetContext`'s try/catch blocks), per React's error boundary semantics.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Fleet dashboard crashed:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ maxWidth: 640, mx: "auto", p: 4 }}>
        <Alert severity="error" variant="outlined">
          <AlertTitle>Something went wrong</AlertTitle>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="body2">
              The dashboard hit an unexpected error and couldn't continue
              rendering. You can try reloading this section, or refresh the page
              if that doesn't help.
            </Typography>
            <Button size="small" variant="outlined" onClick={this.handleReset}>
              Try again
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }
}

export default ErrorBoundary;
