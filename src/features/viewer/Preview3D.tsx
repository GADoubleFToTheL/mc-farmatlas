/**
 * 3D-Ansicht des Bauplans. Mit geladenem Texturpaket sehen die Blöcke aus wie im
 * Spiel, sonst werden einfache farbige Blöcke gezeigt.
 * Gezeichnet wird nur, wenn sich etwas ändert – das schont den Akku am Handy.
 */
import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry,
  ConeGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Structure } from '../../lib/structure';
import type { PackIndex } from '../../lib/textures/pack';
import { BlockScene, type PickResult, type SceneOptions } from './three/blockScene';
import { ModelResolver } from './three/models';
import type { BlockVisual } from './visuals';

interface Props {
  structure: Structure;
  visuals: Array<BlockVisual | null>;
  /** Texturpaket; null = einfache farbige Blöcke. */
  pack: PackIndex | null;
  /** Gezeigt werden die Ebenen 0 … maxLayer (nullbasiert). */
  maxLayer: number;
  start: { x: number; y: number; z: number };
  /** Ebenen unter der aktuellen abdunkeln. */
  dimBelow?: boolean;
  /** Ebenen über der aktuellen durchscheinend andeuten. */
  ghostAbove?: boolean;
  highlight?: ReadonlySet<number> | null;
  selected?: PickResult | null;
  /** Antippen eines Blocks (null = daneben getippt). */
  onPick?: (block: PickResult | null) => void;
  className?: string;
}

interface Api {
  update: (options: SceneOptions, selected: PickResult | null) => void;
}

export default function Preview3D({
  structure,
  visuals,
  pack,
  maxLayer,
  start,
  dimBelow = false,
  ghostAbove = false,
  highlight = null,
  selected = null,
  onPick,
  className,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [state, setState] = useState<'laedt' | 'bereit' | 'fehler'>('laedt');
  const latest = useRef({ maxLayer, dimBelow, ghostAbove, highlight, selected, onPick });
  latest.current = { maxLayer, dimBelow, ghostAbove, highlight, selected, onPick };

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setState('fehler');
      return;
    }
    setState('laedt');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    container.appendChild(canvas);
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D-Ansicht des Bauplans; ziehen dreht, zwei Finger zoomen, antippen zeigt den Block');

    const { size } = structure;
    const scene = new Scene();
    const span = Math.max(size.x, size.y, size.z);
    const camera = new PerspectiveCamera(42, 1, 0.1, span * 12 + 50);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(size.x / 2, size.y / 2, size.z / 2);
    controls.enableDamping = false;
    controls.maxDistance = span * 6 + 20;
    controls.minDistance = 1.5;
    // Blick von Südosten schräg oben; Norden (−z) liegt hinten. Der Abstand wird so
    // gewählt, dass der ganze Bauplan gerade ins Bild passt.
    const radius = Math.hypot(size.x, size.y, size.z) / 2;
    let touched = false;
    controls.addEventListener('start', () => {
      touched = true;
    });
    const frameAll = () => {
      const vertical = (camera.fov * Math.PI) / 180;
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      const distance = Math.min(controls.maxDistance, (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 0.92);
      const dir = { x: 0.55, y: 0.55, z: 0.63 };
      const length = Math.hypot(dir.x, dir.y, dir.z);
      camera.position.set(
        size.x / 2 + (dir.x / length) * distance,
        size.y / 2 + (dir.y / length) * distance,
        size.z / 2 + (dir.z / length) * distance,
      );
      controls.update();
    };
    frameAll();

    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => renderer.render(scene, camera));
    };
    controls.addEventListener('change', render);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6cc566';
    // Pfeil am Boden: zeigt nach Norden
    const arrow = new Mesh(new ConeGeometry(Math.max(0.35, span * 0.035), Math.max(1.1, span * 0.11), 4), new MeshBasicMaterial({ color: accent }));
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(size.x / 2, 0.1, -Math.max(1.4, span * 0.1));
    scene.add(arrow);
    // Startblock und Auswahl als Rahmen
    const frameGeometry = new EdgesGeometry(new BoxGeometry(1.04, 1.04, 1.04));
    const startFrame = new LineSegments(frameGeometry, new LineBasicMaterial({ color: accent }));
    startFrame.position.set(start.x + 0.5, start.y + 0.5, start.z + 0.5);
    scene.add(startFrame);
    const selectFrame = new LineSegments(frameGeometry, new LineBasicMaterial({ color: '#ffffff' }));
    selectFrame.visible = false;
    scene.add(selectFrame);

    const blocks = new BlockScene(new ModelResolver(structure, visuals, pack));
    const update = (options: SceneOptions, sel: PickResult | null) => {
      blocks.update(scene, options);
      startFrame.visible = start.y <= options.maxLayer;
      selectFrame.visible = sel !== null && sel.y <= options.maxLayer;
      if (sel) selectFrame.position.set(sel.x + 0.5, sel.y + 0.5, sel.z + 0.5);
      render();
    };

    void blocks.prepare().then(() => {
      if (disposed) return;
      const l = latest.current;
      api.current = { update };
      update({ maxLayer: l.maxLayer, dimBelow: l.dimBelow, ghostAbove: l.ghostAbove, highlight: l.highlight }, l.selected);
      setState('bereit');
    });

    // Antippen: kurzer Druck ohne Bewegung
    const raycaster = new Raycaster();
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || !latest.current.onPick) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
      latest.current.onPick(blocks.pick(raycaster));
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    const resize = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!touched) frameAll();
      render();
    });
    resize.observe(container);

    return () => {
      disposed = true;
      api.current = null;
      resize.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.dispose();
      void blocks.dispose(scene);
      arrow.geometry.dispose();
      frameGeometry.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [structure, visuals, pack, start]);

  useEffect(() => {
    api.current?.update({ maxLayer, dimBelow, ghostAbove, highlight }, selected);
  }, [maxLayer, dimBelow, ghostAbove, highlight, selected]);

  return (
    <div ref={host} className={`relative ${className ?? ''}`}>
      {state !== 'bereit' && (
        <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
          {state === 'laedt' ? 'Lade 3D-Ansicht …' : 'Die 3D-Ansicht braucht WebGL – das stellt dieser Browser gerade nicht bereit.'}
        </p>
      )}
    </div>
  );
}
