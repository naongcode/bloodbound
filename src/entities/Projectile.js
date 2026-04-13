// 투사체 — Graphics 직접 이동 방식 (Arcade Physics 없음)
export default class Projectile {
  constructor(scene, fromX, fromY, toX, toY, opts = {}) {
    this.scene    = scene;
    this.x        = fromX;
    this.y        = fromY;
    this.active   = true;

    this.damage    = opts.damage    ?? 10;
    this.isCrit    = opts.isCrit    ?? false;
    this.speed     = opts.speed     ?? 540;
    this.maxRange  = opts.maxRange  ?? 650;
    this.piercing  = opts.piercing  ?? false;
    this.hitSet    = new Set();
    this._color    = opts.color     ?? null;   // null = 기본 색상
    this._sizeScale= opts.sizeScale ?? 1.0;
    this.onExplode = opts.onExplode ?? null;   // (x, y) => void

    this._startX = fromX;
    this._startY = fromY;

    // 발사 각도 계산
    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    this._vx = Math.cos(angle) * this.speed;
    this._vy = Math.sin(angle) * this.speed;

    // 총알 비주얼 (Graphics)
    this._gfx = scene.add.graphics().setDepth(15);
    this._drawAt(fromX, fromY, angle);
  }

  _drawAt(x, y, angle) {
    const g = this._gfx;
    g.clear();

    const color   = this._color ?? (this.isCrit ? 0xf39c12 : 0x00d4ff);
    const glowClr = this._color ? 0xffffff : (this.isCrit ? 0xfff0a0 : 0xaaeeff);
    const len = (this.isCrit ? 16 : 12) * this._sizeScale;
    const wid = (this.isCrit ? 5  : 3.5) * this._sizeScale;

    // setPosition + setRotation으로 회전 적용 후 원점(0,0) 기준 타원 그리기
    g.setPosition(x, y);
    g.setRotation(angle);

    // 글로우
    g.fillStyle(glowClr, 0.3);
    g.fillEllipse(0, 0, (len + 5) * 2, (wid + 3) * 2);

    // 몸통
    g.fillStyle(color, 1);
    g.fillEllipse(0, 0, len * 2, wid * 2);

    // 하이라이트
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(-len * 0.2, -wid * 0.2, len * 0.7, wid * 0.8);
  }

  // GameScene update(delta) 에서 호출
  tick(delta, monsters, scene) {
    if (!this.active) return false;

    const dt = delta / 1000;
    this.x += this._vx * dt;
    this.y += this._vy * dt;

    // 각도 유지해서 다시 그리기
    const angle = Math.atan2(this._vy, this._vx);
    this._drawAt(this.x, this.y, angle);

    // 사거리 초과
    if (Phaser.Math.Distance.Between(this._startX, this._startY, this.x, this.y) >= this.maxRange) {
      this.destroy();
      return false;
    }

    // 몬스터 충돌 (반경 20px)
    for (const monster of monsters) {
      if (!monster.isAlive || this.hitSet.has(monster)) continue;
      if (Phaser.Math.Distance.Between(this.x, this.y, monster.x, monster.y) < 20) {
        this.hitSet.add(monster);
        monster.takeDamage(this.damage, this.isCrit);
        scene.sound.play('sfx_hit_monster', { volume: 0.45 });
        scene.combatSystem.showHitEffect(scene, this.x, this.y);
        if (this.isCrit) scene.cameras.main.shake(80, 0.003);
        if (!this.piercing) { this.destroy(); return false; }
      }
    }
    return true;
  }

  // 몬스터 투사체용 — 플레이어를 타겟으로 이동 및 충돌 체크
  tickVsPlayer(delta, player, scene) {
    if (!this.active) return false;

    const dt = delta / 1000;
    this.x += this._vx * dt;
    this.y += this._vy * dt;

    const angle = Math.atan2(this._vy, this._vx);
    this._drawAt(this.x, this.y, angle);

    if (Phaser.Math.Distance.Between(this._startX, this._startY, this.x, this.y) >= this.maxRange) {
      this.destroy(); return false;
    }

    if (player?.isAlive && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 20) {
      player.takeDamage(this.damage, 0, null);
      scene.sound.play('sfx_hit_player', { volume: 0.45 });
      this.destroy(); return false;
    }

    return true;
  }

  destroy() {
    this.active = false;
    if (this.onExplode) this.onExplode(this.x, this.y);
    this._gfx.destroy();
  }
}
