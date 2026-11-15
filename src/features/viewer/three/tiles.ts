/**
 * Kleine Vorschaubilder der Blöcke, gerendert mit denselben Modellen wie die
 * 3D-Ansicht: von oben (für die Ebenenansicht, Norden oben) und schräg (für die Legende).
 */
import { Mesh, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { MaterialCache } from './materials';
import type { ModelResolver } from './models';

const TILE = 48;
const ICON = 64;

export interface TileSet {
  /** Ansicht von oben für die Zelle (x, y, z); null bei Luft. */
  top(x: number, y: number, z: number): HTMLCanvasElement | null;
  /** Schrägansicht eines Paletteneintrags für die Legende. */
  icon(paletteIndex: number): HTMLCanvasElement | null;
}

function snapshot(renderer: WebGLRenderer, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(renderer.domElement, 0, 0, size, size);
  return canvas;
}

/** Rendert alle im Bauplan vorkommenden Modelle einmal vor. */
export async function renderTiles(resolver: ModelResolver): Promise<TileSet> {
  const materials = new MaterialCache();
  const tops = new Map<string, HTMLCanvasElement>();
  const icons = new Map<number, HTMLCanvasElement>();
  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();

    const topCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 20);
    topCamera.position.set(0.5, 10, 0.5);
    topCamera.up.set(0, 0, -1); // Norden oben
    topCamera.lookAt(0.5, 0, 0.5);

    const isoCamera = new OrthographicCamera(-0.88, 0.88, 0.88, -0.88, 0.1, 20);
    isoCamera.position.set(0.5 + 4, 0.5 + 3.3, 0.5 + 4);
    isoCamera.lookAt(0.5, 0.5, 0.5);

    const models = resolver.allModels();
    for (const resolved of models) {
      const built = await materials.build(resolved.model);
      const mesh = new Mesh(built.geometry, built.materials);
      scene.add(mesh);
      renderer.setSize(TILE, TILE, false);
      renderer.render(scene, topCamera);
      tops.set(resolved.key, snapshot(renderer, TILE));
      if (resolved.key.endsWith('|') && !icons.has(resolved.paletteIndex)) {
        renderer.setSize(ICON, ICON, false);
        renderer.render(scene, isoCamera);
        icons.set(resolved.paletteIndex, snapshot(renderer, ICON));
      }
      scene.remove(mesh);
      built.geometry.dispose();
    }
    // Paletteneinträge, die nur mit Verbindungen vorkommen, brauchen trotzdem ein Legendenbild.
    for (let i = 1; i < resolver.structure.palette.length; i++) {
      if (icons.has(i)) continue;
      const resolved = resolver.forPalette(i);
      if (!resolved) continue;
      const built = await materials.build(resolved.model);
      const mesh = new Mesh(built.geometry, built.materials);
      scene.add(mesh);
      renderer.setSize(ICON, ICON, false);
      renderer.render(scene, isoCamera);
      icons.set(i, snapshot(renderer, ICON));
      scene.remove(mesh);
      built.geometry.dispose();
    }
  } finally {
    await materials.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }

  return {
    top: (x, y, z) => {
      const resolved = resolver.at(x, y, z);
      return resolved ? (tops.get(resolved.key) ?? null) : null;
    },
    icon: (paletteIndex) => icons.get(paletteIndex) ?? null,
  };
}
