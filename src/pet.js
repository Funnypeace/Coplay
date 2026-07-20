/* Tamagotchi-Haustier: folgt dem Spieler, will Futter und Spiel */
import { S, saveNow } from "./state.js";
import { clamp, isoPt, ell, txt, fl } from "./draw.js";
import { toast, uiTop } from "./ui.js";
import { gainXp } from "./progress.js";
import { trackPresence } from "./net.js";
import { trackStat, checkAll } from "./achievements.js";

export const PETS = {
  katze: { emoji: "🐱", name: "Katze" },
  hund: { emoji: "🐶", name: "Hund" },
  hase: { emoji: "🐰", name: "Hase" },
};
const FEED_COST = 15;

/* Laufzeit-Position des eigenen Haustiers (folgt dem Charakter) */
const petPos = { x: 0, y: 0, init: false };
let lastPetWarn = 0;

export function adoptPet(type) {
  if (S.pet) return;
  S.pet = { type, name: PETS[type].name, food: 80, fun: 80 };
  toast(PETS[type].emoji + " " + PETS[type].name + " adoptiert! Kümmere dich gut um sie.");
  petPos.init = false;
  renderPetCard(); checkAll(); trackPresence(); saveNow(); uiTop();
}
function feedPet() {
  const p = S.pet; if (!p) return;
  if (p.food >= 85) { toast(PETS[p.type].emoji + " ist satt!"); return; }
  if (S.money < FEED_COST) { toast("Zu wenig Taler! (" + FEED_COST + " nötig)", "warn"); return; }
  S.money -= FEED_COST;
  p.food = clamp(p.food + 45, 0, 100);
  const pp = petPixel();
  if (pp) fl(pp.x, pp.y - 40, "🍖 mampf!", "#f4c95d");
  trackStat("feeds"); renderPetCard(); saveNow(); uiTop();
}
function playPet() {
  const p = S.pet; if (!p) return;
  if (p.fun >= 85) { toast(PETS[p.type].emoji + " hat gerade genug gespielt!"); return; }
  p.fun = clamp(p.fun + 40, 0, 100);
  const pp = petPixel();
  if (pp) fl(pp.x, pp.y - 40, "🎾 juhu!", "#9fe8c5");
  gainXp(4, 0); renderPetCard(); saveNow();
}

export function updatePet(dt) {
  const p = S.pet; if (!p) return;
  p.food = clamp(p.food - 0.055 * dt, 0, 100);
  p.fun = clamp(p.fun - 0.075 * dt, 0, 100);
  if ((p.food < 20 || p.fun < 20) && performance.now() - lastPetWarn > 60000) {
    lastPetWarn = performance.now();
    toast(PETS[p.type].emoji + " " + p.name + " braucht dich! " + (p.food < 20 ? "🍖 Hunger!" : "🎾 Langeweile!"), "warn");
  }
  // dem Charakter hinterherlaufen
  const tx = S.char.x + 0.8, ty = S.char.y + 0.35;
  if (!petPos.init) { petPos.x = tx; petPos.y = ty; petPos.init = true; }
  const dx = tx - petPos.x, dy = ty - petPos.y, dist = Math.hypot(dx, dy);
  if (dist > 0.6) {
    const sp = 2.6 * dt;
    if (dist <= sp) { petPos.x = tx; petPos.y = ty; }
    else { petPos.x += dx / dist * sp; petPos.y += dy / dist * sp; }
  }
}

function petPixel() {
  if (!S.pet || !petPos.init) return null;
  return isoPt(clamp(petPos.x, 0.2, 13.8), clamp(petPos.y, 0.2, 13.8), 0);
}

export function petDepth() { return petPos.init ? petPos.x + petPos.y : -1; }

export function drawLocalPet(t) {
  const p = S.pet; if (!p) return;
  const P = petPixel(); if (!P) return;
  drawPetSprite(P, p.type, t, Math.min(p.food, p.fun));
}
export function drawRemotePet(px, py, type, t) {
  const P = isoPt(clamp(px + 0.8, 0.2, 13.8), clamp(py + 0.35, 0.2, 13.8), 0);
  drawPetSprite(P, type, t, 100);
}
function drawPetSprite(P, type, t, low) {
  const bounce = Math.abs(Math.sin(t * 3)) * 3;
  ell(P.x, P.y - 1, 8, 4, "rgba(0,0,0,.25)");
  txt(PETS[type] ? PETS[type].emoji : "🐾", P.x, P.y - 6 - bounce, 17, "#fff");
  if (low < 20) txt("❗", P.x + 9, P.y - 24 - bounce, 11, "#ffd9a0");
}

export function renderPetCard() {
  const el = document.getElementById("petBody");
  if (!el) return;
  el.innerHTML = "";
  if (!S.pet) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Adoptiere ein Haustier – es folgt dir durch den Hub und will gefüttert und bespaßt werden (Tamagotchi-Style!).";
    el.appendChild(hint);
    const row = document.createElement("div");
    row.className = "adopt";
    Object.keys(PETS).forEach(k => {
      const b = document.createElement("button");
      b.className = "btn"; b.textContent = PETS[k].emoji; b.title = PETS[k].name;
      b.onclick = () => adoptPet(k);
      row.appendChild(b);
    });
    el.appendChild(row);
    return;
  }
  const p = S.pet;
  const moodVal = Math.min(p.food, p.fun);
  const mood = moodVal >= 60 ? "😊 Glücklich (+10 % XP)" : moodVal >= 30 ? "😐 Geht so" : "😟 Braucht Zuwendung!";
  const row = document.createElement("div");
  row.className = "petRow";
  row.innerHTML = '<div class="petFace">' + PETS[p.type].emoji + '</div><div><div class="petName">' +
    p.name + '</div><div class="petMood">' + mood + "</div></div>";
  el.appendChild(row);
  [["🍖 Futter", p.food], ["🎾 Laune", p.fun]].forEach(([lab, v]) => {
    const d = document.createElement("div");
    d.className = "need";
    d.innerHTML = '<div class="lab"><span>' + lab + "</span><span>" + Math.round(v) + '</span></div>' +
      '<div class="track"><div class="fill" style="width:' + v + "%;background:" +
      (v >= 60 ? "linear-gradient(90deg,#4cc9a8,#58e08a)" : v >= 30 ? "linear-gradient(90deg,#e8a13f,#f4c95d)" : "linear-gradient(90deg,#c94c4c,#e36767)") +
      '"></div></div>';
    el.appendChild(d);
  });
  const btns = document.createElement("div");
  btns.className = "petBtns";
  const bF = document.createElement("button");
  bF.className = "btn"; bF.textContent = "🍖 Füttern (" + FEED_COST + ")"; bF.onclick = feedPet;
  const bP = document.createElement("button");
  bP.className = "btn"; bP.textContent = "🎾 Spielen"; bP.onclick = playPet;
  btns.appendChild(bF); btns.appendChild(bP);
  el.appendChild(btns);
}

let petUiT = 0;
export function tickPetUi(dt) {
  petUiT += dt;
  if (petUiT > 2) { petUiT = 0; if (S.pet) renderPetCard(); }
}
