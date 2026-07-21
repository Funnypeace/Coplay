/* Bootstrap: Spielstand + Account laden, UI aufbauen, Netzwerk verbinden, Loop starten */
import { S, account, loadSave, saveNow, SAVE_KEY } from "./state.js";
import * as W from "./world.js";
import {
  initNet, joinRoom, joinedRoom, loadWorld, loadChat, trackPresence, remote, connected,
} from "./net.js";
import {
  toast, uiTop, buildNeedsUI, uiNeeds, initOverlays, openStartOverlay, closeStartOverlay,
  openAchOverlay, openQuestOverlay, setOnline, setRoomUI, setAuthError, setStartBusy,
} from "./ui.js";
import { initChat, addChatMessage, addSysMessage } from "./chat.js";
import { renderAchList, checkAll, trackStatMax } from "./achievements.js";
import { renderPetCard } from "./pet.js";
import { authLogin, tryTokenLogin, startCloudSync, pushCloudSave, logout } from "./auth.js";
import { initQuests, questEvent, renderQuestList } from "./quests.js";
import { setMode, initInput, startLoop, onFurnitureRemoved, switchRoom, showEmote } from "./game.js";

/* Fallback-Einrichtung, falls die Cloud nicht erreichbar ist */
const OFFLINE_FURNITURE = [
  { type: "schreibtisch", x: 1, y: 0 }, { type: "schreibtisch", x: 4, y: 0 },
  { type: "kuehlschrank", x: 12, y: 0 }, { type: "tv", x: 5, y: 5 },
  { type: "teppich", x: 5, y: 6 }, { type: "sofa", x: 5, y: 8 },
  { type: "bett", x: 0, y: 10 }, { type: "dusche", x: 13, y: 12 },
].map((f, i) => ({ ...f, id: "offline-" + i, placed_by: null, placed_by_name: "Hub" }));

function refreshAllUi() {
  uiTop(); uiNeeds(); renderPetCard(); renderAchList(); renderQuestList(); setRoomUI(S.room);
}

async function boot() {
  loadSave();
  // Auto-Login mit gespeichertem Token (lädt ggf. Cloud-Spielstand inkl. Raum)
  await tryTokenLogin();
  initQuests();
  buildNeedsUI();
  refreshAllUi();
  initChat();
  initInput();
  setMode("live");

  initOverlays({
    onLogin: async (name, pw) => {
      setStartBusy(true);
      const res = await authLogin(name, pw);
      setStartBusy(false);
      if (!res.ok) { setAuthError(res.error); return; }
      closeStartOverlay();
      initQuests();
      refreshAllUi();
      toast(res.isNew
        ? "🎉 Account angelegt – willkommen, " + account.username + "!"
        : "Willkommen zurück, " + account.username + "!");
      // Kanal neu beitreten, damit Presence unter der Account-ID läuft (und ggf. Cloud-Raum)
      if (joinedRoom && S.room !== joinedRoom) {
        await switchRoom(S.room);
      } else if (joinedRoom) {
        await joinRoom(joinedRoom);
        trackPresence();
      }
    },
    onGuest: () => {
      trackPresence();
      toast("Willkommen im Hub, " + S.name + "! (Gast-Modus)");
    },
    onProfileSave: () => {
      trackPresence();
      pushCloudSave(true);
      toast("Profil gespeichert!");
    },
    onLogout: () => { logout(); },
    onReset: () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    },
  });
  document.getElementById("achBtn").onclick = () => { renderAchList(); openAchOverlay(); };
  document.getElementById("questBtn").onclick = () => { renderQuestList(); openQuestOverlay(); };
  if (!S.seenIntro && !account.id) openStartOverlay("login");

  startLoop();

  // Netzwerk: erst Kanal abonnieren, dann Welt + Chatverlauf laden
  let online = false;
  let worldLoaded = false;
  async function loadCloudData() {
    if (worldLoaded) return;
    const [world, chat] = await Promise.all([loadWorld(S.room), loadChat()]);
    worldLoaded = true;
    // Offline-Platzhalter ersetzen, sobald die echte Welt da ist
    W.setFurniture([]);
    world.forEach(f => W.addFurniture(f));
    chat.forEach(m => addChatMessage(m));
  }
  try {
    await initNet({
      onChat: m => addChatMessage(m),
      onFurnitureInsert: f => { if (worldLoaded) W.addFurniture(f); },
      onFurnitureDelete: old => { if (old && old.id) { W.removeFurnitureById(old.id); onFurnitureRemoved(old.id); } },
      onPresence: rm => {
        setOnline(rm.size + 1, connected);
        trackStatMax("maxOnline", rm.size);
      },
      onJoin: name => addSysMessage("👋 " + (name || "Jemand") + " ist jetzt hier"),
      onLeave: name => addSysMessage("💤 " + (name || "Jemand") + " ist weg"),
      onEmote: p => { if (p && p.id && p.e) showEmote(p.id, String(p.e).slice(0, 4)); },
      onStatus: ok => {
        setOnline(remote.size + (ok ? 1 : 0) || 1, ok);
        // Verbindung kam erst später zustande: Welt jetzt nachladen
        if (ok && !worldLoaded) loadCloudData().catch(() => {});
      },
    });
    await loadCloudData();
    online = connected;
  } catch (e) {
    console.warn("Netzwerk nicht verfügbar:", e);
  }

  if (!online) {
    setOnline(1, false);
    if (!worldLoaded) W.setFurniture(OFFLINE_FURNITURE);
    addSysMessage("⚠️ Offline-Modus: keine Verbindung zur Cloud. Chat & Multiplayer sind deaktiviert.");
    toast("Offline-Modus – du bist allein im Hub.", "warn");
  }

  // Falls die gespeicherte Position inzwischen verbaut ist: freie Kachel suchen
  const cc = W.charCell();
  if (W.cellBlocked(cc.x, cc.y)) {
    const free = W.findFreeTile(7, 9);
    S.char.x = free.x + 0.5; S.char.y = free.y + 0.5;
    trackPresence();
  }

  // Aktueller Raum zählt für Quests/Erfolge
  if (!S.stats.rooms) S.stats.rooms = {};
  if (!S.stats.rooms[S.room]) S.stats.rooms[S.room] = true;
  questEvent("room", S.room);

  checkAll();
  startCloudSync();
  window.addEventListener("beforeunload", saveNow);
  // Debug-Zugriff (Konsole/Tests)
  window.__coplay = { world: W, remote, S, account };
}

boot();
