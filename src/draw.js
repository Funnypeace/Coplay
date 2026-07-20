/* Canvas- und Iso-Helfer */
import { TW2, TH2, OX, OY } from "./catalog.js";

export const cv = document.getElementById("cv");
export const ctx = cv.getContext("2d");

export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function isoPt(gx, gy, z) { z = z || 0; return { x: OX + (gx - gy) * TW2, y: OY + (gx + gy) * TH2 - z }; }
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 1) { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  else { r *= f; g *= f; b *= f; }
  return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
}
export function poly(pts, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
}
export function line(p1, p2, color, w) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = color; ctx.lineWidth = w || 1; ctx.stroke(); }
export function circ(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); }
export function ell(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); }
export function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
export function rrect(x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
export function txt(s, x, y, size, color, align, bold) {
  ctx.font = (bold ? "700 " : "600 ") + size + "px 'Segoe UI', sans-serif";
  ctx.textAlign = align || "center"; ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
/* Isometrischer Quader: Grundfläche w×d Kacheln, Höhe h px, angehoben um z px */
export function boxIso(gx, gy, w, d, h, z, base) {
  const A = isoPt(gx, gy, z + h), B = isoPt(gx + w, gy, z + h), C = isoPt(gx + w, gy + d, z + h), D = isoPt(gx, gy + d, z + h);
  const Bg = isoPt(gx + w, gy, z), Cg = isoPt(gx + w, gy + d, z), Dg = isoPt(gx, gy + d, z);
  poly([[D.x, D.y], [C.x, C.y], [Cg.x, Cg.y], [Dg.x, Dg.y]], shade(base, 0.78));
  poly([[C.x, C.y], [B.x, B.y], [Bg.x, Bg.y], [Cg.x, Cg.y]], shade(base, 0.6));
  poly([[A.x, A.y], [B.x, B.y], [C.x, C.y], [D.x, D.y]], shade(base, 1.08));
}
export function southPt(gx, gy, w, d, u, z) { return isoPt(gx + u * w, gy + d, z); }
export function eastPt(gx, gy, w, d, u, z) { return isoPt(gx + w, gy + u * d, z); }

/* Floater (aufsteigende Texte) */
const floaters = [];
export function fl(x, y, text, color, size) { floaters.push({ x, y, text, color, size, t: 0, life: 1.7 }); }
export function drawFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt; f.y -= dt * 26;
    if (f.t > f.life) { floaters.splice(i, 1); continue; }
    ctx.globalAlpha = clamp(1.6 - f.t / f.life * 1.6, 0, 1);
    txt(f.text, f.x, f.y, f.size || 13, f.color, "center", true);
    ctx.globalAlpha = 1;
  }
}
