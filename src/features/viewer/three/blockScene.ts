/**
 * Baut aus einem Bauplan eine three.js-Szene: je Blockmodell ein InstancedMesh.
 * Wird von der 3D-Vorschau, dem Bau-Modus und den kleinen Vorschaubildern genutzt.
 */
import { Color, InstancedMesh, Matrix4, type Object3D, type Raycaster, type Scene } from 'three';
import { blockIndex, type Structure } from '../../../lib/structure';
import { MaterialCache, type BuiltModel } from './materials';
import type { ModelResolver, ResolvedModel } from './models';

export interface SceneOptions {
  /** Gezeigt werden die Ebenen 0 … maxLayer (nullbasiert). */
  maxLayer: number;
  /** Ebenen unter maxLayer abdunkeln, damit die aktuelle Ebene hervorsticht. */
  dimBelow: boolean;
  /** Nur diese Palettenindizes voll zeigen, alles andere abdunkeln. */
  highlight?: ReadonlySet<number> | null;
}

export interface PickResult {
  x: number;
  y: number;
  z: number;
}

export class BlockScene {
  readonly materials = new MaterialCache();
  private readonly built = new Map<string, BuiltModel>();
  private meshes: InstancedMesh[] = [];
  private readonly positions = new Map<InstancedMesh, Int32Array>();
  private readonly structure: Structure;

  constructor(private readonly resolver: ModelResolver) {
    this.structure = resolver.structure;
  }

  /** Lädt alle benötigten Texturen und bereitet die Geometrien vor. */
  async prepare(): Promise<void> {
    for (const resolved of this.resolver.allModels()) await this.builtFor(resolved);
  }

  async builtFor(resolved: ResolvedModel): Promise<BuiltModel> {
    let b = this.built.get(resolved.key);
    if (!b) {
      b = await this.materials.build(resolved.model);
      this.built.set(resolved.key, b);
    }
    return b;
  }

  /** Setzt die Instanzen neu (z. B. nach einem Ebenenwechsel). Vorher `prepare()` aufrufen. */
  update(scene: Scene, options: SceneOptions): void {
    this.clear(scene);
    const { size } = this.structure;
    const top = Math.min(options.maxLayer, size.y - 1);
    const groups = new Map<string, { resolved: ResolvedModel; cells: number[] }>();
    const r = this.resolver;
    const hidden = (x: number, y: number, z: number): boolean =>
      y < top &&
      r.isSolid(x + 1, y, z) && r.isSolid(x - 1, y, z) && r.isSolid(x, y + 1, z) &&
      r.isSolid(x, y - 1, z) && r.isSolid(x, y, z + 1) && r.isSolid(x, y, z - 1);

    for (let y = 0; y <= top; y++) {
      for (let z = 0; z < size.z; z++) {
        for (let x = 0; x < size.x; x++) {
          const resolved = r.at(x, y, z);
          if (!resolved || hidden(x, y, z)) continue;
          let g = groups.get(resolved.key);
          if (!g) groups.set(resolved.key, (g = { resolved, cells: [] }));
          g.cells.push(x, y, z);
        }
      }
    }

    const matrix = new Matrix4();
    const full = new Color(1, 1, 1);
    const dim = new Color(0.42, 0.42, 0.45);
    for (const { resolved, cells } of groups.values()) {
      const b = this.built.get(resolved.key);
      if (!b) continue;
      const count = cells.length / 3;
      const mesh = new InstancedMesh(b.geometry, b.materials, count);
      const blend = resolved.model.layer === 'blend';
      mesh.renderOrder = blend ? 1 : 0;
      for (let i = 0; i < count; i++) {
        const x = cells[i * 3]!;
        const y = cells[i * 3 + 1]!;
        const z = cells[i * 3 + 2]!;
        matrix.makeTranslation(x, y, z);
        mesh.setMatrixAt(i, matrix);
        const dimmed =
          (options.dimBelow && y < top) || (options.highlight != null && !options.highlight.has(resolved.paletteIndex));
        mesh.setColorAt(i, dimmed ? dim : full);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      this.meshes.push(mesh);
      this.positions.set(mesh, Int32Array.from(cells));
    }
  }

  /** Welcher Block liegt unter dem Zeiger? */
  pick(raycaster: Raycaster): PickResult | null {
    const hits = raycaster.intersectObjects(this.meshes as Object3D[], false);
    for (const hit of hits) {
      const cells = this.positions.get(hit.object as InstancedMesh);
      if (!cells || hit.instanceId === undefined) continue;
      return { x: cells[hit.instanceId * 3]!, y: cells[hit.instanceId * 3 + 1]!, z: cells[hit.instanceId * 3 + 2]! };
    }
    return null;
  }

  blockIndexOf(p: PickResult): number {
    return blockIndex(this.structure.size, p.x, p.y, p.z);
  }

  private clear(scene: Scene): void {
    for (const m of this.meshes) {
      scene.remove(m);
      m.dispose();
    }
    this.meshes = [];
    this.positions.clear();
  }

  async dispose(scene?: Scene): Promise<void> {
    if (scene) this.clear(scene);
    for (const b of this.built.values()) b.geometry.dispose();
    this.built.clear();
    await this.materials.dispose();
  }
}
