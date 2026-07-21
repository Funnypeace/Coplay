/* Spieldaten: Raster, Bedürfnisse, Möbelkatalog, Level */
export const GRID = 14, TW2 = 34, TH2 = 17, OX = 520, OY = 130, WALL_H = 92;
export const MAX_LEVEL = 5;
export const NEED_KEYS = ["hunger", "energie", "hygiene", "spass"];
export const NEED_META = {
  hunger: { label: "Hunger", icon: "🍔", decay: 0.22 },
  energie: { label: "Energie", icon: "⚡", decay: 0.14 },
  hygiene: { label: "Hygiene", icon: "🚿", decay: 0.16 },
  spass: { label: "Spaß", icon: "🎉", decay: 0.26 },
};
export const CAT = {
  bett:        { name: "Bett", emoji: "🛏️", price: 250, w: 2, d: 1, hh: 34, lvl: 1,
                 act: { label: "Schlafen", dur: 9, needs: { energie: 100 }, xp: 10, fl: "💤" } },
  kuehlschrank:{ name: "Kühlschrank", emoji: "🧊", price: 150, w: 1, d: 1, hh: 50, lvl: 1,
                 act: { label: "Essen", dur: 4, needs: { hunger: 55 }, xp: 8, fl: "🍔" } },
  dusche:      { name: "Dusche", emoji: "🚿", price: 180, w: 1, d: 1, hh: 66, lvl: 1,
                 act: { label: "Duschen", dur: 5, needs: { hygiene: 75 }, xp: 8, fl: "🫧" } },
  schreibtisch:{ name: "Schreibtisch + PC", emoji: "💻", price: 200, w: 2, d: 1, hh: 34, lvl: 1,
                 act: { label: "Arbeiten", dur: 10, needs: { energie: -12, spass: -10 }, xp: 30, work: true, fl: "💼" } },
  pflanze:     { name: "Zimmerpflanze", emoji: "🪴", price: 60, w: 1, d: 1, hh: 36, lvl: 1, deko: true },
  teppich:     { name: "Teppich", emoji: "🟪", price: 80, w: 2, d: 2, hh: 2, lvl: 1, deko: true, walk: true },
  sofa:        { name: "Sofa", emoji: "🛋️", price: 220, w: 2, d: 1, hh: 30, lvl: 2,
                 act: { label: "Ausruhen", dur: 5, needs: { energie: 30, spass: 12 }, xp: 7, fl: "😌" } },
  tv:          { name: "Fernseher", emoji: "📺", price: 300, w: 1, d: 1, hh: 42, lvl: 2,
                 act: { label: "Fernsehen", dur: 6, needs: { spass: 55 }, xp: 9, fl: "📺" } },
  lampe:       { name: "Stehlampe", emoji: "💡", price: 90, w: 1, d: 1, hh: 50, lvl: 2, deko: true },
  herd:        { name: "Herd", emoji: "🍳", price: 350, w: 1, d: 1, hh: 34, lvl: 3,
                 act: { label: "Kochen & Essen", dur: 6, needs: { hunger: 90, spass: 5 }, xp: 14, fl: "🍳" } },
  regal:       { name: "Bücherregal", emoji: "📚", price: 260, w: 1, d: 1, hh: 56, lvl: 3,
                 act: { label: "Lesen", dur: 6, needs: { spass: 35 }, xp: 18, fl: "📖" } },
  stereo:      { name: "Stereoanlage", emoji: "🎵", price: 280, w: 1, d: 1, hh: 24, lvl: 4,
                 act: { label: "Tanzen", dur: 6, needs: { spass: 65, energie: -8 }, xp: 12, fl: "🎵" } },
  badewanne:   { name: "Badewanne", emoji: "🛁", price: 500, w: 2, d: 1, hh: 22, lvl: 5,
                 act: { label: "Baden", dur: 7, needs: { hygiene: 100, spass: 12 }, xp: 12, fl: "🫧" } },
  goldbett:    { name: "Deluxe-Bett", emoji: "👑", price: 900, w: 2, d: 1, hh: 38, lvl: 5,
                 act: { label: "Schlafen (deluxe)", dur: 5, needs: { energie: 100, spass: 8 }, xp: 14, fl: "💤" } },
};
export const SHIRTS = ["#3fb8a0", "#e36767", "#9a6fe0", "#e8a13f", "#5f8fe8"];

export function xpNeed(l) { return 100 + (l - 1) * 120; }

/* Räume mit eigenem Look */
export const ROOMS = {
  lounge: {
    name: "Lounge", emoji: "🛋️",
    bg: ["#1d2438", "#242c44"],
    floor: ["#c2995f", "#cba368"],
    wallL: ["#5b688a", "#5f6c90"], wallR: ["#6a78a0", "#6e7ca4"],
    stripL: "#46516e", stripR: "#525e7e",
    glassDay: "#aee0ff", glassNight: "#26345e",
  },
  garten: {
    name: "Garten", emoji: "🌿",
    bg: ["#1c2b38", "#223447"],
    floor: ["#7fae6a", "#8aba74"],
    wallL: ["#4e7d4d", "#528251"], wallR: ["#5a8f58", "#5e935c"],
    stripL: "#3c6340", stripR: "#456e49",
    glassDay: "#cfe8ff", glassNight: "#22304f",
  },
  arcade: {
    name: "Arcade", emoji: "🕹️",
    bg: ["#181c30", "#20243c"],
    floor: ["#4a4664", "#514d6e"],
    wallL: ["#3c3a5e", "#403e63"], wallR: ["#474368", "#4b476d"],
    stripL: "#2e2c48", stripR: "#343055",
    glassDay: "#9fb8e8", glassNight: "#1e2746",
  },
};
