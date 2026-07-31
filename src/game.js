/* Spielschleife, Rendering und Eingaben */
import { CAT, NEED_KEYS, NEED_META, WALL_H, OX, OY, TW2, TH2, ROOMS, roomGrid } from "./catalog.js";
import {
  cv, ctx, clamp, isoPt, shade, poly, line, circ, ell, rect, rrect, txt,
  boxIso, southPt, fl, drawFloaters,
} from "./draw.js";
import { S, activeId, isAdmin, saveNow, avgNeeds } from "./state.js";
import * as W from "./world.js";
import {
  remote, bubbles, broadcastMove, trackPresence, dbPlaceFurniture, dbRemoveFurniture,
  joinRoom, joinedRoom, loadWorld, sendEmote, connected,
} from "./net.js";
import {
  toast, uiTop, uiNeeds, setShopSel, setModeUI, showMenu, hideMenu, menuEl,
  buildShop, closeOverlaysOnEsc, setRoomUI,
} from "./ui.js";
import { gainXp, charPx } from "./progress.js";
import { updatePet, drawLocalPet, drawRemotePet, petDepth, tickPetUi } from "./pet.js";
import { trackStat, checkAll } from "./achievements.js";
import { questEvent } from "./quests.js";
import { chatHasFocus } from "./chat.js";

/* Laufzeit-Zustand */
let mode = "live";            // "live" | "buy"
let selection = null;          // {type, moveRef|null}
let hoverTile = null;          // {x,y}
let charPath = [];             // [{x,y},...]
let pendingAction = null;      // {fid} Möbel-ID nach Ankunft
let action = null;             // {fid, def, t, dur}
let walkPhase = 0, lastWarn = 0, autosaveT = 0, needsUiT = 0;
let placing = false;
let wasMoving = false;

/* ================= Tag/Nacht (synchron über Uhrzeit) ================= */
function dayInfo() {
  const t01 = ((Date.now() / 1000) % 240) / 240;
  const bright = 0.55 + 0.45 * Math.cos(t01 * Math.PI * 2);
  const hour = (12 + t01 * 24) % 24;
  return { t01, bright, night: bright < 0.5, hour };
}

/* ================= Wände & Boden ================= */
function theme() { return ROOMS[S.room] || ROOMS.lounge; }
export function grid() { return roomGrid(S.room); }

/* Tür-Bereich (auf der linken Wand) als Anteil der jeweiligen Rastergröße, Breite bleibt 1.8 Kacheln */
function doorRange(g) { const a = g * 0.46; return [a, a + 1.8]; }
/* Fenster-Segmente entlang einer Wand der Länge g; linke Wand spart den Türbereich aus */
function windowSegs(g, offset, avoidDoor) {
  const segs = [];
  for (let start = offset; start + 1.8 <= g - 0.5; start += 4) {
    const end = start + 1.8;
    if (avoidDoor) {
      const [dA, dB] = doorRange(g);
      if (end > dA - 0.3 && start < dB + 0.3) continue;
    }
    segs.push([start, end]);
  }
  return segs;
}

function drawWalls(night) {
  const T = theme(), G = grid();
  const glass = night ? T.glassNight : T.glassDay;
  for (let y = 0; y < G; y++) {
    const a = isoPt(0, y, 0), b = isoPt(0, y + 1, 0);
    poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - WALL_H], [a.x, a.y - WALL_H]], y % 2 ? T.wallL[0] : T.wallL[1]);
    poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 8], [a.x, a.y - 8]], T.stripL);
  }
  for (let x = 0; x < G; x++) {
    const a = isoPt(x, 0, 0), b = isoPt(x + 1, 0, 0);
    poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - WALL_H], [a.x, a.y - WALL_H]], x % 2 ? T.wallR[0] : T.wallR[1]);
    poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 8], [a.x, a.y - 8]], T.stripR);
  }
  // Fenster rechte Wand
  windowSegs(G, 1.4, false).forEach(seg => {
    const P = u => isoPt(seg[0] + (seg[1] - seg[0]) * u, 0, 0);
    const a = P(0), b = P(1);
    poly([[a.x, a.y - 32], [b.x, b.y - 32], [b.x, b.y - 72], [a.x, a.y - 72]], glass, "#dfe6f2", 2);
    const m = P(0.5); line({ x: m.x, y: m.y - 32 }, { x: m.x, y: m.y - 72 }, "#dfe6f2", 1.5);
  });
  // Fenster linke Wand (Türbereich ausgespart)
  windowSegs(G, 2.2, true).forEach(seg => {
    const P = u => isoPt(0, seg[0] + (seg[1] - seg[0]) * u, 0);
    const a = P(0), b = P(1);
    poly([[a.x, a.y - 32], [b.x, b.y - 32], [b.x, b.y - 72], [a.x, a.y - 72]], glass, "#cdd6e8", 2);
    const m = P(0.5); line({ x: m.x, y: m.y - 32 }, { x: m.x, y: m.y - 72 }, "#cdd6e8", 1.5);
  });
  // Tür linke Wand
  (() => {
    const [dA] = doorRange(G);
    const P = u => isoPt(0, dA + 1.8 * u, 0);
    const a = P(0), b = P(1);
    poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 78], [a.x, a.y - 78]], "#4a3a2c", "#3a2d22", 2);
    const h = P(0.82); circ(h.x, h.y - 38, 2.5, "#d8b96a");
  })();
}

function drawFloor() {
  const T = theme(), G = grid();
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const a = isoPt(x, y), b = isoPt(x + 1, y), c = isoPt(x + 1, y + 1), d = isoPt(x, y + 1);
    poly([[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], (x + y) % 2 ? T.floor[0] : T.floor[1], "rgba(0,0,0,.08)");
  }
  if (mode === "buy") {
    for (let i = 0; i <= G; i++) {
      line(isoPt(i, 0), isoPt(i, G), "rgba(255,255,255,.12)", 1);
      line(isoPt(0, i), isoPt(G, i), "rgba(255,255,255,.12)", 1);
    }
  }
}

function tileHighlight(x, y, w, d, ok) {
  const a = isoPt(x, y), b = isoPt(x + w, y), c = isoPt(x + w, y + d), dd = isoPt(x, y + d);
  poly([[a.x, a.y], [b.x, b.y], [c.x, c.y], [dd.x, dd.y]],
    ok ? "rgba(107,187,142,.32)" : "rgba(217,123,115,.38)", ok ? "#6bbb8e" : "#d97b73", 2);
}

/* Kleines Accessoire: farbiger Sockel + großes, stets sichtbares Emoji-Symbol
   (+ optional zweites Emoji als Aktions-Feedback). Für die 20 Hobby-/Deko-Items. */
