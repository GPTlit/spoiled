import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { Bookmark, LogOut, Sparkles } from "lucide-react";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative h-7 w-7 rounded-md bg-primary text-primary-foreground shadow-cinema">
            <Sparkles className="absolute inset-0 m-auto h-4 w-4" />
          </div>
          <div className="leading-none">
            <div className="font-display text-lg tracking-tight">THE SPOILED SALEM</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Adaptation Companion
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink to="/" active={path === "/"}>Home</NavLink>
          <NavLink to="/discover" active={path.startsWith("/discover")}>Discover</NavLink>
          <NavLink to="/universes" active={path.startsWith("/universes")}>Universes</NavLink>
          <NavLink to="/library" active={path.startsWith("/library")}>
            <Bookmark className="mr-1 inline h-3.5 w-3.5" /> Library
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {email ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-cinema transition hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-card/60"
      }`}
    >
      {children}
    </Link>
  );
}
