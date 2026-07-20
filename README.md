# 🏡 Coplay – Online-Hub

Ein gemütlicher 2D-Multiplayer-Hub im Iso-Look, entstanden aus der Lebenssimulation
„Mein kleines Leben". Alle Spieler teilen sich denselben Raum: rumlaufen, chatten,
arbeiten, gemeinsam einrichten – und ein Tamagotchi-Haustier großziehen.

## Features

- **Multiplayer-Hub**: Alle sehen sich live rumlaufen (Supabase Realtime Presence + Broadcast)
- **Globaler Chat**: Panel + Sprechblasen über den Köpfen, Verlauf in der Datenbank
- **Gemeinsames Bauen**: Platzierte Möbel sehen alle sofort; eigene Möbel kann man verschieben/verkaufen, Hub-Möbel sind fest
- **Bedürfnisse & Aktionen**: Essen, Schlafen, Duschen, Arbeiten, Fernsehen … wie im Original
- **5 Level**: XP durch Aktionen, jedes Level schaltet neue Möbel im Shop frei (Level 5 = Max)
- **Erfolge**: 9 freischaltbare Erfolge (Chat, Bauen, Arbeiten, Haustier, gesellig sein …)
- **Haustier**: Katze, Hund oder Hase adoptieren – folgt dir durch den Hub, will Futter und Spiel; ein glückliches Haustier gibt +10 % XP
- **Tag/Nacht-Zyklus**: über die Echtzeit synchronisiert, bei allen Spielern gleich
- **Offline-Modus**: ohne Verbindung bleibt das Spiel solo spielbar

## Technik

| Baustein | Wahl |
| --- | --- |
| Frontend | Vite + Vanilla JS, Canvas-2D-Isometrie (kein Framework) |
| Hosting | Vercel (Auto-Deploy aus diesem Repo) |
| Datenbank & Realtime | Supabase (Postgres + Realtime Channels) |

Warum Supabase statt „Datenbank über Vercel"? Vercel bietet kein Realtime-Push
(WebSockets) für Spielerpositionen und Chat – Supabase Realtime schon, und das
kostenlose Kontingent reicht für den Anfang locker.

### Datenbank-Schema

Tabellen (Präfix `coplay_`, liegen aktuell im Supabase-Projekt `app-aktivitaetstatus`):

- `coplay_chat_messages` – globaler Chatverlauf (`player_id`, `name`, `color`, `text`)
- `coplay_world_furniture` – gemeinsame Hub-Einrichtung (`type`, `x`, `y`, `placed_by`)

Beide mit RLS (offene Lese-/Schreib-Policies für anonyme Spieler, Längen-/Format-Checks)
und aktiviertem Realtime (`supabase_realtime` Publication).

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:5173
npm run build    # Produktions-Build nach dist/
```

Supabase-Zugang liegt in `src/config.js` (Publishable Key, darf öffentlich sein).
Optional per Env überschreibbar: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Projektstruktur

```
index.html          Einstieg + UI-Gerüst (Topbar, Seitenleiste, Overlays)
styles/main.css     Styles
src/
  main.js           Bootstrap: Save laden, UI, Netzwerk, Loop
  config.js         Supabase-Zugang + Tabellennamen
  catalog.js        Möbelkatalog, Bedürfnisse, Level-Konstanten
  state.js          Lokaler Spielstand (localStorage) + Spieler-ID
  world.js          Gemeinsame Welt: Möbel, Raster, Wegfindung (BFS)
  net.js            Supabase: Presence, Bewegungs-Broadcast, Chat, Möbel-Sync
  game.js           Spielschleife, Rendering, Eingaben, Aktionen, Bau-Modus
  draw.js           Canvas-/Iso-Helfer, Floater
  ui.js             DOM-UI: Topbar, Shop, Menüs, Overlays, Toasts
  chat.js           Chat-Panel
  pet.js            Tamagotchi-Haustier
  achievements.js   Erfolge
  progress.js       XP, Level (max. 5), Stimmung
legacy/             Die ursprüngliche Einzeldatei-Version
```

## Bekannte Grenzen (v1)

- Anonyme Spieler-Identität pro Browser (keine Accounts) – Namen sind nicht reserviert
- Möbel-Schutz („nur eigene verschieben/verkaufen") wird clientseitig durchgesetzt
- Spielstand (Taler, XP, Bedürfnisse, Haustier) liegt lokal im Browser
