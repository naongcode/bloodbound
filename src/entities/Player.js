import { JOB_DATA, BASE_STATS, calcMaxHp, calcMaxMp, calcMoveSpeed, getRequiredXP } from '../data/jobs.js';
import { SKILL_DATA } from '../data/skills.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, jobKey = 'warrior') {
    const jobData = JOB_DATA[jobKey];
    super(scene, x, y, jobData.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setCollideWorldBounds(true);

    // ── 직업 & 스탯 ────────────────────────────────────────
    this.jobKey  = jobKey;
    this.jobData = jobData;
    this.level   = 1;
    this.xp      = 0;
    this.skillPoints = 0;

    // 기본 스탯 (레벨 1) — AGI는 직업별 startAGI로 덮어씀
    this.baseStats  = { ...BASE_STATS, AGI: jobData.startAGI };
    this.stats      = { ...BASE_STATS, AGI: jobData.startAGI };
    this.totalStats = { ...BASE_STATS, AGI: jobData.startAGI };

    // HP/MP
    this.maxHp = calcMaxHp(jobData, this.stats, this.level);
    this.maxMp = calcMaxMp(jobData, this.stats, this.level);
    this.hp    = this.maxHp;
    this.mp    = this.maxMp;

    // HP/MP 자연 회복 타이머
    this.regenTimer = 0;

    // ── 인벤토리 ────────────────────────────────────────────
    this.inventory = {
      slots: new Array(30).fill(null),
      equipment: {
        weapon: null, helmet: null, armor: null, pants: null,
        gloves: null, boots: null, ring1: null, ring2: null, necklace: null
      },
      gold: 0
    };

    // ── 직업별 공격 타입 ─────────────────────────────────────
    const meleeJobs = ['warrior', 'knight', 'berserker', 'priest', 'alchemist'];
    this.attackType  = meleeJobs.includes(jobKey) ? 'melee' : 'ranged';
    this.attackRange = this.attackType === 'melee' ? 90 : 600;

    const projectileRanges = { archer: 420, mage: 360 };
    this.projectileRange = projectileRanges[jobKey] ?? 500;

    this.skillDef      = SKILL_DATA[jobKey] ?? null;
    this.skillCooldown = 0;

    // ── 전투 상태 ────────────────────────────────────────────
    this.isAlive    = true;
    this.isDodging  = false;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.dodgeCooldown  = 0;
    this.statusEffects  = [];
    this.attackDamageMultiplier = 1.0;

    // ── 이동 ─────────────────────────────────────────────────
    this.moveSpeed = calcMoveSpeed(jobData.startAGI);
    this.body.setSize(20, 24);
    this.body.setOffset(6, 4);

    // ── 입력 ─────────────────────────────────────────────────
    this.keys = scene.input.keyboard.addKeys({
      up:     Phaser.Input.Keyboard.KeyCodes.W,
      down:   Phaser.Input.Keyboard.KeyCodes.S,
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dodge:  Phaser.Input.Keyboard.KeyCodes.SHIFT,
      inv:    Phaser.Input.Keyboard.KeyCodes.I,
      skill:  Phaser.Input.Keyboard.KeyCodes.Q,
    });

    // ── 마우스 포인터 추적 ────────────────────────────────────
    this._pointer = scene.input.activePointer;

    // ── 마우스 클릭 → 투사체 발사 ───────────────────────────
    scene.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown()) {
        const wp = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
        this.shoot(wp.x, wp.y);
      }
    });
  }

  update(time, delta) {
    if (!this.isAlive) return;

    this.handleMovement();
    this.handleDodge(delta);
    this.handleRegen(delta);
    this.updateStatusEffects(delta);
    this.updateAttackCooldown(delta);
    this.handleKeyboardShoot();
    this.handleSkill();
    this.drawAimLine();
  }

  // ── 이동 처리 ────────────────────────────────────────────────
  handleMovement() {
    if (this.isDodging) return;

    const speed = this.moveSpeed;
    let vx = 0, vy = 0;

    if (this.keys.left.isDown)  vx -= speed;
    if (this.keys.right.isDown) vx += speed;
    if (this.keys.up.isDown)    vy -= speed;
    if (this.keys.down.isDown)  vy += speed;

    // 대각선 속도 보정
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.setVelocity(vx, vy);

    // 방향에 따른 플립
    if (vx < 0) this.setFlipX(true);
    if (vx > 0) this.setFlipX(false);
  }

  // ── 구르기 회피 ───────────────────────────────────────────────
  handleDodge(delta) {
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.dodge) && this.dodgeCooldown <= 0) {
      this.isDodging = true;
      this.dodgeCooldown = 2000;

      // 이동 방향으로 빠르게 이동
      const vx = this.body.velocity.x || 0;
      const vy = this.body.velocity.y || 0;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      this.setVelocity((vx / len) * 400, (vy / len) * 400);

      // 무적 이펙트
      this.setAlpha(0.5);
      this.scene.time.delayedCall(300, () => {
        this.isDodging = false;
        this.setAlpha(1);
      });
    }
  }

  // ── 자연 회복 ────────────────────────────────────────────────
  handleRegen(delta) {
    this.regenTimer += delta;
    if (this.regenTimer >= 1000) {
      this.regenTimer = 0;
      const regenHp = Math.max(1, Math.floor(this.totalStats.VIT * 0.02));
      const regenMp = Math.max(1, Math.floor(this.totalStats.WIS * 0.05));
      this.hp = Math.min(this.maxHp, this.hp + regenHp);
      this.mp = Math.min(this.maxMp, this.mp + regenMp);
    }
  }

  // ── 상태이상 처리 ─────────────────────────────────────────────
  updateStatusEffects(delta) {
    this.statusEffects = this.statusEffects.filter(effect => {
      effect.elapsed    = (effect.elapsed    ?? 0) + delta;
      effect.tickTimer  = (effect.tickTimer  ?? 0) + delta;

      if (effect.type === 'poison') {
        while (effect.tickTimer >= 1000) {
          effect.tickTimer -= 1000;
          const dmg = Math.floor(this.totalStats.INT * 0.5);
          this.hp   = Math.max(0, this.hp - dmg);
        }
      } else if (effect.type === 'blood_curse') {
        while (effect.tickTimer >= 5000) {
          effect.tickTimer -= 5000;
          const dmg = Math.floor(this.maxHp * 0.02);
          this.hp   = Math.max(0, this.hp - dmg);
        }
      }

      return effect.elapsed < effect.duration;
    });
  }

  // ── 공격 쿨타임 ───────────────────────────────────────────────
  updateAttackCooldown(delta) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.skillCooldown  = Math.max(0, this.skillCooldown  - delta);
  }

  // ── 스킬 (Q키) ───────────────────────────────────────────────
  handleSkill() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill)) this.useSkill();
  }

  useSkill() {
    if (!this.isAlive || this.skillCooldown > 0 || !this.skillDef) return;
    if (this.mp < this.skillDef.mpCost) {
      this.scene.events.emit('skillFailed', { player: this });
      return;
    }
    this.mp = Math.max(0, this.mp - this.skillDef.mpCost);
    this.skillCooldown = this.skillDef.cooldown;
    this.scene.events.emit('playerSkill', {
      player: this,
      skill:   this.skillDef.key,
      x: this.x, y: this.y,
      targetX: this.scene.cameras.main.getWorldPoint(this._pointer.x, this._pointer.y).x,
      targetY: this.scene.cameras.main.getWorldPoint(this._pointer.x, this._pointer.y).y,
    });
  }

  // ── 조준 표시 ────────────────────────────────────────────────
  drawAimLine() {
    if (!this._aimLine) this._aimLine = this.scene.add.graphics().setDepth(5);
    this._aimLine.clear();

    // UIScene 병렬 실행 시 카메라 선택 오류 방지 — GameScene 카메라로 명시 변환
    const cam = this.scene.cameras.main;
    const wp  = cam.getWorldPoint(this._pointer.x, this._pointer.y);
    const wx  = wp.x;
    const wy  = wp.y;

    if (wx < this.x) this.setFlipX(true);
    else              this.setFlipX(false);

    if (this.attackType === 'melee') {
      // 근접: 공격 범위 원
      this._aimLine.lineStyle(1, 0xe74c3c, 0.3);
      this._aimLine.strokeCircle(this.x, this.y, this.attackRange);
    } else {
      // 원거리: 마우스 방향 조준선
      const angle = Phaser.Math.Angle.Between(this.x, this.y, wx, wy);
      this._aimLine.lineStyle(1, 0x00cfff, 0.4);
      this._aimLine.beginPath();
      this._aimLine.moveTo(this.x, this.y);
      this._aimLine.lineTo(this.x + Math.cos(angle) * 56, this.y + Math.sin(angle) * 56);
      this._aimLine.strokePath();
    }
  }

  // ── Space 키 → 마우스 방향 발사 ──────────────────────────────
  handleKeyboardShoot() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
      const wp = this.scene.cameras.main.getWorldPoint(this._pointer.x, this._pointer.y);
      this.shoot(wp.x, wp.y);
    }
  }

  // ── 공격 (근접 or 원거리) ──────────────────────────────────
  shoot(toX, toY) {
    if (!this.isAlive || this.attackCooldown > 0) return;

    if (this.attackType === 'melee') {
      this.attackCooldown = 500;
      const result = this.scene.combatSystem.calcPhysicalDamage(
        this, { stats: { defense: 0 }, level: 1 }
      );
      this.scene.events.emit('playerMelee', {
        player: this, x: this.x, y: this.y,
        range: this.attackRange,
        damage: result.damage, isCrit: result.isCrit,
      });
    } else {
      this.attackCooldown = 350;
      const result = this.scene.combatSystem.calcPhysicalDamage(
        this, { stats: { defense: 0 }, level: 1 }
      );
      this.scene.events.emit('playerShoot', {
        player: this,
        fromX: this.x, fromY: this.y,
        toX, toY,
        damage: result.damage, isCrit: result.isCrit,
        maxRange: this.projectileRange,
      });
    }
  }

  // ── 피격 처리 ─────────────────────────────────────────────────
  takeDamage(amount, drainRate = 0, source = null) {
    if (this.isDodging) return 0; // 회피 중 무적
    return this.scene.combatSystem.applyDamageToPlayer(this, amount, drainRate, source);
  }

  // ── 사망 처리 ────────────────────────────────────────────────
  die() {
    this.isAlive = false;
    this.setVelocity(0, 0);
    this.setAlpha(0.3);
    if (this._aimLine) this._aimLine.destroy();
  }

  // ── 레벨업 후 스탯 동기화 ────────────────────────────────────
  syncStats() {
    this.totalStats = { ...this.baseStats };
    Object.values(this.inventory.equipment).forEach(item => {
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([k, v]) => {
          this.totalStats[k] = (this.totalStats[k] || 0) + v;
        });
      }
    });
  }

  // ── 경험치 정보 ───────────────────────────────────────────────
  getXPInfo() {
    return {
      current: this.xp,
      required: getRequiredXP(this.level),
      percent: this.xp / getRequiredXP(this.level)
    };
  }
}
