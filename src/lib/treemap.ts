// Carte proportionnelle (« treemap ») — algorithme « squarified » de Bruls, Huizing et van Wijk.
// Les rectangles sont exprimés dans le repère de la zone fournie.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placed<T> = T & Rect;

function worst(row: number[], side: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = s * s;
  const side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}

/** Répartit les éléments (triés par valeur décroissante) dans le rectangle donné. */
export function squarify<T extends { value: number }>(items: T[], box: Rect): Placed<T>[] {
  const list = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = list.reduce((s, i) => s + i.value, 0);
  if (!list.length || box.w <= 0 || box.h <= 0) return [];
  const scale = (box.w * box.h) / total;
  const areas = list.map((i) => i.value * scale);
  const out: Placed<T>[] = [];
  let { x, y, w, h } = box;
  let i = 0;
  while (i < list.length) {
    const side = Math.min(w, h);
    const row: number[] = [areas[i]];
    let j = i + 1;
    while (j < list.length && worst([...row, areas[j]], side) <= worst(row, side)) {
      row.push(areas[j]);
      j++;
    }
    const sum = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      // Colonne à gauche
      const cw = sum / h;
      let cy = y;
      for (let k = 0; k < row.length; k++) {
        const ch = row[k] / cw;
        out.push({ ...list[i + k], x, y: cy, w: cw, h: ch });
        cy += ch;
      }
      x += cw;
      w -= cw;
    } else {
      // Ligne en haut
      const rh = sum / w;
      let cx = x;
      for (let k = 0; k < row.length; k++) {
        const rw = row[k] / rh;
        out.push({ ...list[i + k], x: cx, y, w: rw, h: rh });
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
    i = j;
  }
  return out;
}
