import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { Brain, Home, Upload as UploadIcon, BarChart3, PencilLine } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-9 rounded-lg grid place-items-center"
              style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
              <Brain className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Test<span className="neon-text">ear</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavItem to="/" icon={<Home className="size-4" />} label="Home" />
            <NavItem to="/upload" icon={<UploadIcon className="size-4" />} label="Upload" />
            <NavItem to="/manual" icon={<PencilLine className="size-4" />} label="Manual" />
            <NavItem to="/analytics" icon={<BarChart3 className="size-4" />} label="Analytics" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-muted-foreground">
        Built with focus. Train hard. Pass harder.
      </footer>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-md hover:bg-secondary flex items-center gap-2 transition"
      activeProps={{ className: "px-3 py-2 rounded-md bg-secondary text-primary flex items-center gap-2" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
