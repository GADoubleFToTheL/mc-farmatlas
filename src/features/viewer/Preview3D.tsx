/**
 * 3D-Vorschau mit einfachen farbigen Blöcken (keine Texturen).
 * Wird nur bei Bedarf geladen und nur neu gezeichnet, wenn sich etwas ändert –
 * das schont den Akku am Handy.
 */
import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { paletteIndexAt, type Structure } from '../../lib/structure';
import type { BlockVisual } from './visuals';

interface Props {
  structure: Structure;
  visuals: Array<BlockVisual | null>;
  /** Gezeigt werden die Ebenen 0 … maxLayer (nullbasiert). */
  maxLayer: number;
  start: { x: number; y: number; z: number };
  className?: string;
}

type Kind = 'full' | 'small' | 'flat' | 'fluid' | 'slabBottom' | 'slabTop';

function kindOf(v: BlockVisual): Kind {
  if (v.shape === 'fluid') return 'fluid';
  if (v.shape === 'wire') return 'flat';
  if (v.shape === 'inset') return 'small';
  const id = v.state.id;
  if (id.endsWith('_slab') && v.traits.half === 'top') return 'slabTop';
  if (id.endsWith('_slab') && v.traits.half === 'bottom') return 'slabBottom';
  return 'full';
}

/** [Breite, Höhe, Tiefe, Verschiebung nach oben] je Darstellungsart. */
const SHAPES: Record<Kind, [number, number, number, number]> = {
  full: [1, 1, 1, 0],
  small: [0.5, 0.9, 0.5, -0.05],
  flat: [0.8, 0.08, 0.8, -0.46],
  fluid: [1, 0.86, 1, -0.07],
  slabBottom: [1, 0.5, 1, -0.25],
  slabTop: [1, 0.5, 1, 0.25],
};

export default function Preview3D({ structure, visuals, maxLayer, start, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ rebuild: (maxLayer: number) => void } | null>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      container.textContent = 'Die 3D-Vorschau braucht WebGL – das stellt dieser Browser gerade nicht bereit.';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('aria-label', '3D-Vorschau des Bauplans; ziehen dreht, zwei Finger zoomen');
    renderer.domElement.setAttribute('role', 'img');

    const { size } = structure;
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(-0.6, 1, 0.8);
    scene.add(sun);

    const span = Math.max(size.x, size.y, size.z);
    const camera = new PerspectiveCamera(42, 1, 0.1, span * 12 + 50);
    // Blick von Südosten schräg oben; Norden (−z) liegt hinten.
    camera.position.set(size.x / 2 + span * 1.1, size.y / 2 + span * 0.95, size.z / 2 + span * 1.25);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(size.x / 2, size.y / 2, size.z / 2);
    controls.enableDamping = false;
    controls.maxDistance = span * 6 + 20;
    controls.minDistance = 2;
    controls.update();

    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => renderer.render(scene, camera));
    };
    controls.addEventListener('change', render);

    // Pfeil am Boden: zeigt nach Norden
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6cc566';
    const arrow = new Mesh(new ConeGeometry(Math.max(0.4, span * 0.04), Math.max(1.2, span * 0.12), 4), new MeshBasicMaterial({ color: accent }));
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(size.x / 2, 0, -Math.max(1.5, span * 0.12));
    scene.add(arrow);

    // Startblock: kleiner Würfel in Akzentfarbe über dem Block
    const marker = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), new MeshBasicMaterial({ color: accent }));
    scene.add(marker);

    const geometries = new Map<Kind, BufferGeometry>();
    const materials: Material[] = [];
    let meshes: InstancedMesh[] = [];
    const matrix = new Matrix4();
    const color = new Color();

    const isFullCube = (x: number, y: number, z: number, top: number): boolean => {
      if (y > top) return false;
      const v = visuals[paletteIndexAt(structure, x, y, z)];
      return !!v && kindOf(v) === 'full' && !/glass|ice|leaves|slime|honey/.test(v.state.id);
    };

    const rebuild = (top: number) => {
      for (const m of meshes) {
        scene.remove(m);
        m.dispose();
      }
      meshes = [];
      const groups = new Map<Kind, Array<{ x: number; y: number; z: number; v: BlockVisual }>>();
      for (let y = 0; y <= Math.min(top, size.y - 1); y++) {
        for (let z = 0; z < size.z; z++) {
          for (let x = 0; x < size.x; x++) {
            const v = visuals[paletteIndexAt(structure, x, y, z)];
            if (!v) continue;
            // Vollständig verdeckte Blöcke auslassen
            if (
              isFullCube(x + 1, y, z, top) && isFullCube(x - 1, y, z, top) && isFullCube(x, y + 1, z, top) &&
              isFullCube(x, y - 1, z, top) && isFullCube(x, y, z + 1, top) && isFullCube(x, y, z - 1, top)
            ) {
              continue;
            }
            const kind = kindOf(v);
            let list = groups.get(kind);
            if (!list) groups.set(kind, (list = []));
            list.push({ x, y, z, v });
          }
        }
      }
      for (const [kind, list] of groups) {
        const [w, h, d, dy] = SHAPES[kind];
        let geometry = geometries.get(kind);
        if (!geometry) geometries.set(kind, (geometry = new BoxGeometry(w, h, d)));
        const material = new MeshLambertMaterial({ transparent: kind === 'fluid', opacity: kind === 'fluid' ? 0.6 : 1 });
        materials.push(material);
        const mesh = new InstancedMesh(geometry, material, list.length);
        list.forEach((b, i) => {
          matrix.makeTranslation(b.x + 0.5, b.y + 0.5 + dy, b.z + 0.5);
          mesh.setMatrixAt(i, matrix);
          // Schachbrett-Schattierung, damit gleichfarbige Nachbarn unterscheidbar bleiben
          color.set(b.v.style.color).multiplyScalar((b.x + b.y + b.z) % 2 === 0 ? 1 : 0.9);
          mesh.setColorAt(i, color);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        scene.add(mesh);
        meshes.push(mesh);
      }
      marker.visible = start.y <= top;
      marker.position.set(start.x + 0.5, start.y + 1.25, start.z + 0.5);
      render();
    };
    api.current = { rebuild };

    const resize = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    });
    resize.observe(container);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    return () => {
      api.current = null;
      resize.disconnect();
      cancelAnimationFrame(frame);
      controls.dispose();
      for (const m of meshes) m.dispose();
      for (const g of geometries.values()) g.dispose();
      for (const m of materials) m.dispose();
      arrow.geometry.dispose();
      marker.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [structure, visuals, start]);

  useEffect(() => {
    api.current?.rebuild(maxLayer);
  }, [maxLayer, structure, visuals, start]);

  return <div ref={host} className={className} />;
}
