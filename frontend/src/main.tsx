import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { queryClient, onUnauthorized } from "./lib/query-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { meQueryOptions } from "./features/auth/api";
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
onUnauthorized(() => {
  // A wrong password also returns 401, so only react if someone was logged in
  if (!queryClient.getQueryData(meQueryOptions.queryKey)) return;

  queryClient.setQueryData(meQueryOptions.queryKey, null);

  // Run the route guards again: _app sees no user, and redirects to /login
  void router.invalidate().then(() => {
    // Remove the expired session's data, but keep the "logged out" state
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
