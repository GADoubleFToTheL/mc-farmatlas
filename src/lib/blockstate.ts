/**
 * Blockzustände lesen und schreiben.
 *
 * Java-Syntax:    minecraft:repeater[facing=north,delay=2]
 * Bedrock-Syntax: minecraft:unpowered_repeater["minecraft:cardinal_direction"="north","repeater_delay"=1]
 *
 * Intern sind alle Eigenschaftswerte Strings ("true", "2", "north").
 */

export type StateSyntax = 'java' | 'bedrock';

export interface BlockState {
  /** Immer mit Namensraum, z. B. "minecraft:observer". */
  id: string;
  props: Record<string, string>;
}

const ID_RE = /^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

export class BlockStateError extends Error {}

function normalizeId(raw: string, input: string): string {
  const id = raw.trim();
  if (!ID_RE.test(id)) throw new BlockStateError(`Ungültige Block-ID in "${input}"`);
  return id.includes(':') ? id : `minecraft:${id}`;
}

function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of body) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') out.push(current);
  return out;
}

function unquote(s: string): string {
  const t = s.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

export function parseBlockState(input: string, syntax: StateSyntax = 'java'): BlockState {
  const text = input.trim();
  const open = text.indexOf('[');
  if (open === -1) return { id: normalizeId(text, input), props: {} };
  if (!text.endsWith(']')) throw new BlockStateError(`Schließende Klammer fehlt in "${input}"`);

  const id = normalizeId(text.slice(0, open), input);
  const body = text.slice(open + 1, -1);
  const props: Record<string, string> = {};
  for (const pair of splitTopLevel(body)) {
    const eq = pair.indexOf('=');
    if (eq === -1) throw new BlockStateError(`Eigenschaft ohne "=" in "${input}"`);
    const key = unquote(pair.slice(0, eq));
    const value = unquote(pair.slice(eq + 1));
    if (key === '' || value === '') throw new BlockStateError(`Leere Eigenschaft in "${input}"`);
    if (syntax === 'java' && !/^[a-z0-9_]+$/.test(key)) {
      throw new BlockStateError(`Ungültiger Eigenschaftsname "${key}" in "${input}"`);
    }
    if (key in props) throw new BlockStateError(`Eigenschaft "${key}" doppelt in "${input}"`);
    props[key] = value;
  }
  return { id, props };
}

export function formatBlockState(state: BlockState, syntax: StateSyntax = 'java'): string {
  const keys = Object.keys(state.props).sort();
  if (keys.length === 0) return state.id;
  const body =
    syntax === 'java'
      ? keys.map((k) => `${k}=${state.props[k]}`).join(',')
      : keys
          .map((k) => {
            const v = state.props[k]!;
            const literal = /^(true|false|-?\d+)$/.test(v) ? v : `"${v}"`;
            return `"${k}"=${literal}`;
          })
          .join(',');
  return `${state.id}[${body}]`;
}

const AIR_IDS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

export function isAir(state: BlockState): boolean {
  return AIR_IDS.has(state.id);
}
