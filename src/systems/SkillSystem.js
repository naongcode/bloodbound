import Projectile from '../entities/Projectile.js';

const MAP_W = 3200;
const MAP_H = 2400;

// ── 근접 휘두르기 이펙트 ────────────────────────────────────
export function showMeleeEffect(scene, x, y, range) {
  const g = scene.add.graphics().setDepth(20);
  g.setPosition(x, y);
  g.lineStyle(3, 0xe74c3c, 0.8);
  g.strokeCircle(0, 0, range);
  g.fillStyle(0xe74c3c, 0.12);
  g.fillCircle(0, 0, range);
  scene.tweens.add({
    targets: g, alpha: 0, scaleX: 1.2, scaleY: 1.2,
    duration: 200, onComplete: () => g.destroy()
  });
}

// ── 스킬 라우터 ─────────────────────────────────────────────
export function handlePlayerSkill(scene, player, skill, x, y, targetX, targetY) {
  switch (skill) {
    case 'charge':       _skillCharge(scene, player, targetX, targetY);         break;
    case 'barrage':      _skillBarrage(scene, player, x, y, targetX, targetY);  break;
    case 'fireball':     _skillFireball(scene, player, x, y, targetX, targetY); break;
    case 'holy_light':   _skillHolyLight(scene, player);                         break;
    case 'poison_cloud': _skillPoisonCloud(scene, player, x, y);                break;
  }
}

// warrior — 돌진
function _skillCharge(scene, player, targetX, targetY) {
  const { dashDistance, dashDuration, hitRadius, damageMultiplier } = player.skillDef.params;
  const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
  const fromX = player.x, fromY = player.y;
  const toX   = Phaser.Math.Clamp(fromX + Math.cos(angle) * dashDistance, 60, MAP_W - 60);
  const toY   = Phaser.Math.Clamp(fromY + Math.sin(angle) * dashDistance, 60, MAP_H - 60);

  player.isDodging = true;
  player.setAlpha(0.65);

  scene.tweens.add({
    targets: player, x: toX, y: toY, duration: dashDuration, ease: 'Power2',
    onUpdate: () => {
      const r = scene.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
      scene.monsters.getChildren().forEach(m => {
        if (!m.isAlive) return;
        if (Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y) < hitRadius) {
          m.takeDamage(r.damage * damageMultiplier);
        }
      });
    },
    onComplete: () => { player.isDodging = false; player.setAlpha(1); },
  });

  // 궤적 이펙트
  const g = scene.add.graphics().setDepth(18);
  g.lineStyle(4, player.skillDef.color, 0.7);
  g.beginPath(); g.moveTo(fromX, fromY); g.lineTo(toX, toY); g.strokePath();
  scene.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
}

// archer — 연사 (부채꼴 다발)
function _skillBarrage(scene, player, x, y, targetX, targetY) {
  const { projectileCount, spreadAngle, damageMultiplier, maxRange } = player.skillDef.params;
  const base   = Phaser.Math.Angle.Between(x, y, targetX, targetY);
  const result = scene.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
  const half   = Math.floor(projectileCount / 2);
  for (let i = -half; i <= half; i++) {
    const a  = base + i * spreadAngle;
    const tx = x + Math.cos(a) * 200;
    const ty = y + Math.sin(a) * 200;
    scene._bullets.push(new Projectile(scene, x, y, tx, ty, {
      damage:   result.damage * damageMultiplier,
      isCrit:   result.isCrit,
      maxRange,
      color:    player.skillDef.color,
    }));
  }
}

// mage — 파이어볼 (느리고 큰 투사체, 적중 시 폭발)
function _skillFireball(scene, player, x, y, targetX, targetY) {
  const { damageMultiplier, splashMultiplier, splashRadius, speed, maxRange, sizeScale } = player.skillDef.params;
  const result = scene.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
  const dmg    = result.damage * damageMultiplier;
  scene._bullets.push(new Projectile(scene, x, y, targetX, targetY, {
    damage: dmg,
    speed, maxRange, sizeScale,
    color:  player.skillDef.color,
    onExplode: (ex, ey) => {
      scene.monsters.getChildren().forEach(m => {
        if (!m.isAlive) return;
        if (Phaser.Math.Distance.Between(ex, ey, m.x, m.y) < splashRadius) {
          m.takeDamage(dmg * splashMultiplier);
        }
      });
      _showExplosion(scene, ex, ey);
    },
  }));
}

// priest — 신성한 빛 (HP 회복)
function _skillHolyLight(scene, player) {
  const { healPercent } = player.skillDef.params;
  const heal = Math.floor(player.maxHp * healPercent);
  player.hp  = Math.min(player.maxHp, player.hp + heal);
  scene.events.emit('statsChanged', player);
  scene.showFloatText(player.x, player.y - 45, `+${heal} HP`, '#f1c40f', '18px');

  const g = scene.add.graphics().setDepth(18).setPosition(player.x, player.y);
  g.fillStyle(player.skillDef.color, 0.28);
  g.fillCircle(0, 0, 70);
  scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 600, onComplete: () => g.destroy() });
}

// alchemist — 독 구름
function _skillPoisonCloud(scene, player, x, y) {
  const { radius, tickInterval, ticks, intMultiplier, minDamage } = player.skillDef.params;
  const g = scene.add.graphics().setDepth(8).setPosition(x, y);
  g.fillStyle(player.skillDef.color, 0.2);   g.fillCircle(0, 0, radius);
  g.lineStyle(2, player.skillDef.color, 0.5); g.strokeCircle(0, 0, radius);

  scene.time.addEvent({
    delay: tickInterval, repeat: ticks - 1,
    callback: () => {
      scene.monsters.getChildren().forEach(m => {
        if (!m.isAlive) return;
        if (Phaser.Math.Distance.Between(x, y, m.x, m.y) < radius) {
          m.takeDamage(Math.max(minDamage, player.totalStats.INT * intMultiplier));
        }
      });
    },
  });
  scene.tweens.add({ targets: g, alpha: 0, duration: tickInterval * ticks, onComplete: () => g.destroy() });
}

// 폭발 이펙트 (fireball용)
function _showExplosion(scene, x, y) {
  const g = scene.add.graphics().setDepth(20).setPosition(x, y);
  g.fillStyle(0xff6600, 0.75); g.fillCircle(0, 0, 80);
  g.fillStyle(0xffcc00, 0.9);  g.fillCircle(0, 0, 42);
  g.fillStyle(0xffffff, 0.6);  g.fillCircle(0, 0, 16);
  scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 380, ease: 'Power2', onComplete: () => g.destroy() });
  scene.cameras.main.shake(100, 0.005);
}
