// 몬스터 베이스 클래스 (monster_system.md 기반)

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, data) {
    super(scene, x, y, data.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(9);
    this.monsterData = data;

    // ── 스탯 ────────────────────────────────────────────────
    this.monsterKey  = data.key;
    this.monsterName = data.name;
    this.level       = data.level;
    this.maxHp       = data.baseHp;
    this.hp          = data.baseHp;
    this.damage      = data.baseDamage;
    this.defense     = data.defense || 0;
    this.speed       = data.speed;
    this.drainRate   = data.drainRate || 0;
    this.drainType   = data.drainType || 'normal';

    this.stats = {
      STR: Math.floor(data.baseDamage / 2.5),
      AGI: 5,
      INT: 5,
      VIT: Math.floor(data.baseHp / 20),
      WIS: 5,
      RES: 0,
      defense: data.defense || 0,
      attackPower: data.baseDamage,
    };

    // ── 전투 상태 ────────────────────────────────────────────
    this.isAlive       = true;
    this.isAggro       = false;
    this.target        = null;
    this.attackCooldown = 0;
    this.attackRange   = data.attackRange || 40;
    this.aggroRange    = data.aggroRange  || 200;

    this.defenseState  = null;     // 방어 상태 ('physical_barrier', 'full_guard' 등)
    this.defenseTimer  = 0;
    this.isStunned     = false;
    this.stunTimer     = 0;
    this.isEnraged     = false;    // 파훼 실패 시 격노

    this.patternIndex  = 0;
    this.patternTimer  = 0;

    // ── HP 바 ────────────────────────────────────────────────
    this.hpBar = scene.add.graphics().setDepth(11);
    this.hpBarBg = scene.add.graphics().setDepth(10);
    this.nameText = scene.add.text(x, y - 28, data.name, {
      fontSize: '10px', fill: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(12);

    this.body.setSize(24, 24);

    // ── 방어 상태 오라 (시각 피드백) ─────────────────────────
    this.defenseAura = scene.add.graphics().setDepth(8);
  }

  update(time, delta) {
    if (!this.isAlive) return;

    this.updateHpBar();
    this.updateStun(delta);
    this.updateDefenseState(delta, time);
    this.updateNameTag();

    if (this.isStunned) return;

    this.updateAI(delta);
    this.updateAttackCooldown(delta);
  }

  // ── AI 업데이트 ───────────────────────────────────────────
  updateAI(delta) {
    if (!this.target || !this.target.isAlive) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.x, this.y, this.target.x, this.target.y
    );

    if (dist <= this.aggroRange) {
      this.isAggro = true;
    }

    if (!this.isAggro) {
      this.setVelocity(0, 0);
      return;
    }

    if (dist > this.attackRange) {
      // 플레이어 추적
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      const speed = this.isEnraged ? this.speed * 1.3 : this.speed;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.setFlipX(this.target.x < this.x);
    } else {
      this.setVelocity(0, 0);
      this.tryAttack(delta);
    }
  }

  // ── 공격 시도 ─────────────────────────────────────────────
  tryAttack(delta) {
    if (this.attackCooldown > 0) return;

    const baseCooldown = this.monsterData.attackCooldown || 1500;
    this.attackCooldown = this.isEnraged ? baseCooldown * 0.7 : baseCooldown;

    this.executeAttack();
  }

  // ── 공격 실행 ─────────────────────────────────────────────
  executeAttack() {
    if (!this.target || !this.target.isAlive) return;

    const baseDmg = this.isEnraged ? this.damage * 1.5 : this.damage;
    this.target.takeDamage(baseDmg, this.drainRate, this);

    // 흡혈 이펙트
    if (this.drainRate > 0) {
      this.scene.combatSystem.showDrainEffect(this.scene, this.x, this.y);
    }

    // 저주 흡혈: 상태이상 부여
    if (this.drainType === 'curse' && Math.random() < 0.3) {
      this.applyBloodCurse(this.target);
    }
  }

  applyBloodCurse(target) {
    const existing = target.statusEffects.find(e => e.type === 'blood_curse');
    if (!existing) {
      target.statusEffects.push({ type: 'blood_curse', duration: 20000, elapsed: 0 });
      this.scene.events.emit('statusApplied', { target, type: 'blood_curse' });
    }
  }

  // ── 피격 ─────────────────────────────────────────────────
  takeDamage(amount) {
    // 방어 상태 중 피해 감소
    if (this.defenseState === 'physical_barrier') amount = Math.floor(amount * 0.05);
    if (this.defenseState === 'magic_barrier')   amount = Math.floor(amount * 0.05);
    if (this.defenseState === 'full_guard')      amount = 0;
    if (this.defenseState === 'drain_shield') {
      // 흡혈 보호막: 받은 피해만큼 HP 회복 후 0
      this.hp = Math.min(this.maxHp, this.hp + amount);
      return 0;
    }

    this.hp = Math.max(0, this.hp - amount);

    // 피격 이펙트
    this.setTint(0xff6666);
    this.scene.time.delayedCall(150, () => {
      if (this.active) this.clearTint();
    });

    // 방어 파훼 누적
    this.accumulateBreak(amount);

    if (this.hp <= 0) {
      // try-catch: 이벤트 핸들러에서 예외가 발생해도 die()는 반드시 실행
      try { this.scene.events.emit('monsterDied', { monster: this }); } catch (e) {
        console.warn('[Monster] monsterDied 이벤트 오류:', e);
      }
      this.die();
    }

    return amount;
  }

  // ── 방어 파훼 누적 ────────────────────────────────────────
  accumulateBreak(amount) {
    if (!this.defenseState) return;
    this._breakAccum = (this._breakAccum || 0) + amount;
    const threshold = this.maxHp * 0.15; // 최대 HP의 15% 누적 시 파훼
    if (this._breakAccum >= threshold) {
      this.breakDefense();
      this._breakAccum = 0;
    }
  }

  // ── 방어 파훼 ────────────────────────────────────────────
  breakDefense() {
    this.defenseState = null;
    this.defenseAura.clear();
    this.isStunned = true;
    this.stunTimer = 4000;
    this._breakCooldown = 10000; // 파훼 후 10초간 재발동 금지
    this.clearTint();

    // 파훼 이펙트
    this.scene.combatSystem.showBreakEffect(this.scene, this.x, this.y);
    this.scene.events.emit('defenseBreak', { monster: this });
  }

  // ── 방어 상태 업데이트 ────────────────────────────────────
  updateDefenseState(delta, time) {
    const dd = this.monsterData.defenseState;
    if (!dd) return;

    // 파훼 쿨다운 차감 (스턴 중에도 카운트)
    if (this._breakCooldown > 0) {
      this._breakCooldown -= delta;
      return;
    }

    // 스턴 중엔 새 방어 발동 안 함
    if (this.isStunned) return;

    if (dd.trigger === 'periodic') {
      this.defenseTimer += delta;
      if (this.defenseTimer >= dd.interval && !this.defenseState) {
        this.defenseTimer = 0;
        this.activateDefense(dd.type, 4000);
      }
    } else if (typeof dd.trigger === 'number') {
      if (!this.defenseState && this.hp / this.maxHp <= dd.trigger) {
        this.activateDefense(dd.type);
      }
    }
  }

  // ── 방어 상태 발동 ────────────────────────────────────────
  activateDefense(type, duration = null) {
    this.defenseState = type;
    this._breakAccum  = 0;
    this.drawDefenseAura(type);
    this.scene.events.emit('defenseActivated', { monster: this, type });

    if (duration) {
      this.scene.time.delayedCall(duration, () => {
        if (this.active && this.isAlive && !this.isStunned) {
          // 파훼 실패 → 격노
          this.defenseState = null;
          this.defenseAura.clear();
          if (!this.isEnraged) {
            this.isEnraged = true;
            this.scene.events.emit('monsterEnraged', { monster: this });
          }
        }
      });
    }
  }

  // ── 방어 오라 시각화 ─────────────────────────────────────
  drawDefenseAura(type) {
    const colors = {
      physical_barrier: 0xf1c40f,
      magic_barrier:    0x3498db,
      full_guard:       0xffffff,
      drain_shield:     0xe74c3c,
      thorn_defense:    0xe67e22,
    };
    const color = colors[type] || 0xffffff;

    this.defenseAura.clear();
    this.defenseAura.lineStyle(3, color, 0.8);
    this.defenseAura.strokeCircle(this.x, this.y, 22);
  }

  // ── 경직 처리 ────────────────────────────────────────────
  updateStun(delta) {
    if (this.isStunned) {
      this.stunTimer -= delta;
      this.setTint(0xaaaaff);
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.clearTint();
      }
    }
  }

  // ── HP 바 렌더링 ─────────────────────────────────────────
  updateHpBar() {
    const bw = 32, bh = 4;
    const bx = this.x - bw / 2;
    const by = this.y - 24;

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x222222, 0.8);
    this.hpBarBg.fillRect(bx, by, bw, bh);

    const pct   = Math.max(0, this.hp / this.maxHp);
    const color = pct > 0.5 ? 0x27ae60 : pct > 0.25 ? 0xf39c12 : 0xe74c3c;

    this.hpBar.clear();
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(bx, by, bw * pct, bh);

    // 격노 시 빨간 테두리
    if (this.isEnraged) {
      this.hpBar.lineStyle(1, 0xff0000, 1);
      this.hpBar.strokeRect(bx, by, bw, bh);
    }
  }

  updateNameTag() {
    this.nameText.setPosition(this.x, this.y - 30);
    this.defenseAura.clear();
    if (this.defenseState) this.drawDefenseAura(this.defenseState);
  }

  // ── 공격 쿨타임 ─────────────────────────────────────────
  updateAttackCooldown(delta) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
  }

  // ── 사망 ─────────────────────────────────────────────────
  die() {
    this.isAlive = false;
    this.setVelocity(0, 0);

    // 사망 이펙트
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => {
        this.hpBar.destroy();
        this.hpBarBg.destroy();
        this.nameText.destroy();
        this.defenseAura.destroy();
        this.destroy();
      }
    });
  }
}
