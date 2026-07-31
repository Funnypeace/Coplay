/* Globaler Chat: Panel rechts + Senden über Supabase */
import { S, activeId, isAdmin } from "./state.js";
import { sendChat, setBubble, connected, dbDeleteChatMessage, dbClearChat } from "./net.js";
import { toast } from "./ui.js";
import { trackStat } from "./achievements.js";
import { questEvent } from "./quests.js";

const msgsEl = document.getElementById("chatMsgs");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("chatInput");
const clearBtn = document.getElementById("chatClearBtn");

const seenIds = new Set();
let lastSend = 0;

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function scrollDown() { msgsEl.scrollTop = msgsEl.scrollHeight; }

async function deleteMessage(id) {
  try {
    await dbDeleteChatMessage(id);
    removeChatMessage(id);
  } catch (e) {
    toast("Löschen fehlgeschlagen – keine Verbindung?", "warn");
  }
}
export function removeChatMessage(id) {
  const el = msgsEl.querySelector('[data-mid="' + id + '"]');
  if (el) el.remove();
}
/* Nach Login/Logout: Löschen-Buttons an bereits gerenderten Nachrichten nachrüsten/entfernen */
export function refreshChatAdminButtons() {
  msgsEl.querySelectorAll(".m[data-mid]").forEach(div => {
    const existing = div.querySelector(".msgDel");
    if (isAdmin() && !existing) {
      const id = div.dataset.mid;
      const del = document.createElement("button");
      del.className = "msgDel"; del.title = "Nachricht löschen (Admin)"; del.textContent = "🗑️";
      del.onclick = () => deleteMessage(/^\d+$/.test(id) ? Number(id) : id);
      div.appendChild(del);
    } else if (!isAdmin() && existing) {
      existing.remove();
    }
  });
}

export function addChatMessage(m) {
  if (m.id != null) {
    if (seenIds.has(m.id)) return;
    seenIds.add(m.id);
    if (seenIds.size > 500) seenIds.delete(seenIds.values().next().value);
  }
  const div = document.createElement("div");
  div.className = "m";
  if (m.id != null) div.dataset.mid = m.id;
  const who = m.player_id === activeId() ? (m.name || "Ich") : (m.name || "Gast");
  div.innerHTML = '<span class="n" style="color:' + esc(m.color || "#9aa7c4") + '">' + esc(who) +
    ":</span> <span class=\"t\">" + esc(m.text) + "</span>";
  if (isAdmin() && m.id != null) {
    const del = document.createElement("button");
    del.className = "msgDel"; del.title = "Nachricht löschen (Admin)"; del.textContent = "🗑️";
    del.onclick = () => deleteMessage(m.id);
    div.appendChild(del);
  }
  msgsEl.appendChild(div);
  while (msgsEl.children.length > 120) msgsEl.firstChild.remove();
  scrollDown();
  setBubble(m.player_id, m.text);
}
export function addSysMessage(text) {
  const div = document.createElement("div");
  div.className = "sys";
  div.textContent = text;
  msgsEl.appendChild(div);
  while (msgsEl.children.length > 120) msgsEl.firstChild.remove();
  scrollDown();
}

export function initChat() {
  formEl.addEventListener("submit", async e => {
    e.preventDefault();
    const text = inputEl.value.trim().slice(0, 300);
    if (!text) return;
    if (!connected) { toast("Keine Verbindung – Chat gerade offline.", "warn"); return; }
    const now = Date.now();
    if (now - lastSend < 800) return;
    lastSend = now;
    inputEl.value = "";
    try {
      const row = await sendChat(text);
      addChatMessage(row);
      trackStat("msgs");
      questEvent("msg");
    } catch (err) {
      toast("Nachricht konnte nicht gesendet werden.", "warn");
      inputEl.value = text;
    }
  });
  if (clearBtn) {
    clearBtn.onclick = async () => {
      if (!confirm("Wirklich den GESAMTEN Chatverlauf für alle Spieler löschen?")) return;
      try {
        await dbClearChat();
        msgsEl.innerHTML = "";
        addSysMessage("🧹 Chat wurde von einem Admin geleert.");
      } catch (e) {
        toast("Chat leeren fehlgeschlagen – keine Verbindung?", "warn");
      }
    };
  }
}
export function chatHasFocus() { return document.activeElement === inputEl; }
