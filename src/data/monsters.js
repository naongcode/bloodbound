// 몬스터 데이터 정의 (monster_system.md 기반)

export const MONSTER_DATA = {
  blood_slime: {
    key: 'blood_slime',
    name: '흡혈 슬라임',
    texture: 'monster_slime',
    level: 3,
    baseHp: 80,
    baseDamage: 8,
    defense: 2,
    speed: 60,
    xpReward: 15,
    goldReward: { min: 3, max: 8 },
    drainRate: 0.20,        // 흡혈률
    drainType: 'normal',
    attackRange: 40,
    attackCooldown: 1500,   // ms
    aggroRange: 200,
    canSplit: true,         // HP 50% 이하 시 분열
    patterns: ['jump_slam', 'drain_tentacle'],
    dropTable: [
      { itemKey: 'blood_crystal', chance: 0.4,  quantity: [1, 2] },
      { itemKey: 'iron_ore',      chance: 0.2,  quantity: [1, 1] },
      { itemKey: 'cloth_boots',   chance: 0.08, quantity: [1, 1] },
      { itemKey: 'cloth_gloves',  chance: 0.08, quantity: [1, 1] },
      { itemKey: 'cloth_pants',   chance: 0.06, quantity: [1, 1] },
      { itemKey: 'iron_necklace', chance: 0.05, quantity: [1, 1] },
    ]
  },

  blood_bat: {
    key: 'blood_bat',
    name: '피박쥐',
    texture: 'monster_bat',
    level: 7,
    baseHp: 50,
    baseDamage: 12,
    defense: 1,
    speed: 120,
    xpReward: 25,
    goldReward: { min: 5, max: 12 },
    drainRate: 0.15,
    drainType: 'curse',     // 저주 흡혈
    attackRange: 35,
    attackCooldown: 1000,
    aggroRange: 250,
    canFlock: true,         // 군집 소환
    patterns: ['dive_attack', 'curse_bite', 'flock_summon'],
    dropTable: [
      { itemKey: 'blood_crystal', chance: 0.3,  quantity: [1, 1] },
      { itemKey: 'leather',       chance: 0.5,  quantity: [1, 2] },
      { itemKey: 'cloth_boots',   chance: 0.10, quantity: [1, 1] },
      { itemKey: 'hunters_bow',   chance: 0.08, quantity: [1, 1] },
      { itemKey: 'leather_cap',   chance: 0.06, quantity: [1, 1] },
      { itemKey: 'power_ring',    chance: 0.04, quantity: [1, 1] },
      { itemKey: 'wisdom_ring',   chance: 0.04, quantity: [1, 1] },
    ]
  },

  bloodfang_wolf: {
    key: 'bloodfang_wolf',
    name: '흡혈 늑대',
    texture: 'monster_wolf',
    level: 22,
    baseHp: 200,
    baseDamage: 30,
    defense: 8,
    speed: 100,
    xpReward: 80,
    goldReward: { min: 20, max: 40 },
    drainRate: 0.35,
    drainType: 'normal',
    attackRange: 45,
    attackCooldown: 1200,
    aggroRange: 300,
    defenseState: {
      trigger: 0.3,         // HP 30% 이하
      type: 'physical_barrier',
    },
    patterns: ['charge', 'bite_combo', 'pack_assault'],
    dropTable: [
      { itemKey: 'blood_crystal',  chance: 0.5,  quantity: [2, 4] },
      { itemKey: 'leather',        chance: 0.7,  quantity: [2, 5] },
      { itemKey: 'leather_boots',  chance: 0.12, quantity: [1, 1] },
      { itemKey: 'leather_pants',  chance: 0.10, quantity: [1, 1] },
      { itemKey: 'leather_gloves', chance: 0.10, quantity: [1, 1] },
      { itemKey: 'leather_armor',  chance: 0.08, quantity: [1, 1] },
      { itemKey: 'iron_helmet',    chance: 0.08, quantity: [1, 1] },
      { itemKey: 'shadow_bow',     chance: 0.06, quantity: [1, 1] },
      { itemKey: 'power_ring',     chance: 0.06, quantity: [1, 1] },
      { itemKey: 'wisdom_ring',    chance: 0.06, quantity: [1, 1] },
    ]
  },

  crimson_spider: {
    key: 'crimson_spider',
    name: '붉은 독거미',
    texture: 'monster_spider',
    level: 20,
    baseHp: 180,
    baseDamage: 26,
    defense: 6,
    speed: 95,
    xpReward: 70,
    goldReward: { min: 18, max: 35 },
    drainRate: 0.25,
    drainType: 'poison',
    attackRange: 42,
    attackCooldown: 1100,
    aggroRange: 280,
    patterns: ['poison_bite', 'web_snare'],
    dropTable: [
      { itemKey: 'blood_crystal',  chance: 0.4,  quantity: [1, 3] },
      { itemKey: 'leather',        chance: 0.6,  quantity: [2, 4] },
      { itemKey: 'leather_gloves', chance: 0.12, quantity: [1, 1] },
      { itemKey: 'leather_boots',  chance: 0.10, quantity: [1, 1] },
      { itemKey: 'blood_pendant',  chance: 0.10, quantity: [1, 1] },
      { itemKey: 'iron_helmet',    chance: 0.08, quantity: [1, 1] },
      { itemKey: 'chainmail',      chance: 0.06, quantity: [1, 1] },
      { itemKey: 'resistance_ring',chance: 0.05, quantity: [1, 1] },
      { itemKey: 'blood_signet',   chance: 0.05, quantity: [1, 1] },
    ]
  },

  blood_golem: {
    key: 'blood_golem',
    name: '혈석 골렘',
    texture: 'monster_golem',
    level: 40,
    baseHp: 900,
    baseDamage: 85,
    defense: 45,
    magicResist: 20,   // 돌 몸체라 마법에 둔감
    speed: 45,
    xpReward: 450,
    goldReward: { min: 110, max: 200 },
    drainRate: 0.20,
    drainType: 'normal',
    attackRange: 55,
    attackCooldown: 1800,
    aggroRange: 260,
    defenseState: {
      trigger: 0.4,
      type: 'physical_barrier',
    },
    patterns: ['ground_slam', 'blood_boulder'],
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 0.7,  quantity: [4, 8] },
      { itemKey: 'abyss_stone',     chance: 0.4,  quantity: [1, 3] },
      { itemKey: 'iron_plate',      chance: 0.10, quantity: [1, 1] },
      { itemKey: 'guard_helm',      chance: 0.10, quantity: [1, 1] },
      { itemKey: 'iron_greaves',    chance: 0.08, quantity: [1, 1] },
      { itemKey: 'iron_gauntlets',  chance: 0.08, quantity: [1, 1] },
      { itemKey: 'swift_boots',     chance: 0.08, quantity: [1, 1] },
      { itemKey: 'crusader_sword',  chance: 0.06, quantity: [1, 1] },
      { itemKey: 'crimson_staff',   chance: 0.06, quantity: [1, 1] },
      { itemKey: 'crimson_bow',     chance: 0.06, quantity: [1, 1] },
      { itemKey: 'resistance_ring', chance: 0.07, quantity: [1, 1] },
      { itemKey: 'blood_signet',    chance: 0.07, quantity: [1, 1] },
      { itemKey: 'abyss_ring',      chance: 0.04, quantity: [1, 1] },
    ]
  },

  shadow_knight: {
    key: 'shadow_knight',
    name: '어둠 기사',
    texture: 'monster_shadowknight',
    level: 60,
    baseHp: 650,
    baseDamage: 110,
    defense: 30,
    magicResist: 35,   // 어둠 속성 기사, 마법 저항 높음
    speed: 88,
    xpReward: 550,
    goldReward: { min: 130, max: 240 },
    drainRate: 0.40,
    drainType: 'skill',
    attackRange: 52,
    attackCooldown: 900,
    aggroRange: 320,
    defenseState: {
      trigger: 'periodic',
      interval: 10000,
      type: 'full_guard',
    },
    patterns: ['dark_slash', 'shadow_dash', 'full_guard'],
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 0.65, quantity: [4, 7] },
      { itemKey: 'abyss_stone',     chance: 0.45, quantity: [1, 3] },
      { itemKey: 'bloodkin_emblem', chance: 0.35, quantity: [1, 2] },
      { itemKey: 'bloodbound_armor',chance: 0.08, quantity: [1, 1] },
      { itemKey: 'blood_crown',     chance: 0.07, quantity: [1, 1] },
      { itemKey: 'shadow_treads',   chance: 0.07, quantity: [1, 1] },
      { itemKey: 'shadow_trousers', chance: 0.07, quantity: [1, 1] },
      { itemKey: 'abyss_gloves',    chance: 0.06, quantity: [1, 1] },
      { itemKey: 'bloodkin_blade',  chance: 0.05, quantity: [1, 1] },
      { itemKey: 'void_bow',        chance: 0.04, quantity: [1, 1] },
      { itemKey: 'abyss_wand',      chance: 0.04, quantity: [1, 1] },
      { itemKey: 'abyss_ring',      chance: 0.06, quantity: [1, 1] },
      { itemKey: 'crit_ring',       chance: 0.06, quantity: [1, 1] },
    ]
  },

  blood_kin: {
    key: 'blood_kin',
    name: '혈족 전사',
    texture: 'monster_bloodkin',
    level: 55,
    baseHp: 500,
    baseDamage: 70,
    defense: 25,
    magicResist: 25,   // 혈족 특수 훈련, 마법 어느 정도 버팀
    speed: 80,
    xpReward: 300,
    goldReward: { min: 80, max: 150 },
    drainRate: 0.30,
    drainType: 'skill',
    attackRange: 50,
    attackCooldown: 1000,
    aggroRange: 280,
    defenseState: {
      trigger: 'periodic',  // 주기적 발동
      interval: 8000,       // 8초마다
      type: 'full_guard',
    },
    patterns: ['combo_slash', 'shield_bash', 'full_guard', 'self_buff'],
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 0.6,  quantity: [3, 6] },
      { itemKey: 'abyss_stone',     chance: 0.3,  quantity: [1, 2] },
      { itemKey: 'bloodkin_emblem', chance: 0.4,  quantity: [1, 2] },
      { itemKey: 'crusader_sword',  chance: 0.10, quantity: [1, 1] },
      { itemKey: 'iron_plate',      chance: 0.10, quantity: [1, 1] },
      { itemKey: 'guard_helm',      chance: 0.08, quantity: [1, 1] },
      { itemKey: 'abyss_pendant',   chance: 0.08, quantity: [1, 1] },
      { itemKey: 'resistance_ring', chance: 0.07, quantity: [1, 1] },
      { itemKey: 'blood_signet',    chance: 0.07, quantity: [1, 1] },
      { itemKey: 'bloodkin_blade',  chance: 0.05, quantity: [1, 1] },
    ]
  },

  // 혈계 고블린 — 빠르게 도망다니는 XP원
  blood_goblin: {
    key: 'blood_goblin',
    name: '혈계 고블린',
    texture: 'monster_goblin',
    level: 12,
    baseHp: 65,
    baseDamage: 10,
    defense: 2,
    speed: 195,             // 맵 내 최고속 — 따라잡기 어려움
    xpReward: 180,          // HP 대비 높은 XP — 잡을 가치 있음
    goldReward: { min: 20, max: 50 },
    drainRate: 0,
    drainType: 'normal',
    attackRange: 32,
    attackCooldown: 2500,
    aggroRange: 300,        // 일찍 눈치챔
    isGoblin: true,         // AI 분기 플래그
    patterns: [],
    dropTable: [
      { itemKey: 'blood_crystal', chance: 0.6,  quantity: [1, 2] },
      { itemKey: 'iron_ore',      chance: 0.4,  quantity: [1, 2] },
      { itemKey: 'leather',       chance: 0.3,  quantity: [1, 1] },
    ],
  },

  // 원거리 몬스터 1 — 혈령 궁수 (중간 레벨, 화살 발사)
  blood_archer: {
    key: 'blood_archer',
    name: '혈령 궁수',
    texture: 'monster_archer',
    level: 18,
    baseHp: 120,
    baseDamage: 18,
    defense: 3,
    speed: 70,
    xpReward: 60,
    goldReward: { min: 15, max: 30 },
    drainRate: 0.10,
    drainType: 'normal',
    attackRange: 260,     // 원거리 사정거리
    attackCooldown: 1800,
    aggroRange: 300,
    isRanged: true,
    projColor: 0x27ae60,  // 초록 화살
    projSpeed: 220,
    patterns: ['ranged_shot'],
    dropTable: [
      { itemKey: 'blood_crystal',  chance: 0.4, quantity: [1, 2] },
      { itemKey: 'leather',        chance: 0.5, quantity: [1, 3] },
      { itemKey: 'hunters_bow',    chance: 0.10, quantity: [1, 1] },
      { itemKey: 'leather_boots',  chance: 0.08, quantity: [1, 1] },
      { itemKey: 'power_ring',     chance: 0.05, quantity: [1, 1] },
      { itemKey: 'wisdom_ring',    chance: 0.05, quantity: [1, 1] },
    ]
  },

  // 원거리 몬스터 2 — 독액 마법사 (높은 레벨, 느린 마법 탄)
  poison_mage: {
    key: 'poison_mage',
    name: '독액 마법사',
    texture: 'monster_mage',
    level: 32,
    baseHp: 180,
    baseDamage: 28,
    defense: 5,
    magicResist: 45,   // 마법사 본인이 마법 사용자라 마법 저항 최고
    speed: 55,
    xpReward: 120,
    goldReward: { min: 35, max: 65 },
    drainRate: 0.15,
    drainType: 'poison',
    attackRange: 300,
    attackCooldown: 2400,
    aggroRange: 320,
    isRanged: true,
    projColor: 0x8e00ff,  // 보라 마법탄
    projSpeed: 150,       // 느리지만 강함
    patterns: ['ranged_shot'],
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 0.5, quantity: [2, 4] },
      { itemKey: 'abyss_stone',     chance: 0.25, quantity: [1, 2] },
      { itemKey: 'blood_staff',     chance: 0.10, quantity: [1, 1] },
      { itemKey: 'abyss_pendant',   chance: 0.07, quantity: [1, 1] },
    ]
  },
};

