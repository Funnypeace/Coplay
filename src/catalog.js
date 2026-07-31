/* Spieldaten: Raster, Bedürfnisse, Möbelkatalog, Level */
export const GRID = 14, TW2 = 34, TH2 = 17, OX = 520, OY = 130, WALL_H = 92;
/* Fallback-Rastergröße; die tatsächliche Größe pro Raum liefert roomGrid() unten */
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
  kleiderschrank:{ name: "Kleiderschrank", emoji: "🧥", price: 140, w: 1, d: 1, hh: 68, lvl: 1, deko: true },
  sitzsack:    { name: "Sitzsack", emoji: "🪑", price: 110, w: 1, d: 1, hh: 26, lvl: 1,
                 act: { label: "Chillen", dur: 4, needs: { spass: 20, energie: 10 }, xp: 6, fl: "😌" } },
  sofa:        { name: "Sofa", emoji: "🛋️", price: 220, w: 2, d: 1, hh: 30, lvl: 2,
                 act: { label: "Ausruhen", dur: 5, needs: { energie: 30, spass: 12 }, xp: 7, fl: "😌" } },
  tv:          { name: "Fernseher", emoji: "📺", price: 300, w: 1, d: 1, hh: 42, lvl: 2,
                 act: { label: "Fernsehen", dur: 6, needs: { spass: 55 }, xp: 9, fl: "📺" } },
  lampe:       { name: "Stehlampe", emoji: "💡", price: 90, w: 1, d: 1, hh: 50, lvl: 2, deko: true },
  kamin:       { name: "Kamin", emoji: "🔥", price: 320, w: 1, d: 1, hh: 48, lvl: 2,
                 act: { label: "Am Kamin kuscheln", dur: 6, needs: { spass: 22, energie: 15 }, xp: 11, fl: "🔥" } },
  spiegel:     { name: "Standspiegel", emoji: "🪞", price: 90, w: 1, d: 1, hh: 64, lvl: 2, deko: true },
  herd:        { name: "Herd", emoji: "🍳", price: 350, w: 1, d: 1, hh: 34, lvl: 3,
                 act: { label: "Kochen & Essen", dur: 6, needs: { hunger: 90, spass: 5 }, xp: 14, fl: "🍳" } },
  regal:       { name: "Bücherregal", emoji: "📚", price: 260, w: 1, d: 1, hh: 56, lvl: 3,
                 act: { label: "Lesen", dur: 6, needs: { spass: 35 }, xp: 18, fl: "📖" } },
  kaffeemaschine:{ name: "Kaffeemaschine", emoji: "☕", price: 150, w: 1, d: 1, hh: 32, lvl: 3,
                 act: { label: "Kaffee trinken", dur: 3, needs: { energie: 22 }, xp: 6, fl: "☕" } },
  dartscheibe: { name: "Dartscheibe", emoji: "🎯", price: 210, w: 1, d: 1, hh: 60, lvl: 3,
                 act: { label: "Dart spielen", dur: 5, needs: { spass: 38 }, xp: 11, fl: "🎯" } },
  stereo:      { name: "Stereoanlage", emoji: "🎵", price: 280, w: 1, d: 1, hh: 24, lvl: 4,
                 act: { label: "Tanzen", dur: 6, needs: { spass: 65, energie: -8 }, xp: 12, fl: "🎵" } },
  klavier:     { name: "Klavier", emoji: "🎹", price: 450, w: 2, d: 1, hh: 30, lvl: 4,
                 act: { label: "Klavier spielen", dur: 7, needs: { spass: 55, energie: -6 }, xp: 22, fl: "🎹" } },
  aquarium:    { name: "Aquarium", emoji: "🐠", price: 240, w: 1, d: 1, hh: 54, lvl: 4, deko: true },
  badewanne:   { name: "Badewanne", emoji: "🛁", price: 500, w: 2, d: 1, hh: 22, lvl: 5,
                 act: { label: "Baden", dur: 7, needs: { hygiene: 100, spass: 12 }, xp: 12, fl: "🫧" } },
  goldbett:    { name: "Deluxe-Bett", emoji: "👑", price: 900, w: 2, d: 1, hh: 38, lvl: 5,
                 act: { label: "Schlafen (deluxe)", dur: 5, needs: { energie: 100, spass: 8 }, xp: 14, fl: "💤" } },
  whirlpool:   { name: "Whirlpool", emoji: "♨️", price: 680, w: 2, d: 2, hh: 22, lvl: 5,
                 act: { label: "Entspannen", dur: 8, needs: { hygiene: 55, energie: 35, spass: 28 }, xp: 18, fl: "♨️" } },
  heimkino:    { name: "Heimkino", emoji: "🎬", price: 560, w: 2, d: 1, hh: 42, lvl: 5,
                 act: { label: "Kino schauen", dur: 7, needs: { spass: 75 }, xp: 16, fl: "🎬" } },

  /* ---- 20 weitere Items ---- */
  teddybaer:   { name: "Teddybär", emoji: "🧸", price: 40, w: 1, d: 1, hh: 20, lvl: 1, deko: true },
  gemaelde:    { name: "Gemälde", emoji: "🖼️", price: 70, w: 1, d: 1, hh: 60, lvl: 1, deko: true },
  vase:        { name: "Blumenvase", emoji: "💐", price: 45, w: 1, d: 1, hh: 24, lvl: 1, deko: true },
  yogamatte:   { name: "Yogamatte", emoji: "🧘", price: 100, w: 1, d: 1, hh: 10, lvl: 1,
                 act: { label: "Yoga machen", dur: 4, needs: { spass: 18, hygiene: 6 }, xp: 7, fl: "🧘" } },
  haengematte: { name: "Hängematte", emoji: "🌴", price: 240, w: 2, d: 1, hh: 46, lvl: 2,
                 act: { label: "Dösen in der Hängematte", dur: 6, needs: { energie: 35, spass: 15 }, xp: 9, fl: "😌" } },
  schaukelstuhl:{ name: "Schaukelstuhl", emoji: "🔄", price: 190, w: 1, d: 1, hh: 40, lvl: 2,
                 act: { label: "Schaukeln", dur: 5, needs: { energie: 20, spass: 14 }, xp: 8, fl: "😌" } },
  plattenspieler:{ name: "Plattenspieler", emoji: "📀", price: 150, w: 1, d: 1, hh: 26, lvl: 2, deko: true },
  kerzen:      { name: "Kerzenständer", emoji: "🕯️", price: 55, w: 1, d: 1, hh: 20, lvl: 2, deko: true },
  staffelei:   { name: "Staffelei", emoji: "🎨", price: 230, w: 1, d: 1, hh: 48, lvl: 3,
                 act: { label: "Malen", dur: 7, needs: { spass: 42 }, xp: 16, fl: "🎨" } },
  sandsack:    { name: "Boxsack", emoji: "🥊", price: 260, w: 1, d: 1, hh: 50, lvl: 3,
                 act: { label: "Boxen", dur: 5, needs: { spass: 35, energie: -10 }, xp: 13, fl: "🥊" } },
  basketballkorb:{ name: "Basketballkorb", emoji: "🏀", price: 240, w: 1, d: 1, hh: 64, lvl: 3,
                 act: { label: "Basketball spielen", dur: 6, needs: { spass: 45, energie: -8 }, xp: 14, fl: "🏀" } },
  weinregal:   { name: "Weinregal", emoji: "🍷", price: 170, w: 1, d: 1, hh: 50, lvl: 3,
                 act: { label: "Wein genießen", dur: 3, needs: { spass: 20 }, xp: 8, fl: "🍷" } },
  tischkicker: { name: "Tischkicker", emoji: "⚽", price: 360, w: 2, d: 1, hh: 30, lvl: 4,
                 act: { label: "Kickern", dur: 6, needs: { spass: 50 }, xp: 17, fl: "⚽" } },
  trampolin:   { name: "Trampolin", emoji: "🤸", price: 340, w: 2, d: 2, hh: 14, lvl: 4,
                 act: { label: "Trampolin hüpfen", dur: 6, needs: { spass: 58, energie: -10 }, xp: 18, fl: "🤸" } },
  spielekonsole:{ name: "Spielekonsole", emoji: "🎮", price: 380, w: 1, d: 1, hh: 34, lvl: 4,
                 act: { label: "Zocken", dur: 6, needs: { spass: 62 }, xp: 19, fl: "🎮" } },
  massageliege:{ name: "Massageliege", emoji: "💆", price: 400, w: 2, d: 1, hh: 24, lvl: 4,
                 act: { label: "Massage genießen", dur: 6, needs: { hygiene: 25, energie: 25, spass: 20 }, xp: 18, fl: "💆" } },
  billardtisch:{ name: "Billardtisch", emoji: "🎱", price: 620, w: 2, d: 2, hh: 24, lvl: 5,
                 act: { label: "Billard spielen", dur: 7, needs: { spass: 70 }, xp: 20, fl: "🎱" } },
  sauna:       { name: "Sauna", emoji: "🧖", price: 640, w: 1, d: 1, hh: 66, lvl: 5,
                 act: { label: "Saunieren", dur: 7, needs: { hygiene: 70, energie: 30 }, xp: 19, fl: "🧖" } },
  kronleuchter:{ name: "Kronleuchter", emoji: "✨", price: 480, w: 1, d: 1, hh: 70, lvl: 5, deko: true },
  laufband:    { name: "Laufband", emoji: "🏃", price: 420, w: 2, d: 1, hh: 40, lvl: 5,
                 act: { label: "Joggen", dur: 6, needs: { spass: 34, energie: -16 }, xp: 16, fl: "🏃" } },
};
export const SHIRTS = ["#3d8f7e", "#b2564f", "#7d63a8", "#c48f45", "#5478b0"];

