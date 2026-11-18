import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

const MAX_RETRIES = 2;

// main.tsx sets this once the router exists, so this file doesn't import the router
let handleUnauthorized = () => {};

export function onUnauthorized(handler: () => void) {
  handleUnauthorized = handler;
}

// Every failed query and mutation passes through here
function handleError(error: Error) {
  if (error instanceof ApiError && error.status === 401) handleUnauthorized();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,

      retry: (failureCount, error) => {
        // A 4xx means the request itself was wrong, so trying again won't help
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < MAX_RETRIES;
      },
    },
  },
});
