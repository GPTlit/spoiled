import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { LanguageSwitcher } from "./language-switcher";
import { LogOut, User, BookOpen, Library, Shield, ChevronDown } from "lucide-react";

const ADMIN_EMAIL = "salemmoustapha15@gmail.com";

export function SiteHeader() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => setMenu(false), [path]);

  const isAdmin = (email ?? "").toLowerCase() === ADMIN_EMAIL;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">S</div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">SPOILED</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">by Spoiled Salem</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink to="/" active={path === "/"}>Home</NavLink>
          <NavLink to="/watch" active={path.startsWith("/watch")}>Watch</NavLink>
          <NavLink to="/feed" active={path.startsWith("/feed")}>Feed</NavLink>
          <NavLink to="/theories" active={path.startsWith("/theories")}>Theories</NavLink>
          <NavLink to="/community" active={path.startsWith("/community")}>Community</NavLink>
          <NavLink to="/chats" active={path.startsWith("/chats")}>Chats</NavLink>
          <NavLink to="/studio" active={path.startsWith("/studio")}>Studio</NavLink>
          <NavLink to="/books" active={path.startsWith("/books")}>Books</NavLink>
          <NavLink to="/stories" active={path.startsWith("/stories")}>Stories</NavLink>
          <NavLink to="/library" active={path.startsWith("/library")}>Library</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {userId ? (
            <>
              <NotificationsBell userId={userId} />
              <button
                onClick={() => supabase.auth.signOut()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <MobileNav path={path} />
    </header>
  );
}

function MobileNav({ path }: { path: string }) {
  return (
    <nav className="flex overflow-x-auto border-t border-border/60 md:hidden">
      {[
        { to: "/", label: "Home" },
        { to: "/watch", label: "Watch" },
        { to: "/feed", label: "Feed" },
        { to: "/theories", label: "Theories" },
        { to: "/community", label: "Community" },
        { to: "/chats", label: "Chats" },
        { to: "/studio", label: "Studio" },
        { to: "/books", label: "Books" },
        { to: "/stories", label: "Stories" },
        { to: "/library", label: "Library" },
      ].map((l) => (

        <Link
          key={l.to}
          to={l.to}
          className={`flex-1 whitespace-nowrap px-3 py-2 text-center text-xs ${
            (l.to === "/" ? path === "/" : path.startsWith(l.to))
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`rounded-full px-3 py-1.5 transition ${
        active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
