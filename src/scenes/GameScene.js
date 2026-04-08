import Player from '../entities/Player.js';
import Monster from '../entities/Monster.js';
import Projectile from '../entities/Projectile.js';
import CombatSystem from '../systems/CombatSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import InventorySystem from '../systems/InventorySystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import Network from '../systems/NetworkManager.js';
import { guildSystem } from '../systems/GuildSystem.js';
import { MONSTER_DATA } from '../data/monsters.js';
import { ITEM_DATA } from '../data/items.js';

const MAP_W = 3200;
const MAP_H = 2400;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this._jobKey   = (data && data.jobKey)  ? data.jobKey  : 'warrior';
    this._charId   = (data && data.charId)  ? data.charId  : null;
    this._loadSave = (data && data.loadSave) ? true : false;
    this._isMulti  = (data && data.multi)   ? true : false;
  }

  create() {
    // ── 시스템 초기화 ────────────────────────────────────────
    this.combatSystem    = new CombatSystem(this);
    this.levelSystem     = new LevelSystem(this);
    this.inventorySystem = new InventorySystem(this);

    // ── 월드 생성 ─────────────────────────────────────────────
    this.buildWorld();

    // ── 플레이어 생성 ─────────────────────────────────────────
    this.player = new Player(this, MAP_W / 2, MAP_H / 2, this._jobKey);
    this.player.inventory = this.inventorySystem.createInventory();
    this.player.inventory.gold = 500;

    // 세이브 로드 or 신규 시작 장비
    if (this._loadSave && this._charId) {
      // 1) localStorage 캐시를 즉시 적용 (프레임 끊김 없음)
      const cached = SaveSystem.loadCharSync(this._charId);
      if (cached) SaveSystem.apply(this.player, cached, this.inventorySystem);

      // 2) 클라우드 최신 데이터로 덮어쓰기 (비동기)
      SaveSystem.loadChar(this._charId).then(saveData => {
        if (saveData) {
          SaveSystem.apply(this.player, saveData, this.inventorySystem);
          this.events.emit('statsChanged', this.player);
        }
      }).catch(e => console.warn('[GameScene] 세이브 로드 실패:', e));
    } else {
      this.inventorySystem.addItem(this.player.inventory, 'iron_sword');
      this.inventorySystem.addItem(this.player.inventory, 'leather_armor');
      this.inventorySystem.addItem(this.player.inventory, 'hp_potion_small', 5);
      this.inventorySystem.equip(this.player, 0); // iron_sword (slot 0)
      this.inventorySystem.equip(this.player, 1); // leather_armor (slot 1)
    }

    // E 키 (NPC 상호작용)
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // ── 몬스터 그룹 ──────────────────────────────────────────
    this.monsters = this.add.group();
    this.spawnInitialMonsters();

    // ── 활성 투사체 목록 ─────────────────────────────────────
    this._bullets = [];

    // ── 카메라 ────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── 충돌 설정 ────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.monsters.getChildren(), this.obstacles);

    // ── 이벤트 리스너 ─────────────────────────────────────────
    this.setupEvents();

    // ── UI 씬 시작 ────────────────────────────────────────────
    this.scene.launch('UIScene', { gameScene: this });

    // ── 몬스터 리스폰 타이머 ──────────────────────────────────
    this.time.addEvent({ delay: 10000, loop: true, callback: this.respawnMonsters, callbackScope: this });

    // ── 필드 보스 ─────────────────────────────────────────────
    this.buildFieldBosses();

    // ── 길드 홀 포털 ──────────────────────────────────────────
    this.buildGuildPortal();

    // ── NPC 상인 ──────────────────────────────────────────────
    this.buildNPC();

    // ── 던전 포털 ─────────────────────────────────────────────
    this.buildDungeonPortal();

    // ── 미니맵 ────────────────────────────────────────────────
    this.buildMinimap();

    // ── 멀티플레이 ────────────────────────────────────────────
    if (this._isMulti) this.setupMultiplayer();
  }

  // ── 월드 빌드 ─────────────────────────────────────────────
  buildWorld() {
    // 배경 타일 (잔디)
    this.bgTiles = [];
    for (let tx = 0; tx < MAP_W; tx += 32) {
      for (let ty = 0; ty < MAP_H; ty += 32) {
        const variant = Math.random() < 0.85 ? 'tile_grass' : 'tile_dirt';
        const t = this.add.image(tx + 16, ty + 16, variant).setDepth(0);
        this.bgTiles.push(t);
      }
    }

    // 장애물 (나무/바위 — 정적 물리 바디)
    this.obstacles = this.physics.add.staticGroup();
    const obstaclePositions = this.generateObstacles();
    obstaclePositions.forEach(({ x, y }) => {
      const ob = this.obstacles.create(x, y, 'tile_stone').setDepth(3);
      ob.setTint(0x666666);
      ob.body.setSize(28, 28);
    });

    // 월드 경계
    this.add.rectangle(MAP_W / 2, 8,      MAP_W, 16, 0x2c3e50).setDepth(20);
    this.add.rectangle(MAP_W / 2, MAP_H - 8, MAP_W, 16, 0x2c3e50).setDepth(20);
    this.add.rectangle(8,          MAP_H / 2, 16, MAP_H, 0x2c3e50).setDepth(20);
    this.add.rectangle(MAP_W - 8,  MAP_H / 2, 16, MAP_H, 0x2c3e50).setDepth(20);
  }

  generateObstacles() {
    const positions = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(100, MAP_W - 100);
      const y = Phaser.Math.Between(100, MAP_H - 100);
      // 시작 지점 근처 제외
      if (Phaser.Math.Distance.Between(x, y, MAP_W / 2, MAP_H / 2) > 200) {
        positions.push({ x, y });
      }
    }
    return positions;
  }

  // ── 몬스터 스폰 ──────────────────────────────────────────
  spawnInitialMonsters() {
    const spawnList = [
      { key: 'blood_slime',    count: 15 },
      { key: 'blood_bat',      count: 10 },
      { key: 'blood_archer',   count: 8,  minDist: 400 },
      { key: 'bloodfang_wolf', count: 5,  minDist: 600 },
      { key: 'crimson_spider', count: 5,  minDist: 500 },
      { key: 'poison_mage',    count: 4,  minDist: 700 },
      { key: 'blood_golem',    count: 3,  minDist: 800, outerZone: true },
      { key: 'shadow_knight',  count: 3,  minDist: 800, outerZone: true },
    ];

    spawnList.forEach(({ key, count, minDist }) => {
      for (let i = 0; i < count; i++) {
        this.spawnMonster(key, { minDist });
      }
    });
  }

  spawnMonster(key, opts = {}) {
    const data = MONSTER_DATA[key];
    if (!data) return;

    const minDist = opts.minDist ?? 300;
    // 플레이어 근처 제외한 랜덤 위치
    let x, y;
    if (opts.outerZone) {
      // 맵 외곽 400px 이내 영역에서만 스폰
      const margin = 400;
      do {
        const side = Phaser.Math.Between(0, 3);
        if (side === 0)      { x = Phaser.Math.Between(100, margin);           y = Phaser.Math.Between(100, MAP_H - 100); }
        else if (side === 1) { x = Phaser.Math.Between(MAP_W - margin, MAP_W - 100); y = Phaser.Math.Between(100, MAP_H - 100); }
        else if (side === 2) { x = Phaser.Math.Between(100, MAP_W - 100);     y = Phaser.Math.Between(100, margin); }
        else                 { x = Phaser.Math.Between(100, MAP_W - 100);     y = Phaser.Math.Between(MAP_H - margin, MAP_H - 100); }
      } while (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minDist);
    } else {
      do {
        x = Phaser.Math.Between(100, MAP_W - 100);
        y = Phaser.Math.Between(100, MAP_H - 100);
      } while (Phaser.Math.Distance.Between(x, y, MAP_W / 2, MAP_H / 2) < minDist);
    }

    const monster = new Monster(this, x, y, data);
    monster.target = this.player;
    this.monsters.add(monster);

    // 10% 확률로 엘리트화
    if (!opts.noElite && Math.random() < 0.10) this.makeElite(monster);

    return monster;
  }

  makeElite(monster) {
    monster.isElite  = true;
    monster.maxHp    = Math.floor(monster.maxHp * 2.2);
    monster.hp       = monster.maxHp;
    monster.damage   = Math.floor(monster.damage * 1.5);
    monster.monsterData = {
      ...monster.monsterData,
      xpReward:   monster.monsterData.xpReward * 2,
      goldReward: {
        min: monster.monsterData.goldReward.min * 2,
        max: monster.monsterData.goldReward.max * 2,
      },
    };
    monster.setTint(0xff8c00).setScale(1.25);
    monster.nameText.setText(`★ ${monster.monsterName}`);
    monster.nameText.setStyle({ fontSize: '11px', fill: '#ffaa00', stroke: '#000000', strokeThickness: 3 });
  }

  respawnMonsters() {
    const alive   = this.monsters.getChildren().filter(m => m.isAlive).length;
    const toSpawn = Math.max(0, 20 - alive);
    for (let i = 0; i < toSpawn; i++) {
      const roll = Math.random();
      let key, opts;
      if      (roll < 0.25) { key = 'blood_slime';    opts = {}; }
      else if (roll < 0.45) { key = 'blood_bat';      opts = {}; }
      else if (roll < 0.60) { key = 'crimson_spider'; opts = { minDist: 400 }; }
      else if (roll < 0.75) { key = 'bloodfang_wolf'; opts = { minDist: 500 }; }
      else if (roll < 0.87) { key = 'blood_golem';    opts = { minDist: 700, outerZone: true }; }
      else if (roll < 0.95) { key = 'shadow_knight';  opts = { minDist: 700, outerZone: true }; }
      else                  { key = 'blood_kin';      opts = { minDist: 700, noElite: true }; }
      this.spawnMonster(key, opts);
    }
  }

  // ── 이벤트 설정 ───────────────────────────────────────────
  setupEvents() {
    // 중복 등록 방지: 씬 재시작 시 기존 핸들러 먼저 제거
    ['playerShoot','playerMelee','monsterDied','levelUp','playerDied',
     'playerSkill','skillFailed','defenseBreak','monsterEnraged','monsterShoot',
     'equipmentChanged','inventoryChanged','statsChanged'].forEach(ev => {
      this.events.off(ev);
    });

    // 장비/인벤/스탯 변경 시 자동저장
    const _autoSave = () => SaveSystem.saveChar(this._charId, this.player);
    this.events.on('equipmentChanged', _autoSave);
    this.events.on('inventoryChanged', _autoSave);
    this.events.on('statsChanged',     _autoSave);

    // 몬스터 원거리 투사체
    this._monsterBullets = this._monsterBullets || [];
    this.events.on('monsterShoot', ({ x, y, tx, ty, damage, drainRate, projColor, projSpeed }) => {
      const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
      const g = this.add.graphics().setDepth(15);
      g.fillStyle(projColor, 1);
      g.fillCircle(0, 0, 5);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(-2, -2, 2);
      g.setPosition(x, y);
      this._monsterBullets.push({
        g, angle,
        speed: projSpeed,
        damage, drainRate,
        dist: 0,
        maxDist: 400,
      });
    });

    // 플레이어 투사체 발사
    this.events.on('playerShoot', ({ fromX, fromY, toX, toY, damage, isCrit, maxRange }) => {
      const bullet = new Projectile(this, fromX, fromY, toX, toY, { damage, isCrit, maxRange });
      this._bullets.push(bullet);
      if (isCrit) this.cameras.main.shake(60, 0.002);
    });

    // 근접 공격
    this.events.on('playerMelee', ({ x, y, range, damage, isCrit }) => {
      // 범위 내 모든 몬스터 피격
      let hit = false;
      this.monsters.getChildren().forEach(monster => {
        if (!monster.isAlive) return;
        const dist = Phaser.Math.Distance.Between(x, y, monster.x, monster.y);
        if (dist <= range) {
          monster.takeDamage(damage);
          hit = true;
        }
      });
      // 휘두르기 이펙트
      this.showMeleeEffect(x, y, range);
      if (isCrit && hit) this.cameras.main.shake(80, 0.003);
    });

    // 몬스터 사망 처리
    this.events.on('monsterDied', ({ monster }) => {
      if (!monster.isAlive) return;
      monster.isAlive = false;
      this.handleMonsterDeath(monster);
      // 필드 보스 사망 콜백
      if (monster.isFieldBoss && monster.onBossDeath) {
        monster.onBossDeath();
        this._fieldBosses[monster._bossIdx] = null;
        this.showFloatText(monster.x, monster.y - 60, '혈왕 처치!', '#ff4444', '20px');
        this.cameras.main.shake(500, 0.015);
      }
    });

    // 레벨업 알림 + 자동 저장
    this.events.on('levelUp', ({ player, level }) => {
      this.showLevelUpEffect(player, level);
      SaveSystem.saveChar(this._charId, player);
    });

    // 플레이어 사망
    this.events.on('playerDied', ({ player }) => {
      player.die();
      this.time.delayedCall(2000, () => {
        this.showDeathMessage();
      });
    });

    // 스킬 발동
    this.events.on('playerSkill', ({ player, skill, x, y, targetX, targetY }) => {
      this.handlePlayerSkill(player, skill, x, y, targetX, targetY);
    });

    // MP 부족
    this.events.on('skillFailed', ({ player }) => {
      this.showFloatText(player.x, player.y - 30, 'MP 부족!', '#3498db', '13px');
    });

    // 방어 파훼 알림
    this.events.on('defenseBreak', ({ monster }) => {
      this.showFloatText(monster.x, monster.y - 40, '방어 파훼!', '#f39c12', '16px');
    });

    // 격노 알림
    this.events.on('monsterEnraged', ({ monster }) => {
      this.showFloatText(monster.x, monster.y - 40, '격노!', '#e74c3c', '16px');
      monster.setTint(0xff4444);
    });
  }

  // ── 투사체 수동 충돌 체크 (update에서 호출) ─────────────────
  checkProjectiles(delta) {
    const monsterList = this.monsters.getChildren();
    this._bullets = this._bullets.filter(b => {
      if (!b.active) return false;
      return b.tick(delta, monsterList, this);
    });
    this._checkMonsterBullets(delta);
  }

  _checkMonsterBullets(delta) {
    if (!this._monsterBullets) return;
    const player = this.player;
    const dt = delta / 1000;

    this._monsterBullets = this._monsterBullets.filter(b => {
      const dx = Math.cos(b.angle) * b.speed * dt;
      const dy = Math.sin(b.angle) * b.speed * dt;
      b.g.x += dx;
      b.g.y += dy;
      b.dist += Math.sqrt(dx * dx + dy * dy);

      // 사거리 초과 → 제거
      if (b.dist >= b.maxDist) { b.g.destroy(); return false; }

      // 플레이어 충돌 체크
      if (player?.isAlive) {
        const hit = Phaser.Math.Distance.Between(b.g.x, b.g.y, player.x, player.y) < 16;
        if (hit) {
          player.takeDamage(b.damage, b.drainRate, null);
          b.g.destroy();
          return false;
        }
      }
      return true;
    });
  }

  // ── 근접 휘두르기 이펙트 ────────────────────────────────────
  showMeleeEffect(x, y, range) {
    const g = this.add.graphics().setDepth(20);
    g.setPosition(x, y);
    g.lineStyle(3, 0xe74c3c, 0.8);
    g.strokeCircle(0, 0, range);
    g.fillStyle(0xe74c3c, 0.12);
    g.fillCircle(0, 0, range);
    this.tweens.add({
      targets: g, alpha: 0, scaleX: 1.2, scaleY: 1.2,
      duration: 200, onComplete: () => g.destroy()
    });
  }

  // ── 스킬 라우터 ─────────────────────────────────────────────
  handlePlayerSkill(player, skill, x, y, targetX, targetY) {
    switch (skill) {
      case 'charge':       this.skillCharge(player, targetX, targetY);         break;
      case 'barrage':      this.skillBarrage(player, x, y, targetX, targetY);  break;
      case 'fireball':     this.skillFireball(player, x, y, targetX, targetY); break;
      case 'holy_light':   this.skillHolyLight(player);                         break;
      case 'poison_cloud': this.skillPoisonCloud(player, x, y);                break;
    }
  }

  // warrior — 돌진
  skillCharge(player, targetX, targetY) {
    const { dashDistance, dashDuration, hitRadius, damageMultiplier } = player.skillDef.params;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    const fromX = player.x, fromY = player.y;
    const toX   = Phaser.Math.Clamp(fromX + Math.cos(angle) * dashDistance, 60, MAP_W - 60);
    const toY   = Phaser.Math.Clamp(fromY + Math.sin(angle) * dashDistance, 60, MAP_H - 60);

    player.isDodging = true;
    player.setAlpha(0.65);

    this.tweens.add({
      targets: player, x: toX, y: toY, duration: dashDuration, ease: 'Power2',
      onUpdate: () => {
        const r = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y) < hitRadius) {
            m.takeDamage(r.damage * damageMultiplier);
          }
        });
      },
      onComplete: () => { player.isDodging = false; player.setAlpha(1); },
    });

    // 궤적 이펙트
    const g = this.add.graphics().setDepth(18);
    g.lineStyle(4, player.skillDef.color, 0.7);
    g.beginPath(); g.moveTo(fromX, fromY); g.lineTo(toX, toY); g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  // archer — 연사 (부채꼴 다발)
  skillBarrage(player, x, y, targetX, targetY) {
    const { projectileCount, spreadAngle, damageMultiplier, maxRange } = player.skillDef.params;
    const base   = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const result = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
    const half   = Math.floor(projectileCount / 2);
    for (let i = -half; i <= half; i++) {
      const a  = base + i * spreadAngle;
      const tx = x + Math.cos(a) * 200;
      const ty = y + Math.sin(a) * 200;
      this._bullets.push(new Projectile(this, x, y, tx, ty, {
        damage:   result.damage * damageMultiplier,
        isCrit:   result.isCrit,
        maxRange,
        color:    player.skillDef.color,
      }));
    }
  }

  // mage — 파이어볼 (느리고 큰 투사체, 적중 시 폭발)
  skillFireball(player, x, y, targetX, targetY) {
    const { damageMultiplier, splashMultiplier, splashRadius, speed, maxRange, sizeScale } = player.skillDef.params;
    const result = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
    const dmg    = result.damage * damageMultiplier;
    this._bullets.push(new Projectile(this, x, y, targetX, targetY, {
      damage: dmg,
      speed, maxRange, sizeScale,
      color:  player.skillDef.color,
      onExplode: (ex, ey) => {
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(ex, ey, m.x, m.y) < splashRadius) {
            m.takeDamage(dmg * splashMultiplier);
          }
        });
        this.showExplosion(ex, ey);
      },
    }));
  }

  // priest — 신성한 빛 (HP 회복)
  skillHolyLight(player) {
    const { healPercent } = player.skillDef.params;
    const heal = Math.floor(player.maxHp * healPercent);
    player.hp  = Math.min(player.maxHp, player.hp + heal);
    this.events.emit('statsChanged', player);
    this.showFloatText(player.x, player.y - 45, `+${heal} HP`, '#f1c40f', '18px');

    const g = this.add.graphics().setDepth(18).setPosition(player.x, player.y);
    g.fillStyle(player.skillDef.color, 0.28);
    g.fillCircle(0, 0, 70);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 600, onComplete: () => g.destroy() });
  }

  // alchemist — 독 구름
  skillPoisonCloud(player, x, y) {
    const { radius, tickInterval, ticks, intMultiplier, minDamage } = player.skillDef.params;
    const g = this.add.graphics().setDepth(8).setPosition(x, y);
    g.fillStyle(player.skillDef.color, 0.2);  g.fillCircle(0, 0, radius);
    g.lineStyle(2, player.skillDef.color, 0.5); g.strokeCircle(0, 0, radius);

    this.time.addEvent({
      delay: tickInterval, repeat: ticks - 1,
      callback: () => {
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(x, y, m.x, m.y) < radius) {
            m.takeDamage(Math.max(minDamage, player.totalStats.INT * intMultiplier));
          }
        });
      },
    });
    this.tweens.add({ targets: g, alpha: 0, duration: tickInterval * ticks, onComplete: () => g.destroy() });
  }

  // 폭발 이펙트 (fireball용)
  showExplosion(x, y) {
    const g = this.add.graphics().setDepth(20).setPosition(x, y);
    g.fillStyle(0xff6600, 0.75); g.fillCircle(0, 0, 80);
    g.fillStyle(0xffcc00, 0.9);  g.fillCircle(0, 0, 42);
    g.fillStyle(0xffffff, 0.6);  g.fillCircle(0, 0, 16);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 380, ease: 'Power2', onComplete: () => g.destroy() });
    this.cameras.main.shake(100, 0.005);
  }

  // ── 몬스터 사망 처리 ─────────────────────────────────────
  handleMonsterDeath(monster) {
    const data = monster.monsterData;
    const bossMulti = monster.isFieldBoss ? 10 : 1;

    // 길드 퀘스트 진행도 갱신
    guildSystem.progressQuest('kill', data.key, 1);
    if (monster.isFieldBoss) guildSystem.progressQuest('boss', 'field_boss', 1);

    // 경험치 지급 (길드 XP 보너스 포함)
    const xpBonus = 1 + (guildSystem.hasGuild() ? guildSystem.getEffectivePerks().xpBonus : 0);
    this.levelSystem.gainXP(this.player, {
      base: Math.round(data.xpReward * bossMulti * xpBonus),
      sourceLevel: data.level
    });

    // 골드 드롭 (길드 골드 보너스 포함)
    const goldBonus = 1 + (guildSystem.hasGuild() ? guildSystem.getEffectivePerks().goldBonus : 0);
    const gold = Math.round(Phaser.Math.Between(data.goldReward.min, data.goldReward.max) * bossMulti * goldBonus);
    this.player.inventory.gold += gold;
    guildSystem.progressQuest('gold', null, gold);

    // 아이템 드롭
    if (data.dropTable) {
      data.dropTable.forEach(drop => {
        if (Math.random() < drop.chance) {
          const qty = Phaser.Math.Between(drop.quantity[0], drop.quantity[1]);
          this.inventorySystem.addItem(this.player.inventory, drop.itemKey, qty);
          this.spawnDropEffect(monster.x, monster.y, drop.itemKey);
        }
      });
    }

    // 분열 처리 (흡혈 슬라임)
    if (data.canSplit && monster.hp <= 0 && !monster._hasSplit) {
      monster._hasSplit = true;
      this.splitSlime(monster);
    }

    // UI 갱신 이벤트
    this.events.emit('statsChanged', this.player);
  }

  splitSlime(parent) {
    for (let i = 0; i < 2; i++) {
      const offset = 40;
      const sx = parent.x + (i === 0 ? -offset : offset);
      const sy = parent.y;
      const splitData = {
        ...MONSTER_DATA.blood_slime,
        baseHp: Math.floor(MONSTER_DATA.blood_slime.baseHp / 2),
        baseDamage: Math.floor(MONSTER_DATA.blood_slime.baseDamage * 0.7),
        xpReward: Math.floor(MONSTER_DATA.blood_slime.xpReward / 2),
        canSplit: false,
      };
      const baby = this.spawnMonster('blood_slime');
      if (baby) {
        baby.setPosition(sx, sy);
        baby.maxHp = splitData.baseHp;
        baby.hp    = splitData.baseHp;
        baby.monsterData = splitData;
      }
    }
  }

  // ── 이펙트들 ─────────────────────────────────────────────
  showLevelUpEffect(player, level) {
    const text = this.add.text(player.x, player.y - 50, `LEVEL UP! Lv.${level}`, {
      fontSize: '22px', fill: '#f1c40f', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: text,
      y: player.y - 120,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });

    // 파티클 링
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = player.x + Math.cos(angle) * 40;
      const py = player.y + Math.sin(angle) * 40;
      const dot = this.add.graphics().setDepth(99);
      dot.fillStyle(0xf1c40f);
      dot.fillCircle(px, py, 4);
      this.tweens.add({
        targets: dot,
        x: player.x + Math.cos(angle) * 80,
        y: player.y + Math.sin(angle) * 80,
        alpha: 0,
        duration: 600,
        onComplete: () => dot.destroy()
      });
    }
  }

  showFloatText(x, y, msg, color, size = '14px') {
    const text = this.add.text(x, y, msg, {
      fontSize: size, fill: color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }

  spawnDropEffect(x, y, itemKey) {
    const item = ITEM_DATA[itemKey];
    if (!item) return;
    this.showFloatText(x, y - 20, `+ ${item.name}`, '#2ecc71', '12px');
  }

  showDeathMessage() {
    const cam = this.cameras.main;
    const cx  = cam.scrollX + 640;
    const cy  = cam.scrollY + 360;
    const overlay = this.add.rectangle(cx, cy, 400, 200, 0x000000, 0.8).setDepth(200);
    const text = this.add.text(cx, cy - 20, '사망했습니다', {
      fontSize: '28px', fill: '#e74c3c', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    const sub = this.add.text(cx, cy + 20, 'R 키를 눌러 재시작', {
      fontSize: '16px', fill: '#aaaaaa'
    }).setOrigin(0.5).setDepth(201);

    this.input.keyboard.once('keydown-R', () => {
      overlay.destroy(); text.destroy(); sub.destroy();
      this.scene.restart({ jobKey: this._jobKey, charId: this._charId });
    });
  }

  // ── NPC 상인 ──────────────────────────────────────────────
  buildNPC() {
    const nx = MAP_W / 2 - 260, ny = MAP_H / 2;
    this._npcX = nx; this._npcY = ny;

    // 비주얼 (절차적)
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0xf5cba7); g.fillCircle(nx, ny - 30, 11);       // 머리
    g.fillStyle(0xe67e22); g.fillRect(nx - 14, ny - 18, 28, 26); // 몸통
    g.fillStyle(0x8B6914); g.fillRect(nx - 6,  ny + 8,  12, 16); // 하의

    this.add.text(nx, ny + 30, '[ 상인 ]', {
      fontSize: '12px', fill: '#f39c12', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this._npcPrompt = this.add.text(nx, ny - 55, '[E] 상점 열기', {
      fontSize: '13px', fill: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setVisible(false);
  }

  // ── 필드 보스 ─────────────────────────────────────────────
  buildFieldBosses() {
    // 보스 2마리 — 맵 양 끝 고정 위치
    this._fieldBossSpawns = [
      { x: 400,           y: 400 },
      { x: MAP_W - 400,   y: MAP_H - 400 },
    ];
    this._fieldBosses = [];

    this._fieldBossSpawns.forEach((pos, idx) => {
      this.spawnFieldBoss(pos.x, pos.y, idx);
    });

    // 보스 HP 바 (상단 중앙, scrollFactor 0)
    this._bossBarBg  = this.add.rectangle(640, 24, 500, 18, 0x1a0000, 0.9).setScrollFactor(0).setDepth(98).setVisible(false);
    this._bossBar    = this.add.rectangle(390, 24, 0, 14, 0xcc0000).setScrollFactor(0).setDepth(99).setOrigin(0, 0.5).setVisible(false);
    this._bossLabel  = this.add.text(640, 24, '', { fontSize: '11px', fill: '#ff6666', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
  }

  spawnFieldBoss(x, y, idx) {
    const data = MONSTER_DATA['blood_kin'];
    const boss = new Monster(this, x, y, data);
    boss.target      = this.player;
    boss.isFieldBoss = true;
    boss._bossIdx    = idx;
    boss.maxHp       = Math.floor(data.baseHp * 15);
    boss.hp          = boss.maxHp;
    boss.damage      = Math.floor(data.baseDamage * 3);
    boss.setScale(2.0).setTint(0x8b0000);
    boss.nameText.setText('⚔ 혈왕 ⚔');
    boss.nameText.setStyle({ fontSize: '14px', fill: '#ff4444', stroke: '#000000', strokeThickness: 4 });

    this.monsters.add(boss);
    this._fieldBosses[idx] = boss;

    // 보스 구역 마커
    const marker = this.add.graphics().setDepth(2);
    marker.lineStyle(3, 0x8b0000, 0.3);
    marker.strokeCircle(x, y, 220);
    this.add.text(x, y - 240, '[ 혈왕 영역 ]', {
      fontSize: '12px', fill: '#ff4444', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);

    // 리스폰 (보스 사망 후 5분)
    boss.onBossDeath = () => {
      this.time.delayedCall(5 * 60 * 1000, () => {
        this.spawnFieldBoss(x, y, idx);
      });
    };
  }

  updateFieldBossHUD() {
    // 가장 가까운 살아있는 필드 보스
    let nearest = null, nearDist = Infinity;
    this._fieldBosses.forEach(b => {
      if (!b || !b.isAlive) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
      if (d < nearDist) { nearDist = d; nearest = b; }
    });

    if (nearest && nearDist < 600) {
      const ratio = Phaser.Math.Clamp(nearest.hp / nearest.maxHp, 0, 1);
      this._bossBarBg.setVisible(true);
      this._bossBar.setVisible(true).setSize(ratio * 500, 14);
      this._bossLabel.setVisible(true).setText(`⚔ 혈왕  ${nearest.hp} / ${nearest.maxHp}`);
    } else {
      this._bossBarBg.setVisible(false);
      this._bossBar.setVisible(false);
      this._bossLabel.setVisible(false);
    }
  }

  // ── 길드 홀 포털 ─────────────────────────────────────────
  buildGuildPortal() {
    const gx = MAP_W / 2, gy = MAP_H / 2 + 260;
    this._guildX = gx; this._guildY = gy;

    const g = this.add.graphics().setDepth(5).setPosition(gx, gy);
    g.lineStyle(5, 0xf1c40f, 0.9); g.strokeCircle(0, 0, 36);
    g.fillStyle(0x1a1400, 0.85);   g.fillCircle(0, 0, 32);
    g.fillStyle(0xf1c40f, 0.25);   g.fillCircle(0, 0, 18);

    this.add.text(gx, gy - 52, '[ 길드 홀 ]', {
      fontSize: '13px', fill: '#f1c40f', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this._guildPrompt = this.add.text(gx, gy + 52, '[E] 길드 홀 입장', {
      fontSize: '13px', fill: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setVisible(false);
  }

  // ── 던전 포털 ─────────────────────────────────────────────
  buildDungeonPortal() {
    const px = MAP_W / 2 + 260, py = MAP_H / 2;
    this._portalX = px; this._portalY = py;

    // 포털 비주얼
    const g = this.add.graphics().setDepth(5).setPosition(px, py);
    g.lineStyle(5, 0x9b59b6, 0.9); g.strokeCircle(0, 0, 36);
    g.fillStyle(0x1a003a, 0.85);    g.fillCircle(0, 0, 32);
    g.fillStyle(0x9b59b6, 0.3);    g.fillCircle(0, 0, 18);
    this.tweens.add({ targets: g, angle: 360, duration: 4000, repeat: -1 });

    this.add.text(px, py - 52, '[ 던전 ]', {
      fontSize: '13px', fill: '#bb88ff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this._portalPrompt = this.add.text(px, py + 52, '[E] 던전 입장', {
      fontSize: '13px', fill: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setVisible(false);
  }

  // ── 미니맵 ────────────────────────────────────────────────
  buildMinimap() {
    const W = 150, H = 110;
    const px = 1280 - W - 10, py = 10;
    const scale = W / MAP_W;

    this.minimapBg = this.add.rectangle(px + W / 2, py + H / 2, W + 4, H + 4, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(90);
    this.minimapDot = this.add.graphics().setScrollFactor(0).setDepth(91);

    this.time.addEvent({
      delay: 200, loop: true, callback: () => {
        this.minimapDot.clear();
        // 몬스터 표시
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          this.minimapDot.fillStyle(0xe74c3c, 0.6);
          this.minimapDot.fillRect(px + m.x * scale, py + m.y * (H / MAP_H), 2, 2);
        });
        // 플레이어 표시
        this.minimapDot.fillStyle(0x3498db, 1);
        this.minimapDot.fillRect(
          px + this.player.x * scale - 2,
          py + this.player.y * (H / MAP_H) - 2,
          4, 4
        );
      }
    });
  }

  update(time, delta) {
    this.player.update(time, delta);
    this.monsters.getChildren().forEach(m => {
      if (m.active && m.update) m.update(time, delta);
    });
    this.checkProjectiles(delta);
    this.updateNPC();
    if (this._fieldBosses) this.updateFieldBossHUD();
  }

  updateNPC() {
    if (!this._npcX) return;
    const nearNPC = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this._npcX, this._npcY
    ) < 110;
    this._npcPrompt.setVisible(nearNPC);

    const nearPortal = this._portalX && Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this._portalX, this._portalY
    ) < 110;
    if (this._portalPrompt) this._portalPrompt.setVisible(nearPortal);

    const nearGuild = this._guildX && Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this._guildX, this._guildY
    ) < 110;
    if (this._guildPrompt) this._guildPrompt.setVisible(nearGuild);

    if (Phaser.Input.Keyboard.JustDown(this._eKey)) {
      if (nearNPC) {
        const ui = this.scene.get('UIScene');
        if (ui && ui.toggleShop) ui.toggleShop();
      } else if (nearPortal) {
        this.enterDungeon();
      } else if (nearGuild) {
        this.enterGuildHall();
      }
    }
  }

  enterGuildHall() {
    SaveSystem.saveChar(this._charId, this.player);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UIScene');
      this.scene.start('GuildScene', {
        jobKey:   this._jobKey,
        charId:   this._charId,
        loadSave: true,
        player:   this.player,
      });
    });
  }

  enterDungeon() {
    if (this._diffPanel) return; // 이미 열려있으면 무시
    this._showDifficultyPanel();
  }

  _showDifficultyPanel() {
    const W = 1280, H = 720;
    const PW = 520, PH = 440;
    const px = (W - PW) / 2, py = (H - PH) / 2;
    const D  = 500; // depth
    const sf = obj => { obj.setScrollFactor(0).setDepth(D); return obj; };

    const DIFFS = [
      { level: 1, name: '일반', color: 0x2ecc71, waves: 4, rewardMult: 1.0, desc: '입문자용. 기본 구성.' },
      { level: 2, name: '고급', color: 0x3498db, waves: 5, rewardMult: 1.4, desc: 'HP×1.3 / 데미지×1.2' },
      { level: 3, name: '잔혹', color: 0x9b59b6, waves: 6, rewardMult: 2.0, desc: 'HP×1.7 / 데미지×1.5' },
      { level: 4, name: '악몽', color: 0xe67e22, waves: 7, rewardMult: 2.8, desc: 'HP×2.2 / 데미지×1.9' },
      { level: 5, name: '심연', color: 0xe74c3c, waves: 8, rewardMult: 4.0, desc: 'HP×3.0 / 데미지×2.5  최고 보상' },
    ];

    // 모든 요소를 배열로 관리 (Container 미사용 — 입력 히트 영역 문제 방지)
    this._diffEls = [];
    const add = obj => { this._diffEls.push(obj); return sf(obj); };
    const destroy = () => { this._diffEls.forEach(o => o.destroy()); this._diffEls = null; this._diffPanel = false; };

    // 반투명 오버레이
    add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6));
    // 패널 배경
    add(this.add.rectangle(px + PW / 2, py + PH / 2, PW, PH, 0x0a0005, 0.97)).setStrokeStyle(2, 0xc0392b);
    // 타이틀
    add(this.add.text(W / 2, py + 18, '던전 난이도 선택', { fontSize: '20px', fill: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5, 0));
    // 구분선
    add(this.add.rectangle(px + PW / 2, py + 51, PW, 1, 0x4a0000));

    DIFFS.forEach((d, i) => {
      const rx = px + 10,  ry = py + 60 + i * 72;
      const colorHex = '#' + d.color.toString(16).padStart(6, '0');

      const rowBg = add(this.add.rectangle(rx + (PW - 20) / 2, ry + 32, PW - 20, 64, 0x150005)
        .setStrokeStyle(1, d.color, 0.5).setInteractive({ useHandCursor: true }));

      add(this.add.text(rx + 10,       ry + 10, `Lv.${d.level}  ${d.name}`, { fontSize: '16px', fill: colorHex, fontStyle: 'bold' }).setOrigin(0, 0));
      add(this.add.text(rx + 10,       ry + 34, d.desc,  { fontSize: '11px', fill: '#aaaaaa' }).setOrigin(0, 0));
      add(this.add.text(px + PW - 120, ry + 14, `${d.waves}웨이브`, { fontSize: '13px', fill: '#cccccc' }).setOrigin(0, 0));
      add(this.add.text(px + PW - 120, ry + 34, `보상 ×${d.rewardMult}`, { fontSize: '12px', fill: '#f39c12' }).setOrigin(0, 0));

      rowBg.on('pointerover',  () => rowBg.setFillStyle(0x2a0010));
      rowBg.on('pointerout',   () => rowBg.setFillStyle(0x150005));
      rowBg.on('pointerdown',  () => {
        destroy();
        SaveSystem.saveChar(this._charId, this.player);
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('UIScene');
          this.scene.start('DungeonScene', {
            jobKey: this._jobKey, charId: this._charId,
            loadSave: true, multi: this._isMulti, difficulty: d.level,
          });
        });
      });
    });

    // 취소 버튼
    const cancelBtn = add(this.add.text(W / 2, py + PH - 18, '취소', { fontSize: '14px', fill: '#888888' })
      .setOrigin(0.5, 1).setInteractive({ useHandCursor: true }));
    cancelBtn.on('pointerdown', destroy);
    cancelBtn.on('pointerover', () => cancelBtn.setStyle({ fill: '#ffffff' }));
    cancelBtn.on('pointerout',  () => cancelBtn.setStyle({ fill: '#888888' }));

    this._diffPanel = true;
  }

  // ════════════════════════════════════════════════
  // 멀티플레이 동기화
  // ════════════════════════════════════════════════
  setupMultiplayer() {
    // 원격 플레이어 아바타 맵 { socketId → { gfx, nameText, hpBar } }
    this._remotes = new Map();

    // 내 상태 60ms마다 송신
    this._netTimer = this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        const p = this.player;
        Network.sendPlayerState({
          x: Math.round(p.x), y: Math.round(p.y),
          hp: Math.round(p.hp), maxHp: p.maxHp,
          level: p.level,
        });
      },
    });

    // 다른 플레이어 상태 수신
    Network.on('playerStateUpdate', ({ id, x, y, hp, maxHp, level }) => {
      this._updateRemotePlayer(id, x, y, hp, maxHp, level);
    });

    // 플레이어 퇴장 시 아바타 제거
    Network.on('playerLeft', ({ id }) => {
      const remote = this._remotes.get(id);
      if (remote) {
        remote.gfx?.destroy();
        remote.nameText?.destroy();
        remote.hpBg?.destroy();
        remote.hpBar?.destroy();
        this._remotes.delete(id);
      }
    });

    // 파티 HP 바 UI (좌측 하단)
    this._buildPartyHUD();
    // 30ms마다 파티 HUD 갱신
    this.time.addEvent({ delay: 300, loop: true, callback: () => this._refreshPartyHUD() });
  }

  _updateRemotePlayer(id, x, y, hp, maxHp, level) {
    let remote = this._remotes.get(id);
    const room = Network.room;
    const info = room?.players?.find(p => p.id === id);

    if (!remote) {
      // 처음 등장 — 아바타 생성
      const gfx = this.add.graphics().setDepth(8);
      const nameText = this.add.text(x, y - 32, info?.name ?? '???', {
        fontSize: '11px', fill: '#5dade2', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9);
      const hpBg  = this.add.rectangle(x, y - 22, 34, 5, 0x333333).setDepth(9);
      const hpBar = this.add.rectangle(x - 17, y - 22, 34, 5, 0x2ecc71).setOrigin(0, 0.5).setDepth(10);

      remote = { gfx, nameText, hpBg, hpBar, x, y, hp, maxHp };
      this._remotes.set(id, remote);
    }

    // 위치 트윈 (보간)
    Object.assign(remote, { x, y, hp, maxHp });

    const gfx = remote.gfx;
    gfx.clear();
    gfx.fillStyle(0x5dade2, 0.85);
    gfx.fillCircle(x, y, 10);
    gfx.lineStyle(2, 0x2980b9);
    gfx.strokeCircle(x, y, 10);

    remote.nameText.setPosition(x, y - 32);
    remote.hpBg.setPosition(x, y - 22);
    remote.hpBar.setPosition(x - 17, y - 22);
    const ratio = Phaser.Math.Clamp(hp / (maxHp || 1), 0, 1);
    remote.hpBar.setSize(34 * ratio, 5);
  }

  _buildPartyHUD() {
    const room = Network.room;
    if (!room) return;
    this._partyHudY = 720 - 54;
    this._partyCards = [];

    const others = (room.players ?? []).filter(p => p.id !== Network.myId);
    others.forEach((p, i) => {
      const cx = 12, cy = this._partyHudY - i * 50;
      const bg   = this.add.rectangle(cx + 90, cy, 180, 40, 0x000000, 0.6).setScrollFactor(0).setDepth(95);
      const name = this.add.text(cx + 8, cy - 10, p.name, { fontSize: '11px', fill: '#5dade2' }).setScrollFactor(0).setDepth(96);
      const hpBg = this.add.rectangle(cx + 8, cy + 8, 160, 6, 0x333333).setOrigin(0, 0.5).setScrollFactor(0).setDepth(96);
      const hpBr = this.add.rectangle(cx + 8, cy + 8, 160, 6, 0x2ecc71).setOrigin(0, 0.5).setScrollFactor(0).setDepth(97);
      this._partyCards.push({ id: p.id, hpBr, name });
    });
  }

  _refreshPartyHUD() {
    if (!this._partyCards) return;
    this._partyCards.forEach(card => {
      const remote = this._remotes.get(card.id);
      if (!remote) return;
      const ratio = Phaser.Math.Clamp(remote.hp / (remote.maxHp || 1), 0, 1);
      card.hpBr.setSize(160 * ratio, 6);
    });
  }
}
