/** three.js-Materialien und -Geometrien aus Blockmodellen. */
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
  type Material,
} from 'three';
import type { BlockModel } from '../../../lib/textures/blockmodel';
import { buildMeshData, type MeshGroup } from '../../../lib/textures/meshdata';
import { loadTexture } from '../../textures/textureStore';

export interface BuiltModel {
  geometry: BufferGeometry;
  materials: Material[];
}

export class MaterialCache {
  private readonly materials = new Map<string, Promise<Material>>();
  private readonly textures: CanvasTexture[] = [];

  private create(group: MeshGroup, layer: BlockModel['layer']): Promise<Material> {
    const key = `${group.material}|${layer}`;
    let promise = this.materials.get(key);
    if (!promise) {
      promise = (async () => {
        const side = group.doubleSided || layer !== 'opaque' ? DoubleSide : FrontSide;
        const options = {
          vertexColors: true,
          side,
          transparent: layer === 'blend',
          opacity: layer === 'blend' ? 0.72 : 1,
          alphaTest: layer === 'cutout' ? 0.4 : 0,
          depthWrite: layer !== 'blend',
        };
        const { path, tint } = group.tex;
        // Pfade mit „#“ sind einfache Farben (Ersatzdarstellung ohne Texturen).
        if (path.startsWith('#')) return new MeshBasicMaterial({ ...options, color: path });
        const canvas = await loadTexture(path, tint);
        if (!canvas) return new MeshBasicMaterial({ ...options, color: '#c84bd0' });
        const map = new CanvasTexture(canvas);
        map.magFilter = NearestFilter;
        map.minFilter = NearestFilter;
        map.generateMipmaps = false;
        map.colorSpace = SRGBColorSpace;
        this.textures.push(map);
        return new MeshBasicMaterial({ ...options, map });
      })();
      this.materials.set(key, promise);
    }
    return promise;
  }

  /** Geometrie mit einer Gruppe je Material, plus die passenden Materialien. */
  async build(model: BlockModel): Promise<BuiltModel> {
    const groups = buildMeshData(model);
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const geometry = new BufferGeometry();
    const materials: Material[] = [];
    for (const group of groups) {
      geometry.addGroup(positions.length / 3, group.positions.length / 3, materials.length);
      positions.push(...group.positions);
      uvs.push(...group.uvs);
      colors.push(...group.colors);
      materials.push(await this.create(group, model.layer));
    }
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return { geometry, materials };
  }

  async dispose(): Promise<void> {
    for (const t of this.textures) t.dispose();
    for (const m of this.materials.values()) (await m).dispose();
    this.materials.clear();
  }
}
