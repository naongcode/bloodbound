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
      { itemKey: 'blood_crystal', chance: 0.4, quantity: [1, 2] },
      { itemKey: 'iron_ore',      chance: 0.2, quantity: [1, 1] },
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
      { itemKey: 'blood_crystal', chance: 0.3, quantity: [1, 1] },
      { itemKey: 'leather',       chance: 0.5, quantity: [1, 2] },
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
      trigger: 0.4,         // HP 40% 이하
      type: 'physical_barrier',
    },
    patterns: ['charge', 'bite_combo', 'pack_assault'],
    dropTable: [
      { itemKey: 'blood_crystal', chance: 0.5, quantity: [2, 4] },
      { itemKey: 'leather',       chance: 0.7, quantity: [2, 5] },
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
      { itemKey: 'blood_crystal',   chance: 0.6, quantity: [3, 6] },
      { itemKey: 'abyss_stone',     chance: 0.3, quantity: [1, 2] },
      { itemKey: 'bloodkin_emblem', chance: 0.4, quantity: [1, 2] },
    ]
  }
};

export const MONSTER_SPAWN_TABLES = {
  plains: [
    { key: 'blood_slime', weight: 50, minLevel: 1 },
    { key: 'blood_bat',   weight: 30, minLevel: 5 },
  ],
  forest: [
    { key: 'bloodfang_wolf', weight: 40, minLevel: 18 },
    { key: 'blood_bat',      weight: 30, minLevel: 5  },
    { key: 'blood_slime',    weight: 30, minLevel: 1  },
  ],
};
