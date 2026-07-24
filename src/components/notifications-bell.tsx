import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

type Notif = { id: string; kind: string; payload: Record<string, unknown>; read_at: string | null; created_at: string };

export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("notifications")
      .select("id, kind, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setItems((data ?? []) as Notif[]);
      });
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notif, ...prev].slice(0, 20)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((i) => !i.read_at).length;

  const markRead = async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", userId);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (unread > 0) markRead();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-cinema">
            <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
              Notifications
            </div>
            <div className="max-h-96 divide-y divide-border/60 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
              ) : (
                items.map((n) => <NotifRow key={n.id} n={n} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotifRow({ n }: { n: Notif }) {
  const preview = String(n.payload?.message ?? n.payload?.preview ?? n.payload?.body ?? "");
  return (
    <Link
      to={n.kind === "group_message" ? "/community" : n.kind === "broadcast" ? "/" : "/feed"}
      className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-card/60"
    >
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0">
        <div className="font-medium capitalize">{n.kind.replace(/_/g, " ")}</div>
        {preview && <div className="mt-0.5 truncate text-xs text-muted-foreground">{preview}</div>}
      </div>
    </Link>
  );
}
