import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { getMyProfile, setUsername, updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — SPOILED" },
      { name: "description", content: "Manage your SPOILED username, display name, avatar and bio." },
      { property: "og:title", content: "Your Profile — SPOILED" },
      { property: "og:description", content: "Manage your SPOILED username, display name, avatar and bio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  roles?: string[];
};

function ProfilePage() {
  const load = useServerFn(getMyProfile);
  const saveName = useServerFn(setUsername);
  const saveProfile = useServerFn(updateMyProfile);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [username, setU] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    load().then((p) => {
      const row = p as unknown as Profile;
      setProfile(row);
      setU(row.username ?? "");
      setDisplayName(row.display_name ?? "");
      setBio(row.bio ?? "");
      setAvatar(row.avatar_url ?? "");
    });
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      if (username && username !== (profile?.username ?? "")) {
        await saveName({ data: { username } });
      }
      await saveProfile({ data: { display_name: displayName, bio, avatar_url: avatar } });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = (profile?.roles ?? []).includes("admin");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Your Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{email}</p>

        {!profile && (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {profile && (
          <div className="mt-8 space-y-5 rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                {avatar ? (
                  <img src={avatar} alt="Your avatar" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                    {(displayName || username || "S").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <Field label="Avatar image link" value={avatar} onChange={setAvatar} placeholder="https://…" />
            </div>

            <Field label="Username" value={username} onChange={setU} placeholder="salem" />
            <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Salem" />

            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block flex-1">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
