// 직업별 스킬 데이터 + 계수

export const SKILL_DATA = {
  warrior: {
    key:         'charge',
    name:        '돌진',
    color:       0x3498db,
    mpCost:      20,
    cooldown:    5000,
    description: '전방으로 돌진, 경로 적에게 피해',
    params: {
      dashDistance:    200,   // 돌진 거리 (px)
      dashDuration:    180,   // 이동 시간 (ms)
      hitRadius:       45,    // 피격 판정 반경 (px)
      damageMultiplier: 1.5,  // 물리 데미지 배율
    },
  },

  archer: {
    key:         'barrage',
    name:        '연사',
    color:       0x2ecc71,
    mpCost:      25,
    cooldown:    4000,
    description: '화살 5발 부채꼴 발사',
    params: {
      projectileCount:  5,    // 발사 수
      spreadAngle:      0.22, // 화살 간 각도 간격 (rad)
      damageMultiplier: 0.7,  // 발당 물리 데미지 배율
      maxRange:         420,  // 사거리 (px)
    },
  },

  mage: {
    key:         'fireball',
    name:        '파이어볼',
    color:       0xff4500,
    mpCost:      40,
    cooldown:    6000,
    description: '폭발하는 불덩이 (범위 80px)',
    params: {
      damageMultiplier: 2.0,  // 직격 데미지 배율
      splashMultiplier: 0.6,  // 폭발 범위 데미지 배율
      splashRadius:     80,   // 폭발 반경 (px)
      speed:            260,  // 투사체 속도
      maxRange:         520,  // 사거리 (px)
      sizeScale:        2.2,  // 투사체 크기 배율
    },
  },

  priest: {
    key:         'holy_light',
    name:        '신성한 빛',
    color:       0xf1c40f,
    mpCost:      50,
    cooldown:    8000,
    description: 'HP 30% 즉시 회복',
    params: {
      healPercent: 0.3,       // maxHp 대비 회복 비율
    },
  },

  alchemist: {
    key:         'poison_cloud',
    name:        '독 구름',
    color:       0x27ae60,
    mpCost:      30,
    cooldown:    6000,
    description: '범위 내 적에게 독 피해 (3초)',
    params: {
      radius:              150,  // 구름 반경 (px)
      tickInterval:        500,  // 틱 간격 (ms)
      ticks:               8,    // 총 틱 횟수
      intMultiplier:       0.5,  // INT 기반 틱 피해 계수
      minDamage:           5,    // 최소 틱 피해
    },
  },

  berserker: {
    key:         'berserk',
    name:        '광전사',
    color:       0xe74c3c,
    mpCost:      35,
    cooldown:    10000,
    description: '10초간 공격력 +50%, 속도 +30%',
    params: {
      damageBonus: 1.5,     // 공격 배율
      speedBonus:  1.3,     // 이동속도 배율
      duration:    10000,   // 지속 시간 (ms)
    },
  },

  knight: {
    key:         'shield_bash',
    name:        '방패 강타',
    color:       0x95a5a6,
    mpCost:      25,
    cooldown:    7000,
    description: '전방 적 스턴 + 방어력 비례 피해',
    params: {
      hitRadius:          60,    // 피격 반경 (px)
      defenseMultiplier:  2.0,   // defense 값 × 배율 = 피해
      stunDuration:       2000,  // 스턴 지속 (ms)
    },
  },
};
