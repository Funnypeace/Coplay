/* Lokaler Spielstand + Spieler-Identität + Account */
import { SHIRTS, NEED_KEYS, ROOMS } from "./catalog.js";

export const SAVE_KEY = "coplay_save_v1";
const PID_KEY = "coplay_pid";

export function defaultState() {
  return {
    name: "", shirt: SHIRTS[0], money: 500, level: 1, xp: 0,
    needs: { hunger: 80, energie: 90, hygiene: 75, spass: 70 },
    char: { x: 7.5, y: 9.5 },
    pet: null, // {type, name, food, fun}
    room: "lounge",
    stats: { msgs: 0, works: 0, placed: 0, feeds: 0, moves: 0, questsDone: 0, rooms: {} },
    ach: {},
    quests: null, // {date, prog, done, rooms}
    seenIntro: false,
  };
}

export let S = defaultState();

/* Eingeloggter Account (null-Felder = Gast) */
export const account = { id: null, username: null, token: null, isAdmin: false };
export function activeId() { return account.id || playerId; }
export function isAdmin() { return !!account.isAdmin; }

export function saveNow() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
function mergeState(d) {
  S = Object.assign(defaultState(), d);
  S.needs = Object.assign(defaultState().needs, d.needs || {});
  S.stats = Object.assign(defaultState().stats, d.stats || {});
  S.ach = d.ach || {};
  if (!ROOMS[S.room]) S.room = "lounge";
  NEED_KEYS.forEach(k => { if (typeof S.needs[k] !== "number") S.needs[k] = 70; });
}
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.needs) mergeState(d);
  } catch (e) {}
}
/* Cloud-Spielstand übernehmen */
export function applyCloudSave(cloud) {
  if (cloud && cloud.needs) { mergeState(cloud); saveNow(); }
}
export function exportSave() {
  return JSON.parse(JSON.stringify(S));
}

/* Stabile anonyme Spieler-ID pro Browser */
export const playerId = (() => {
  try {
    let id = localStorage.getItem(PID_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
          }));
      localStorage.setItem(PID_KEY, id);
    }
    return id;
  } catch (e) { return "anon-" + Math.random().toString(36).slice(2); }
})();

export function avgNeeds() {
  return (S.needs.hunger + S.needs.energie + S.needs.hygiene + S.needs.spass) / 4;
}
