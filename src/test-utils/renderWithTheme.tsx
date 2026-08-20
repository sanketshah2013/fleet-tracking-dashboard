import { ThemeProvider } from "@mui/material";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import theme from "../theme";

/**
 * Renders a component wrapped in the app's real MUI theme, so `sx` color
 * tokens (e.g. `success.light`) resolve the same way they do in production.
 */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
