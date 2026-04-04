// 직업별 스킬 데이터

export const SKILL_DATA = {
  warrior: {
    key:         'charge',
    name:        '돌진',
    color:       0x3498db,
    mpCost:      20,
    cooldown:    5000,
    description: '전방으로 돌진, 경로 적에게 피해',
  },
  archer: {
    key:         'barrage',
    name:        '연사',
    color:       0x2ecc71,
    mpCost:      25,
    cooldown:    4000,
    description: '화살 5발 부채꼴 발사',
  },
  mage: {
    key:         'fireball',
    name:        '파이어볼',
    color:       0xe74c3c,
    mpCost:      40,
    cooldown:    6000,
    description: '폭발하는 불덩이 (범위 80px)',
  },
  priest: {
    key:         'holy_light',
    name:        '신성한 빛',
    color:       0xf1c40f,
    mpCost:      50,
    cooldown:    8000,
    description: 'HP 30% 즉시 회복',
  },
  alchemist: {
    key:         'poison_cloud',
    name:        '독 구름',
    color:       0x27ae60,
    mpCost:      30,
    cooldown:    6000,
    description: '범위 내 적에게 독 피해 (3초)',
  },
};
