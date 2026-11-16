import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, ApiError } from "../../lib/api";

export type User = {
  id: string;
  email: string;
};

export type Credentials = {
  email: string;
  password: string;
};

type UserResponse = { user: User };

export const meQueryOptions = queryOptions({
  queryKey: ["auth", "me"],
  queryFn: async ({ signal }) => {
    try {
      const { user } = await api.get<UserResponse>("/auth/me", signal);
      return user;
    } catch (error) {
      // Being logged out is a normal state, not an error
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 5 * 60_000,
});

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: Credentials) =>
      api.post<UserResponse>("/auth/login", credentials),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(meQueryOptions.queryKey, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: Credentials) =>
      api.post<UserResponse>("/auth/register", credentials),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(meQueryOptions.queryKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: async () => {
      queryClient.setQueryData(meQueryOptions.queryKey, null);
      await navigate({ to: "/login" });
      // Remove the previous user's data, so the next user can't see it
      queryClient.clear();
    },
  });
}
