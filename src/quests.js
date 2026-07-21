/* Tagesquests: jeden Tag drei Aufgaben, Belohnung automatisch */
import { S, saveNow } from "./state.js";
import { toast, uiTop } from "./ui.js";
import { gainXp } from "./progress.js";
import { trackStat } from "./achievements.js";

export const QUEST_POOL = [
  { id: "arbeit3", icon: "💼", name: "Schichtarbeit", desc: "Arbeite 3× am Schreibtisch", type: "work", target: 3, money: 120, xp: 30 },
  { id: "chat5", icon: "💬", name: "Plappermaul", desc: "Sende 5 Chat-Nachrichten", type: "msg", target: 5, money: 60, xp: 20 },
  { id: "futter2", icon: "🍖", name: "Leckerli-Zeit", desc: "Füttere dein Haustier 2×", type: "feed", target: 2, money: 80, xp: 20 },
  { id: "spiel2", icon: "🎾", name: "Spielstunde", desc: "Spiele 2× mit deinem Haustier", type: "play", target: 2, money: 60, xp: 15 },
  { id: "aktion6", icon: "⚡", name: "Aktiv unterwegs", desc: "Führe 6 Möbel-Aktionen aus", type: "action", target: 6, money: 100, xp: 25 },
  { id: "raum3", icon: "🚪", name: "Weltenbummler", desc: "Besuche heute alle 3 Räume", type: "room", target: 3, money: 100, xp: 30 },
  { id: "bau1", icon: "📦", name: "Innenarchitekt", desc: "Platziere 1 Möbelstück im Hub", type: "place", target: 1, money: 80, xp: 20 },
  { id: "emote5", icon: "🎉", name: "Stimmungskanone", desc: "Sende 5 Emotes", type: "emote", target: 5, money: 50, xp: 15 },
];

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* Stellt sicher, dass S.quests zum heutigen Tag gehört */
export function initQuests() {
  const today = todayKey();
  if (!S.quests || S.quests.date !== today) {
    S.quests = { date: today, prog: {}, done: {}, rooms: {} };
    saveNow();
  }
}

export function activeQuests() {
  initQuests();
  const start = hash(S.quests.date) % QUEST_POOL.length;
  const picks = [];
  for (let i = 0; i < 3; i++) picks.push(QUEST_POOL[(start + i * 7) % QUEST_POOL.length]);
  return picks;
}

export function questEvent(type, key) {
  initQuests();
  let changed = false;
  activeQuests().forEach(q => {
    if (q.type !== type || S.quests.done[q.id]) return;
    if (type === "room") {
      if (!key || S.quests.rooms[key]) return;
      S.quests.rooms[key] = true;
      S.quests.prog[q.id] = Object.keys(S.quests.rooms).length;
    } else {
      S.quests.prog[q.id] = (S.quests.prog[q.id] || 0) + 1;
    }
    changed = true;
    if (S.quests.prog[q.id] >= q.target) {
      S.quests.done[q.id] = true;
      S.money += q.money;
      toast("🎯 Quest geschafft: " + q.name + " (+" + q.money + " 💰)", "gold");
      gainXp(q.xp, 0);
      trackStat("questsDone");
      uiTop();
    }
  });
  if (changed) { saveNow(); renderQuestList(); }
}

export function renderQuestList() {
  const el = document.getElementById("questList");
  if (!el) return;
  el.innerHTML = "";
  activeQuests().forEach(q => {
    const prog = Math.min(S.quests.prog[q.id] || 0, q.target);
    const done = !!S.quests.done[q.id];
    const div = document.createElement("div");
    div.className = "questItem" + (done ? " done" : "");
    div.innerHTML =
      '<div class="top"><span class="ic">' + q.icon + '</span><span class="nm">' + q.name +
      '</span><span class="rw">+' + q.money + " 💰 · +" + q.xp + " XP</span></div>" +
      '<div class="ds">' + q.desc + "</div>" +
      '<div class="track"><div class="fill" style="width:' + (prog / q.target * 100) + '%"></div></div>' +
      '<div class="pr">' + (done ? "✅ Abgeschlossen" : prog + " / " + q.target) + "</div>";
    el.appendChild(div);
  });
}
