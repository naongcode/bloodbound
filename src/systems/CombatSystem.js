// 전투 수치 시스템 (combat_formula.md 기반)

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // ── 물리 피해 계산 ──────────────────────────────────────
  calcPhysicalDamage(attacker, target, skillMultiplier = 1.0) {
    const atkStats = attacker.totalStats || attacker.stats;
    const defStats = target.totalStats  || target.stats;

    const baseDmg = (atkStats.STR * 2.5 + (atkStats.attackPower || 0)) * skillMultiplier;
    const rand    = 0.9 + Math.random() * 0.2;
    const defense = defStats.defense || 0;
    const level   = target.level || 1;
    const defReduction = defense / (defense + level * 10) * baseDmg;
    const damage  = Math.max(1, Math.floor(baseDmg * rand - defReduction));

    return this.applyCritical(atkStats, damage);
  }

  // ── 마법 피해 계산 ──────────────────────────────────────
  calcMagicDamage(attacker, target, skillBasePower, skillMultiplier = 1.0) {
    const atkStats = attacker.totalStats || attacker.stats;
    const defStats = target.totalStats  || target.stats;

    const baseDmg    = (atkStats.INT * 3.0 + skillBasePower) * skillMultiplier;
    const rand       = 0.9 + Math.random() * 0.2;
    const magicRes   = defStats.magicResist || 0;
    const reductPct  = Math.min(0.75, magicRes / (magicRes + 200));
    const damage     = Math.max(1, Math.floor(baseDmg * rand * (1 - reductPct)));

    return this.applyCritical(atkStats, damage);
  }

  // ── 치명타 판정 ─────────────────────────────────────────
  applyCritical(atkStats, damage) {
    const critChance = Math.min(0.6, (atkStats.AGI || 0) * 0.0005 + (atkStats.critRate || 0));
    const critMult   = 1.5 + (atkStats.critDamage || 0);
    const isCrit     = Math.random() < critChance;
    return { damage: isCrit ? Math.floor(damage * critMult) : damage, isCrit };
  }

  // ── 흡혈 계산 ───────────────────────────────────────────
  calcDrain(damage, drainRate, targetRES) {
    const res = targetRES || 0;
    const reduction = res / (res + 200);          // 최대 ~80%
    const capped    = Math.min(reduction, 0.80);
    return Math.floor(damage * drainRate * (1 - capped));
  }

  // ── 힐 계산 ─────────────────────────────────────────────
  calcHeal(healer, skillBase, skillMultiplier = 1.0) {
    const stats = healer.totalStats || healer.stats;
    return Math.floor((stats.WIS * 3.5 + skillBase) * skillMultiplier);
  }

  // ── 피해 적용 (몬스터 → 플레이어) ────────────────────────
  applyDamageToPlayer(player, rawDamage, drainRate = 0, source = null) {
    const actual = Math.max(1, rawDamage);
    player.hp = Math.max(0, player.hp - actual);

    // 흡혈 처리
    if (source && drainRate > 0) {
      const drained = this.calcDrain(actual, drainRate, player.stats.RES);
      source.hp = Math.min(source.maxHp, source.hp + drained);
    }

    this.showDamageNumber(player, actual, false);
    this.scene.events.emit('playerDamaged', { player, damage: actual });

    if (player.hp <= 0) {
      this.scene.events.emit('playerDied', { player });
    }
    return actual;
  }

  // ── 피해 적용 (플레이어 → 몬스터) ────────────────────────
  applyDamageToMonster(monster, damageResult, attacker = null) {
    const { damage, isCrit } = damageResult;
    monster.hp = Math.max(0, monster.hp - damage);

    this.showDamageNumber(monster, damage, isCrit);

    if (monster.hp <= 0) {
      this.scene.events.emit('monsterDied', { monster, attacker });
    }
    return damage;
  }

  // ── 피해 숫자 표시 ───────────────────────────────────────
  showDamageNumber(target, damage, isCrit) {
    const x = target.x + Phaser.Math.Between(-20, 20);
    const y = target.y - 20;
    const color  = isCrit ? '#f39c12' : '#ffffff';
    const size   = isCrit ? '18px'    : '14px';
    const prefix = isCrit ? '★ '      : '';

    const text = this.scene.add.text(x, y, `${prefix}${damage}`, {
      fontSize: size, fill: color, fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#000000', strokeThickness: 3
    }).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 900,
      ease: 'Power1',
      onComplete: () => text.destroy()
    });
  }

  // ── 흡혈 숫자 표시 (초록) ────────────────────────────────
  showDrainNumber(target, amount) {
    const x    = target.x + Phaser.Math.Between(-15, 15);
    const y    = target.y - 10;
    const text = this.scene.add.text(x, y, `+${amount}`, {
      fontSize: '13px', fill: '#27ae60',
      stroke: '#000000', strokeThickness: 2
    }).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy()
    });
  }

  // ── 공격 히트 이펙트 ─────────────────────────────────────
  showHitEffect(scene, x, y) {
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, 8);
    scene.tweens.add({
      targets: g, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 200, onComplete: () => g.destroy()
    });
  }

  // ── 흡혈 이펙트 (붉은 원) ────────────────────────────────
  showDrainEffect(scene, x, y) {
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0xc0392b, 0.7);
    g.fillCircle(x, y, 12);
    scene.tweens.add({
      targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 400, onComplete: () => g.destroy()
    });
  }

  // ── 방어 파훼 이펙트 (황금 파편) ────────────────────────
  showBreakEffect(scene, x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const g = scene.add.graphics().setDepth(50);
      g.fillStyle(0xf39c12, 1);
      g.fillCircle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 5);
      scene.tweens.add({
        targets: g, alpha: 0,
        duration: 500, onComplete: () => g.destroy()
      });
    }
  }
}
