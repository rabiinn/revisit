import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { registerFormSchema, type RegisterFormValues } from "../features/auth/auth.schemas";
import z from "zod";
import { meQueryOptions, useRegister } from "../features/auth/api";
import { safeRedirect } from "../lib/safeRedirect";
import { useState, type SubmitEvent } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

export const Route = createFileRoute("/register")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.query({ ...meQueryOptions });
    if (user) throw redirect({ href: safeRedirect(search.redirect) });
  },
  component: RegisterPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function RegisterPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const register = useRegister();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = registerFormSchema.safeParse(values);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      register.reset();
      return;
    }
    setFieldErrors({});
    register.mutate(result.data, {
      onSuccess: () => navigate({ href: safeRedirect(redirectTo) }),
    });
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-2xl font-bold tracking-tight">Revisit</p>

        <section
          aria-labelledby="register-heading"
          className="mt-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h1 id="register-heading" className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-muted">Plan what to study, then review it before you forget.</p>

          {register.error && (
            <div role="alert" className="mt-4 rounded-lg bg-notice px-4 py-3 text-sm font-medium">
              {register.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <Input label="Email" name="email" type="email" autoComplete="email" required error={fieldErrors.email} />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              hint="At least 8 characters"
              error={fieldErrors.password}
            />
            <Button type="submit" size="lg" isLoading={register.isPending} className="mt-2 w-full">
              Create account
            </Button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            search={{ redirect: redirectTo }}
            className="font-semibold text-accent hover:text-accent-ink">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
