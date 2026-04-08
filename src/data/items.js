// 아이템 데이터 정의 (game_design_document.md 기반)

export const ITEM_GRADES = {
  COMMON:    { key: 'common',    label: '일반', color: '#aaaaaa' },
  UNCOMMON:  { key: 'uncommon',  label: '고급', color: '#2ecc71' },
  RARE:      { key: 'rare',      label: '희귀', color: '#3498db' },
  EPIC:      { key: 'epic',      label: '영웅', color: '#9b59b6' },
  LEGENDARY: { key: 'legendary', label: '전설', color: '#e67e22' },
  ABYSS:     { key: 'abyss',     label: '심연', color: '#c0392b' },
};

export const ITEM_SLOTS = {
  WEAPON:   'weapon',
  HELMET:   'helmet',
  ARMOR:    'armor',
  PANTS:    'pants',
  GLOVES:   'gloves',
  BOOTS:    'boots',
  RING1:    'ring1',
  RING2:    'ring2',
  NECKLACE: 'necklace',
};

// 등급 색상 헬퍼 — 텍스트용 문자열 색상
const _GRADE_HEX_MAP = {
  common: 0x888888, uncommon: 0x2ecc71, rare: 0x3498db,
  epic:   0x9b59b6, legendary: 0xe67e22, abyss: 0xc0392b,
};

/** 텍스트용 CSS 색상 문자열 반환 (예: '#3498db') */
export function gradeColor(grade) {
  return ITEM_GRADES[grade?.toUpperCase()]?.color ?? '#ffffff';
}

/** Graphics strokeStyle 등에 사용할 hex 색상 반환 (예: 0x3498db) */
export function gradeHexColor(grade) {
  return _GRADE_HEX_MAP[grade] ?? 0x444466;
}

export const ITEM_DATA = {
  // 무기
  iron_sword: {
    key: 'iron_sword',
    name: '철제 장검',
    type: 'equipment',
    slot: ITEM_SLOTS.WEAPON,
    grade: 'common',
    texture: 'item_sword',
    requiredLevel: 1,
    stats: { STR: 5, attackPower: 20 },
    description: '기본적인 철제 장검.'
  },
  soldiers_sword: {
    key: 'soldiers_sword',
    name: '병사의 장검',
    type: 'equipment',
    slot: ITEM_SLOTS.WEAPON,
    grade: 'uncommon',
    texture: 'item_sword',
    requiredLevel: 10,
    stats: { STR: 12, attackPower: 45 },
    description: '잘 단련된 병사용 장검.'
  },
  // 갑옷
  leather_armor: {
    key: 'leather_armor',
    name: '가죽 갑옷',
    type: 'equipment',
    slot: ITEM_SLOTS.ARMOR,
    grade: 'common',
    texture: 'item_armor',
    requiredLevel: 1,
    stats: { VIT: 5, defense: 10 },
    description: '기본 가죽 갑옷.'
  },
  // 반지
  resistance_ring: {
    key: 'resistance_ring',
    name: '저항의 반지',
    type: 'equipment',
    slot: ITEM_SLOTS.RING1,
    grade: 'rare',
    texture: 'item_ring',
    requiredLevel: 15,
    stats: { RES: 40 },
    description: '흡혈 저주에 저항력을 높여주는 반지.'
  },
  // 소모품
  hp_potion_small: {
    key: 'hp_potion_small',
    name: 'HP 포션 (소)',
    type: 'consumable',
    texture: 'item_potion',
    requiredLevel: 1,
    effect: { type: 'heal_hp', amount: 100 },
    cooldown: 5000,
    stackable: true,
    maxStack: 99,
    description: 'HP를 100 회복한다.'
  },
  hp_potion_medium: {
    key: 'hp_potion_medium',
    name: 'HP 포션 (중)',
    type: 'consumable',
    texture: 'item_potion',
    requiredLevel: 20,
    effect: { type: 'heal_hp', amount: 350 },
    cooldown: 5000,
    stackable: true,
    maxStack: 99,
    description: 'HP를 350 회복한다.'
  },
  // 재료
  iron_ore:       { key: 'iron_ore',       name: '철 광석',      type: 'material', texture: 'item_sword',  stackable: true, maxStack: 999, description: '제작에 사용되는 철 광석.' },
  leather:        { key: 'leather',        name: '단단한 가죽',  type: 'material', texture: 'item_armor',  stackable: true, maxStack: 999, description: '가죽 장비 제작에 사용.' },
  blood_crystal:  { key: 'blood_crystal',  name: '흡혈 결정',    type: 'material', texture: 'item_ring',   stackable: true, maxStack: 999, description: '흡혈 저항 옵션 부여 재료.' },
  abyss_stone:    { key: 'abyss_stone',    name: '심연석 원석',  type: 'material', texture: 'item_ring',   stackable: true, maxStack: 999, description: '고급 장비 강화 재료.' },
  bloodkin_emblem:{ key: 'bloodkin_emblem',name: '혈족의 문장',  type: 'material', texture: 'item_armor',  stackable: true, maxStack: 999, description: '혈족 몬스터에게서 드롭.' },
};