function drawProp(x, y, t, active, emoji, baseColor, hh, activeEmoji) {
  const p = isoPt(x + 0.5, y + 0.5, 0);
  ell(p.x, p.y - 1, 11, 5, "rgba(0,0,0,.22)");
  boxIso(x + 0.3, y + 0.3, 0.4, 0.4, Math.min(hh, 14), 0, baseColor);
  const bob = active ? Math.sin(t * 3) * 2 : 0;
  txt(emoji, p.x, p.y - hh * 0.55 - bob, 19, "#fff");
  if (active && activeEmoji) txt(activeEmoji, p.x + 10, p.y - hh * 0.85, 12, "#fff");
}

/* ================= Möbel zeichnen ================= */
function drawFurniture(f, t, active) {
  const x = f.x, y = f.y;
  switch (f.type) {
    case "teppich": {
      const a = isoPt(x, y, 2), b = isoPt(x + 2, y, 2), cc = isoPt(x + 2, y + 2, 2), d = isoPt(x, y + 2, 2);
      poly([[a.x, a.y], [b.x, b.y], [cc.x, cc.y], [d.x, d.y]], "#7a5fb0", "#5d4691", 2);
      const a2 = isoPt(x + 0.4, y + 0.4, 2), b2 = isoPt(x + 1.6, y + 0.4, 2), c2 = isoPt(x + 1.6, y + 1.6, 2), d2 = isoPt(x + 0.4, y + 1.6, 2);
      poly([[a2.x, a2.y], [b2.x, b2.y], [c2.x, c2.y], [d2.x, d2.y]], "#9078c4");
      break; }
    case "bett": case "goldbett": {
      const deluxe = f.type === "goldbett";
      boxIso(x, y, 2, 1, 10, 0, deluxe ? "#7a5a36" : "#8a6543");
      boxIso(x, y + 0.04, 0.16, 0.92, 30, 0, deluxe ? "#6e5030" : "#7a5739");
      boxIso(x + 0.18, y + 0.08, 1.76, 0.84, 9, 10, "#e9e5db");
      boxIso(x + 0.92, y + 0.1, 1.0, 0.8, 5, 19, deluxe ? "#d8a93f" : "#5f8fe8");
      boxIso(x + 0.26, y + 0.22, 0.5, 0.55, 5, 19, "#ffffff");
      if (deluxe) { const p = isoPt(x + 0.1, y + 0.5, 46); txt("👑", p.x, p.y, 14, "#fff"); }
      if (active) { const p = isoPt(x + 1, y + 0.5, 40); txt("💤", p.x, p.y - Math.sin(t * 2) * 4, 13, "#cfe0ff"); }
      break; }
    case "kuehlschrank": {
      boxIso(x + 0.1, y + 0.1, 0.8, 0.8, 46, 0, "#dfe5ee");
      line(southPt(x + 0.1, y + 0.1, 0.8, 0.8, 0, 30), southPt(x + 0.1, y + 0.1, 0.8, 0.8, 1, 30), "#aab3c4", 1.5);
      line(southPt(x + 0.1, y + 0.1, 0.8, 0.8, 0.15, 34), southPt(x + 0.1, y + 0.1, 0.8, 0.8, 0.15, 42), "#6b7488", 3);
      break; }
    case "dusche": {
      boxIso(x + 0.05, y + 0.05, 0.9, 0.9, 6, 0, "#cfd6e2");
      const g = "rgba(165,205,235,.38)", gs = "rgba(220,240,255,.55)";
      let a = isoPt(x, y, 6), b = isoPt(x + 1, y, 6);
      poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 60], [a.x, a.y - 60]], g, gs, 1.5);
      b = isoPt(x, y + 1, 6);
      poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 60], [a.x, a.y - 60]], g, gs, 1.5);
      const hp = isoPt(x + 0.28, y + 0.28, 0);
      line({ x: hp.x, y: hp.y - 64 }, { x: hp.x, y: hp.y - 56 }, "#b8c0d0", 3);
      circ(hp.x, hp.y - 54, 4, "#aab3c6");
      if (active) { for (let i = 0; i < 5; i++) { const dy = ((t * 60 + i * 13) % 34); line({ x: hp.x - 6 + i * 3, y: hp.y - 50 + dy }, { x: hp.x - 6 + i * 3, y: hp.y - 46 + dy }, "rgba(190,225,255,.7)", 1.5); } }
      break; }
    case "schreibtisch": {
      boxIso(x + 0.05, y + 0.1, 0.12, 0.12, 16, 0, "#6e5030"); boxIso(x + 1.83, y + 0.1, 0.12, 0.12, 16, 0, "#6e5030");
      boxIso(x + 0.05, y + 0.78, 0.12, 0.12, 16, 0, "#6e5030"); boxIso(x + 1.83, y + 0.78, 0.12, 0.12, 16, 0, "#6e5030");
      boxIso(x, y, 2, 1, 5, 16, "#9a7148");
      boxIso(x + 0.5, y + 0.22, 0.62, 0.12, 17, 21, "#252c3e");
      const Pa = southPt(x + 0.5, y + 0.22, 0.62, 0.12, 0.08, 36), Pb = southPt(x + 0.5, y + 0.22, 0.62, 0.12, 0.92, 36),
        Pc = southPt(x + 0.5, y + 0.22, 0.62, 0.12, 0.92, 24), Pd = southPt(x + 0.5, y + 0.22, 0.62, 0.12, 0.08, 24);
      poly([[Pa.x, Pa.y], [Pb.x, Pb.y], [Pc.x, Pc.y], [Pd.x, Pd.y]], active ? (Math.sin(t * 9) > 0 ? "#7fa8e8" : "#8fb8f4") : "#3b4d7a");
      boxIso(x + 1.25, y + 0.5, 0.5, 0.28, 2, 21, "#3a4256");
      break; }
    case "pflanze": {
      boxIso(x + 0.3, y + 0.3, 0.4, 0.4, 12, 0, "#b5694a");
      const p = isoPt(x + 0.5, y + 0.5, 0);
      circ(p.x - 7, p.y - 26, 10, "#356f44"); circ(p.x + 7, p.y - 28, 9, "#3e7d4e");
      circ(p.x, p.y - 36, 10, "#4e9a5e"); circ(p.x + 2, p.y - 24, 7, "#2e6039");
      break; }
    case "lampe": {
      boxIso(x + 0.35, y + 0.35, 0.3, 0.3, 3, 0, "#3a4256");
      const p = isoPt(x + 0.5, y + 0.5, 0);
      line({ x: p.x, y: p.y - 3 }, { x: p.x, y: p.y - 46 }, "#4a5468", 3);
      poly([[p.x - 14, p.y - 44], [p.x + 14, p.y - 44], [p.x + 8, p.y - 62], [p.x - 8, p.y - 62]], "#e8d8a8", "#c4b58a", 1.5);
      break; }
    case "kleiderschrank": {
      boxIso(x + 0.08, y + 0.08, 0.84, 0.84, 68, 0, "#6b4a32");
      const Pa = southPt(x + 0.08, y + 0.08, 0.84, 0.84, 0.5, 68), Pb = southPt(x + 0.08, y + 0.08, 0.84, 0.84, 0.5, 6);
      line(Pa, Pb, "#4a3220", 2);
      const h1 = southPt(x + 0.08, y + 0.08, 0.84, 0.84, 0.4, 34), h2 = southPt(x + 0.08, y + 0.08, 0.84, 0.84, 0.6, 34);
      circ(h1.x, h1.y, 2, "#d8b96a"); circ(h2.x, h2.y, 2, "#d8b96a");
      break; }
    case "sitzsack": {
      const p = isoPt(x + 0.5, y + 0.5, 0);
      ell(p.x, p.y - 1, 15, 7, "rgba(0,0,0,.25)");
      ell(p.x, p.y - 14, 14, 13, "#9a6fe0");
      ell(p.x - 4, p.y - 21, 6, 5, "#8558c8");
      if (active) txt("😌", p.x, p.y - 30, 13, "#fff");
      break; }
    case "kamin": {
      boxIso(x + 0.05, y + 0.05, 0.9, 0.9, 46, 0, "#7a5040");
      const A = isoPt(x + 0.24, y + 0.24, 10), B = isoPt(x + 0.76, y + 0.24, 10), C = isoPt(x + 0.76, y + 0.76, 10), D = isoPt(x + 0.24, y + 0.76, 10);
      poly([[A.x, A.y], [B.x, B.y], [C.x, C.y], [D.x, D.y]], active ? "#c9531f" : "#5a2a18");
      if (active) { const p = isoPt(x + 0.5, y + 0.5, 22); txt("🔥", p.x, p.y - Math.sin(t * 3) * 3, 15, "#ffb15a"); }
      break; }
    case "spiegel": {
      boxIso(x + 0.4, y + 0.4, 0.2, 0.2, 3, 0, "#3a4256");
      const p = isoPt(x + 0.5, y + 0.5, 3);
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 46, 10, 22, 0, 0, 7);
      ctx.fillStyle = "#cfe0f0"; ctx.fill(); ctx.strokeStyle = "#8a94ac"; ctx.lineWidth = 2; ctx.stroke();
      break; }
    case "sofa": {
      boxIso(x, y, 2, 1, 14, 0, "#c46a6a");
      boxIso(x, y, 2, 0.32, 16, 14, "#b35f5f");
      boxIso(x, y + 0.25, 0.26, 0.75, 9, 14, "#b35f5f");
      boxIso(x + 1.74, y + 0.25, 0.26, 0.75, 9, 14, "#b35f5f");
      line(isoPt(x + 1, y + 0.32, 28), isoPt(x + 1, y + 1, 15), "rgba(0,0,0,.18)", 1.5);
      break; }
    case "tv": {
      boxIso(x + 0.3, y + 0.38, 0.4, 0.26, 10, 0, "#2c3346");
      boxIso(x + 0.05, y + 0.4, 0.9, 0.16, 32, 10, "#1d2330");
      const Pa = southPt(x + 0.05, y + 0.4, 0.9, 0.16, 0.06, 38), Pb = southPt(x + 0.05, y + 0.4, 0.9, 0.16, 0.94, 38),
        Pc = southPt(x + 0.05, y + 0.4, 0.9, 0.16, 0.94, 14), Pd = southPt(x + 0.05, y + 0.4, 0.9, 0.16, 0.06, 14);
      let col = "#28324a";
      if (active) { const ph = Math.floor(t * 6) % 3; col = ["#6f9ce0", "#8fb2e8", "#7fd0c0"][ph]; }
      poly([[Pa.x, Pa.y], [Pb.x, Pb.y], [Pc.x, Pc.y], [Pd.x, Pd.y]], col);
      break; }
    case "herd": {
      boxIso(x + 0.08, y + 0.08, 0.84, 0.84, 30, 0, "#cdd3dd");
      const A = isoPt(x + 0.14, y + 0.14, 30), B = isoPt(x + 0.86, y + 0.14, 30), C = isoPt(x + 0.86, y + 0.86, 30), D = isoPt(x + 0.14, y + 0.86, 30);
      poly([[A.x, A.y], [B.x, B.y], [C.x, C.y], [D.x, D.y]], "#39404e");
      [[0.32, 0.32], [0.68, 0.32], [0.32, 0.68], [0.68, 0.68]].forEach((q, i) => {
        const p = isoPt(x + q[0], y + q[1], 30);
        ell(p.x, p.y, 7, 3.5, active && i === 0 ? "#e8784a" : "#22262e");
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 3.5, 0, 0, 7); ctx.strokeStyle = "#565e6e"; ctx.lineWidth = 1; ctx.stroke();
      });
      if (active) { const p = isoPt(x + 0.5, y + 0.5, 44); txt("♨️", p.x, p.y - Math.sin(t * 2.5) * 3, 12, "#fff"); }
      break; }
    case "regal": {
      boxIso(x + 0.1, y + 0.15, 0.8, 0.7, 56, 0, "#8a6543");
      const L = (u, z) => southPt(x + 0.1, y + 0.15, 0.8, 0.7, u, z);
      [16, 32, 46].forEach(z => line(L(0.04, z), L(0.96, z), "#6e5030", 2));
      const books = [[0.08, 0.2, 16, 28, "#c46a6a"], [0.22, 0.34, 16, 30, "#5f8fe8"], [0.4, 0.5, 16, 27, "#e8a13f"],
        [0.1, 0.24, 32, 44, "#4e9a5e"], [0.3, 0.44, 32, 42, "#9a6fe0"], [0.6, 0.74, 32, 45, "#d8d2c4"],
        [0.15, 0.27, 46, 55, "#6ea8e8"], [0.5, 0.66, 46, 54, "#c46a6a"]];
      books.forEach(b => {
        const p1 = L(b[0], b[2]), p2 = L(b[1], b[2]), p3 = L(b[1], b[3]), p4 = L(b[0], b[3]);
        poly([[p1.x, p1.y], [p2.x, p2.y], [p3.x, p3.y], [p4.x, p4.y]], b[4]);
      });
      break; }
    case "kaffeemaschine": {
      boxIso(x + 0.25, y + 0.25, 0.5, 0.5, 30, 0, "#2c2c34");
      const p = isoPt(x + 0.5, y + 0.5, 30);
      ell(p.x, p.y, 5, 2.5, "#1a1a20");
      if (active) txt("☕", p.x, p.y - 14 - Math.sin(t * 2) * 2, 12, "#e8c9a0");
      break; }
    case "dartscheibe": {
      boxIso(x + 0.42, y + 0.42, 0.16, 0.16, 3, 0, "#3a4256");
      const p = isoPt(x + 0.5, y + 0.5, 55);
      circ(p.x, p.y, 12, "#e9e5db"); circ(p.x, p.y, 9, "#c46a6a");
      circ(p.x, p.y, 6, "#e9e5db"); circ(p.x, p.y, 3, "#2c2c34");
      if (active) txt("🎯", p.x + 12, p.y - 8, 12, "#fff");
      break; }
    case "stereo": {
      boxIso(x + 0.15, y + 0.2, 0.7, 0.6, 20, 0, "#2e3850");
      const L = (u, z) => southPt(x + 0.15, y + 0.2, 0.7, 0.6, u, z);
      [0.28, 0.72].forEach(u => {
        const p = L(u, 10); circ(p.x, p.y, 5, "#1a2030");
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.strokeStyle = "#56648a"; ctx.lineWidth = 1.5; ctx.stroke();
        circ(p.x, p.y, 1.8, active ? "#7fd0c0" : "#3a4663");
      });
      if (active) { const p = isoPt(x + 0.5, y + 0.5, 34); txt("🎵", p.x + Math.sin(t * 4) * 6, p.y - Math.abs(Math.sin(t * 3)) * 8, 12, "#9fd8cc"); }
      break; }
    case "klavier": {
      boxIso(x + 0.05, y + 0.1, 0.12, 0.12, 20, 0, "#241a14"); boxIso(x + 1.5, y + 0.1, 0.12, 0.12, 20, 0, "#241a14");
      boxIso(x + 0.05, y + 0.7, 0.12, 0.12, 20, 0, "#241a14"); boxIso(x + 1.5, y + 0.7, 0.12, 0.12, 20, 0, "#241a14");
      boxIso(x, y, 1.7, 0.9, 8, 20, "#1c130f");
      const Pa = southPt(x, y, 1.7, 0.9, 0.1, 26), Pb = southPt(x, y, 1.7, 0.9, 0.9, 26),
        Pc = southPt(x, y, 1.7, 0.9, 0.9, 20), Pd = southPt(x, y, 1.7, 0.9, 0.1, 20);
      poly([[Pa.x, Pa.y], [Pb.x, Pb.y], [Pc.x, Pc.y], [Pd.x, Pd.y]], "#e9e5db");
      if (active) { const p = isoPt(x + 0.85, y + 0.45, 40); txt("🎹", p.x, p.y - Math.sin(t * 3) * 4, 13, "#c9b8f0"); }
      break; }
    case "aquarium": {
      boxIso(x + 0.1, y + 0.15, 0.8, 0.7, 6, 0, "#3a4256");
      let a = isoPt(x + 0.1, y + 0.15, 6), b = isoPt(x + 0.9, y + 0.15, 6);
      poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 50], [a.x, a.y - 50]], "rgba(120,200,230,.5)", "#bfe6f5", 1.5);
      a = isoPt(x + 0.1, y + 0.85, 6); b = isoPt(x + 0.1, y + 0.15, 6);
      poly([[a.x, a.y], [b.x, b.y], [b.x, b.y - 50], [a.x, a.y - 50]], "rgba(120,200,230,.5)", "#bfe6f5", 1.5);
      const p = isoPt(x + 0.5, y + 0.5, 30);
      txt("🐠", p.x + Math.sin(t * 1.5) * 8, p.y - Math.abs(Math.sin(t)) * 4, 13, "#fff");
      break; }
    case "badewanne": {
      boxIso(x, y, 2, 1, 18, 0, "#e9edf3");
      const A = isoPt(x + 0.16, y + 0.18, 18), B = isoPt(x + 1.84, y + 0.18, 18), C = isoPt(x + 1.84, y + 0.82, 18), D = isoPt(x + 0.16, y + 0.82, 18);
      poly([[A.x, A.y], [B.x, B.y], [C.x, C.y], [D.x, D.y]], "#7fb8e0");
      if (active) { for (let i = 0; i < 4; i++) { const p = isoPt(x + 0.4 + i * 0.4, y + 0.5, 18); circ(p.x, p.y - ((t * 14 + i * 8) % 10), 2.2, "rgba(255,255,255,.8)"); } }
      const f2 = isoPt(x + 1.84, y + 0.5, 18); line({ x: f2.x, y: f2.y - 2 }, { x: f2.x + 6, y: f2.y - 12 }, "#aab3c6", 3); circ(f2.x + 6, f2.y - 13, 2.5, "#aab3c6");
      break; }
    case "whirlpool": {
      boxIso(x, y, 2, 2, 20, 0, "#cfa46a");
      const A = isoPt(x + 0.18, y + 0.18, 20), B = isoPt(x + 1.82, y + 0.18, 20), C = isoPt(x + 1.82, y + 1.82, 20), D = isoPt(x + 0.18, y + 1.82, 20);
      poly([[A.x, A.y], [B.x, B.y], [C.x, C.y], [D.x, D.y]], "#6fb8d8");
      if (active) {
        for (let i = 0; i < 6; i++) {
          const p = isoPt(x + 0.4 + (i % 3) * 0.6, y + 0.4 + Math.floor(i / 3) * 0.9, 20);
          circ(p.x, p.y - ((t * 16 + i * 7) % 12), 2.4, "rgba(255,255,255,.85)");
        }
      }
      break; }
    case "heimkino": {
      boxIso(x + 0.05, y + 0.4, 1.9, 0.14, 40, 10, "#151a24");
      const Pa = southPt(x + 0.05, y + 0.4, 1.9, 0.14, 0.04, 48), Pb = southPt(x + 0.05, y + 0.4, 1.9, 0.14, 0.96, 48),
        Pc = southPt(x + 0.05, y + 0.4, 1.9, 0.14, 0.96, 14), Pd = southPt(x + 0.05, y + 0.4, 1.9, 0.14, 0.04, 14);
      let col = "#1c2436";
      if (active) { const ph = Math.floor(t * 6) % 3; col = ["#6f9ce0", "#8fb2e8", "#7fd0c0"][ph]; }
      poly([[Pa.x, Pa.y], [Pb.x, Pb.y], [Pc.x, Pc.y], [Pd.x, Pd.y]], col);
      boxIso(x + 0.02, y + 0.42, 0.12, 0.16, 20, 0, "#2a2f3a"); boxIso(x + 1.86, y + 0.42, 0.12, 0.16, 20, 0, "#2a2f3a");
      break; }

    /* ---- 20 weitere Items: einheitlicher Sockel + Emoji-Symbol ---- */
    case "teddybaer": drawProp(x, y, t, active, "🧸", "#c48a52", 20); break;
    case "gemaelde": drawProp(x, y, t, active, "🖼️", "#5a4030", 60); break;
    case "vase": drawProp(x, y, t, active, "💐", "#e8e0d0", 24); break;
    case "yogamatte": drawProp(x, y, t, active, "🧘", "#5f8fe8", 10); break;
    case "haengematte": drawProp(x, y, t, active, "🌴", "#8a6543", 46, "😌"); break;
    case "schaukelstuhl": drawProp(x, y, t, active, "🔄", "#8a6543", 40, "😌"); break;
    case "plattenspieler": drawProp(x, y, t, active, "📀", "#3a3a44", 26); break;
    case "kerzen": drawProp(x, y, t, active, "🕯️", "#6b4a32", 20); break;
    case "staffelei": drawProp(x, y, t, active, "🎨", "#8a6543", 48, "✨"); break;
    case "sandsack": drawProp(x, y, t, active, "🥊", "#6b4a3a", 50, "💥"); break;
    case "basketballkorb": drawProp(x, y, t, active, "🏀", "#8a94ac", 64, "⚡"); break;
    case "weinregal": drawProp(x, y, t, active, "🍷", "#5a3f28", 50); break;
    case "tischkicker": drawProp(x, y, t, active, "⚽", "#3a5a3a", 30, "⚡"); break;
    case "trampolin": drawProp(x, y, t, active, "🤸", "#2e3850", 14, "💫"); break;
    case "spielekonsole": drawProp(x, y, t, active, "🎮", "#2c2c34", 34, "✨"); break;
    case "massageliege": drawProp(x, y, t, active, "💆", "#c9b8a0", 24, "😌"); break;
    case "billardtisch": drawProp(x, y, t, active, "🎱", "#2f6b45", 24); break;
    case "sauna": drawProp(x, y, t, active, "🧖", "#7a5739", 66, "💦"); break;
    case "kronleuchter": drawProp(x, y, t, active, "✨", "#8a7a3a", 70); break;
    case "laufband": drawProp(x, y, t, active, "🏃", "#3a4256", 40, "💨"); break;
  }
}

