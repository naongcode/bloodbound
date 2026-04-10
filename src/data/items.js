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

  // ═══════════════════════════════════════════
  // 무기 — 검 (STR/근접 계열)
  // ═══════════════════════════════════════════
  iron_sword: {
    key: 'iron_sword', name: '철제 장검',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'common',
    texture: 'item_sword', requiredLevel: 1,
    stats: { STR: 5, attackPower: 20 },
    description: '기본적인 철제 장검.'
  },
  soldiers_sword: {
    key: 'soldiers_sword', name: '병사의 장검',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'uncommon',
    texture: 'item_sword', requiredLevel: 7,
    stats: { STR: 12, attackPower: 45 },
    description: '잘 단련된 병사용 장검.'
  },
  crusader_sword: {
    key: 'crusader_sword', name: '성전사의 대검',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'rare',
    texture: 'item_sword', requiredLevel: 15,
    stats: { STR: 25, attackPower: 90, VIT: 10 },
    description: '무거운 대검. 강인한 육체를 키워준다.'
  },
  bloodkin_blade: {
    key: 'bloodkin_blade', name: '혈족의 칼날',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'epic',
    texture: 'item_sword', requiredLevel: 23,
    stats: { STR: 45, attackPower: 160, critRate: 0.05 },
    description: '혈족 전사에게서 빼앗은 저주받은 검. 치명타율이 오른다.'
  },
  demon_blade: {
    key: 'demon_blade', name: '악마의 대검',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'legendary',
    texture: 'item_sword', requiredLevel: 30,
    stats: { STR: 70, attackPower: 250, critRate: 0.10, critDamage: 0.3 },
    description: '심연에서 단조된 대검. 치명타 시 적의 영혼을 흡수한다.'
  },

  // ═══════════════════════════════════════════
  // 무기 — 활 (AGI/원거리 계열)
  // ═══════════════════════════════════════════
  hunters_bow: {
    key: 'hunters_bow', name: '사냥꾼의 활',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'common',
    texture: 'item_bow', requiredLevel: 1,
    stats: { AGI: 5, attackPower: 18, critRate: 0.02 },
    description: '가벼운 사냥용 활.'
  },
  shadow_bow: {
    key: 'shadow_bow', name: '그림자 장궁',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'uncommon',
    texture: 'item_bow', requiredLevel: 7,
    stats: { AGI: 15, attackPower: 40, critRate: 0.04 },
    description: '어둠 속에서 빛나는 장궁.'
  },
  crimson_bow: {
    key: 'crimson_bow', name: '진홍의 대궁',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'rare',
    texture: 'item_bow', requiredLevel: 15,
    stats: { AGI: 28, attackPower: 85, critRate: 0.07 },
    description: '혈석으로 강화된 대궁. 명중 시 독이 오른다.'
  },
  void_bow: {
    key: 'void_bow', name: '공허의 활',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'epic',
    texture: 'item_bow', requiredLevel: 23,
    stats: { AGI: 50, attackPower: 150, critRate: 0.12, critDamage: 0.25 },
    description: '공허에서 깎아낸 활. 화살이 허공을 가른다.'
  },
  soul_bow: {
    key: 'soul_bow', name: '영혼 포식자',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'legendary',
    texture: 'item_bow', requiredLevel: 30,
    stats: { AGI: 80, attackPower: 230, critRate: 0.18, critDamage: 0.4 },
    description: '쓰러진 자의 영혼으로 만든 활. 치명타 시 MP가 회복된다.'
  },

  // ═══════════════════════════════════════════
  // 무기 — 지팡이 (INT/마법 계열)
  // ═══════════════════════════════════════════
  apprentice_staff: {
    key: 'apprentice_staff', name: '견습생의 지팡이',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'common',
    texture: 'item_staff', requiredLevel: 1,
    stats: { INT: 8, attackPower: 15 },
    description: '마법사 수업에 쓰이는 기본 지팡이.'
  },
  blood_staff: {
    key: 'blood_staff', name: '혈관 지팡이',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'uncommon',
    texture: 'item_staff', requiredLevel: 7,
    stats: { INT: 20, attackPower: 38, WIS: 5 },
    description: '혈석이 박힌 지팡이. 마력이 고동친다.'
  },
  crimson_staff: {
    key: 'crimson_staff', name: '진홍 마법봉',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'rare',
    texture: 'item_staff', requiredLevel: 15,
    stats: { INT: 38, attackPower: 80, WIS: 10 },
    description: '고급 마법사가 사용하는 진홍빛 봉.'
  },
  abyss_wand: {
    key: 'abyss_wand', name: '심연의 완드',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'epic',
    texture: 'item_staff', requiredLevel: 23,
    stats: { INT: 65, attackPower: 140, WIS: 18, critDamage: 0.2 },
    description: '심연의 에너지가 응축된 완드.'
  },
  void_staff: {
    key: 'void_staff', name: '공허의 대지팡이',
    type: 'equipment', slot: ITEM_SLOTS.WEAPON, grade: 'legendary',
    texture: 'item_staff', requiredLevel: 30,
    stats: { INT: 100, attackPower: 220, WIS: 25, critDamage: 0.35 },
    description: '공허를 지배하는 자의 지팡이. 범위 마법이 강화된다.'
  },

  // ═══════════════════════════════════════════
  // 투구
  // ═══════════════════════════════════════════
  leather_cap: {
    key: 'leather_cap', name: '가죽 모자',
    type: 'equipment', slot: ITEM_SLOTS.HELMET, grade: 'common',
    texture: 'item_helmet', requiredLevel: 1,
    stats: { VIT: 3, defense: 5 },
    description: '가벼운 가죽 모자.'
  },
  iron_helmet: {
    key: 'iron_helmet', name: '철제 투구',
    type: 'equipment', slot: ITEM_SLOTS.HELMET, grade: 'uncommon',
    texture: 'item_helmet', requiredLevel: 7,
    stats: { VIT: 8, defense: 18 },
    description: '단단한 철제 투구.'
  },
  guard_helm: {
    key: 'guard_helm', name: '수호자의 투구',
    type: 'equipment', slot: ITEM_SLOTS.HELMET, grade: 'rare',
    texture: 'item_helmet', requiredLevel: 15,
    stats: { VIT: 16, defense: 38, STR: 6 },
    description: '최전선 수호자가 착용하는 투구.'
  },
  blood_crown: {
    key: 'blood_crown', name: '혈왕의 왕관',
    type: 'equipment', slot: ITEM_SLOTS.HELMET, grade: 'epic',
    texture: 'item_helmet', requiredLevel: 23,
    stats: { VIT: 25, INT: 15, defense: 58, RES: 15 },
    description: '혈왕이 쓰던 왕관. 지식과 생명력을 높인다.'
  },
  abyss_crown: {
    key: 'abyss_crown', name: '심연왕의 관',
    type: 'equipment', slot: ITEM_SLOTS.HELMET, grade: 'legendary',
    texture: 'item_helmet', requiredLevel: 30,
    stats: { VIT: 40, INT: 30, defense: 90, critRate: 0.05 },
    description: '심연을 통치하던 자의 관.'
  },

  // ═══════════════════════════════════════════
  // 갑옷
  // ═══════════════════════════════════════════
  leather_armor: {
    key: 'leather_armor', name: '가죽 갑옷',
    type: 'equipment', slot: ITEM_SLOTS.ARMOR, grade: 'common',
    texture: 'item_armor', requiredLevel: 1,
    stats: { VIT: 5, defense: 10 },
    description: '기본 가죽 갑옷.'
  },
  chainmail: {
    key: 'chainmail', name: '사슬 갑옷',
    type: 'equipment', slot: ITEM_SLOTS.ARMOR, grade: 'uncommon',
    texture: 'item_armor', requiredLevel: 7,
    stats: { VIT: 12, defense: 28 },
    description: '촘촘하게 엮인 사슬 갑옷.'
  },
  iron_plate: {
    key: 'iron_plate', name: '철판 갑옷',
    type: 'equipment', slot: ITEM_SLOTS.ARMOR, grade: 'rare',
    texture: 'item_armor', requiredLevel: 15,
    stats: { VIT: 22, defense: 55, RES: 10 },
    description: '두꺼운 철판을 여러 겹 덧댄 갑옷.'
  },
  bloodbound_armor: {
    key: 'bloodbound_armor', name: '혈맹 갑옷',
    type: 'equipment', slot: ITEM_SLOTS.ARMOR, grade: 'epic',
    texture: 'item_armor', requiredLevel: 23,
    stats: { VIT: 38, defense: 88, RES: 22, STR: 10 },
    description: '혈맹 결사대가 착용하는 특수 제작 갑옷.'
  },
  abyss_plate: {
    key: 'abyss_plate', name: '심연 흑철 갑옷',
    type: 'equipment', slot: ITEM_SLOTS.ARMOR, grade: 'legendary',
    texture: 'item_armor', requiredLevel: 30,
    stats: { VIT: 60, defense: 140, RES: 40, STR: 18 },
    description: '심연의 흑철로 벼려낸 최고급 갑옷.'
  },

  // ═══════════════════════════════════════════
  // 바지
  // ═══════════════════════════════════════════
  cloth_pants: {
    key: 'cloth_pants', name: '천 바지',
    type: 'equipment', slot: ITEM_SLOTS.PANTS, grade: 'common',
    texture: 'item_pants', requiredLevel: 1,
    stats: { VIT: 3, defense: 5 },
    description: '기본적인 천 바지.'
  },
  leather_pants: {
    key: 'leather_pants', name: '가죽 각반',
    type: 'equipment', slot: ITEM_SLOTS.PANTS, grade: 'uncommon',
    texture: 'item_pants', requiredLevel: 7,
    stats: { VIT: 8, defense: 16, AGI: 5 },
    description: '움직임이 편한 가죽 각반.'
  },
  iron_greaves: {
    key: 'iron_greaves', name: '철제 다리보호대',
    type: 'equipment', slot: ITEM_SLOTS.PANTS, grade: 'rare',
    texture: 'item_pants', requiredLevel: 15,
    stats: { VIT: 15, defense: 32, STR: 8 },
    description: '단단한 철제 다리보호대.'
  },
  shadow_trousers: {
    key: 'shadow_trousers', name: '그림자 바지',
    type: 'equipment', slot: ITEM_SLOTS.PANTS, grade: 'epic',
    texture: 'item_pants', requiredLevel: 23,
    stats: { AGI: 22, defense: 48, critRate: 0.05 },
    description: '어둠 속에서 발소리도 나지 않는 바지.'
  },

  // ═══════════════════════════════════════════
  // 장갑
  // ═══════════════════════════════════════════
  cloth_gloves: {
    key: 'cloth_gloves', name: '천 장갑',
    type: 'equipment', slot: ITEM_SLOTS.GLOVES, grade: 'common',
    texture: 'item_gloves', requiredLevel: 1,
    stats: { STR: 3, defense: 3 },
    description: '기본 천 장갑.'
  },
  leather_gloves: {
    key: 'leather_gloves', name: '가죽 장갑',
    type: 'equipment', slot: ITEM_SLOTS.GLOVES, grade: 'uncommon',
    texture: 'item_gloves', requiredLevel: 7,
    stats: { STR: 8, attackPower: 12 },
    description: '손목을 감싸는 가죽 장갑.'
  },
  iron_gauntlets: {
    key: 'iron_gauntlets', name: '철제 건틀릿',
    type: 'equipment', slot: ITEM_SLOTS.GLOVES, grade: 'rare',
    texture: 'item_gloves', requiredLevel: 15,
    stats: { STR: 16, attackPower: 28, defense: 15 },
    description: '주먹 한 방에 바위가 부서질 것 같은 건틀릿.'
  },
  abyss_gloves: {
    key: 'abyss_gloves', name: '심연의 손길',
    type: 'equipment', slot: ITEM_SLOTS.GLOVES, grade: 'epic',
    texture: 'item_gloves', requiredLevel: 23,
    stats: { STR: 28, attackPower: 55, critDamage: 0.2 },
    description: '심연의 힘이 깃든 장갑. 치명타 피해가 증가한다.'
  },

  // ═══════════════════════════════════════════
  // 부츠
  // ═══════════════════════════════════════════
  cloth_boots: {
    key: 'cloth_boots', name: '천 신발',
    type: 'equipment', slot: ITEM_SLOTS.BOOTS, grade: 'common',
    texture: 'item_boots', requiredLevel: 1,
    stats: { AGI: 4, defense: 3, moveSpeed: 5 },
    description: '가벼운 천 신발. 이동속도 +5.'
  },
  leather_boots: {
    key: 'leather_boots', name: '가죽 장화',
    type: 'equipment', slot: ITEM_SLOTS.BOOTS, grade: 'uncommon',
    texture: 'item_boots', requiredLevel: 7,
    stats: { AGI: 10, defense: 10, moveSpeed: 12 },
    description: '발걸음이 가벼워지는 가죽 장화. 이동속도 +12.'
  },
  swift_boots: {
    key: 'swift_boots', name: '질풍의 단화',
    type: 'equipment', slot: ITEM_SLOTS.BOOTS, grade: 'rare',
    texture: 'item_boots', requiredLevel: 15,
    stats: { AGI: 22, defense: 20, moveSpeed: 22 },
    description: '바람처럼 달릴 수 있는 특수 단화. 이동속도 +22.'
  },
  shadow_treads: {
    key: 'shadow_treads', name: '그림자 밟기',
    type: 'equipment', slot: ITEM_SLOTS.BOOTS, grade: 'epic',
    texture: 'item_boots', requiredLevel: 23,
    stats: { AGI: 38, defense: 35, critRate: 0.04, moveSpeed: 35 },
    description: '그림자 위를 걷는 듯한 부츠. 이동속도 +35.'
  },

  // ═══════════════════════════════════════════
  // 반지
  // ═══════════════════════════════════════════
  power_ring: {
    key: 'power_ring', name: '힘의 반지',
    type: 'equipment', slot: ITEM_SLOTS.RING1, grade: 'uncommon',
    texture: 'item_ring', requiredLevel: 7,
    stats: { STR: 8, attackPower: 12 },
    description: '착용자의 힘을 높여주는 반지.'
  },
  wisdom_ring: {
    key: 'wisdom_ring', name: '지혜의 반지',
    type: 'equipment', slot: ITEM_SLOTS.RING1, grade: 'uncommon',
    texture: 'item_ring', requiredLevel: 7,
    stats: { WIS: 8, INT: 6 },
    description: '마력과 지혜를 높여주는 반지.'
  },
  resistance_ring: {
    key: 'resistance_ring', name: '저항의 반지',
    type: 'equipment', slot: ITEM_SLOTS.RING1, grade: 'rare',
    texture: 'item_ring', requiredLevel: 15,
    stats: { RES: 40 },
    description: '흡혈 저주에 저항력을 높여주는 반지.'
  },
  abyss_ring: {
    key: 'abyss_ring', name: '심연의 반지',
    type: 'equipment', slot: ITEM_SLOTS.RING1, grade: 'epic',
    texture: 'item_ring', requiredLevel: 23,
    stats: { STR: 20, attackPower: 42, critRate: 0.05 },
    description: '심연의 힘이 응결된 반지.'
  },
  blood_signet: {
    key: 'blood_signet', name: '혈인의 인장반지',
    type: 'equipment', slot: ITEM_SLOTS.RING2, grade: 'rare',
    texture: 'item_ring', requiredLevel: 15,
    stats: { RES: 25, VIT: 10, defense: 12 },
    description: '혈족의 문장이 새겨진 인장반지.'
  },
  crit_ring: {
    key: 'crit_ring', name: '냉혹한 반지',
    type: 'equipment', slot: ITEM_SLOTS.RING2, grade: 'epic',
    texture: 'item_ring', requiredLevel: 23,
    stats: { critRate: 0.06, critDamage: 0.3, AGI: 12 },
    description: '착용자를 냉혹한 암살자로 만드는 반지.'
  },

  // ═══════════════════════════════════════════
  // 목걸이
  // ═══════════════════════════════════════════
  iron_necklace: {
    key: 'iron_necklace', name: '철제 목걸이',
    type: 'equipment', slot: ITEM_SLOTS.NECKLACE, grade: 'common',
    texture: 'item_necklace', requiredLevel: 1,
    stats: { VIT: 4, RES: 5 },
    description: '단순한 철제 목걸이.'
  },
  blood_pendant: {
    key: 'blood_pendant', name: '혈석 펜던트',
    type: 'equipment', slot: ITEM_SLOTS.NECKLACE, grade: 'uncommon',
    texture: 'item_necklace', requiredLevel: 7,
    stats: { RES: 22, VIT: 8 },
    description: '혈석이 달린 펜던트. 흡혈 공격을 어느 정도 막아준다.'
  },
  abyss_pendant: {
    key: 'abyss_pendant', name: '심연 펜던트',
    type: 'equipment', slot: ITEM_SLOTS.NECKLACE, grade: 'rare',
    texture: 'item_necklace', requiredLevel: 15,
    stats: { RES: 35, INT: 12, WIS: 10 },
    description: '심연의 에너지가 담긴 펜던트. 마법 능력이 향상된다.'
  },
  crimson_choker: {
    key: 'crimson_choker', name: '진홍 초커',
    type: 'equipment', slot: ITEM_SLOTS.NECKLACE, grade: 'epic',
    texture: 'item_necklace', requiredLevel: 23,
    stats: { STR: 15, INT: 15, critDamage: 0.25 },
    description: '전사와 마법사 모두에게 어울리는 만능 초커.'
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
  hp_potion_large: {
    key: 'hp_potion_large',
    name: 'HP 포션 (대)',
    type: 'consumable',
    texture: 'item_potion_large',
    requiredLevel: 40,
    effect: { type: 'heal_hp', amount: 800 },
    cooldown: 8000,
    stackable: true,
    maxStack: 99,
    description: 'HP를 800 회복한다.'
  },
  mp_potion_small: {
    key: 'mp_potion_small',
    name: 'MP 포션 (소)',
    type: 'consumable',
    texture: 'item_potion_mp',
    requiredLevel: 1,
    effect: { type: 'heal_mp', amount: 80 },
    cooldown: 5000,
    stackable: true,
    maxStack: 99,
    description: 'MP를 80 회복한다.'
  },
  // 재료
  iron_ore:       { key: 'iron_ore',       name: '철 광석',      type: 'material', texture: 'mat_ore',     stackable: true, maxStack: 999, description: '제작에 사용되는 철 광석.' },
  leather:        { key: 'leather',        name: '단단한 가죽',  type: 'material', texture: 'mat_leather', stackable: true, maxStack: 999, description: '가죽 장비 제작에 사용.' },
  blood_crystal:  { key: 'blood_crystal',  name: '흡혈 결정',    type: 'material', texture: 'mat_crystal', stackable: true, maxStack: 999, description: '흡혈 저항 옵션 부여 재료.' },
  abyss_stone:    { key: 'abyss_stone',    name: '심연석 원석',  type: 'material', texture: 'mat_abyss',   stackable: true, maxStack: 999, description: '고급 장비 강화 재료.' },
  bloodkin_emblem:{ key: 'bloodkin_emblem',name: '혈족의 문장',  type: 'material', texture: 'mat_emblem',  stackable: true, maxStack: 999, description: '혈족 몬스터에게서 드롭.' },
};