export function xpNeed(l) { return 100 + (l - 1) * 120; }

/* Räume mit eigenem Look UND eigener Größe (Raster) – gedämpfte, edlere Töne statt Comic-Farben */
export const ROOMS = {
  lounge: {
    name: "Lounge", emoji: "🛋️", grid: 14,
    bg: ["#191d27", "#20242f"],
    floor: ["#a9835a", "#b58e63"],
    wallL: ["#4c5468", "#4f586e"], wallR: ["#565f78", "#5a6480"],
    stripL: "#383f52", stripR: "#414a60",
    glassDay: "#9cc2dc", glassNight: "#233047",
  },
  garten: {
    name: "Garten", emoji: "🌿", grid: 12,
    bg: ["#171f22", "#1c262a"],
    floor: ["#748a63", "#7d9269"],
    wallL: ["#3f5842", "#425c45"], wallR: ["#48624a", "#4b664d"],
    stripL: "#324832", stripR: "#385036",
    glassDay: "#b7d4c8", glassNight: "#20302a"
  },
  arcade: {
    name: "Arcade", emoji: "🕹️", grid: 10,
    bg: ["#14151d", "#191b25"],
    floor: ["#3a3850", "#403d58"],
    wallL: ["#302e46", "#33314a"], wallR: ["#38364e", "#3b3952"],
    stripL: "#232135", stripR: "#272538",
    glassDay: "#8a95c4", glassNight: "#1a1a2c",
  },
};
/* Rastergröße des angegebenen Raums (Fallback: GRID) */
export function roomGrid(room) {
  return (ROOMS[room] && ROOMS[room].grid) || GRID;
}