// ── 누적 처치 특별 몬스터 (25킬마다 등장, 웨이브 누적 강화) ──────────
export const HUNTER_WAVES = [
  {
    // 25킬 — 혈맹 사냥꾼
    name: '혈맹 사냥꾼',
    texture: 'monster_bloodkin',
    hpMult: 3.0, dmgMult: 2.0, speedMult: 1.3,
    tint: 0xff4488,
    xpReward: 400, goldReward: { min: 80, max: 150 },
    defense: 20, magicResist: 15,
    dropTable: [
      { itemKey: 'blood_crystal',  chance: 1.0, quantity: [3, 5] },
      { itemKey: 'abyss_stone',    chance: 0.5, quantity: [1, 2] },
      { itemKey: 'bloodkin_blade', chance: 0.15, quantity: [1, 1] },
    ],
  },
  {
    // 50킬 — 혈족 집행관
    name: '혈족 집행관',
    texture: 'monster_shadowknight',
    hpMult: 4.5, dmgMult: 2.8, speedMult: 1.2,
    tint: 0xcc00ff,
    xpReward: 800, goldReward: { min: 160, max: 280 },
    defense: 35, magicResist: 30,
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 1.0, quantity: [5, 8] },
      { itemKey: 'abyss_stone',     chance: 0.7, quantity: [2, 3] },
      { itemKey: 'bloodbound_armor',chance: 0.15, quantity: [1, 1] },
      { itemKey: 'bloodkin_blade',  chance: 0.12, quantity: [1, 1] },
    ],
  },
  {
    // 75킬 — 혈왕의 종
    name: '혈왕의 종',
    texture: 'monster_golem',
    hpMult: 6.5, dmgMult: 3.5, speedMult: 0.9,
    tint: 0xff2200,
    xpReward: 1400, goldReward: { min: 280, max: 450 },
    defense: 55, magicResist: 40,
    defenseState: { trigger: 0.5, type: 'physical_barrier' },
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 1.0, quantity: [6, 10] },
      { itemKey: 'abyss_stone',     chance: 0.8, quantity: [2, 4] },
      { itemKey: 'demon_blade',     chance: 0.12, quantity: [1, 1] },
      { itemKey: 'abyss_plate',     chance: 0.10, quantity: [1, 1] },
    ],
  },
  {
    // 100킬+ — 혈계의 군주 (이후 반복, 점점 강해짐)
    name: '혈계의 군주',
    texture: 'monster_shadowknight',
    hpMult: 9.0, dmgMult: 4.5, speedMult: 1.1,
    tint: 0x880000,
    xpReward: 2500, goldReward: { min: 500, max: 800 },
    defense: 70, magicResist: 55,
    defenseState: { trigger: 'periodic', interval: 8000, type: 'full_guard' },
    dropTable: [
      { itemKey: 'blood_crystal',   chance: 1.0, quantity: [8, 14] },
      { itemKey: 'abyss_stone',     chance: 1.0, quantity: [3, 5] },
      { itemKey: 'demon_blade',     chance: 0.20, quantity: [1, 1] },
      { itemKey: 'void_bow',        chance: 0.15, quantity: [1, 1] },
      { itemKey: 'void_staff',      chance: 0.15, quantity: [1, 1] },
      { itemKey: 'abyss_crown',     chance: 0.12, quantity: [1, 1] },
    ],
  },
];

export const MONSTER_SPAWN_TABLES = {
  plains: [
    { key: 'blood_slime',    weight: 45, minLevel: 1  },
    { key: 'blood_bat',      weight: 25, minLevel: 5  },
    { key: 'crimson_spider', weight: 15, minLevel: 15 },
    { key: 'blood_archer',   weight: 15, minLevel: 13 },
  ],
  forest: [
    { key: 'bloodfang_wolf', weight: 35, minLevel: 18 },
    { key: 'blood_bat',      weight: 25, minLevel: 5  },
    { key: 'blood_slime',    weight: 15, minLevel: 1  },
    { key: 'crimson_spider', weight: 10, minLevel: 15 },
    { key: 'blood_archer',   weight: 15, minLevel: 13 },
  ],
  outer: [
    { key: 'blood_golem',   weight: 35, minLevel: 35 },
    { key: 'shadow_knight', weight: 35, minLevel: 50 },
    { key: 'poison_mage',   weight: 30, minLevel: 28 },
  ],
};
