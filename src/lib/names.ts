/**
 * Deutsche Anzeigenamen für Block- und Item-IDs (handgepflegt).
 * Fehlt ein Eintrag, wird die ID ohne Namensraum angezeigt.
 */
const NAMES: Record<string, string> = {
  'farmatlas:xp': 'Erfahrung (XP)',
  // Naturblöcke
  stone: 'Stein',
  cobblestone: 'Bruchstein',
  mossy_cobblestone: 'Bemooster Bruchstein',
  smooth_stone: 'Glatter Stein',
  stone_bricks: 'Steinziegel',
  deepslate: 'Tiefenschiefer',
  cobbled_deepslate: 'Bruchtiefenschiefer',
  dirt: 'Erde',
  coarse_dirt: 'Grobe Erde',
  grass_block: 'Grasblock',
  podzol: 'Podsol',
  mud: 'Schlamm',
  moss_block: 'Moosblock',
  farmland: 'Ackerboden',
  sand: 'Sand',
  red_sand: 'Roter Sand',
  gravel: 'Kies',
  clay: 'Ton',
  obsidian: 'Obsidian',
  basalt: 'Basalt',
  netherrack: 'Netherrack',
  soul_sand: 'Seelensand',
  soul_soil: 'Seelenerde',
  magma_block: 'Magmablock',
  ice: 'Eis',
  packed_ice: 'Packeis',
  blue_ice: 'Blaueis',
  snow_block: 'Schneeblock',
  dripstone_block: 'Tropfsteinblock',
  pointed_dripstone: 'Spitzer Tropfstein',
  glass: 'Glas',
  glass_pane: 'Glasscheibe',
  tinted_glass: 'Getöntes Glas',
  glowstone: 'Leuchtstein',
  sea_lantern: 'Seelaterne',
  jack_o_lantern: 'Kürbislaterne',
  torch: 'Fackel',
  lantern: 'Laterne',
  water: 'Wasser',
  lava: 'Lava',
  // Pflanzen
  sugar_cane: 'Zuckerrohr',
  bamboo: 'Bambus',
  cactus: 'Kaktus',
  kelp: 'Seetang',
  kelp_plant: 'Seetang',
  pumpkin: 'Kürbis',
  carved_pumpkin: 'Geschnitzter Kürbis',
  melon: 'Melone',
  melon_slice: 'Melonenscheibe',
  melon_stem: 'Melonenpflanze',
  pumpkin_stem: 'Kürbispflanze',
  melon_seeds: 'Melonenkerne',
  pumpkin_seeds: 'Kürbiskerne',
  wheat: 'Weizen',
  wheat_seeds: 'Weizenkörner',
  carrot: 'Karotte',
  carrots: 'Karotten',
  potato: 'Kartoffel',
  potatoes: 'Kartoffeln',
  beetroot: 'Rote Bete',
  beetroots: 'Rote Bete',
  beetroot_seeds: 'Rote-Bete-Samen',
  nether_wart: 'Netherwarze',
  cocoa_beans: 'Kakaobohnen',
  sweet_berries: 'Süßbeeren',
  glow_berries: 'Leuchtbeeren',
  brown_mushroom: 'Brauner Pilz',
  red_mushroom: 'Roter Pilz',
  vine: 'Ranken',
  lily_pad: 'Seerosenblatt',
  oak_log: 'Eichenstamm',
  oak_leaves: 'Eichenlaub',
  oak_sapling: 'Eichensetzling',
  // Holz und Bauteile
  oak_planks: 'Eichenholzbretter',
  spruce_planks: 'Fichtenholzbretter',
  oak_slab: 'Eichenholzstufe',
  oak_stairs: 'Eichenholztreppe',
  oak_fence: 'Eichenholzzaun',
  oak_fence_gate: 'Eichenholzzauntor',
  oak_trapdoor: 'Eichenholzfalltür',
  oak_door: 'Eichenholztür',
  oak_sign: 'Eichenholzschild',
  oak_button: 'Eichenholzknopf',
  oak_pressure_plate: 'Eichenholzdruckplatte',
  stone_slab: 'Steinstufe',
  smooth_stone_slab: 'Glatte Steinstufe',
  cobblestone_slab: 'Bruchsteinstufe',
  cobblestone_stairs: 'Bruchsteintreppe',
  cobblestone_wall: 'Bruchsteinmauer',
  stone_brick_slab: 'Steinziegelstufe',
  stone_button: 'Steinknopf',
  stone_pressure_plate: 'Steindruckplatte',
  iron_bars: 'Eisengitter',
  iron_trapdoor: 'Eisenfalltür',
  iron_door: 'Eisentür',
  iron_block: 'Eisenblock',
  ladder: 'Leiter',
  scaffolding: 'Gerüst',
  white_wool: 'Weiße Wolle',
  white_carpet: 'Weißer Teppich',
  // Redstone
  redstone: 'Redstone-Staub',
  redstone_wire: 'Redstone-Leitung',
  redstone_torch: 'Redstone-Fackel',
  redstone_block: 'Redstone-Block',
  redstone_lamp: 'Redstone-Lampe',
  repeater: 'Redstone-Verstärker',
  comparator: 'Redstone-Komparator',
  observer: 'Beobachter',
  piston: 'Kolben',
  sticky_piston: 'Klebriger Kolben',
  slime_block: 'Schleimblock',
  honey_block: 'Honigblock',
  hopper: 'Trichter',
  dropper: 'Spender',
  dispenser: 'Werfer',
  lever: 'Hebel',
  tripwire_hook: 'Haken',
  string: 'Faden',
  daylight_detector: 'Tageslichtsensor',
  target: 'Zielblock',
  note_block: 'Notenblock',
  tnt: 'TNT',
  lightning_rod: 'Blitzableiter',
  rail: 'Schiene',
  powered_rail: 'Antriebsschiene',
  detector_rail: 'Sensorschiene',
  activator_rail: 'Aktivierungsschiene',
  minecart: 'Lore',
  hopper_minecart: 'Trichterlore',
  chest_minecart: 'Güterlore',
  // Behälter und Arbeitsblöcke
  chest: 'Truhe',
  trapped_chest: 'Redstone-Truhe',
  ender_chest: 'Endertruhe',
  barrel: 'Fass',
  shulker_box: 'Shulkerkiste',
  furnace: 'Ofen',
  blast_furnace: 'Schmelzofen',
  smoker: 'Räucherofen',
  composter: 'Komposter',
  cauldron: 'Kessel',
  lava_cauldron: 'Lavakessel',
  water_cauldron: 'Wasserkessel',
  crafting_table: 'Werkbank',
  campfire: 'Lagerfeuer',
  soul_campfire: 'Seelenlagerfeuer',
  bed: 'Bett',
  white_bed: 'Weißes Bett',
  bell: 'Glocke',
  spawner: 'Spawner',
  // Items
  bucket: 'Eimer',
  water_bucket: 'Wassereimer',
  lava_bucket: 'Lavaeimer',
  bone_meal: 'Knochenmehl',
  bone: 'Knochen',
  stick: 'Stock',
  paper: 'Papier',
  sugar: 'Zucker',
  dried_kelp: 'Getrockneter Seetang',
  iron_ingot: 'Eisenbarren',
  iron_nugget: 'Eisenklumpen',
  gold_ingot: 'Goldbarren',
  gold_nugget: 'Goldklumpen',
  emerald: 'Smaragd',
  diamond: 'Diamant',
  coal: 'Kohle',
  gunpowder: 'Schwarzpulver',
  arrow: 'Pfeil',
  rotten_flesh: 'Verrottetes Fleisch',
  spider_eye: 'Spinnenauge',
  ender_pearl: 'Enderperle',
  slime_ball: 'Schleimball',
  blaze_rod: 'Lohenrute',
  prismarine_shard: 'Prismarinscherbe',
  prismarine_crystals: 'Prismarinkristalle',
  wither_skeleton_skull: 'Witherskelettschädel',
  totem_of_undying: 'Totem der Unsterblichkeit',
  glowstone_dust: 'Leuchtsteinstaub',
  feather: 'Feder',
  egg: 'Ei',
  chicken: 'Rohes Hühnchen',
  cooked_chicken: 'Gebratenes Hühnchen',
  beef: 'Rohes Rindfleisch',
  cooked_beef: 'Steak',
  leather: 'Leder',
  cod: 'Roher Kabeljau',
  clay_ball: 'Tonklumpen',
  porkchop: 'Rohes Schweinefleisch',
  mutton: 'Rohes Hammelfleisch',
  honey_bottle: 'Honigflasche',
  honeycomb: 'Honigwabe',
  shulker_shell: 'Shulkerschale',
  ink_sac: 'Tintenbeutel',
  poppy: 'Mohn',
  shears: 'Schere',
  flint_and_steel: 'Feuerzeug',
  name_tag: 'Namensschild',
  trident: 'Dreizack',
  nautilus_shell: 'Nautilusschale',
  copper_ingot: 'Kupferbarren',
  quartz: 'Netherquarz',
  green_dye: 'Grüner Farbstoff',
};

