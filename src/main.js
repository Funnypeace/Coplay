/* Bootstrap: Spielstand laden, UI aufbauen, Netzwerk verbinden, Loop starten */
import { S, loadSave, saveNow, SAVE_KEY } from "./state.js";
import * as W from "./world.js";
import {
  initNet, loadWorld, loadChat, trackPresence, remote, connected,
} from "./net.js";
import {
  toast, uiTop, buildNeedsUI, uiNeeds, initOverlays, openStartOverlay,
  openAchOverlay, setOnline,
} from "./ui.js";
import { initChat, addChatMessage, addSysMessage } from "./chat.js";
import { renderAchList, checkAll, trackStatMax } from "./achievements.js";
import { renderPetCard } from "./pet.js";
import { setMode, initInput, startLoop, onFurnitureRemoved } from "./game.js";

/* Fallback-Einrichtung, falls die Cloud nicht erreichbar ist */
const OFFLINE_FURNITURE = [
  { type: "schreibtisch", x: 1, y: 0 }, { type: "schreibtisch", x: 4, y: 0 },
  { type: "kuehlschrank", x: 12, y: 0 }, { type: "tv", x: 5, y: 5 },
  { type: "teppich", x: 5, y: 6 }, { type: "sofa", x: 5, y: 8 },
  { type: "bett", x: 0, y: 10 }, { type: "dusche", x: 13, y: 12 },
].map((f, i) => ({ ...f, id: "offline-" + i, placed_by: null, placed_by_name: "Hub" }));

async function boot() {
  loadSave();
  buildNeedsUI();
  uiTop(); uiNeeds();
  renderPetCard();
  renderAchList();
  initChat();
  initInput();
  setMode("live");

  initOverlays({
    onProfileSave: () => {
      trackPresence();
      renderPetCard();
      toast("Willkommen im Hub, " + S.name + "! 🏡");
    },
    onReset: () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    },
  });
  document.getElementById("achBtn").onclick = () => { renderAchList(); openAchOverlay(); };
  if (!S.seenIntro) openStartOverlay(false);

  startLoop();

  // Netzwerk: erst Kanal abonnieren, dann Welt + Chatverlauf laden
  let online = false;
  let worldLoaded = false;
  async function loadCloudData() {
    if (worldLoaded) return;
    const [world, chat] = await Promise.all([loadWorld(), loadChat()]);
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
        setOnline(rm.size + 1, true);
        trackStatMax("maxOnline", rm.size);
      },
      onJoin: name => addSysMessage("👋 " + (name || "Jemand") + " ist jetzt online"),
      onLeave: name => addSysMessage("💤 " + (name || "Jemand") + " ist weg"),
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

  checkAll();
  window.addEventListener("beforeunload", saveNow);
  // Debug-Zugriff (Konsole/Tests)
  window.__coplay = { world: W, remote };
}

boot();
