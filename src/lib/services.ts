// Streaming service catalog. Seed titles per service — AI generates the rest.

export type Service = {
  slug: string;
  name: string;
  color: string;
  short: string;
};

export const SERVICES: Service[] = [
  { slug: "netflix", name: "Netflix", color: "#E50914", short: "N" },
  { slug: "prime-video", name: "Prime Video", color: "#00A8E1", short: "PV" },
  { slug: "apple-tv", name: "Apple TV+", color: "#F5F5F7", short: "" },
  { slug: "paramount-plus", name: "Paramount+", color: "#0064FF", short: "P+" },
  { slug: "disney-plus", name: "Disney+", color: "#0F2247", short: "D+" },
  { slug: "hulu", name: "Hulu", color: "#1CE783", short: "hulu" },
  { slug: "peacock", name: "Peacock", color: "#FFFFFF", short: "" },
  { slug: "amc-plus", name: "AMC+", color: "#E11D2E", short: "AMC+" },
  { slug: "hbo", name: "HBO / Max", color: "#0057FF", short: "MAX" },
];

// Seed catalog — small curated list; the AI title-lookup handles anything else.
export const SERVICE_TITLES: Record<string, { title: string; year: number; kind: "series" | "movie" }[]> = {
  "netflix": [
    { title: "Stranger Things", year: 2016, kind: "series" },
    { title: "Squid Game", year: 2021, kind: "series" },
    { title: "The Witcher", year: 2019, kind: "series" },
    { title: "Wednesday", year: 2022, kind: "series" },
    { title: "Dark", year: 2017, kind: "series" },
    { title: "Money Heist", year: 2017, kind: "series" },
    { title: "One Piece", year: 2023, kind: "series" },
    { title: "3 Body Problem", year: 2024, kind: "series" },
    { title: "The Crown", year: 2016, kind: "series" },
    { title: "Ozark", year: 2017, kind: "series" },
    { title: "Bridgerton", year: 2020, kind: "series" },
    { title: "Peaky Blinders", year: 2013, kind: "series" },
  ],
  "prime-video": [
    { title: "The Boys", year: 2019, kind: "series" },
    { title: "Fallout", year: 2024, kind: "series" },
    { title: "The Rings of Power", year: 2022, kind: "series" },
    { title: "Invincible", year: 2021, kind: "series" },
    { title: "Reacher", year: 2022, kind: "series" },
    { title: "The Marvelous Mrs. Maisel", year: 2017, kind: "series" },
    { title: "Jack Ryan", year: 2018, kind: "series" },
    { title: "The Expanse", year: 2015, kind: "series" },
  ],
  "apple-tv": [
    { title: "Silo", year: 2023, kind: "series" },
    { title: "Severance", year: 2022, kind: "series" },
    { title: "Ted Lasso", year: 2020, kind: "series" },
    { title: "Foundation", year: 2021, kind: "series" },
    { title: "Slow Horses", year: 2022, kind: "series" },
    { title: "Pachinko", year: 2022, kind: "series" },
    { title: "For All Mankind", year: 2019, kind: "series" },
    { title: "The Morning Show", year: 2019, kind: "series" },
  ],
  "paramount-plus": [
    { title: "Yellowstone", year: 2018, kind: "series" },
    { title: "Star Trek: Strange New Worlds", year: 2022, kind: "series" },
    { title: "Halo", year: 2022, kind: "series" },
    { title: "1923", year: 2022, kind: "series" },
    { title: "Tulsa King", year: 2022, kind: "series" },
    { title: "Landman", year: 2024, kind: "series" },
  ],
  "disney-plus": [
    { title: "The Mandalorian", year: 2019, kind: "series" },
    { title: "Loki", year: 2021, kind: "series" },
    { title: "Andor", year: 2022, kind: "series" },
    { title: "Ahsoka", year: 2023, kind: "series" },
    { title: "WandaVision", year: 2021, kind: "series" },
    { title: "The Bear", year: 2022, kind: "series" },
    { title: "Only Murders in the Building", year: 2021, kind: "series" },
  ],
  "hulu": [
    { title: "The Handmaid's Tale", year: 2017, kind: "series" },
    { title: "Shogun", year: 2024, kind: "series" },
    { title: "Only Murders in the Building", year: 2021, kind: "series" },
    { title: "Fargo", year: 2014, kind: "series" },
    { title: "The Great", year: 2020, kind: "series" },
  ],
  "peacock": [
    { title: "Poker Face", year: 2023, kind: "series" },
    { title: "The Traitors", year: 2023, kind: "series" },
    { title: "Yellowstone", year: 2018, kind: "series" },
    { title: "Mrs. Davis", year: 2023, kind: "series" },
    { title: "Twisted Metal", year: 2023, kind: "series" },
  ],
  "amc-plus": [
    { title: "The Walking Dead: The Ones Who Live", year: 2024, kind: "series" },
    { title: "Interview with the Vampire", year: 2022, kind: "series" },
    { title: "Anne Rice's Mayfair Witches", year: 2023, kind: "series" },
    { title: "Dark Winds", year: 2022, kind: "series" },
    { title: "The Terror", year: 2018, kind: "series" },
  ],
  "hbo": [
    { title: "The Last of Us", year: 2023, kind: "series" },
    { title: "House of the Dragon", year: 2022, kind: "series" },
    { title: "Succession", year: 2018, kind: "series" },
    { title: "The White Lotus", year: 2021, kind: "series" },
    { title: "True Detective", year: 2014, kind: "series" },
    { title: "Game of Thrones", year: 2011, kind: "series" },
    { title: "Chernobyl", year: 2019, kind: "series" },
    { title: "Euphoria", year: 2019, kind: "series" },
  ],
};

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function findService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}
