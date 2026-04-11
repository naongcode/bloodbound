// 제작소 레시피 데이터
// 고등급 아이템의 재료는 던전에서만 수급 가능한 재료(abyss_stone, bloodkin_emblem)를 요구

export const CRAFT_RECIPES = [

  // ── 일반 등급 ────────────────────────────────────────────────
  {
    key: 'craft_guard_helm',
    resultKey: 'guard_helm',
    name: '수호자의 투구 제작',
    materials: [
      { key: 'iron_ore',      qty: 8 },
      { key: 'leather',       qty: 4 },
    ],
    locked: false,
  },
  {
    key: 'craft_iron_plate',
    resultKey: 'iron_plate',
    name: '철판 갑옷 제작',
    materials: [
      { key: 'iron_ore',      qty: 12 },
      { key: 'leather',       qty: 6 },
    ],
    locked: false,
  },
  {
    key: 'craft_swift_boots',
    resultKey: 'swift_boots',
    name: '질풍의 단화 제작',
    materials: [
      { key: 'leather',       qty: 10 },
      { key: 'blood_crystal', qty: 3 },
    ],
    locked: false,
  },

  // ── 영웅 등급 (던전 재료 필요) ─────────────────────────────────
  {
    key: 'craft_bloodkin_blade',
    resultKey: 'bloodkin_blade',
    name: '혈족의 칼날 제작',
    materials: [
      { key: 'iron_ore',      qty: 20 },
      { key: 'blood_crystal', qty: 10 },
      { key: 'abyss_stone',   qty: 3 },
    ],
    locked: true,
  },
  {
    key: 'craft_bloodbound_armor',
    resultKey: 'bloodbound_armor',
    name: '혈맹 갑옷 제작',
    materials: [
      { key: 'leather',         qty: 20 },
      { key: 'blood_crystal',   qty: 8 },
      { key: 'abyss_stone',     qty: 4 },
    ],
    locked: true,
  },
  {
    key: 'craft_blood_crown',
    resultKey: 'blood_crown',
    name: '혈왕의 왕관 제작',
    materials: [
      { key: 'iron_ore',        qty: 15 },
      { key: 'abyss_stone',     qty: 5 },
      { key: 'bloodkin_emblem', qty: 2 },
    ],
    locked: true,
  },

  // ── 전설 등급 (던전 재료 다수 필요) ────────────────────────────
  {
    key: 'craft_demon_blade',
    resultKey: 'demon_blade',
    name: '악마의 대검 제작',
    materials: [
      { key: 'blood_crystal',   qty: 20 },
      { key: 'abyss_stone',     qty: 10 },
      { key: 'bloodkin_emblem', qty: 5 },
    ],
    locked: true,
  },
  {
    key: 'craft_void_bow',
    resultKey: 'void_bow',
    name: '공허의 활 제작',
    materials: [
      { key: 'leather',         qty: 15 },
      { key: 'abyss_stone',     qty: 10 },
      { key: 'bloodkin_emblem', qty: 5 },
    ],
    locked: true,
  },
  {
    key: 'craft_void_staff',
    resultKey: 'void_staff',
    name: '공허의 대지팡이 제작',
    materials: [
      { key: 'blood_crystal',   qty: 15 },
      { key: 'abyss_stone',     qty: 12 },
      { key: 'bloodkin_emblem', qty: 6 },
    ],
    locked: true,
  },
  {
    key: 'craft_abyss_plate',
    resultKey: 'abyss_plate',
    name: '심연 흑철 갑옷 제작',
    materials: [
      { key: 'iron_ore',        qty: 30 },
      { key: 'abyss_stone',     qty: 15 },
      { key: 'bloodkin_emblem', qty: 8 },
    ],
    locked: true,
  },

  // ── 초월 등급 (최고 재료 필요) ──────────────────────────────────
  {
    key: 'craft_void_sovereign_blade',
    resultKey: 'void_sovereign_blade',
    name: '공허 군주의 검 제작',
    materials: [
      { key: 'abyss_stone',     qty: 30 },
      { key: 'bloodkin_emblem', qty: 15 },
      { key: 'blood_crystal',   qty: 30 },
    ],
    locked: true,
  },
  {
    key: 'craft_transcendent_armor',
    resultKey: 'transcendent_armor',
    name: '초월자의 갑옷 제작',
    materials: [
      { key: 'abyss_stone',     qty: 35 },
      { key: 'bloodkin_emblem', qty: 18 },
      { key: 'leather',         qty: 30 },
    ],
    locked: true,
  },
];
