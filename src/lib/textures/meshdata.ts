/**
 * Macht aus einem Blockmodell fertige Dreiecke: Positionen (in Blöcken, 0–1),
 * Texturkoordinaten und die für Minecraft typische Seitenschattierung.
 * Reine Rechnung ohne three.js – damit testbar.
 */
import type { BlockModel, FaceTex, Quarter, Vec3 } from './blockmodel';
import type { Face } from './pack';

export interface MeshGroup {
  /** Schlüssel des Materials: Texturpfad plus Einfärbung. */
  material: string;
  tex: FaceTex;
  /** Beidseitig sichtbar (Pflanzenkreuze, flache Flächen). */
  doubleSided: boolean;
  positions: number[];
  uvs: number[];
  /** Helligkeit je Ecke als RGB (Grauwert). */
  colors: number[];
}

/** Helligkeit der Seiten wie im Spiel: oben hell, unten dunkel. */
const SHADE: Record<Face, number> = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 };

export function materialKey(tex: FaceTex): string {
  return tex.tint ? `${tex.path}|${tex.tint.mode}|${tex.tint.color}` : tex.path;
}

function rotatePoint(p: Vec3, rotX: Quarter, rotY: Quarter): Vec3 {
  let x = p[0] - 8;
  let y = p[1] - 8;
  let z = p[2] - 8;
  // Kippen um die West-Ost-Achse: Oberseite → Norden
  for (let i = 0; i < rotX; i++) [y, z] = [z, -y];
  // Drehen um die senkrechte Achse: Norden → Osten
  for (let i = 0; i < rotY; i++) [x, z] = [-z, x];
  return [x + 8, y + 8, z + 8];
}

function faceOfNormal(n: Vec3): Face {
  const [x, y, z] = n;
  if (y > 0.5) return 'up';
  if (y < -0.5) return 'down';
  if (z < -0.5) return 'north';
  if (z > 0.5) return 'south';
  return x > 0 ? 'east' : 'west';
}

const NORMALS: Record<Face, Vec3> = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
};

/** Wohin zeigt eine Modellseite nach den Drehungen des Modells? */
export function rotatedFace(face: Face, rotX: Quarter, rotY: Quarter): Face {
  const n = NORMALS[face];
  const a = rotatePoint([n[0] + 8, n[1] + 8, n[2] + 8], rotX, rotY);
  return faceOfNormal([a[0] - 8, a[1] - 8, a[2] - 8]);
}

interface Quad {
  /** Ecken: oben links, oben rechts, unten rechts, unten links (von außen betrachtet). */
  corners: [Vec3, Vec3, Vec3, Vec3];
  /** Standardausschnitt [u0, v0, u1, v1] in Texturpixeln. */
  uv: [number, number, number, number];
}

function boxQuad(face: Face, a: Vec3, b: Vec3): Quad {
  const [x0, y0, z0] = a;
  const [x1, y1, z1] = b;
  switch (face) {
    case 'north':
      return { corners: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], uv: [16 - x1, 16 - y1, 16 - x0, 16 - y0] };
    case 'south':
      return { corners: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], uv: [x0, 16 - y1, x1, 16 - y0] };
    case 'west':
      return { corners: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]], uv: [z0, 16 - y1, z1, 16 - y0] };
    case 'east':
      return { corners: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], uv: [16 - z1, 16 - y1, 16 - z0, 16 - y0] };
    case 'up':
      return { corners: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], uv: [x0, z0, x1, z1] };
    case 'down':
      return { corners: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], uv: [x0, 16 - z1, x1, 16 - z0] };
  }
}

function clamp16(v: number): number {
  return Math.max(0, Math.min(16, v));
}

/** Zerlegt ein Modell in Dreiecksgruppen je Material. */
export function buildMeshData(model: BlockModel): MeshGroup[] {
  const groups = new Map<string, MeshGroup>();
  const groupFor = (tex: FaceTex, doubleSided: boolean): MeshGroup => {
    const key = `${materialKey(tex)}${doubleSided ? '|2' : ''}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { material: key, tex, doubleSided, positions: [], uvs: [], colors: [] }));
    return g;
  };

  const emit = (quad: Quad, tex: FaceTex, shade: number, doubleSided: boolean): void => {
    const g = groupFor(tex, doubleSided);
    const [u0, v0, u1, v1] = (tex.uv ?? quad.uv).map(clamp16) as [number, number, number, number];
    // Texturecken in der Reihenfolge der Quad-Ecken; v zählt in WebGL von unten.
    let uv: Array<[number, number]> = [
      [u0 / 16, 1 - v0 / 16],
      [u1 / 16, 1 - v0 / 16],
      [u1 / 16, 1 - v1 / 16],
      [u0 / 16, 1 - v1 / 16],
    ];
    // Drehung im Uhrzeigersinn: Jede Ecke zeigt, was vorher an der Ecke davor lag.
    for (let i = 0; i < (tex.rot ?? 0) / 90; i++) uv = [uv[3]!, uv[0]!, uv[1]!, uv[2]!];
    const pts = quad.corners.map((c) => rotatePoint(c, model.rotX, model.rotY));
    for (const i of [0, 3, 2, 0, 2, 1]) {
      const pt = pts[i]!;
      g.positions.push(pt[0] / 16, pt[1] / 16, pt[2] / 16);
      g.uvs.push(uv[i]![0], uv[i]![1]);
      g.colors.push(shade, shade, shade);
    }
  };

  for (const element of model.elements) {
    if (element.type === 'cross') {
      const [x0, y0, z0] = element.from;
      const [x1, y1, z1] = element.to;
      const uv: [number, number, number, number] = [0, 0, 16, 16];
      emit({ corners: [[x0, y1, z0], [x1, y1, z1], [x1, y0, z1], [x0, y0, z0]], uv }, element.tex, 1, true);
      emit({ corners: [[x0, y1, z1], [x1, y1, z0], [x1, y0, z0], [x0, y0, z1]], uv }, element.tex, 1, true);
      continue;
    }
    const flat = element.from[0] === element.to[0] || element.from[1] === element.to[1] || element.from[2] === element.to[2];
    for (const face of Object.keys(element.faces) as Face[]) {
      const tex = element.faces[face];
      if (!tex) continue;
      // Bei flachen Elementen (Schiene, Redstone) genügt eine beidseitige Fläche.
      if (flat && (face === 'down' || face === 'south' || face === 'east') && Object.keys(element.faces).length > 1) continue;
      const shade = flat ? 1 : SHADE[rotatedFace(face, model.rotX, model.rotY)];
      emit(boxQuad(face, element.from, element.to), tex, shade, flat || model.layer !== 'opaque');
    }
  }
  return [...groups.values()];
}