// ---------------------------------------------------------------------------
// Regelmäßige Namensfamilien: Holzarten, Farben, Steinsorten
// ---------------------------------------------------------------------------

/** Holzart → [Vorsilbe für Holzprodukte, Stamm, Laub]. */
const WOODS: Record<string, [string, string, string]> = {
  oak: ['Eichenholz', 'Eichenstamm', 'Eichenlaub'],
  spruce: ['Fichtenholz', 'Fichtenstamm', 'Fichtennadeln'],
  birch: ['Birkenholz', 'Birkenstamm', 'Birkenlaub'],
  jungle: ['Tropenholz', 'Tropenbaumstamm', 'Tropenbaumlaub'],
  acacia: ['Akazienholz', 'Akazienstamm', 'Akazienlaub'],
  dark_oak: ['Schwarzeichenholz', 'Schwarzeichenstamm', 'Schwarzeichenlaub'],
  mangrove: ['Mangrovenholz', 'Mangrovenstamm', 'Mangrovenlaub'],
  cherry: ['Kirschholz', 'Kirschstamm', 'Kirschlaub'],
  pale_oak: ['Blasseichenholz', 'Blasseichenstamm', 'Blasseichenlaub'],
  bamboo: ['Bambus', 'Bambusblock', ''],
  crimson: ['Karmesin', 'Karmesinstiel', ''],
  warped: ['Wirr', 'Wirrstiel', ''],
};

