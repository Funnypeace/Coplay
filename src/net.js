/* Netzwerk: Supabase Realtime (Presence + Broadcast) und Persistenz */
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, CHAT_TABLE, FURNITURE_TABLE, CHANNEL } from "./config.js";
import { S, playerId } from "./state.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 12 } },
});

export let connected = false;
/* Andere Spieler: id -> {id, name, shirt, level, pet, x, y, tx, ty} */
export const remote = new Map();
/* Sprechblasen: id -> {text, until} */
export const bubbles = new Map();
export function setBubble(id, text) {
  bubbles.set(id, { text: String(text).slice(0, 120), until: performance.now() + 6000 });
}

let channel = null;
let handlers = {};
let lastMoveSent = 0;

function presenceMeta() {
  return {
    name: S.name || "Gast",
    shirt: S.shirt,
    level: S.level,
    pet: S.pet ? S.pet.type : null,
    x: Math.round(S.char.x * 10) / 10,
    y: Math.round(S.char.y * 10) / 10,
  };
}

export async function initNet(h) {
  handlers = h || {};
  channel = supabase.channel(CHANNEL, {
    config: { presence: { key: playerId }, broadcast: { self: false } },
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    const seen = new Set();
    Object.keys(state).forEach(id => {
      if (id === playerId) return;
      seen.add(id);
      const meta = state[id][0];
      if (!meta) return;
      const ex = remote.get(id);
      if (ex) {
        ex.name = meta.name; ex.shirt = meta.shirt; ex.level = meta.level; ex.pet = meta.pet;
      } else {
        remote.set(id, {
          id, name: meta.name, shirt: meta.shirt, level: meta.level, pet: meta.pet,
          x: meta.x ?? 7.5, y: meta.y ?? 9.5, tx: meta.x ?? 7.5, ty: meta.y ?? 9.5,
        });
      }
    });
    [...remote.keys()].forEach(id => { if (!seen.has(id)) { remote.delete(id); bubbles.delete(id); } });
    handlers.onPresence && handlers.onPresence(remote);
  });

  channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
    if (key !== playerId && newPresences[0]) handlers.onJoin && handlers.onJoin(newPresences[0].name);
  });
  channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
    if (key !== playerId && leftPresences[0]) handlers.onLeave && handlers.onLeave(leftPresences[0].name);
  });

  channel.on("broadcast", { event: "move" }, ({ payload }) => {
    const p = remote.get(payload.id);
    if (!p) return;
    p.tx = payload.x; p.ty = payload.y;
    if (Math.hypot(p.x - p.tx, p.y - p.ty) > 3) { p.x = p.tx; p.y = p.ty; }
  });

  channel.on("postgres_changes", { event: "INSERT", schema: "public", table: CHAT_TABLE }, payload => {
    handlers.onChat && handlers.onChat(payload.new);
  });
  channel.on("postgres_changes", { event: "INSERT", schema: "public", table: FURNITURE_TABLE }, payload => {
    handlers.onFurnitureInsert && handlers.onFurnitureInsert(payload.new);
  });
  channel.on("postgres_changes", { event: "DELETE", schema: "public", table: FURNITURE_TABLE }, payload => {
    handlers.onFurnitureDelete && handlers.onFurnitureDelete(payload.old);
  });

  await new Promise(resolve => {
    let done = false;
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        connected = true;
        await channel.track(presenceMeta());
        handlers.onStatus && handlers.onStatus(true);
        if (!done) { done = true; resolve(); }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        connected = false;
        handlers.onStatus && handlers.onStatus(false);
        if (!done) { done = true; resolve(); }
      }
    });
    setTimeout(() => { if (!done) { done = true; resolve(); } }, 8000);
  });
}

/* Presence-Metadaten aktualisieren (Name, Level, Haustier, letzte Position) */
export function trackPresence() {
  if (channel && connected) channel.track(presenceMeta()).catch(() => {});
}

/* Position senden, gedrosselt */
export function broadcastMove(force) {
  if (!channel || !connected) return;
  const now = performance.now();
  if (!force && now - lastMoveSent < 110) return;
  lastMoveSent = now;
  channel.send({
    type: "broadcast", event: "move",
    payload: { id: playerId, x: Math.round(S.char.x * 100) / 100, y: Math.round(S.char.y * 100) / 100 },
  }).catch(() => {});
}

/* ---------- Persistenz ---------- */
export async function loadWorld() {
  const { data, error } = await supabase.from(FURNITURE_TABLE)
    .select("id,type,x,y,placed_by,placed_by_name")
    .order("created_at", { ascending: true }).limit(500)
    .abortSignal(AbortSignal.timeout(7000));
  if (error) throw error;
  return data;
}
export async function loadChat() {
  const { data, error } = await supabase.from(CHAT_TABLE)
    .select("id,player_id,name,color,text,created_at")
    .order("created_at", { ascending: false }).limit(50)
    .abortSignal(AbortSignal.timeout(7000));
  if (error) throw error;
  return data.reverse();
}
export async function sendChat(text) {
  const { data, error } = await supabase.from(CHAT_TABLE)
    .insert({ player_id: playerId, name: S.name || "Gast", color: S.shirt, text })
    .select().single();
  if (error) throw error;
  return data;
}
export async function dbPlaceFurniture(type, x, y) {
  const { data, error } = await supabase.from(FURNITURE_TABLE)
    .insert({ type, x, y, placed_by: playerId, placed_by_name: S.name || "Gast" })
    .select().single();
  if (error) throw error;
  return data;
}
export async function dbRemoveFurniture(id) {
  const { error } = await supabase.from(FURNITURE_TABLE).delete().eq("id", id);
  if (error) throw error;
}
