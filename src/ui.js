/* DOM-UI: Topbar, Bedürfnisse, Shop, Menüs, Overlays, Toasts */
import { CAT, NEED_KEYS, NEED_META, SHIRTS, MAX_LEVEL, xpNeed, ROOMS } from "./catalog.js";
import { S, account, avgNeeds, saveNow } from "./state.js";
import { clamp } from "./draw.js";

const moneyEl = document.getElementById("money"), lvlBadge = document.getElementById("lvlBadge"),
  xpFill = document.getElementById("xpFill"), xpText = document.getElementById("xpText"),
  needsList = document.getElementById("needsList"), moodLine = document.getElementById("moodLine"),
  shopCard = document.getElementById("shopCard"), shopList = document.getElementById("shopList"),
  modeBtn = document.getElementById("modeBtn"), toastsEl = document.getElementById("toasts"),
  onlineBadge = document.getElementById("onlineBadge"),
  startOverlay = document.getElementById("startOverlay"), helpOverlay = document.getElementById("helpOverlay"),
  achOverlay = document.getElementById("achOverlay");
export const menuEl = document.getElementById("menu");

export function toast(msg, type) {
  const t = document.createElement("div");
  t.className = "toast" + (type === "warn" ? " warn" : type === "gold" ? " gold" : "");
  t.textContent = msg;
  toastsEl.appendChild(t);
  setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = "0"; }, 2600);
  setTimeout(() => t.remove(), 3100);
  while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
}

export function uiTop() {
  moneyEl.textContent = "💰 " + Math.round(S.money) + " Taler";
  lvlBadge.textContent = "Lv " + S.level;
  if (S.level >= MAX_LEVEL && S.xp >= xpNeed(MAX_LEVEL)) {
    xpFill.style.width = "100%"; xpText.textContent = "MAX";
  } else {
    xpFill.style.width = clamp(S.xp / xpNeed(S.level) * 100, 0, 100) + "%";
    xpText.textContent = Math.round(S.xp) + "/" + xpNeed(S.level) + " XP";
  }
}
export function setOnline(count, ok) {
  onlineBadge.textContent = (ok ? "🟢 " : "🔴 ") + count + " online";
  onlineBadge.classList.toggle("off", !ok);
}
export function setRoomUI(room) {
  const r = ROOMS[room];
  if (r) document.getElementById("roomBtn").textContent = "🚪 " + r.emoji + " " + r.name;
}
/* Topbar-Knopf: "🔑 Login" für Gäste, Name für eingeloggte Accounts */
export function updateProfileBtn() {
  const btn = document.getElementById("profileBtn");
  if (!btn) return;
  btn.textContent = account.id ? "👤 " + (account.username || "Profil") : "🔑 Login";
}

export function buildNeedsUI() {
  needsList.innerHTML = "";
  NEED_KEYS.forEach(k => {
    const m = NEED_META[k], div = document.createElement("div");
    div.className = "need";
    div.innerHTML = '<div class="lab"><span>' + m.icon + " " + m.label + '</span><span id="nv_' + k + '"></span></div>' +
      '<div class="track"><div class="fill" id="nf_' + k + '"></div></div>';
    needsList.appendChild(div);
  });
}
export function uiNeeds() {
  NEED_KEYS.forEach(k => {
    const v = S.needs[k], f = document.getElementById("nf_" + k);
    if (!f) return;
    f.style.width = v + "%";
    f.style.background = v >= 60 ? "linear-gradient(90deg,#4cc9a8,#58e08a)" :
      v >= 30 ? "linear-gradient(90deg,#e8a13f,#f4c95d)" :
        "linear-gradient(90deg,#c94c4c,#e36767)";
    document.getElementById("nv_" + k).textContent = Math.round(v);
  });
  const a = avgNeeds();
  moodLine.textContent = a >= 70 ? "😊 Super Stimmung (XP ×1,3)" : a >= 40 ? "😐 Geht so (XP ×1,0)" : "😟 Schlechte Laune (XP ×0,6)";
}

/* ---------- Shop ---------- */
let shopOnPick = null;
export function buildShop(onPick) {
  if (onPick) shopOnPick = onPick;
  shopList.innerHTML = "";
  Object.keys(CAT).forEach(key => {
    const c = CAT[key], div = document.createElement("div");
    div.className = "shopItem" + (c.lvl > S.level ? " locked" : "");
    div.dataset.lock = "🔒 ab Level " + c.lvl; div.dataset.key = key;
    div.innerHTML = '<div class="em">' + c.emoji + '</div><div class="nm">' + c.name + '</div>' +
      '<div class="pr">💰 ' + c.price + '</div><div class="ds">' + (c.act ? c.act.label : "Deko") + "</div>";
    div.onclick = () => {
      if (c.lvl > S.level) { toast("Ab Level " + c.lvl + " verfügbar!", "warn"); return; }
      if (S.money < c.price) { toast("Zu wenig Taler! (" + c.price + " nötig)", "warn"); return; }
      shopOnPick && shopOnPick(key);
    };
    shopList.appendChild(div);
  });
}
export function refreshShop() { if (shopOnPick) buildShop(); }
export function setShopSel(key) {
  document.querySelectorAll(".shopItem").forEach(el => {
    el.classList.toggle("sel", !!key && el.dataset.key === key);
  });
}
export function setModeUI(mode) {
  modeBtn.textContent = mode === "buy" ? "▶️ Leben" : "🔨 Bauen";
  shopCard.classList.toggle("open", mode === "buy");
  document.getElementById("chatCard").style.display = mode === "buy" ? "none" : "";
}

