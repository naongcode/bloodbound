// 직업 데이터 (combat_formula.md 기반)

export const JOB_DATA = {
  warrior: {
    key: 'warrior',
    name: '전사',
    texture: 'player_warrior',
    baseHp: 500,
    baseMp: 100,
    statGrowth: { STR: 3.0, AGI: 1.5, INT: 0.5, VIT: 2.5, WIS: 0.5, RES: 0.5 },
    description: '근접 탱커. 높은 HP와 방어력.'
  },
  archer: {
    key: 'archer',
    name: '궁수',
    texture: 'player_archer',
    baseHp: 350,
    baseMp: 150,
    statGrowth: { STR: 1.5, AGI: 3.5, INT: 0.5, VIT: 1.5, WIS: 1.0, RES: 0.5 },
    description: '원거리 딜러. 빠른 공격속도.'
  },
  mage: {
    key: 'mage',
    name: '마법사',
    texture: 'player_mage',
    baseHp: 200,
    baseMp: 400,
    statGrowth: { STR: 0.5, AGI: 1.0, INT: 4.0, VIT: 1.0, WIS: 2.5, RES: 0.5 },
    description: '강력한 광역 마법. 낮은 HP.'
  },
  priest: {
    key: 'priest',
    name: '사제',
    texture: 'player_priest',
    baseHp: 250,
    baseMp: 350,
    statGrowth: { STR: 0.5, AGI: 1.0, INT: 2.5, VIT: 1.5, WIS: 3.5, RES: 0.5 },
    description: '힐 및 버프. 파티의 핵심.'
  },
  alchemist: {
    key: 'alchemist',
    name: '연금술사',
    texture: 'player_alchemist',
    baseHp: 300,
    baseMp: 250,
    statGrowth: { STR: 1.0, AGI: 2.0, INT: 2.5, VIT: 1.5, WIS: 2.0, RES: 0.5 },
    description: '상태이상 특화. 독특한 플레이스타일.'
  }
};

// 레벨 1 기본 스탯 (전 직업 공통)
export const BASE_STATS = {
  STR: 10, AGI: 10, INT: 10, VIT: 10, WIS: 10, RES: 5
};

// 레벨업 필요 경험치 (공식: 100 × N^1.8)
export function getRequiredXP(level) {
  return Math.floor(100 * Math.pow(level, 1.8));
}

// 최대 HP 계산
export function calcMaxHp(job, stats, level) {
  return job.baseHp + stats.VIT * 20 + level * 50;
}

// 최대 MP 계산
export function calcMaxMp(job, stats, level) {
  return job.baseMp + stats.WIS * 15 + level * 20;
}
