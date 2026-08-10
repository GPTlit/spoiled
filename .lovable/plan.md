# SPOILED — Big Build Plan

Everything you asked for, grouped into phases so each ships working rather than half-done.

## Phase 1 — Languages + platform catalogs
- Add English / Arabic / French across the whole app, with a language switcher in the header. Arabic flips the layout to right-to-left.
- Every streaming platform page shows its shows as poster tiles with the show name. Clicking a show gives seasons and episodes; clicking an episode gives the spoilers, clues, source-book mapping and theories that already exist in the app.

## Phase 2 — SALEM full-screen chat
- SALEM moves to its own full-screen page: fixed layout, no zooming or squashing, back arrow top-left, message area scrolls, the composer stays pinned and grows properly as you type.
- Conversation history kept for 48 hours, listed in a side panel; older conversations drop off automatically.
- Attachments: photos and video sent to SALEM, which reads them; voice recording with automatic transcription shown next to the audio.
- SALEM can search the live web for current information and says when it did.

## Phase 3 — SCREEN WRITER
- New AI at its own full-screen fixed page.
- You give key points, tone, scene-to-scene instructions and target scene length; it fills the gaps with dialogue, pacing and distinct character voices.
- Paste or upload what you already wrote and it continues in your style.
- Manuscript workspace: pages you can navigate and edit by hand. Anything the AI writes can be pushed into the manuscript in part or in full, then saved.
- Covers and inline illustrations: AI-generated or uploaded from your device, insertable anywhere.
- Publish public or keep private.
- Export to PDF with correct direction (Arabic right-to-left, English/French left-to-right), paginated by story length.

## Phase 4 — Show-to-book
- Pick a show, pick a style (cinematic, screenplay, dramatic, novel, and more), pick a season range.
- Generates a full book covering every scene, with the show's poster as the cover.
- Last page credits the show's creator, then "SPOILED SALEM TEAM".
- Readable in-app and downloadable as PDF.

## Phase 5 — Messaging rebuilt WhatsApp-style
- Thin conversation rows in one list, newest activity on top, pin a conversation to keep it up top.
- Direct messages between individuals as well as group chats.
- Tapping a row opens a full-screen fixed chat.

## Phase 6 — Admin panel
- Your account only. Manage platforms and their shows, theories, users, feed posts and groups, plus published screenplays and books.

## Technical notes
- Translations via a light i18n layer with a `dir` switch on the document root; no page reload on language change.
- New tables: chat conversations and messages with a 48-hour cleanup, screenwriter projects, project pages, project assets, generated books, direct-message threads, and conversation pins. All with row-level security scoped to the owner.
- Media (voice notes, images, video, covers, illustrations) goes to private storage buckets with signed URLs.
- SALEM uses multimodal input for images/video, transcription for voice, and a web-search tool for live information.
- PDF export rendered client-side with an Arabic-capable font so shaping and direction are correct.
- Long generations stream so nothing times out.

## Order of delivery
Phases run in the order above. Each is usable on its own, so you can review as they land.
