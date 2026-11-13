import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import z from "zod";
import { meQueryOptions, useLogin } from "../features/auth/api";
import type { SubmitEvent } from "react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { safeRedirect } from "../lib/safeRedirect";
import { loginFormSchema, type LoginFormValues } from "../features/auth/auth.schemas";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.query({
      ...meQueryOptions,
    });
    if (user) throw redirect({ href: safeRedirect(search.redirect) });
  },
});

// eslint-disable-next-line react-refresh/only-export-components
function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const login = useLogin();

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = loginFormSchema.safeParse(values);
    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }

    setFieldErrors({});
    login.mutate(result.data, {
      onSuccess: () => navigate({ href: safeRedirect(redirectTo) }),
    });
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-2xl font-bold tracking-tight">Revisit</p>

        <section aria-labelledby="login-heading" className="mt-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h1 id="login-heading" className="text-2xl font-bold tracking-tight">
            Log in
          </h1>
          <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>

          {login.error && (
            <div role="alert" className="mt-4 rounded-lg bg-notice px-4 py-3 text-sm font-medium">
              {login.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <Input label="Email" name="email" type="email" autoComplete="email" required error={fieldErrors.email} />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              error={fieldErrors.password}
            />
            <Button type="submit" size="lg" isLoading={login.isPending} className="mt-2 w-full">
              Log in
            </Button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-muted">
          New to Revisit?{" "}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-ink">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