const WOOD_FORMS: Record<string, string> = {
  planks: 'bretter',
  slab: 'stufe',
  stairs: 'treppe',
  fence: 'zaun',
  fence_gate: 'zauntor',
  trapdoor: 'falltür',
  door: 'tür',
  sign: 'schild',
  wall_sign: 'schild',
  hanging_sign: 'hängeschild',
  button: 'knopf',
  pressure_plate: 'druckplatte',
};

/** Farbe → Stamm des Adjektivs; "!" = unveränderlich. */
const COLORS: Record<string, string> = {
  white: 'Weiß',
  orange: 'Orange',
  magenta: 'Magenta!',
  light_blue: 'Hellblau',
  yellow: 'Gelb',
  lime: 'Hellgrün',
  pink: 'Rosa!',
  gray: 'Grau',
  light_gray: 'Hellgrau',
  cyan: 'Türkis',
  purple: 'Violett',
  blue: 'Blau',
  brown: 'Braun',
  green: 'Grün',
  red: 'Rot',
  black: 'Schwarz',
};

/** Gefärbter Block → [Name, Geschlecht]. */
const COLOR_FORMS: Record<string, [string, 'f' | 'm' | 'n']> = {
  wool: ['Wolle', 'f'],
  carpet: ['Teppich', 'm'],
  concrete: ['Beton', 'm'],
  concrete_powder: ['Trockenbeton', 'm'],
  terracotta: ['Keramik', 'f'],
  glazed_terracotta: ['glasierte Keramik', 'f'],
  stained_glass: ['Glas', 'n'],
  stained_glass_pane: ['Glasscheibe', 'f'],
  bed: ['Bett', 'n'],
  shulker_box: ['Shulkerkiste', 'f'],
  candle: ['Kerze', 'f'],
  banner: ['Banner', 'n'],
};

