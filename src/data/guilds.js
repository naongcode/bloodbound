// 길드 레벨별 혜택 데이터

export const GUILD_LEVEL_DATA = [
  // idx 0 = Lv 1
  { level: 1,  expNeeded: 0,      maxMembers: 20, goldBonus: 0,    dropBonus: 0,    xpBonus: 0,    speedBonus: 0    },
  { level: 2,  expNeeded: 2000,   maxMembers: 22, goldBonus: 0,    dropBonus: 0,    xpBonus: 0,    speedBonus: 0    },
  { level: 3,  expNeeded: 5000,   maxMembers: 25, goldBonus: 0.03, dropBonus: 0,    xpBonus: 0,    speedBonus: 0    },
  { level: 4,  expNeeded: 10000,  maxMembers: 28, goldBonus: 0.03, dropBonus: 0.01, xpBonus: 0,    speedBonus: 0    },
  { level: 5,  expNeeded: 18000,  maxMembers: 30, goldBonus: 0.03, dropBonus: 0.02, xpBonus: 0,    speedBonus: 0    },
  { level: 6,  expNeeded: 30000,  maxMembers: 35, goldBonus: 0.03, dropBonus: 0.02, xpBonus: 0.03, speedBonus: 0    },
  { level: 7,  expNeeded: 48000,  maxMembers: 40, goldBonus: 0.03, dropBonus: 0.02, xpBonus: 0.05, speedBonus: 0    },
  { level: 8,  expNeeded: 72000,  maxMembers: 45, goldBonus: 0.04, dropBonus: 0.03, xpBonus: 0.05, speedBonus: 0    },
  { level: 9,  expNeeded: 100000, maxMembers: 50, goldBonus: 0.04, dropBonus: 0.03, xpBonus: 0.05, speedBonus: 0    },
  { level: 10, expNeeded: 140000, maxMembers: 60, goldBonus: 0.06, dropBonus: 0.04, xpBonus: 0.05, speedBonus: 0.03 },
  { level: 15, expNeeded: 350000, maxMembers: 75, goldBonus: 0.06, dropBonus: 0.04, xpBonus: 0.10, speedBonus: 0.03 },
  { level: 20, expNeeded: 700000, maxMembers: 90, goldBonus: 0.08, dropBonus: 0.05, xpBonus: 0.10, speedBonus: 0.05 },
  { level: 25, expNeeded: 1200000,maxMembers: 95, goldBonus: 0.10, dropBonus: 0.07, xpBonus: 0.15, speedBonus: 0.05 },
  { level: 30, expNeeded: 2000000,maxMembers: 100,goldBonus: 0.15, dropBonus: 0.10, xpBonus: 0.20, speedBonus: 0.08 },
];

// 길드 퀘스트 풀 (매일 3개 랜덤 선택)
export const GUILD_QUEST_POOL = [
  { id: 'kill_slime_20',  title: '슬라임 사냥',       desc: '흡혈 슬라임 20마리 처치',  type: 'kill', target: 'blood_slime',    count: 20,  guildXp: 500,  goldReward: 200  },
  { id: 'kill_bat_15',    title: '박쥐 소탕',          desc: '피박쥐 15마리 처치',       type: 'kill', target: 'blood_bat',      count: 15,  guildXp: 500,  goldReward: 200  },
  { id: 'kill_wolf_10',   title: '늑대 사냥',          desc: '흡혈 늑대 10마리 처치',    type: 'kill', target: 'bloodfang_wolf', count: 10,  guildXp: 800,  goldReward: 350  },
  { id: 'kill_kin_5',     title: '혈족 처치',          desc: '혈족 전사 5마리 처치',     type: 'kill', target: 'blood_kin',      count: 5,   guildXp: 1200, goldReward: 500  },
  { id: 'dungeon_clear_1','title': '던전 클리어',       desc: '던전 1회 클리어',          type: 'dungeon', count: 1,             guildXp: 1000, goldReward: 400 },
  { id: 'dungeon_clear_3','title': '연속 던전 공략',    desc: '던전 3회 클리어',          type: 'dungeon', count: 3,             guildXp: 2500, goldReward: 900 },
  { id: 'gold_1000',      title: '자금 조달',           desc: '골드 1,000 획득',          type: 'gold',    count: 1000,          guildXp: 400,  goldReward: 150 },
  { id: 'gold_5000',      title: '대규모 자금 조달',    desc: '골드 5,000 획득',          type: 'gold',    count: 5000,          guildXp: 1000, goldReward: 300 },
  { id: 'level_up_1',     title: '레벨업',              desc: '레벨을 1 올리기',          type: 'level',   count: 1,             guildXp: 600,  goldReward: 250 },
  { id: 'boss_kill_1',    title: '혈왕 토벌',           desc: '필드 보스 혈왕 처치',      type: 'boss',    count: 1,             guildXp: 3000, goldReward: 1000},
];

// 길드 버프 목록 (레벨 1~3 강화, 영구 적용)
// levels[i] = { effect, cost }  — cost는 해당 레벨로 올리는 데 드는 길드 자금
export const GUILD_BUFFS = [
  {
    key: 'combat_spirit',  name: '전투의 기운',
    levels: [
      { effect: { attackBonus: 0.05 }, cost: 1000 },
      { effect: { attackBonus: 0.10 }, cost: 2000 },
      { effect: { attackBonus: 0.15 }, cost: 3000 },
    ],
  },
  {
    key: 'defense_will',   name: '방어의 의지',
    levels: [
      { effect: { defenseBonus: 0.05 }, cost: 1000 },
      { effect: { defenseBonus: 0.10 }, cost: 2000 },
      { effect: { defenseBonus: 0.15 }, cost: 3000 },
    ],
  },
  {
    key: 'explorer',       name: '탐험가의 본능',
    levels: [
      { effect: { dropBonus: 0.03, speedBonus: 0.03 }, cost: 1500 },
      { effect: { dropBonus: 0.05, speedBonus: 0.05 }, cost: 2500 },
      { effect: { dropBonus: 0.08, speedBonus: 0.08 }, cost: 4000 },
    ],
  },
  {
    key: 'abyss_awakening', name: '심연의 각성',
    levels: [
      { effect: { skillCdBonus: -0.05 }, cost: 2000 },
      { effect: { skillCdBonus: -0.08 }, cost: 3500 },
      { effect: { skillCdBonus: -0.12 }, cost: 5000 },
    ],
  },
  {
    key: 'blood_pact',     name: '혈맹의 서약',
    levels: [
      { effect: { attackBonus: 0.03, defenseBonus: 0.03, dropBonus: 0.02, speedBonus: 0.02, xpBonus: 0.05 }, cost: 5000  },
      { effect: { attackBonus: 0.05, defenseBonus: 0.05, dropBonus: 0.03, speedBonus: 0.03, xpBonus: 0.08 }, cost: 10000 },
      { effect: { attackBonus: 0.08, defenseBonus: 0.08, dropBonus: 0.05, speedBonus: 0.05, xpBonus: 0.12 }, cost: 18000 },
    ],
  },
];

// 길드 창설 조건
export const GUILD_CREATE_REQUIREMENTS = {
  minLevel: 5,
  goldCost: 5000,
};
