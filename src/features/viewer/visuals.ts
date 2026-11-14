/**
 * Vorbereitete Darstellung je Paletteneintrag eines Bauplans
 * (Farbe, Symbole, Kürzel, Klartext) – einmal berechnet, oft gezeichnet.
 */
import { formatBlockState, type BlockState } from '../../lib/blockstate';
import { assignLabels, styleOf, type BlockStyle } from '../../lib/blockstyle';
import { displayName } from '../../lib/names';
import { countBlocks, type Structure } from '../../lib/structure';
import { DIRECTION_DE, traitsOf, type BlockTraits } from '../../lib/traits';

export type Shape = 'full' | 'inset' | 'wire' | 'fluid';

export interface BlockVisual {
  paletteIndex: number;
  state: BlockState;
  traits: BlockTraits;
  style: BlockStyle;
  shape: Shape;
  /** Zwei Zeichen, innerhalb des Bauplans eindeutig je Block-ID. */
  label: string;
  /** Deutscher Name inklusive der wichtigsten Zustände, z. B. „Kolben → Norden“. */
  title: string;
  /** Roher Zustand in Minecraft-Syntax. */
  raw: string;
  /** Einträge mit gleichem Schlüssel teilen sich eine Legendenzeile. */
  legendKey: string;
}

/** Blöcke, die kein voller Würfel sind – sie werden kleiner gezeichnet. */
const INSET =
  /^(sugar_cane|bamboo|bamboo_sapling|cactus|kelp|kelp_plant|seagrass|tall_seagrass|wheat|carrots|potatoes|beetroots|nether_wart|cocoa|sweet_berry_bush|vine|lily_pad|pointed_dripstone|ladder|lever|rail|tripwire|tripwire_hook|string|repeater|comparator|torch|lantern|chain|iron_bars|scaffolding|.*_stem|.*_sapling|.*_mushroom|.*_torch|.*_rail|.*_button|.*_pressure_plate|.*_carpet|.*_fence|.*_fence_gate|.*_wall|.*_pane|.*_sign|.*_door|.*_trapdoor|.*_candle|.*_flower|.*_roots)$/;

function shortId(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

function shapeOf(state: BlockState, traits: BlockTraits): Shape {
  const id = shortId(state.id);
  if (traits.fluid) return 'fluid';
  if (id === 'redstone_wire') return 'wire';
  return INSET.test(id) ? 'inset' : 'full';
}

const ARROW_CHAR = { north: '↑', south: '↓', east: '→', west: '←', up: '⊙', down: '⊗' } as const;

function titleOf(state: BlockState, traits: BlockTraits): string {
  const name = displayName(state.id);
  const extras: string[] = [];
  if (traits.fluid) extras.push(traits.fluid.source ? 'Quelle' : 'fließend');
  if (traits.arrow) extras.push(`${ARROW_CHAR[traits.arrow]} ${DIRECTION_DE[traits.arrow]}`);
  if (traits.delay) extras.push(`${traits.delay} ${traits.delay === 1 ? 'Tick' : 'Ticks'}`);
  if (traits.half) extras.push(traits.half === 'top' ? 'oben' : traits.half === 'double' ? 'doppelt' : 'unten');
  if (traits.waterlogged) extras.push('mit Wasser');
  return extras.length > 0 ? `${name} (${extras.join(', ')})` : name;
}

export function buildVisuals(structure: Structure): Array<BlockVisual | null> {
  const labels = assignLabels(structure.palette.slice(1).map((s) => s.id));
  return structure.palette.map((state, paletteIndex) => {
    if (paletteIndex === 0) return null;
    const traits = traitsOf(state, structure.syntax);
    const title = titleOf(state, traits);
    return {
      paletteIndex,
      state,
      traits,
      style: styleOf(state),
      shape: shapeOf(state, traits),
      label: labels.get(state.id) ?? '?',
      title,
      raw: formatBlockState(state, structure.syntax),
      // Fließendes Wasser unterschiedlicher Stufen ergibt eine gemeinsame Legendenzeile.
      legendKey: traits.fluid && !traits.fluid.source ? `${state.id}|fließend` : `${state.id}|${title}`,
    };
  });
}

export interface LegendEntry {
  visual: BlockVisual;
  count: number;
  paletteIndices: number[];
}

/** Legende für eine Ebene (nullbasiert) oder den ganzen Bauplan, häufigste zuerst. */
export function buildLegend(structure: Structure, visuals: Array<BlockVisual | null>, layer?: number): LegendEntry[] {
  const entries = new Map<string, LegendEntry>();
  for (const [paletteIndex, count] of countBlocks(structure, layer)) {
    const visual = visuals[paletteIndex];
    if (!visual) continue;
    const entry = entries.get(visual.legendKey);
    if (entry) {
      entry.count += count;
      entry.paletteIndices.push(paletteIndex);
    } else {
      entries.set(visual.legendKey, { visual, count, paletteIndices: [paletteIndex] });
    }
  }
  return [...entries.values()].sort((a, b) => b.count - a.count || a.visual.title.localeCompare(b.visual.title, 'de'));
}
