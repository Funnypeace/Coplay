/* Einfache Accounts: Name + Hub-Passwort, Spielstand in der Cloud */
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { S, account, applyCloudSave, exportSave, saveNow, SAVE_KEY } from "./state.js";
import { supabase } from "./net.js";

const TOKEN_KEY = "coplay_token";

export async function authLogin(username, password) {
  try {
    const { data, error } = await supabase
      .rpc("coplay_auth", { p_username: username, p_password: password })
      .abortSignal(AbortSignal.timeout(8000));
    if (error) return { ok: false, error: "network" };
    if (!data.ok) return data;
    account.id = data.id; account.username = data.username; account.token = data.token;
    try { localStorage.setItem(TOKEN_KEY, data.token); } catch (e) {}
    if (data.save) applyCloudSave(data.save);
    S.name = data.username;
    S.seenIntro = true;
    saveNow();
    pushCloudSave(true);
    return { ok: true, isNew: !!data.new };
  } catch (e) {
    return { ok: false, error: "network" };
  }
}

/* Auto-Login mit gespeichertem Token */
export async function tryTokenLogin() {
  let t = null;
  try { t = localStorage.getItem(TOKEN_KEY); } catch (e) {}
  if (!t) return false;
  try {
    const { data, error } = await supabase
      .rpc("coplay_cloud_load", { p_token: t })
      .abortSignal(AbortSignal.timeout(6000));
    if (error) return false; // Netzproblem: Token behalten, offline weiterspielen
    if (!data.ok) { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} return false; }
    account.id = data.id; account.username = data.username; account.token = t;
    if (data.save) applyCloudSave(data.save);
    S.name = data.username;
    S.seenIntro = true;
    return true;
  } catch (e) { return false; }
}

let lastPushed = "";
export async function pushCloudSave(force) {
  if (!account.token) return;
  const payload = exportSave();
  const str = JSON.stringify(payload);
  if (!force && str === lastPushed) return;
  lastPushed = str;
  try {
    await supabase.rpc("coplay_cloud_save", { p_token: account.token, p_save: payload });
  } catch (e) {}
}

export function startCloudSync() {
  setInterval(() => pushCloudSave(false), 20000);
  window.addEventListener("beforeunload", beaconSave);
}
/* Letzter Speicherversuch beim Schließen des Tabs */
function beaconSave() {
  if (!account.token || !navigator.sendBeacon) return;
  try {
    const body = new Blob(
      [JSON.stringify({ p_token: account.token, p_save: exportSave() })],
      { type: "application/json" }
    );
    navigator.sendBeacon(SUPABASE_URL + "/rest/v1/rpc/coplay_cloud_save?apikey=" + SUPABASE_KEY, body);
  } catch (e) {}
}

export async function logout() {
  await pushCloudSave(true);
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(SAVE_KEY); } catch (e) {}
  location.reload();
}
