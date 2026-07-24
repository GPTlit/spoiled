
# SPOILED — Full Rebuild Plan

Rebrand, redesign, and layer on community/feed/streaming/admin. Shipped in one pass, but sequenced so each layer builds on the last.

## 1. Rebrand + redesign + font

- Rename everywhere: "THE SPOILED SALEM" / "story weaver" → **SPOILED**. Footer + about: *"Created by SPOILED SALEM"*.
- Swap `Instrument Serif` display font for **Inter** everywhere (single normal font). Remove serif utilities.
- New palette (cleaner, less muddy): near-black bg `#0B0B0F`, card `#14141B`, primary red `#E11D2E`, blush `#F5A3B4`, verdant `#2FBF71`, text `#F5F5F7`. Tighter radii, less glow, real spacing rhythm.
- Redesign header, hero, cards, buttons with a consistent shadcn-based component pass.

## 2. Auth + unique username + admin lock

- Extend `profiles`: add `username citext unique not null`, `bio`, `avatar_url` (already there). Backfill username from email on trigger; require selection at signup.
- New `user_roles` table + `app_role` enum (`admin`,`user`) + `has_role()` SECURITY DEFINER function.
- Trigger: on new user, if `email = 'salemmoustapha15@gmail.com'` → insert admin role (verified email only). Nobody else can become admin from the UI.
- Signup flow: after Supabase signup, force username selection page (unique check via RPC).

## 3. Streaming service browser (AI-generated)

- New route `/watch` with tiles for **Netflix, Prime Video, Apple TV+, Paramount+, Disney+, Hulu, Peacock, AMC+, HBO** (SVG/lucide-style logos, in-house).
- `/watch/$service` → curated seed list of popular titles per service (static JSON `src/lib/services.ts`, ~15/service). Users can also search.
- `/watch/$service/$titleSlug` → title page. AI (Lovable AI, `google/gemini-3.6-flash`) generates: synopsis, seasons/episodes list.
- `/watch/$service/$titleSlug/$season/$episode` → AI recap, clues, book/source links, predictions for unreleased episodes, spoiler-toggle.
- Cache generations in a new `ai_cache` table keyed by `(kind, key)` so repeat views are free.

## 4. AI Nerd Analysis ("your nerd friend")

- New server fn `nerdBreakdown(query)` — casual, buddy-toned system prompt ("okay so hear me out…"). Used on episode pages + accessible from `/continue`.
- Streams into a chat-style panel with markdown.

## 5. Community: groups + full-page chat

- Tables: `groups` (name, slug, topic, cover, created_by), `group_members` (group_id, user_id, role), `group_messages` (group_id, user_id, content, kind: text|image|video|voice|sticker, media_url, duration).
- `/community` — list + create group.
- `/community/$slug` — full-page chat. Realtime via Supabase channels. Messages list, composer with:
  - text
  - image upload (storage bucket `chat-media`, public)
  - video upload (same bucket)
  - voice recording via `MediaRecorder` → upload
  - sticker picker (built-in pack of ~24 emoji-style stickers rendered as SVG/emoji tiles)
- RLS: members only can read/write.

## 6. Feed (public posts)

- Tables: `posts` (author_id, caption, media_url, media_kind, visibility: public|followers), `post_likes`, `post_comments`, `follows` (follower_id, following_id).
- `/feed` — chronological public feed. Composer (auth-gated) with caption + optional photo/video.
- Like / comment / share (share = copy link + Web Share API). Like and comment buttons redirect to `/auth` if not signed in.
- Post detail route `/feed/$postId` with comments thread.

## 7. Notifications

- Table `notifications` (user_id, kind, payload jsonb, read_at).
- Header bell icon with unread count (realtime). Panel lists recent notifications.
- Emitted on: new comment on your post, new like, new group message in a group you're in, admin broadcasts.

## 8. Admin panel

- `/admin` gated by `has_role(auth.uid(),'admin')`. Only `salemmoustapha15@gmail.com` will match.
- Tabs: **Users** (search, ban toggle, force-rename), **Posts** (delete), **Groups** (delete), **Broadcast** (send system notification to all users).

## 9. Theory section

- Special post kind `theory` with fields: `title`, `body`, `title_ref` (which show/movie), `season`, `episode`. Rendered as a dedicated tab on `/feed` and a `/theories` route with sort by "hot / new / top".

## Technical notes

- **Storage:** create public `chat-media` and `feed-media` buckets via storage tool. Client uploads with size + mime validation (image ≤10MB, video ≤50MB, voice ≤5MB).
- **Realtime:** enable on `group_messages`, `notifications`, `posts`, `post_likes`, `post_comments`.
- **RLS on every table.** GRANTs to `authenticated`; anon SELECT only on `posts` (public), `profiles` (username+avatar+bio), `groups`.
- **AI:** all calls via `createServerFn` + Lovable AI Gateway, streamed where it improves UX (nerd breakdown, episode analysis).
- **Design system:** replace tokens in `src/styles.css`, remove `--font-display` serif, retune glow/shadow. Rebuild `SiteHeader`, hero, cards.
- **Routes added:** `/watch`, `/watch/$service`, `/watch/$service/$title`, `/watch/$service/$title/$season/$episode`, `/community`, `/community/$slug`, `/feed`, `/feed/$postId`, `/theories`, `/notifications`, `/admin`, `/onboarding/username`.

## Scope reality check

This is roughly 25–30 new files, 4–5 migrations, 2 storage buckets, and heavy realtime + media work. It will consume significant credits and I'll ship in one pass without stopping for approvals between phases (per your instruction). If anything blocks (e.g. media recording permissions in preview), I'll note it and continue.

Reply **go** to start, or edit the plan.
