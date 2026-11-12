import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < MAX_RETRIES;
      },
      refetchOnWindowFocus: false,
    },
  },
});