/** Steinsorte → Wortstamm für Stufe, Treppe und Mauer. */
const STONES: Record<string, string> = {
  stone: 'Stein',
  cobblestone: 'Bruchstein',
  mossy_cobblestone: 'Bemooste Bruchstein',
  stone_brick: 'Steinziegel',
  mossy_stone_brick: 'Bemooste Steinziegel',
  brick: 'Ziegel',
  sandstone: 'Sandstein',
  red_sandstone: 'Rote Sandstein',
  andesite: 'Andesit',
  diorite: 'Diorit',
  granite: 'Granit',
  polished_andesite: 'Polierte Andesit',
  polished_diorite: 'Polierte Diorit',
  polished_granite: 'Polierte Granit',
  nether_brick: 'Netherziegel',
  quartz: 'Quarz',
  prismarine: 'Prismarin',
  blackstone: 'Schwarzstein',
  cobbled_deepslate: 'Bruchtiefenschiefer',
  polished_deepslate: 'Polierte Tiefenschiefer',
  deepslate_brick: 'Tiefenschieferziegel',
  deepslate_tile: 'Tiefenschieferfliesen',
  mud_brick: 'Schlammziegel',
  tuff: 'Tuffstein',
};

const STONE_FORMS: Record<string, string> = { slab: 'stufe', stairs: 'treppe', wall: 'mauer' };

const EXTRA: Record<string, string> = {
  beacon: 'Leuchtfeuer',
  diamond_block: 'Diamantblock',
  gold_block: 'Goldblock',
  emerald_block: 'Smaragdblock',
  coal_block: 'Kohleblock',
  lapis_block: 'Lapislazuliblock',
  copper_block: 'Kupferblock',
  soul_lantern: 'Seelenlaterne',
  soul_torch: 'Seelenfackel',
  deepslate_bricks: 'Tiefenschieferziegel',
  deepslate_tiles: 'Tiefenschieferfliesen',
  cracked_deepslate_tiles: 'Rissige Tiefenschieferfliesen',
  polished_deepslate: 'Polierter Tiefenschiefer',
  bricks: 'Ziegelsteine',
  nether_bricks: 'Netherziegel',
  sandstone: 'Sandstein',
  andesite: 'Andesit',
  diorite: 'Diorit',
  granite: 'Granit',
  tuff: 'Tuffstein',
  calcite: 'Kalzit',
  blackstone: 'Schwarzstein',
  end_stone: 'Endstein',
  end_rod: 'Endstab',
  purpur_block: 'Purpurblock',
  quartz_block: 'Quarzblock',
  bookshelf: 'Bücherregal',
  cobweb: 'Spinnennetz',
  hay_block: 'Strohballen',
  bone_block: 'Knochenblock',
  dried_kelp_block: 'Getrockneter Seetangblock',
  sponge: 'Schwamm',
  anvil: 'Amboss',
  brewing_stand: 'Braustand',
  enchanting_table: 'Zaubertisch',
  jukebox: 'Plattenspieler',
  lectern: 'Lesepult',
  loom: 'Webstuhl',
  grindstone: 'Schleifstein',
  stonecutter: 'Steinsäge',
  smithing_table: 'Schmiedetisch',
  fletching_table: 'Bognertisch',
  cartography_table: 'Kartentisch',
  flower_pot: 'Blumentopf',
  chain: 'Kette',
  lily_pad: 'Seerosenblatt',
  short_grass: 'Gras',
  fern: 'Farn',
  dandelion: 'Löwenzahn',
  snow: 'Schnee',
  powder_snow: 'Pulverschnee',
  cake: 'Kuchen',
  sea_pickle: 'Seegurke',
  turtle_egg: 'Schildkrötenei',
  honeycomb_block: 'Honigwabenblock',
  bee_nest: 'Bienennest',
  beehive: 'Bienenstock',
  sculk_sensor: 'Sculk-Sensor',
  crafter: 'Werker',
  wall_torch: 'Fackel',
  redstone_wall_torch: 'Redstone-Fackel',
  piston_head: 'Kolbenkopf',
  dirt_path: 'Trampelpfad',
  mycelium: 'Myzel',
  amethyst_block: 'Amethystblock',
  nether_portal: 'Netherportal',
  crying_obsidian: 'Weinender Obsidian',
  respawn_anchor: 'Seelenanker',
  dragon_egg: 'Drachenei',
  item_frame: 'Rahmen',
  armor_stand: 'Rüstungsständer',
  splash_potion: 'Wurftrank',
  potion: 'Trank',
  glass_bottle: 'Glasflasche',
  nether_star: 'Netherstern',
  iron_nugget: 'Eisenklumpen',
  smooth_quartz: 'Glatter Quarzblock',
  jigsaw: 'Verbundblock',
  structure_block: 'Konstruktionsblock',
};