/* ================= Figuren ================= */
function drawPersonAt(gx, gy, name, shirt, opts) {
  opts = opts || {};
  const P = isoPt(gx, gy, 0);
  const bob = opts.bob || 0;
  ell(P.x, P.y - 2, 13, 6, "rgba(0,0,0,.3)");
  const by = P.y - bob;
  rect(P.x - 7, by - 16, 5.5, 14, "#2e3850");
  rect(P.x + 1.5, by - 16, 5.5, 14, "#2e3850");
  rrect(P.x - 12, by - 33, 4, 15, 2, shade(shirt, 0.78));
  rrect(P.x + 8, by - 33, 4, 15, 2, shade(shirt, 0.78));
  rrect(P.x - 9, by - 36, 18, 22, 6, shirt);
  circ(P.x, by - 44, 8.5, "#f0c8a2");
  ctx.beginPath(); ctx.arc(P.x, by - 46.5, 8.2, Math.PI * 0.95, Math.PI * 2.05); ctx.fillStyle = "#6b4a2f"; ctx.fill();
  circ(P.x - 3, by - 43.5, 1.4, "#222"); circ(P.x + 3, by - 43.5, 1.4, "#222");
  ctx.beginPath(); ctx.arc(P.x, by - 40.5, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = "#a3704c"; ctx.lineWidth = 1.4; ctx.stroke();
  if (opts.mood != null) {
    const mc = opts.mood >= 70 ? "#6bbb8e" : opts.mood >= 40 ? "#e0a856" : "#d97b73";
    ctx.save(); ctx.shadowColor = mc; ctx.shadowBlur = 10;
    circ(P.x, by - 61 + Math.sin((opts.t || 0) * 2.4) * 1.5, 4.5, mc);
    ctx.restore();
  }
  txt(name, P.x, by - 71, 11.5, "#eef2fb");
  if (opts.level) txt("Lv " + opts.level, P.x, by - 82, 9.5, "#c9b98a");
  if (opts.progress != null) {
    rrect(P.x - 23, by - 88, 46, 8, 4, "#111318");
    if (opts.progress > 0.02) rrect(P.x - 21, by - 86, 42 * opts.progress, 4, 2, "#d3ad68");
  }
}

function drawSelf(t) {
  const moving = charPath.length > 0;
  const bob = moving ? Math.abs(Math.sin(walkPhase * 9)) * 3 : (action ? Math.abs(Math.sin(t * 3)) * 1.5 : 0);
  drawPersonAt(S.char.x, S.char.y, S.name || "Ich", S.shirt, {
    bob, mood: avgNeeds(), t,
    progress: action ? clamp(action.t / action.dur, 0, 1) : null,
  });
}
function drawRemote(p, t) {
  const moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 0.05;
  const bob = moving ? Math.abs(Math.sin(t * 9)) * 3 : 0;
  drawPersonAt(p.x, p.y, p.name || "Gast", p.shirt || "#9aa7c4", { bob, level: p.level });
  if (p.pet) drawRemotePet(p.x, p.y, p.pet, t);
}

/* Sprechblasen */
function wrapText(text, maxW) {
  ctx.font = "600 11.5px 'Segoe UI', sans-serif";
  const words = String(text).split(/\s+/); const lines = []; let cur = "";
  words.forEach(w => {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
function drawBubble(gx, gy, text) {
  const P = isoPt(gx, gy, 0);
  const lines = wrapText(text, 150);
  ctx.font = "600 11.5px 'Segoe UI', sans-serif";
  const w = Math.min(160, Math.max(...lines.map(l => ctx.measureText(l).width)) + 16);
  const h = lines.length * 14 + 10;
  const bx = clamp(P.x - w / 2, 4, cv.width - w - 4), by = P.y - 96 - h;
  rrect(bx, by, w, h, 7, "rgba(255,255,255,.94)");
  poly([[P.x - 5, by + h], [P.x + 5, by + h], [P.x, by + h + 6]], "rgba(255,255,255,.94)");
  ctx.fillStyle = "#1b2130"; ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 17 + i * 14));
}

/* ================= Render ================= */
export function render(t, dt) {
  ctx.clearRect(0, 0, cv.width, cv.height);
  const day = dayInfo();
  const T = theme();
  const grd = ctx.createLinearGradient(0, 0, 0, cv.height);
  grd.addColorStop(0, T.bg[0]); grd.addColorStop(1, T.bg[1]);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, cv.width, cv.height);
  drawWalls(day.night);
  drawFloor();
  W.furniture.forEach(f => { if (CAT[f.type].walk) drawFurniture(f, t, false); });
  if (mode === "live" && hoverTile && !selection) {
    const a = isoPt(hoverTile.x, hoverTile.y), b = isoPt(hoverTile.x + 1, hoverTile.y), c = isoPt(hoverTile.x + 1, hoverTile.y + 1), d = isoPt(hoverTile.x, hoverTile.y + 1);
    poly([[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], "rgba(255,255,255,.07)");
  }
  // Möbel, Spieler und Haustiere in Tiefenreihenfolge
  const items = [];
  W.furniture.forEach(f => {
    const c = CAT[f.type];
    if (!c.walk) items.push({ d: f.x + f.y + (c.w + c.d) / 2, kind: "f", f });
  });
  items.push({ d: S.char.x + S.char.y, kind: "c" });
  remote.forEach(p => items.push({ d: p.x + p.y, kind: "r", p }));
  const pd = petDepth();
  if (pd >= 0) items.push({ d: pd, kind: "pet" });
  items.sort((a, b) => a.d - b.d);
  items.forEach(it => {
    if (it.kind === "c") drawSelf(t);
    else if (it.kind === "r") drawRemote(it.p, t);
    else if (it.kind === "pet") drawLocalPet(t);
    else drawFurniture(it.f, t, action && action.fid === it.f.id);
  });
  // Geist-Platzierung im Bauen-Modus
  if (mode === "buy" && selection && hoverTile) {
    const c = CAT[selection.type];
    const ok = W.canPlace(selection.type, hoverTile.x, hoverTile.y);
    tileHighlight(hoverTile.x, hoverTile.y, c.w, c.d, ok);
    ctx.globalAlpha = 0.6;
    drawFurniture({ type: selection.type, x: hoverTile.x, y: hoverTile.y }, t, false);
    ctx.globalAlpha = 1;
  }
  // Nacht-Abdunklung
  if (day.bright < 1) {
    ctx.fillStyle = "rgba(9,14,38," + (0.42 * (1 - day.bright)).toFixed(3) + ")";
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  if (day.night) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    W.furniture.forEach(f => {
      if (f.type === "lampe") {
        const p = isoPt(f.x + 0.5, f.y + 0.5, 0);
        const g = ctx.createRadialGradient(p.x, p.y - 50, 4, p.x, p.y - 40, 70);
        g.addColorStop(0, "rgba(255,214,130,.4)"); g.addColorStop(1, "rgba(255,214,130,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 70, 0, 7); ctx.fill();
      }
    });
    ctx.restore();
  }
  drawFloaters(dt);
  // Sprechblasen
  const now = performance.now();
  bubbles.forEach((b, id) => {
    if (b.until < now) { bubbles.delete(id); return; }
    if (id === activeId()) drawBubble(S.char.x, S.char.y, b.text);
    else { const p = remote.get(id); if (p) drawBubble(p.x, p.y, b.text); }
  });
  // Emotes über den Köpfen
  emoteMap.forEach((e, id) => {
    const age = (now - e.t0) / 2200;
    if (age >= 1) { emoteMap.delete(id); return; }
    let gx = null, gy = null;
    if (id === activeId()) { gx = S.char.x; gy = S.char.y; }
    else { const p = remote.get(id); if (p) { gx = p.x; gy = p.y; } }
    if (gx == null) return;
    const P = isoPt(gx, gy, 0);
    ctx.globalAlpha = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4;
    txt(e.e, P.x, P.y - 92 - age * 30, 22, "#fff");
    ctx.globalAlpha = 1;
  });
  // Uhr + Raumname
  const hh = Math.floor(day.hour), mm = Math.floor((day.hour % 1) * 60);
  txt((day.night ? "🌙 " : "☀️ ") + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"), 70, 28, 14, "#cfd8ec", "left");
  txt(theme().emoji + " " + theme().name, 70, 48, 12.5, "#9aa7c4", "left");
}

/* ================= Emotes ================= */
export const EMOTES = ["👋", "😂", "❤️", "👍", "😮", "🎉"];
const emoteMap = new Map(); // id -> {e, t0}
export function showEmote(id, e) {
  emoteMap.set(id, { e, t0: performance.now() });
}
function sendMyEmote(e) {
  showEmote(activeId(), e);
  sendEmote(e);
  questEvent("emote");
}

/* ================= Raumwechsel ================= */
let switching = false;
export async function switchRoom(room) {
  if (switching || !ROOMS[room] || room === joinedRoom) return;
  switching = true;
  hideMenu(); cancelSelection();
  try {
    S.room = room;
    charPath = []; action = null; pendingAction = null;
    await joinRoom(room);
    const world = await loadWorld(room);
    W.setFurniture(world);
    const c = Math.floor(W.currentGrid() / 2);
    const free = W.findFreeTile(c, c);
    S.char.x = free.x + 0.5; S.char.y = free.y + 0.5;
    trackPresence();
    setRoomUI(room);
    if (!S.stats.rooms) S.stats.rooms = {};
    if (!S.stats.rooms[room]) { S.stats.rooms[room] = true; checkAll(); }
    questEvent("room", room);
    toast(ROOMS[room].emoji + " Willkommen in: " + ROOMS[room].name);
    saveNow();
  } catch (e) {
    toast("Raumwechsel fehlgeschlagen – keine Verbindung?", "warn");
  } finally {
    switching = false;
  }
}
function openRoomMenu(x, y) {
  const entries = Object.keys(ROOMS)
    .filter(id => id !== S.room)
    .map(id => ({ label: ROOMS[id].emoji + " " + ROOMS[id].name, cb: () => { hideMenu(); switchRoom(id); } }));
  showMenu(x, y, entries);
}
/* Tür an der linken Wand */
function doorHit(sx, sy) {
  const [dA, dB] = doorRange(grid());
  const p1 = isoPt(0, dA, 0), p2 = isoPt(0, dB, 0);
  const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
  const maxY = Math.max(p1.y, p2.y), minY = Math.min(p1.y, p2.y) - 78;
  return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
}

/* ================= Aktionen ================= */
function walkTo(tx, ty) {
  const cc = W.charCell();
  pendingAction = null; action = null;
  if (cc.x === tx && cc.y === ty) { charPath = []; return true; }
  const r = W.bfs(cc);
  if (r.dist[ty][tx] === Infinity) { toast("Da komme ich nicht hin!"); return false; }
  charPath = W.reconstruct(r.parent, cc, { x: tx, y: ty });
  trackStat("moves");
  return true;
}
function useFurniture(f) {
  const def = CAT[f.type].act;
  if (!def) return;
  const cc = W.charCell(), tiles = W.approachTiles(f);
  if (!tiles.length) { toast("Kein Platz vor dem Möbelstück frei!", "warn"); return; }
  if (tiles.some(p => p.x === cc.x && p.y === cc.y)) { charPath = []; startAction(f.id); return; }
  const r = W.bfs(cc); let best = null;
  tiles.forEach(p => { const d = r.dist[p.y][p.x]; if (d !== Infinity && (best === null || d < best.d)) best = { p, d }; });
  if (!best) { toast("Da komme ich nicht hin!"); return; }
  charPath = W.reconstruct(r.parent, cc, best.p);
  action = null; pendingAction = { fid: f.id };
}
function startAction(fid) {
  const f = W.findFurniture(fid);
  if (!f) return;
  const def = CAT[f.type].act;
  if (def.work && S.needs.energie < 15) { toast("Zu müde zum Arbeiten – erst schlafen! 😴", "warn"); return; }
  action = { fid, def, t: 0, dur: def.dur };
  charPath = []; pendingAction = null;
}
function completeAction() {
  const def = action.def, P = charPx(); let dy = 0;
  Object.keys(def.needs || {}).forEach(k => {
    S.needs[k] = clamp(S.needs[k] + def.needs[k], 0, 100);
    if (def.needs[k] > 0) { fl(P.x, P.y - 92 - dy, "+" + def.needs[k] + " " + NEED_META[k].icon, "#8fc7a3"); dy += 15; }
  });
  if (def.work) {
    const pay = 40 + 15 * S.level; S.money += pay;
    fl(P.x, P.y - 92 - dy, "+" + pay + " 💰", "#e7cb96"); dy += 15;
    trackStat("works");
    questEvent("work");
  }
  questEvent("action");
  action = null;
  gainXp(def.xp, dy);
  uiNeeds(); saveNow();
}

/* Wird aus main.js gerufen, wenn ein Möbel remote gelöscht wurde */
export function onFurnitureRemoved(id) {
  if (action && action.fid === id) { action = null; toast("Das Möbelstück ist gerade verschwunden!", "warn"); }
  if (pendingAction && pendingAction.fid === id) pendingAction = null;
}

/* ================= Kaufen / Verkaufen / Verschieben ================= */
function pickFromShop(key) {
  cancelSelection();
  selection = { type: key, moveRef: null };
  setShopSel(key);
}
async function placeSelection(x, y) {
  if (placing) return;
  const sel = selection, c = CAT[sel.type];
  if (!sel.moveRef && S.money < c.price) { toast("Zu wenig Taler!", "warn"); return; }
  placing = true;
  try {
    const row = await dbPlaceFurniture(sel.type, x, y);
    W.addFurniture(row);
    if (sel.moveRef) {
      dbRemoveFurniture(sel.moveRef.id).catch(() => {});
    } else {
      S.money -= c.price;
      const p = isoPt(x + c.w / 2, y + c.d / 2, 40);
      fl(p.x, p.y, "−" + c.price + " 💰", "#e7cb96");
      trackStat("placed");
      questEvent("place");
      gainXp(5, 0);
    }
    toast(c.emoji + " " + c.name + " platziert!");
    selection = null; setShopSel(null);
    uiTop(); saveNow();
  } catch (e) {
    toast("Platzieren fehlgeschlagen – keine Verbindung?", "warn");
    if (sel.moveRef) W.addFurniture(sel.moveRef);
    selection = null; setShopSel(null);
  } finally {
    placing = false;
  }
}
function cancelSelection() {
  if (selection && selection.moveRef) W.addFurniture(selection.moveRef);
  selection = null; setShopSel(null);
}
async function sellFurniture(f) {
  const c = CAT[f.type];
  try {
    await dbRemoveFurniture(f.id);
    W.removeFurnitureById(f.id);
    S.money += Math.round(c.price / 2);
    toast(c.emoji + " " + c.name + " verkauft (+" + Math.round(c.price / 2) + " Taler)");
    uiTop(); saveNow();
  } catch (e) {
    toast("Verkaufen fehlgeschlagen – keine Verbindung?", "warn");
  }
}
/* Admin-Löschung: kein Taler-Refund, betrifft fremdes/Hub-Möbel */
async function adminDeleteFurniture(f) {
  const c = CAT[f.type];
  try {
    await dbRemoveFurniture(f.id);
    W.removeFurnitureById(f.id);
    if (action && action.fid === f.id) action = null;
    toast("🗑️ " + c.emoji + " " + c.name + " gelöscht (Admin)");
  } catch (e) {
    toast("Löschen fehlgeschlagen – keine Verbindung?", "warn");
  }
}

/* ================= Menü-Popup ================= */
function effectsStr(def) {
  const parts = Object.keys(def.needs || {}).map(k => {
    const v = def.needs[k]; return (v > 0 ? "+" : "−") + Math.abs(v) + " " + NEED_META[k].icon;
  });
  if (def.work) parts.unshift("+" + (40 + 15 * S.level) + " 💰");
  parts.push("+" + def.xp + " XP");
  return parts.join("  ");
}
function openLiveMenu(f, x, y) {
  const c = CAT[f.type];
  if (!c.act) { toast(c.emoji + " " + c.name + " – sieht hübsch aus!"); return; }
  showMenu(x, y, [{ label: c.emoji + " " + c.act.label, sub: effectsStr(c.act), cb: () => { hideMenu(); useFurniture(f); } }]);
}
function openBuyMenu(f, x, y) {
  const c = CAT[f.type];
  const owned = f.placed_by === activeId();
  if (!owned && !isAdmin()) {
    const who = f.placed_by ? (f.placed_by_name || "einem anderen Spieler") : "Hub";
    showMenu(x, y, [{ label: "🔒 " + c.emoji + " " + c.name, sub: "Gehört: " + who + " – nur eigene Möbel änderbar", cb: () => hideMenu() }]);
    return;
  }
  const moveLabel = owned ? "↔️ Verschieben" : "↔️ Verschieben (Admin)";
  const entries = [
    { label: moveLabel, cb: () => {
      hideMenu();
      W.removeFurnitureById(f.id);
      if (action && action.fid === f.id) action = null;
      selection = { type: f.type, moveRef: f };
      setShopSel(null);
    } },
  ];
  if (owned) {
    const refund = Math.round(c.price / 2);
    entries.push({ label: "💰 Verkaufen (+" + refund + " Taler)", danger: true, cb: btn => {
      if (btn.dataset.c) { hideMenu(); sellFurniture(f); }
      else { btn.dataset.c = "1"; btn.innerHTML = "❗ Wirklich verkaufen?"; }
    } });
  } else {
    entries.push({ label: "🗑️ Löschen (Admin)", danger: true, cb: btn => {
      if (btn.dataset.c) { hideMenu(); adminDeleteFurniture(f); }
      else { btn.dataset.c = "1"; btn.innerHTML = "❗ Wirklich löschen?"; }
    } });
  }
  showMenu(x, y, entries);
}

/* ================= Eingabe ================= */
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height,
    cx: e.clientX - r.left, cy: e.clientY - r.top };
}
function screenToCell(sx, sy) {
  const dx = sx - OX, dy = sy - OY;
  const gx = (dx / TW2 + dy / TH2) / 2, gy = (dy / TH2 - dx / TW2) / 2;
  return { x: Math.floor(gx), y: Math.floor(gy) };
}

export function setMode(m) {
  mode = m; hideMenu(); cancelSelection();
  setModeUI(m);
  if (m === "buy") buildShop(pickFromShop);
}

export function initInput() {
  cv.addEventListener("pointermove", e => {
    const p = canvasPos(e), c = screenToCell(p.x, p.y), G = grid();
    hoverTile = (c.x >= 0 && c.y >= 0 && c.x < G && c.y < G) ? { x: c.x, y: c.y } : null;
    if (hoverTile && selection) {
      const cc = CAT[selection.type];
      hoverTile = { x: clamp(c.x, 0, G - cc.w), y: clamp(c.y, 0, G - cc.d) };
    }
  });
  cv.addEventListener("pointerleave", () => hoverTile = null);
  cv.addEventListener("pointerdown", e => {
    if (e.button === 2) return;
    hideMenu();
    const p = canvasPos(e), cell = screenToCell(p.x, p.y);
    if (mode === "live" && !selection && doorHit(p.x, p.y)) { openRoomMenu(p.cx, p.cy); return; }
    if (mode === "buy") {
      if (selection) {
        if (!hoverTile) return;
        if (W.canPlace(selection.type, hoverTile.x, hoverTile.y)) placeSelection(hoverTile.x, hoverTile.y);
        else toast("Hier ist kein Platz!", "warn");
        return;
      }
      const f = W.furnitureAt(p.x, p.y);
      if (f) openBuyMenu(f, p.cx, p.cy);
      return;
    }
    const f = W.furnitureAt(p.x, p.y);
    if (f) { openLiveMenu(f, p.cx, p.cy); return; }
    const G = grid();
    if (cell.x >= 0 && cell.y >= 0 && cell.x < G && cell.y < G && !W.cellBlocked(cell.x, cell.y)) walkTo(cell.x, cell.y);
  });
  cv.addEventListener("contextmenu", e => { e.preventDefault(); cancelSelection(); hideMenu(); });
  document.addEventListener("pointerdown", e => { if (!menuEl.contains(e.target) && e.target !== cv) hideMenu(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { cancelSelection(); hideMenu(); closeOverlaysOnEsc(); }
    const typing = chatHasFocus() || document.activeElement.tagName === "INPUT";
    if ((e.key === "b" || e.key === "B") && !typing) setMode(mode === "live" ? "buy" : "live");
    if (!typing && e.key >= "1" && e.key <= "6") sendMyEmote(EMOTES[Number(e.key) - 1]);
  });
  document.getElementById("modeBtn").onclick = () => setMode(mode === "live" ? "buy" : "live");
  document.getElementById("roomBtn").onclick = () => openRoomMenu(14, 14);
  // Emote-Leiste
  const bar = document.getElementById("emoteBar");
  EMOTES.forEach(e => {
    const b = document.createElement("button");
    b.textContent = e; b.title = "Emote senden";
    b.onclick = () => sendMyEmote(e);
    bar.appendChild(b);
  });
}

/* ================= Update ================= */
export function update(dt) {
  NEED_KEYS.forEach(k => { S.needs[k] = clamp(S.needs[k] - NEED_META[k].decay * dt * (action ? 0.5 : 1), 0, 100); });
  const low = NEED_KEYS.filter(k => S.needs[k] <= 18);
  if (low.length && performance.now() - lastWarn > 20000) {
    lastWarn = performance.now();
    toast("⚠️ Niedrig: " + low.map(k => NEED_META[k].icon + " " + NEED_META[k].label).join(", "), "warn");
  }
  if (charPath.length) {
    walkPhase += dt;
    const tgt = charPath[0], tx = tgt.x + 0.5, ty = tgt.y + 0.5;
    const dx = tx - S.char.x, dy = ty - S.char.y, dist = Math.hypot(dx, dy), sp = 3.1 * dt;
    if (dist <= sp) {
      S.char.x = tx; S.char.y = ty; charPath.shift();
      if (!charPath.length && pendingAction) { const pa = pendingAction; pendingAction = null; startAction(pa.fid); }
    } else { S.char.x += dx / dist * sp; S.char.y += dy / dist * sp; }
    broadcastMove(false);
    wasMoving = true;
  } else if (wasMoving) {
    wasMoving = false;
    broadcastMove(true);
    trackPresence();
  }
  // Andere Spieler weich interpolieren
  remote.forEach(p => {
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    if (dist > 0.01) {
      const sp = 3.4 * dt;
      if (dist <= sp) { p.x = p.tx; p.y = p.ty; }
      else { p.x += dx / dist * sp; p.y += dy / dist * sp; }
    }
  });
  if (action) {
    if (!W.findFurniture(action.fid)) { action = null; }
    else { action.t += dt; if (action.t >= action.dur) completeAction(); }
  }
  updatePet(dt); tickPetUi(dt);
  autosaveT += dt; if (autosaveT > 8) { autosaveT = 0; saveNow(); }
  needsUiT += dt; if (needsUiT > 0.25) { needsUiT = 0; uiNeeds(); }
}

let last = performance.now() / 1000;
export function startLoop() {
  function frame(now) {
    const t = now / 1000; const dt = clamp(t - last, 0, 0.1); last = t;
    update(dt); render(t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
