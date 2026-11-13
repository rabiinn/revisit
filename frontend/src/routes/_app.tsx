/* eslint-disable react-refresh/only-export-components */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { meQueryOptions, useLogout } from "../features/auth/api";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.query(meQueryOptions);

    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  component: AppLayout,
});

const navLinkClasses = "inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold transition-colors";
const activeLinkProps = { className: "border-ink bg-ink text-white" };
const inactiveLinkProps = { className: "border-line bg-surface text-ink hover:border-ink" };

// eslint-disable-next-line react-refresh/only-export-components
function AppLayout() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function AppHeader() {
  const { data: user } = useQuery(meQueryOptions);
  const logout = useLogout();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          Revisit
        </Link>

        <nav aria-label="Main" className="flex gap-2">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className={navLinkClasses}
            activeProps={activeLinkProps}
            inactiveProps={inactiveLinkProps}>
            Today
          </Link>
          <Link to="/topics" className={navLinkClasses} activeProps={activeLinkProps} inactiveProps={inactiveLinkProps}>
            Topics
          </Link>
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">{user?.email}</span>
          <Button variant="ghost" onClick={() => logout.mutate()} isLoading={logout.isPending}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
