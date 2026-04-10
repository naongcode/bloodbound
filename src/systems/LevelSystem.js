import { getRequiredXP, calcMaxHp, calcMaxMp, calcMoveSpeed, BASE_STATS } from '../data/jobs.js';

// ── 직업 등급 ─────────────────────────────────────────────
const RANK_THRESHOLDS = [
  { level: 10, prefix: '견습 ' },
  { level: 20, prefix: '숙련 ' },
  { level: 30, prefix: '고급 ' },
  { level: 40, prefix: '달인 ' },
  { level: 50, prefix: '전설의 ' },
];

export function getJobRankName(player) {
  const level = player.level;
  let prefix = '';
  for (const r of RANK_THRESHOLDS) {
    if (level >= r.level) prefix = r.prefix;
  }
  return prefix + player.jobData.name;
}

export default class LevelSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // 경험치 획득 처리
  gainXP(player, amount) {
    // 레벨 보정 — 레벨 차이당 3% 감소, 최소 20% 보장
    // (기존 5%/최소10% → 저레벨 몹도 어느 정도 XP 제공)
    const levelDiff = player.level - (amount.sourceLevel || player.level);
    const correction = Math.max(0.2, 1 - levelDiff * 0.03);
    const finalXP = Math.floor(amount.base * correction);

    player.xp += finalXP;

    // 레벨업 체크
    let leveledUp = false;
    while (player.xp >= getRequiredXP(player.level)) {
      player.xp -= getRequiredXP(player.level);
      this.levelUp(player);
      leveledUp = true;
    }

    return { gained: finalXP, leveledUp };
  }

  // 레벨업 처리
  levelUp(player) {
    const prevLevel = player.level;
    player.level += 1;
    player.skillPoints += 1;

    // 스탯 성장 적용
    const growth = player.jobData.statGrowth;
    Object.keys(growth).forEach(stat => {
      player.stats[stat] += growth[stat];
    });

    // HP/MP 최대치 재계산 및 풀 회복
    player.maxHp = calcMaxHp(player.jobData, player.stats, player.level);
    player.maxMp = calcMaxMp(player.jobData, player.stats, player.level);
    player.hp = player.maxHp;
    player.mp = player.maxMp;

    // 이동속도 재계산
    player.moveSpeed = calcMoveSpeed(player.stats.AGI || 10);

    this.scene.events.emit('levelUp', { player, level: player.level });

    // 등급 임계값 통과 시 rankUp 이벤트
    const crossed = RANK_THRESHOLDS.find(r => prevLevel < r.level && player.level >= r.level);
    if (crossed) {
      const rankName = crossed.prefix + player.jobData.name;
      this.scene.events.emit('rankUp', { player, rankName });
    }
  }

}