/* ---------- Kontextmenü ---------- */
export function showMenu(x, y, entries) {
  menuEl.innerHTML = "";
  entries.forEach(en => {
    const b = document.createElement("button");
    b.innerHTML = en.label + (en.sub ? '<span class="sub">' + en.sub + "</span>" : "");
    if (en.danger) b.classList.add("danger");
    b.onclick = ev => { ev.stopPropagation(); en.cb(b); };
    menuEl.appendChild(b);
  });
  const wrap = document.getElementById("canvasWrap").getBoundingClientRect();
  menuEl.style.display = "block";
  menuEl.style.left = clamp(x, 8, wrap.width - 198) + "px";
  menuEl.style.top = clamp(y, 8, wrap.height - entries.length * 52 - 16) + "px";
}
export function hideMenu() { menuEl.style.display = "none"; }

/* ---------- Overlays ---------- */
let pickShirt = SHIRTS[0];
let overlayMode = "login"; // "login" | "profil"

export function setAuthError(code) {
  const map = {
    wrong_password: "Falsches Hub-Passwort!",
    bad_username: "Name bitte mit 2–14 Zeichen.",
    bad_password: "Passwort bitte eingeben (mind. 2 Zeichen).",
    network: "Keine Verbindung – später nochmal versuchen (oder als Gast spielen).",
    "": "",
  };
  document.getElementById("authError").textContent = map[code] ?? code ?? "";
}
export function setStartBusy(busy) {
  const b = document.getElementById("startBtn");
  b.disabled = busy;
  b.textContent = busy ? "Einen Moment …" : (overlayMode === "login" ? "Anmelden / Registrieren" : "Speichern");
}

export function initOverlays({ onLogin, onGuest, onProfileSave, onLogout, onReset }) {
  const swatchesEl = document.getElementById("swatches"), nameInput = document.getElementById("nameInput");
  pickShirt = S.shirt;
  SHIRTS.forEach(col => {
    const d = document.createElement("div");
    d.className = "sw" + (col === S.shirt ? " sel" : ""); d.style.background = col;
    d.onclick = () => {
      pickShirt = col;
      document.querySelectorAll(".sw").forEach(el => el.classList.toggle("sel", el === d));
    };
    swatchesEl.appendChild(d);
  });
  document.getElementById("startBtn").onclick = () => {
    const name = (nameInput.value.trim() || "").slice(0, 14);
    S.shirt = pickShirt;
    if (overlayMode === "login") {
      setAuthError("");
      onLogin && onLogin(name, document.getElementById("pwInput").value);
    } else {
      if (!account.id && name) S.name = name;
      S.seenIntro = true;
      startOverlay.classList.add("hidden");
      saveNow();
      onProfileSave && onProfileSave();
    }
  };
  document.getElementById("guestBtn").onclick = () => {
    const name = (nameInput.value.trim() || "Gast").slice(0, 14);
    S.name = name; S.shirt = pickShirt; S.seenIntro = true;
    startOverlay.classList.add("hidden");
    saveNow();
    onGuest && onGuest();
  };
  document.getElementById("logoutBtn").onclick = () => { onLogout && onLogout(); };
  document.getElementById("helpBtn").onclick = () => helpOverlay.classList.remove("hidden");
  document.getElementById("helpClose").onclick = () => helpOverlay.classList.add("hidden");
  document.getElementById("achClose").onclick = () => achOverlay.classList.add("hidden");
  document.getElementById("questClose").onclick = () => document.getElementById("questOverlay").classList.add("hidden");
  document.getElementById("profileBtn").onclick = () => openStartOverlay(account.id ? "profil" : "login");
  document.getElementById("resetBtn").onclick = () => {
    if (confirm("Deinen lokalen Spielstand wirklich löschen und neu starten? (Chat & Hub-Möbel bleiben erhalten)")) {
      onReset && onReset();
    }
  };
  updateProfileBtn();
}

export function openStartOverlay(mode) {
  overlayMode = mode === "profil" ? "profil" : "login";
  const login = overlayMode === "login";
  const nameInput = document.getElementById("nameInput");
  nameInput.value = account.username || S.name || "";
  nameInput.disabled = !login && !!account.id;
  document.getElementById("startTitle").textContent = login ? "🏡 Willkommen im Coplay-Hub!" : "👤 Profil";
  document.getElementById("startIntro").textContent = login
    ? "Melde dich mit Namen und Hub-Passwort an – dein bisheriger Fortschritt wird in die Cloud übernommen und ist dann auf jedem Gerät da. Neue Namen werden automatisch registriert."
    : (account.id ? "Angemeldet als " + account.username + " – Fortschritt liegt in der Cloud." : "Du spielst als Gast – Fortschritt nur auf diesem Gerät.");
  document.getElementById("pwRow").classList.toggle("hidden", !login);
  document.getElementById("guestBtn").classList.toggle("hidden", !login);
  document.getElementById("logoutBtn").classList.toggle("hidden", !(overlayMode === "profil" && account.id));
  setAuthError("");
  setStartBusy(false);
  document.querySelectorAll(".sw").forEach((el, i) => el.classList.toggle("sel", SHIRTS[i] === S.shirt));
  pickShirt = S.shirt;
  startOverlay.classList.remove("hidden");
  if (login) nameInput.focus();
}
export function closeStartOverlay() { startOverlay.classList.add("hidden"); }
export function openAchOverlay() { achOverlay.classList.remove("hidden"); }
export function openQuestOverlay() { document.getElementById("questOverlay").classList.remove("hidden"); }
export function closeOverlaysOnEsc() {
  helpOverlay.classList.add("hidden");
  achOverlay.classList.add("hidden");
  document.getElementById("questOverlay").classList.add("hidden");
}