function colorAdjective(stem: string, gender: 'f' | 'm' | 'n'): string {
  if (stem.endsWith('!')) return stem.slice(0, -1);
  return stem + (gender === 'f' ? 'e' : gender === 'm' ? 'er' : 'es');
}

function composedName(short: string): string | undefined {
  if (short.startsWith('stripped_')) {
    const inner = composedName(short.slice('stripped_'.length));
    return inner ? `Entrindeter ${inner}` : undefined;
  }
  // Farben zuerst (light_blue vor blue, daher längste Vorsilbe gewinnt)
  for (const color of Object.keys(COLORS).sort((a, b) => b.length - a.length)) {
    if (!short.startsWith(`${color}_`)) continue;
    const form = COLOR_FORMS[short.slice(color.length + 1).replace(/^wall_/, '')];
    if (form) return `${colorAdjective(COLORS[color]!, form[1])} ${form[0]}`;
  }
  for (const wood of Object.keys(WOODS).sort((a, b) => b.length - a.length)) {
    if (!short.startsWith(`${wood}_`)) continue;
    const [prefix, log, leaves] = WOODS[wood]!;
    const rest = short.slice(wood.length + 1);
    if (rest === 'log' || rest === 'stem' || rest === 'block') return log;
    if (rest === 'wood' || rest === 'hyphae') return prefix.endsWith('holz') ? prefix : `${prefix}hyphen`;
    if (rest === 'leaves' && leaves) return leaves;
    if (rest === 'sapling' && prefix.endsWith('holz')) return `${prefix.slice(0, -4)}setzling`;
    const form = WOOD_FORMS[rest] ?? WOOD_FORMS[rest.replace(/^wall_/, '')];
    if (form) return prefix + form;
  }
  for (const stone of Object.keys(STONES).sort((a, b) => b.length - a.length)) {
    if (!short.startsWith(`${stone}_`)) continue;
    const form = STONE_FORMS[short.slice(stone.length + 1)];
    if (form) return STONES[stone]! + form;
  }
  return undefined;
}

const composedCache = new Map<string, string | undefined>();

function lookup(id: string): string | undefined {
  const short = id.replace(/^minecraft:/, '');
  const direct = NAMES[id] ?? NAMES[short] ?? EXTRA[short];
  if (direct) return direct;
  if (id.includes(':') && !id.startsWith('minecraft:')) return undefined;
  if (!composedCache.has(short)) composedCache.set(short, composedName(short));
  return composedCache.get(short);
}

export function hasGermanName(id: string): boolean {
  return lookup(id) !== undefined;
}

/** Anzeigename; unbekannte IDs werden ohne "minecraft:" zurückgegeben. */
export function displayName(id: string): string {
  return lookup(id) ?? id.replace(/^minecraft:/, '');
}
