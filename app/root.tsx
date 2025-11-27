import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/notifications/styles.css";

import { QueryClient, QueryClientProvider } from "react-query";

/**
 * Configure QueryClient with sensible defaults
 * These defaults apply to all queries unless overridden
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default staleTime: 2 minutes - data stays fresh
      staleTime: 2 * 60 * 1000,
      // Default cacheTime: 10 minutes - keep in cache
      cacheTime: 10 * 60 * 1000,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh (saves API calls)
      refetchOnMount: false,
      // Retry failed requests once
      retry: 1,
      // Retry delay: exponential backoff starting at 1s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import "./tailwind.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { mantineTheme } from "~/theme";
import { ErrorBoundary } from "~/components/Common/ErrorBoundary";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:wght@300;400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mantine-color-scheme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript />
      </head>
      <body>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
              <Notifications />
              {children}
            </MantineProvider>
          </QueryClientProvider>
        </ErrorBoundary>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
