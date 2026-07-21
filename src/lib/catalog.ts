export const TRENDING = [
  { q: "Silo Season 3 Episode 10", franchise: "Silo", tag: "TV → Book" },
  { q: "Solo Leveling Episode 12", franchise: "Solo Leveling", tag: "Anime → Manhwa" },
  { q: "The Last of Us Season 2", franchise: "The Last of Us", tag: "TV → Game" },
  { q: "Harry Potter Movie 4", franchise: "Harry Potter", tag: "Movie → Book" },
  { q: "One Piece Episode 1135", franchise: "One Piece", tag: "Anime → Manga" },
  { q: "House of the Dragon S2 Finale", franchise: "Game of Thrones", tag: "TV → Book" },
  { q: "Attack on Titan Final Season", franchise: "Attack on Titan", tag: "Anime → Manga" },
  { q: "The Witcher Season 3", franchise: "The Witcher", tag: "TV → Book" },
];

export const UNIVERSES = [
  "Marvel", "DC", "Star Wars", "Harry Potter", "Lord of the Rings",
  "Game of Thrones", "The Walking Dead", "Silo", "One Piece", "Naruto",
  "Solo Leveling", "Attack on Titan", "Chainsaw Man", "Jujutsu Kaisen",
  "The Last of Us", "The Witcher", "Dune", "Foundation", "Wheel of Time",
  "Bleach", "Demon Slayer", "Berserk", "Vinland Saga", "Mistborn",
  "The Expanse", "His Dark Materials", "Sandman", "Watchmen", "Invincible",
  "The Boys", "Cyberpunk", "Halo",
];

export const STORY_MODES = [
  "Screenplay", "Movie Script", "Novel Style", "Narrator", "Character POV",
  "Timeline", "Bullet Summary", "Explain Like I'm 10", "Documentary",
  "Horror", "Action", "Cinematic",
] as const;

export const SPOILER_LEVELS = [
  { level: 1, label: "Level 1", desc: "Only the next episode" },
  { level: 2, label: "Level 2", desc: "Finish this season" },
  { level: 3, label: "Level 3", desc: "Finish the book" },
  { level: 4, label: "Level 4", desc: "Entire franchise" },
] as const;

export const FOLLOWUPS = [
  "What happens after this?",
  "Who dies?",
  "Explain that scene.",
  "Only spoil one chapter.",
  "Explain the ending.",
  "Continue.",
];
