# 🏡 Coplay – Online-Hub

Ein gemütlicher 2D-Multiplayer-Hub im Iso-Look, entstanden aus der Lebenssimulation
„Mein kleines Leben". Alle Spieler teilen sich denselben Raum: rumlaufen, chatten,
arbeiten, gemeinsam einrichten – und ein Tamagotchi-Haustier großziehen.

## Features

- **Multiplayer-Hub**: Alle sehen sich live rumlaufen (Supabase Realtime Presence + Broadcast)
- **Einfache Accounts + Cloud-Save**: Name + eigenes Passwort (neuer Name = neues Konto), Fortschritt liegt in der Cloud und ist auf jedem Gerät da; Gast-Modus (nur lokal) weiterhin möglich
- **Admin-Konto**: kann jedes Möbelstück im Hub verschieben/löschen (nicht nur eigene)
- **3 Räume**: Lounge 🛋️, Garten 🌿 und Arcade 🕹️ – jeweils mit eigenem Look und eigener Einrichtung; Wechsel über die Tür oder den 🚪-Knopf
- **Globaler Chat**: Panel + Sprechblasen über den Köpfen, Verlauf in der Datenbank (raumübergreifend)
- **Emotes**: 👋 😂 ❤️ 👍 😮 🎉 per Leiste oder Tasten 1–6, sichtbar für alle im Raum
- **Tagesquests**: jeden Tag 3 Aufgaben mit Taler- und XP-Belohnung
- **Gemeinsames Bauen**: Platzierte Möbel sehen alle sofort; eigene Möbel kann man verschieben/verkaufen, Hub-Möbel sind fest
- **Bedürfnisse & Aktionen**: Essen, Schlafen, Duschen, Arbeiten, Fernsehen … wie im Original
- **24 Möbelstücke**: von Bett bis Whirlpool, Klavier, Dartscheibe, Kamin, Heimkino und mehr
- **5 Level**: XP durch Aktionen, jedes Level schaltet neue Möbel im Shop frei (Level 5 = Max)
- **Erfolge**: 12 freischaltbare Erfolge (Chat, Bauen, Arbeiten, Haustier, Räume, Quests …)
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
- `coplay_world_furniture` – gemeinsame Hub-Einrichtung (`type`, `x`, `y`, `room`, `placed_by`)
- `coplay_accounts` – einfache Accounts (`username`, `password_hash`, `token`, `is_admin`, `save` als JSONB)

Chat/Möbel mit RLS (offene Lese-/Schreib-Policies für anonyme Spieler, Längen-/Format-Checks)
und aktiviertem Realtime (`supabase_realtime` Publication). Die Accounts-Tabelle ist per RLS
komplett gesperrt – Zugriff nur über `security definer`-Funktionen (`coplay_auth`,
`coplay_cloud_load`, `coplay_cloud_save`); Passwörter werden mit bcrypt gehasht, jeder Account
hat sein eigenes. Ein neuer Name registriert beim ersten Login automatisch ein neues Konto mit
dem eingegebenen Passwort; die Session merkt sich ein Token in `localStorage` für Auto-Login.
Das Konto `Funnypeace` (`is_admin = true`) darf zusätzlich jedes Möbelstück im Hub verschieben
oder löschen, unabhängig davon, wer es platziert hat.

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
  main.js           Bootstrap: Save/Account laden, UI, Netzwerk, Loop
  config.js         Supabase-Zugang + Tabellennamen
  catalog.js        Möbelkatalog, Bedürfnisse, Level, Raum-Themes
  state.js          Lokaler Spielstand (localStorage), Spieler-ID, Account
  auth.js           Login/Registrierung, Cloud-Save-Sync
  world.js          Gemeinsame Welt: Möbel, Raster, Wegfindung (BFS)
  net.js            Supabase: Presence, Broadcasts (Move/Emote), Chat, Möbel-Sync, Räume
  game.js           Spielschleife, Rendering, Eingaben, Aktionen, Bau-Modus, Raumwechsel
  draw.js           Canvas-/Iso-Helfer, Floater
  ui.js             DOM-UI: Topbar, Shop, Menüs, Overlays, Toasts
  chat.js           Chat-Panel
  pet.js            Tamagotchi-Haustier
  quests.js         Tagesquests
  achievements.js   Erfolge
  progress.js       XP, Level (max. 5), Stimmung
legacy/             Die ursprüngliche Einzeldatei-Version
```

## Bekannte Grenzen (v3)

- Bewusst simples Auth-Modell: keine E-Mail-Verifizierung, kein Passwort-Reset – wer den
  Namen zuerst registriert, hat ihn; Passwörter sind aber pro Account individuell
- Möbel-Schutz („nur eigene verschieben/verkaufen") wird clientseitig durchgesetzt
  (Admin-Bypass ebenso) – kein serverseitiges Rechtesystem
- Gast-Modus speichert weiterhin nur lokal im Browser
