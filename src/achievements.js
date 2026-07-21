/* Erfolge – lokal gespeichert, mit Toast bei Freischaltung */
import { MAX_LEVEL } from "./catalog.js";
import { S, saveNow } from "./state.js";
import { toast } from "./ui.js";

export const ACH = [
  { id: "hallo_welt", icon: "💬", name: "Hallo Welt!", desc: "Erste Chat-Nachricht gesendet", cond: s => s.stats.msgs >= 1 },
  { id: "plausch", icon: "🗣️", name: "Plaudertasche", desc: "10 Chat-Nachrichten gesendet", cond: s => s.stats.msgs >= 10 },
  { id: "erste_schritte", icon: "👣", name: "Erste Schritte", desc: "Zum ersten Mal losgelaufen", cond: s => s.stats.moves >= 1 },
  { id: "moebelpacker", icon: "📦", name: "Möbelpacker", desc: "3 Möbel im Hub platziert", cond: s => s.stats.placed >= 3 },
  { id: "fleissig", icon: "💼", name: "Fleißig", desc: "5-mal am Schreibtisch gearbeitet", cond: s => s.stats.works >= 5 },
  { id: "level5", icon: "🚀", name: "Max-Level", desc: "Level " + MAX_LEVEL + " erreicht", cond: s => s.level >= MAX_LEVEL },
  { id: "tierfreund", icon: "🐾", name: "Tierfreund", desc: "Ein Haustier adoptiert", cond: s => !!s.pet },
  { id: "gute_seele", icon: "🍖", name: "Gute Seele", desc: "Haustier 5-mal gefüttert", cond: s => s.stats.feeds >= 5 },
  { id: "gesellig", icon: "👥", name: "Gesellig", desc: "Mit 2 anderen Spielern gleichzeitig online", cond: s => (s.stats.maxOnline || 0) >= 2 },
  { id: "weltenbummler", icon: "🗺️", name: "Weltenbummler", desc: "Alle 3 Räume besucht", cond: s => s.stats.rooms && Object.keys(s.stats.rooms).length >= 3 },
  { id: "questmeister", icon: "🎯", name: "Questmeister", desc: "Erste Tagesquest abgeschlossen", cond: s => (s.stats.questsDone || 0) >= 1 },
  { id: "questlegende", icon: "🏅", name: "Quest-Legende", desc: "10 Tagesquests abgeschlossen", cond: s => (s.stats.questsDone || 0) >= 10 },
];

export function trackStat(key, inc) {
  S.stats[key] = (S.stats[key] || 0) + (inc == null ? 1 : inc);
  checkAll();
}
export function trackStatMax(key, value) {
  if (value > (S.stats[key] || 0)) { S.stats[key] = value; checkAll(); }
}

export function checkAll() {
  let changed = false;
  ACH.forEach(a => {
    if (!S.ach[a.id] && a.cond(S)) {
      S.ach[a.id] = Date.now();
      toast("🏆 Erfolg freigeschaltet: " + a.icon + " " + a.name, "gold");
      changed = true;
    }
  });
  if (changed) { saveNow(); renderAchList(); }
}

export function renderAchList() {
  const el = document.getElementById("achList");
  if (!el) return;
  el.innerHTML = "";
  ACH.forEach(a => {
    const done = !!S.ach[a.id];
    const div = document.createElement("div");
    div.className = "achItem " + (done ? "done" : "locked");
    div.innerHTML = '<div class="ic">' + a.icon + '</div><div><div class="nm">' + a.name +
      '</div><div class="ds">' + a.desc + "</div></div>";
    el.appendChild(div);
  });
}
