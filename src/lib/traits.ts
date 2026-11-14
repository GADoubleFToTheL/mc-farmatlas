/**
 * Übersetzt Blockzustände in das, was der Ebenen-Viewer zeigt:
 * Pfeil, Verzögerung, obere/untere Hälfte, Flüssigkeit – plus Klartext
 * für die Anzeige beim Antippen.
 */
import type { BlockState, StateSyntax } from './blockstate';

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export const DIRECTION_DE: Record<Direction, string> = {
  north: 'Norden',
  south: 'Süden',
  east: 'Osten',
  west: 'Westen',
  up: 'oben',
  down: 'unten',
};

const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
};

export function opposite(d: Direction): Direction {
  return OPPOSITE[d];
}

export function isDirection(v: string | undefined): v is Direction {
  return v !== undefined && v in OPPOSITE;
}

export interface FluidTrait {
  kind: 'water' | 'lava';
  /** true = Quellblock, false = fließend. */
  source: boolean;
  /** 0 = Quelle, 1–7 = fließend (höher = flacher), 8 = fallend. */
  level: number;
}

export interface BlockTraits {
  /** Pfeil in der Draufsicht. Bei Verstärker/Komparator die Signalrichtung. */
  arrow?: Direction;
  /** Verzögerung eines Verstärkers in Redstone-Ticks (1–4). */
  delay?: number;
  /** Stufen, Treppen, Falltüren: oben, unten oder doppelt. */
  half?: 'top' | 'bottom' | 'double';
  fluid?: FluidTrait;
  waterlogged?: boolean;
  /** Redstone-Leitung: Seiten, zu denen sie verbunden ist. */
  wire?: Direction[];
  /** Klartext für die Detailanzeige. */
  details: string[];
}

function toward(d: Direction): string {
  return `nach ${DIRECTION_DE[d]}`;
}

const SHORT_ID = (id: string): string => id.replace(/^minecraft:/, '');

function javaTraits(state: BlockState): BlockTraits {
  const id = SHORT_ID(state.id);
  const p = state.props;
  const t: BlockTraits = { details: [] };
  const facing = isDirection(p.facing) ? p.facing : undefined;

  if (id === 'water' || id === 'lava') {
    const level = Number(p.level ?? 0);
    const source = level === 0;
    t.fluid = { kind: id, source, level: Math.min(level, 8) };
    t.details.push(
      source ? 'Quellblock (mit Eimer platzieren)' : level >= 8 ? 'fallend' : `fließend (Stufe ${level} von 7)`,
    );
    return t;
  }

  if (facing) {
    if (id === 'repeater' || id === 'comparator') {
      t.arrow = opposite(facing);
      t.details.push(`Signal fließt ${toward(t.arrow)}`);
    } else {
      t.arrow = facing;
      if (id === 'observer') {
        t.details.push(
          `Gesicht (beobachtet) ${toward(facing)}, Signal kommt hinten heraus (${DIRECTION_DE[opposite(facing)]})`,
        );
      } else if (id === 'piston' || id === 'sticky_piston') {
        t.details.push(`Schiebt ${toward(facing)}`);
      } else if (id === 'hopper') {
        t.details.push(`Gibt Items ${toward(facing)} ab`);
      } else if (id === 'dispenser' || id === 'dropper') {
        t.details.push(`Öffnung zeigt ${toward(facing)}`);
      } else if (id.endsWith('_stairs')) {
        t.details.push(`Hohe Seite ${toward(facing).replace('nach ', 'im ')}`);
      } else {
        t.details.push(`Ausrichtung: ${DIRECTION_DE[facing]}`);
      }
    }
  }

  if (id === 'repeater') {
    t.delay = Math.min(4, Math.max(1, Number(p.delay ?? 1)));
    t.details.push(`Verzögerung: ${t.delay} ${t.delay === 1 ? 'Tick' : 'Ticks'} (${t.delay - 1}× Rechtsklick)`);
    if (p.locked === 'true') t.details.push('gesperrt');
  }
  if (id === 'comparator') {
    t.details.push(p.mode === 'subtract' ? 'Modus: Subtrahieren (Lämpchen an)' : 'Modus: Vergleichen (Lämpchen aus)');
  }

  if (id.endsWith('_slab')) {
    t.half = p.type === 'top' ? 'top' : p.type === 'double' ? 'double' : 'bottom';
    t.details.push(t.half === 'top' ? 'obere Stufe' : t.half === 'double' ? 'Doppelstufe' : 'untere Stufe');
  } else if (p.half === 'top' || p.half === 'bottom') {
    t.half = p.half;
    t.details.push(p.half === 'top' ? 'obere Hälfte (kopfüber)' : 'untere Hälfte');
  }

  if (id === 'redstone_wire') {
    const sides = (['north', 'east', 'south', 'west'] as const).filter((d) => p[d] === 'side' || p[d] === 'up');
    if (sides.length > 0) t.wire = [...sides];
  }

  if (p.waterlogged === 'true') {
    t.waterlogged = true;
    t.details.push('mit Wasser gefüllt');
  }
  if (p.axis) t.details.push(`Achse: ${p.axis === 'y' ? 'senkrecht' : p.axis === 'x' ? 'West–Ost' : 'Nord–Süd'}`);
  if (p.open === 'true') t.details.push('geöffnet');
  if (p.lit === 'true') t.details.push('an');
  if (p.thickness === 'tip' && p.vertical_direction) {
    t.details.push(p.vertical_direction === 'down' ? 'hängt von der Decke (Spitze unten)' : 'steht auf dem Boden');
  }
  return t;
}

/**
 * Bedrock-Zustände: Die vollständige Zuordnung folgt mit dem Schematic-Import
 * (Phase 2). Bis dahin werden die Rohwerte angezeigt.
 */
function bedrockTraits(_state: BlockState): BlockTraits {
  return { details: [] };
}

export function traitsOf(state: BlockState, syntax: StateSyntax): BlockTraits {
  return syntax === 'java' ? javaTraits(state) : bedrockTraits(state);
}
