/* XP, Level (max. 5), Stimmung */
import { MAX_LEVEL, xpNeed } from "./catalog.js";
import { S, avgNeeds, saveNow } from "./state.js";
import { fl, isoPt } from "./draw.js";
import { toast, uiTop, refreshShop } from "./ui.js";
import { trackPresence } from "./net.js";
import { checkAll } from "./achievements.js";

export function moodMult() {
  const a = avgNeeds();
  let m = a >= 70 ? 1.3 : a >= 40 ? 1 : 0.6;
  if (S.pet && S.pet.food >= 60 && S.pet.fun >= 60) m *= 1.1; // glückliches Haustier
  return m;
}

export function charPx() { return isoPt(S.char.x, S.char.y, 0); }

export function gainXp(base, dy) {
  const v = Math.max(1, Math.round(base * moodMult()));
  const P = charPx();
  fl(P.x, P.y - 92 - (dy || 0), "+" + v + " XP", "#8fd0ff");
  if (S.level >= MAX_LEVEL) {
    S.xp = Math.min(S.xp + v, xpNeed(MAX_LEVEL));
    uiTop(); return;
  }
  S.xp += v;
  let leveled = false;
  while (S.level < MAX_LEVEL && S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level); S.level++;
    const bonus = 100 + 50 * S.level; S.money += bonus;
    toast("🎉 Level " + S.level + " erreicht! Bonus: " + bonus + " Taler – neue Möbel im Shop!");
    leveled = true;
  }
  if (S.level >= MAX_LEVEL) S.xp = Math.min(S.xp, xpNeed(MAX_LEVEL));
  if (leveled) { refreshShop(); trackPresence(); checkAll(); saveNow(); }
  uiTop();
}
