// 직업 데이터 (combat_formula.md 기반)

export const JOB_DATA = {
  // 전사: 맞으면서 싸움. STR/VIT 중심. AGI 성장 낮아 레벨 높아도 느린 편
  warrior: {
    key: 'warrior',
    name: '전사',
    texture: 'player_warrior',
    baseHp: 500,
    baseMp: 100,
    startAGI: 10,
    statGrowth: { STR: 3.0, AGI: 0.8, INT: 0.5, VIT: 2.5, WIS: 0.5, RES: 0.5 },
    description: '근접 탱커. 높은 HP와 방어력.'
  },
  // 궁수: AGI 성장 가장 빠름 → 레벨 5 내외에 박쥐(120)도 추월
  archer: {
    key: 'archer',
    name: '궁수',
    texture: 'player_archer',
    baseHp: 350,
    baseMp: 150,
    startAGI: 10,
    statGrowth: { STR: 1.5, AGI: 3.5, INT: 0.5, VIT: 1.5, WIS: 1.0, RES: 0.5 },
    description: '원거리 딜러. 빠른 공격속도.'
  },
  // 마법사: AGI 성장 낮음. 거리 유지가 관건
  mage: {
    key: 'mage',
    name: '마법사',
    texture: 'player_mage',
    baseHp: 200,
    baseMp: 400,
    startAGI: 10,
    statGrowth: { STR: 0.5, AGI: 1.0, INT: 4.0, VIT: 1.0, WIS: 2.5, RES: 0.5 },
    description: '강력한 광역 마법. 낮은 HP.'
  },
  // 사제: AGI 성장 낮음. 힐로 버팀
  priest: {
    key: 'priest',
    name: '사제',
    texture: 'player_priest',
    baseHp: 250,
    baseMp: 350,
    startAGI: 10,
    statGrowth: { STR: 0.5, AGI: 1.0, INT: 2.5, VIT: 1.5, WIS: 3.5, RES: 0.5 },
    description: '힐 및 버프. 파티의 핵심.'
  },
  // 연금술사: 중간 AGI 성장. 상태이상으로 몹을 느리게 만들어야 함
  alchemist: {
    key: 'alchemist',
    name: '연금술사',
    texture: 'player_alchemist',
    baseHp: 300,
    baseMp: 250,
    startAGI: 10,
    statGrowth: { STR: 1.0, AGI: 2.0, INT: 2.5, VIT: 1.5, WIS: 2.0, RES: 0.5 },
    description: '상태이상 특화. 독특한 플레이스타일.'
  },
  // 광전사: 스킬로 순간 가속
  berserker: {
    key: 'berserker',
    name: '광전사',
    texture: 'player_warrior',
    baseHp: 420,
    baseMp: 120,
    startAGI: 10,
    statGrowth: { STR: 2.5, AGI: 1.5, INT: 0.5, VIT: 2.0, WIS: 0.5, RES: 0.5 },
    description: '공격 특화 근접. 광전사 스킬로 순간 가속.'
  },
  // 나이트: AGI 성장 최저. 방어로 버텨야 함
  knight: {
    key: 'knight',
    name: '나이트',
    texture: 'player_warrior',
    baseHp: 550,
    baseMp: 80,
    startAGI: 10,
    statGrowth: { STR: 2.0, AGI: 0.5, INT: 0.5, VIT: 3.0, WIS: 0.5, RES: 1.0 },
    description: '최고의 탱커. 방패 강타로 스턴.'
  },
};

// 레벨 1 기본 스탯 (전 직업 공통 — AGI는 직업별 startAGI로 덮어씀)
export const BASE_STATS = {
  STR: 10, AGI: 10, INT: 10, VIT: 10, WIS: 10, RES: 5
};

// 이동속도 계산 (AGI 기반)
// 몬스터 이속 참고: 슬라임 60, 늑대 100, 박쥐 120 (최대)
// 전사(AGI5)→80, 나이트(AGI4)→78, 궁수(AGI20)→110, 레벨업으로 점차 빨라짐
// AGI=10(기본) → 이속 110. 박쥐(최속 120) 추월 기준: AGI 20
export function calcMoveSpeed(agi) {
  return Math.round(100 + agi);
}

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
