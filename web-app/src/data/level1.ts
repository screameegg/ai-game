export const TILE = 32;
export const MAP_W = 20;
export const MAP_H = 16;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;
export const VIEW_W = 360;
export const VIEW_H = 640;
export const DEADZONE = 0.12;
export const SPEED = 110;
export const SPEED_WATER = 55;
export const SPRINT_MULT = 1.6;
export const SPRINT_CD = 0.2;

export const cell = (cx: number, cy: number) => ({
  x: cx * TILE + TILE / 2,
  y: cy * TILE + TILE / 2,
});

export const POND = { x: 12 * TILE + TILE / 2, y: 8 * TILE + TILE / 2, r: 4 * TILE };
export const SPAWN = cell(2, 12);
export const ORB_YELLOW = cell(10, 3);
export const ORB_RED = cell(14, 8);
export const ORB_BLUE = cell(9, 9);

export function buildDirt(): Set<string> {
  const dirt = new Set<string>();
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    dirt.add(`${x},${y}`);
  };
  for (let a = 0; a < Math.PI * 2; a += 0.08) {
    for (const rad of [4.6, 5.2, 5.8]) {
      const gx = Math.round(12 + Math.cos(a) * rad);
      const gy = Math.round(8 + Math.sin(a) * rad);
      add(gx, gy);
      add(gx + 1, gy);
    }
  }
  for (let x = 2; x <= 7; x++) {
    add(x, 12);
    add(x, 11);
  }
  for (let y = 10; y <= 12; y++) add(7, y);
  for (let y = 3; y <= 5; y++) {
    add(10, y);
    add(9, y);
  }
  for (let x = 8; x <= 10; x++) add(x, 5);
  return dirt;
}

export const TREES = [
  { ...cell(4, 4), key: 'tree' },
  { ...cell(10, 2), key: 'tree2' },
  { ...cell(16, 3), key: 'tree' },
  { ...cell(3, 8), key: 'tree2' },
  { ...cell(17, 12), key: 'tree' },
  { ...cell(6, 14), key: 'tree2' },
];

export const POSTS = [cell(5, 12), cell(8, 10), cell(15, 12), cell(11, 5)];

export const DECOR: [number, number, string, number][] = [
  [3, 11, 'decor_flower', 0.5],
  [4, 13, 'decor_berry', 0.42],
  [5, 9, 'decor_grass', 0.5],
  [8, 13, 'decor_flower2', 0.5],
  [11, 13, 'decor_flower', 0.48],
  [14, 13, 'decor_berry', 0.42],
  [16, 10, 'decor_flower2', 0.5],
  [17, 7, 'decor_grass', 0.5],
  [15, 5, 'decor_flower', 0.48],
  [8, 4, 'decor_berry', 0.42],
  [6, 6, 'decor_flower2', 0.5],
  [13, 3, 'decor_grass', 0.5],
  [18, 14, 'decor_flower', 0.5],
  [1, 9, 'decor_grass', 0.5],
  [2, 6, 'decor_flower', 0.48],
  [10, 14, 'decor_rockpile', 0.32],
  [7, 3, 'decor_rocks', 0.55],
];

export const ART_KEYS = [
  'grass', 'dirt', 'pond', 'post', 'tree', 'tree2',
  'wizard_s', 'wizard_w', 'wizard_e', 'wizard_n',
  'slime_s', 'slime_w', 'slime_e', 'slime_n',
  'hud_joy_base', 'hud_joy_knob', 'hud_panel', 'hud_ok',
  'orb_yellow', 'orb_red', 'orb_blue',
  'guide_arrow', 'guide_dot', 'fx_star',
  'decor_rocks', 'decor_flower', 'decor_flower2', 'decor_berry',
  'decor_grass', 'decor_shore', 'decor_rockpile',
] as const;
