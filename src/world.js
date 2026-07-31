/* Gemeinsame Hub-Welt: Möbel, Raster, Wegfindung */
import { CAT, roomGrid } from "./catalog.js";
import { S } from "./state.js";
import { clamp, isoPt } from "./draw.js";

/* Rastergröße des aktuellen Raums (jeder Raum hat seine eigene Größe) */
export function currentGrid() { return roomGrid(S.room); }

export let furniture = []; // {id, type, x, y, placed_by, placed_by_name}

export function setFurniture(list) {
  furniture = list.filter(f => CAT[f.type]);
}
export function addFurniture(f) {
  if (!CAT[f.type]) return false;
  if (furniture.some(o => o.id === f.id)) return false;
  furniture.push(f);
  return true;
}
export function removeFurnitureById(id) {
  const i = furniture.findIndex(o => o.id === id);
  if (i < 0) return null;
  return furniture.splice(i, 1)[0];
}
export function findFurniture(id) { return furniture.find(o => o.id === id) || null; }

export function cellBlocked(cx, cy) {
  for (const f of furniture) {
    const c = CAT[f.type]; if (c.walk) continue;
    if (cx >= f.x && cx < f.x + c.w && cy >= f.y && cy < f.y + c.d) return true;
  }
  return false;
}
export function canPlace(type, x, y) {
  const c = CAT[type], GRID = currentGrid();
  if (x < 0 || y < 0 || x + c.w > GRID || y + c.d > GRID) return false;
  const cc = charCell();
  for (let i = 0; i < c.w; i++) for (let j = 0; j < c.d; j++) {
    const px = x + i, py = y + j;
    if (!c.walk) {
      if (cellBlocked(px, py)) return false;
      if (cc.x === px && cc.y === py) return false;
    } else {
      for (const f of furniture) {
        const fc = CAT[f.type];
        if (fc.walk && px >= f.x && px < f.x + fc.w && py >= f.y && py < f.y + fc.d) return false;
      }
    }
  }
  return true;
}
export function charCell() {
  const GRID = currentGrid();
  return { x: clamp(Math.floor(S.char.x), 0, GRID - 1), y: clamp(Math.floor(S.char.y), 0, GRID - 1) };
}
export function bfs(from) {
  const GRID = currentGrid();
  const dist = Array.from({ length: GRID }, () => Array(GRID).fill(Infinity));
  const parent = {}; const q = [[from.x, from.y]]; dist[from.y][from.x] = 0;
  while (q.length) {
    const cur = q.shift(), cx = cur[0], cy = cur[1];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
      const nx = cx + d[0], ny = cy + d[1];
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return;
      if (dist[ny][nx] !== Infinity || cellBlocked(nx, ny)) return;
      dist[ny][nx] = dist[cy][cx] + 1; parent[nx + "," + ny] = [cx, cy]; q.push([nx, ny]);
    });
  }
  return { dist, parent };
}
export function reconstruct(parent, from, to) {
  const path = []; let cur = [to.x, to.y];
  while (!(cur[0] === from.x && cur[1] === from.y)) {
    path.push({ x: cur[0], y: cur[1] });
    const p = parent[cur[0] + "," + cur[1]]; if (!p) break; cur = p;
  }
  path.reverse(); return path;
}
export function approachTiles(f) {
  const c = CAT[f.type], cells = [], GRID = currentGrid();
  for (let i = 0; i < c.w; i++) { cells.push({ x: f.x + i, y: f.y - 1 }); cells.push({ x: f.x + i, y: f.y + c.d }); }
  for (let j = 0; j < c.d; j++) { cells.push({ x: f.x - 1, y: f.y + j }); cells.push({ x: f.x + c.w, y: f.y + j }); }
  return cells.filter(p => p.x >= 0 && p.y >= 0 && p.x < GRID && p.y < GRID && !cellBlocked(p.x, p.y));
}
/* Bounding-Box für Klick-Erkennung */
export function furnBounds(f) {
  const c = CAT[f.type];
  const minX = isoPt(f.x, f.y + c.d).x, maxX = isoPt(f.x + c.w, f.y).x;
  const maxY = isoPt(f.x + c.w, f.y + c.d).y, minY = isoPt(f.x, f.y).y - c.hh;
  return { minX, maxX, minY, maxY };
}
export function furnitureAt(sx, sy) {
  const order = furniture.map((f, i) => ({ f, i, d: f.x + f.y })).sort((a, b) => b.d - a.d);
  for (const o of order) {
    if (CAT[o.f.type].walk) continue;
    const b = furnBounds(o.f);
    if (sx >= b.minX && sx <= b.maxX && sy >= b.minY && sy <= b.maxY) return o.f;
  }
  for (const o of order) {
    if (!CAT[o.f.type].walk) continue;
    const b = furnBounds(o.f);
    if (sx >= b.minX && sx <= b.maxX && sy >= b.minY && sy <= b.maxY) return o.f;
  }
  return null;
}
/* Freie Kachel in der Nähe der Mitte finden (Spawn) */
export function findFreeTile(px, py) {
  const GRID = currentGrid();
  const cx = clamp(Math.round(px), 0, GRID - 1), cy = clamp(Math.round(py), 0, GRID - 1);
  for (let r = 0; r < GRID; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      if (!cellBlocked(x, y)) return { x, y };
    }
  }
  return { x: Math.floor(GRID / 2), y: Math.floor(GRID / 2) };
}
