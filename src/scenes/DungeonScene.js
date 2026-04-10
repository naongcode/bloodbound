import Player from '../entities/Player.js';
import Monster from '../entities/Monster.js';
import Projectile from '../entities/Projectile.js';
import CombatSystem from '../systems/CombatSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import InventorySystem from '../systems/InventorySystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import Network from '../systems/NetworkManager.js';
import { MONSTER_DATA } from '../data/monsters.js';
import { ITEM_DATA } from '../data/items.js';

const DW = 1280;
const DH = 960;
const WALL = 32;

// 난이도별 설정
const DIFF_TABLE = {
  1: { hpMult: 1.0, dmgMult: 1.0, speedMult: 1.1,  rewardMult: 1.0 },
  2: { hpMult: 1.3, dmgMult: 1.2, speedMult: 1.25, rewardMult: 1.4 },
  3: { hpMult: 1.7, dmgMult: 1.5, speedMult: 1.4,  rewardMult: 2.0 },
  4: { hpMult: 2.2, dmgMult: 1.9, speedMult: 1.6,  rewardMult: 2.8 },
  5: { hpMult: 3.0, dmgMult: 2.5, speedMult: 1.8,  rewardMult: 4.0 },
};

// 웨이브 풀 (난이도에 따라 앞에서부터 waveCount-1개 사용 + 보스 웨이브)
const WAVE_POOL = [
  { label: '1웨이브', monsters: [{ key: 'blood_slime', count: 5 }, { key: 'blood_bat', count: 3 }] },
  { label: '2웨이브', monsters: [{ key: 'blood_slime', count: 3 }, { key: 'blood_bat', count: 3 }, { key: 'bloodfang_wolf', count: 2 }] },
  { label: '3웨이브', monsters: [{ key: 'bloodfang_wolf', count: 3 }, { key: 'blood_archer', count: 3 }] },
  { label: '4웨이브', monsters: [{ key: 'blood_kin', count: 2 }, { key: 'blood_archer', count: 3 }, { key: 'crimson_spider', count: 2 }] },
  { label: '5웨이브', monsters: [{ key: 'blood_kin', count: 3 }, { key: 'poison_mage', count: 2 }] },
  { label: '6웨이브', monsters: [{ key: 'shadow_knight', count: 1 }, { key: 'blood_kin', count: 3 }, { key: 'poison_mage', count: 2 }] },
  { label: '7웨이브', monsters: [{ key: 'shadow_knight', count: 2 }, { key: 'blood_archer', count: 4 }, { key: 'poison_mage', count: 2 }] },
];

const BOSS_BY_DIFF = {
  1: { key: 'blood_kin',     label: '보스' },
  2: { key: 'blood_kin',     label: '보스' },
  3: { key: 'shadow_knight', label: '보스' },
  4: { key: 'shadow_knight', label: '보스' },
  5: { key: 'blood_golem',   label: '최종 보스' },
};

export default class DungeonScene extends Phaser.Scene {
  constructor() { super('DungeonScene'); }

  init(data) {
    this._jobKey     = (data && data.jobKey)     ? data.jobKey     : 'warrior';
    this._charId     = (data && data.charId)     ? data.charId     : null;
    this._isMulti    = (data && data.multi)      ? true            : false;
    this._difficulty = (data && data.difficulty) ? data.difficulty : 1;
  }

  create() {
    this.combatSystem    = new CombatSystem(this);
    this.levelSystem     = new LevelSystem(this);
    this.inventorySystem = new InventorySystem(this);

    this.buildWorld();
    this.spawnPlayer();

    this.monsters  = this.add.group();
    this._bullets  = [];
    this._waveIdx  = 0;
    this._cleared  = false;

    // 난이도에 따라 웨이브 목록 생성
    const diff    = this._difficulty;
    const diffCfg = DIFF_TABLE[diff] || DIFF_TABLE[1];
    const waveCount = 3 + diff; // 난이도1→4웨이브 ~ 난이도5→8웨이브
    const boss    = BOSS_BY_DIFF[diff] || BOSS_BY_DIFF[1];
    this._waves   = [
      ...WAVE_POOL.slice(0, waveCount - 1),
      { label: boss.label, boss: true, monsters: [{ key: boss.key, count: 1, boss: true }] },
    ];
    this._diffCfg = diffCfg;

    this.physics.world.setBounds(WALL, WALL, DW - WALL * 2, DH - WALL * 2);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.monsters.getChildren(), this.walls);

    this.cameras.main.setBounds(0, 0, DW, DH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.setupEvents();
    this.buildHUD();

    // 던전 BGM은 웨이브 시작 시 1회 재생 (startWave에서 처리)

    // UIScene 실행 (이전 인스턴스가 있으면 먼저 정리)
    this.scene.stop('UIScene');
    this.scene.launch('UIScene', { gameScene: this });
    this.scene.bringToTop('UIScene');

    // ESC → 귀환
    this.input.keyboard.on('keydown-ESC', () => this.exitDungeon());

    // 멀티플레이 설정
    if (this._isMulti) this.setupMultiplayer();

    // 1초 후 첫 웨이브 시작 (멀티: 호스트만 직접 시작, 나머지는 sync 대기)
    if (!this._isMulti || Network.isHost()) {
      this.time.delayedCall(1000, () => this.startWave(0));
    }
  }

  // ── 월드 ─────────────────────────────────────────────────
  buildWorld() {
    // 바닥 (어두운 돌)
    for (let tx = 0; tx < DW; tx += 32) {
      for (let ty = 0; ty < DH; ty += 32) {
        const variant = Math.random() < 0.8 ? 'tile_stone' : 'tile_dirt';
        this.add.image(tx + 16, ty + 16, variant).setTint(0x334455).setDepth(0);
      }
    }

    // 벽 (정적 물리 그룹)
    this.walls = this.physics.add.staticGroup();
    const addWall = (x, y, w, h) => {
      const r = this.add.rectangle(x, y, w, h, 0x2c3e50).setDepth(5);
      this.physics.add.existing(r, true);
      this.walls.add(r);
    };

    // 상하좌우 벽
    addWall(DW / 2, WALL / 2,      DW,    WALL);     // 상
    addWall(DW / 2, DH - WALL / 2, DW,    WALL);     // 하
    addWall(WALL / 2,      DH / 2, WALL,  DH);       // 좌
    addWall(DW - WALL / 2, DH / 2, WALL,  DH);       // 우

    // 내부 기둥 장식 (4개 코너)
    const pillars = [
      [200, 200], [DW - 200, 200],
      [200, DH - 200], [DW - 200, DH - 200],
    ];
    pillars.forEach(([px, py]) => {
      const g = this.add.rectangle(px, py, 40, 40, 0x1a2534).setDepth(5);
      this.physics.add.existing(g, true);
      this.walls.add(g);
    });

    // 혈안개 분위기 오버레이
    this.add.rectangle(DW / 2, DH / 2, DW, DH, 0x440011, 0.12).setDepth(1).setScrollFactor(0);
  }

  spawnPlayer() {
    this.player = new Player(this, DW / 2, DH / 2, this._jobKey);
    this.player.inventory = this.inventorySystem.createInventory();

    if (this._charId) {
      // 1) 로컬 캐시 즉시 적용 (동기)
      const cached = SaveSystem.loadCharSync(this._charId);
      if (cached) {
        SaveSystem.apply(this.player, cached, this.inventorySystem);
      }
      // 2) 클라우드 최신 데이터로 덮어쓰기 (비동기)
      SaveSystem.loadChar(this._charId).then(saveData => {
        if (!this.scene.isActive('DungeonScene')) return;
        if (saveData) SaveSystem.apply(this.player, saveData, this.inventorySystem);
      }).catch(e => console.warn('[DungeonScene] 세이브 로드 실패:', e));
    } else {
      this.inventorySystem.addItem(this.player.inventory, 'iron_sword');
      this.inventorySystem.addItem(this.player.inventory, 'leather_armor');
      this.inventorySystem.addItem(this.player.inventory, 'hp_potion_small', 3);
      this.inventorySystem.equip(this.player, 0);
      this.inventorySystem.equip(this.player, 1);
    }
  }

  // ── 웨이브 시스템 ─────────────────────────────────────────
  startWave(idx) {
    if (idx >= this._waves.length) return;
    this._waveIdx = idx;
    const wave = this._waves[idx];

    this.showWaveBanner(wave.label, wave.boss);
    this.updateWaveHUD();
    this.sound.stopByKey('bgm_dungeon');
    this.sound.play('bgm_dungeon', { loop: false, volume: 0.5 });
    if (wave.boss) this.sound.play('sfx_boss_popup', { volume: 0.5 });

    // 기존 몬스터 정리
    this.monsters.getChildren().forEach(m => { if (m.active) m.destroy(); });
    this.monsters.clear(true, true);

    wave.monsters.forEach(entry => {
      for (let i = 0; i < entry.count; i++) {
        const m = this.spawnMonster(entry.key);
        if (m && entry.boss) this.makeBoss(m);
      }
    });

    this.physics.add.collider(this.monsters.getChildren(), this.walls);
  }

  spawnMonster(key) {
    const data = MONSTER_DATA[key];
    if (!data) return null;

    // 플레이어와 멀리 떨어진 스폰 위치
    let x, y;
    let tries = 0;
    do {
      x = Phaser.Math.Between(WALL + 50, DW - WALL - 50);
      y = Phaser.Math.Between(WALL + 50, DH - WALL - 50);
      tries++;
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 250 && tries < 30);

    // 난이도 배율 적용
    const cfg = this._diffCfg || DIFF_TABLE[1];
    const scaledData = {
      ...data,
      baseHp:     Math.floor(data.baseHp     * cfg.hpMult),
      baseDamage: Math.floor(data.baseDamage * cfg.dmgMult),
      speed:      Math.floor(data.speed      * (cfg.speedMult || 1.0)),
    };

    const monster = new Monster(this, x, y, scaledData);
    monster.target   = this.player;
    monster.isAggro  = true;
    this.monsters.add(monster);
    return monster;
  }

  makeBoss(monster) {
    monster.isBoss = true;
    monster.maxHp  = Math.floor(monster.maxHp * 8);
    monster.hp     = monster.maxHp;
    monster.damage = Math.floor(monster.damage * 2);
    monster.speed  = Math.floor(monster.speed * 1.6);
    monster.setScale(1.8).setTint(0xcc0033);
    monster.nameText.setText('★★ 심연의 군주 ★★');
    monster.nameText.setStyle({
      fontSize: '13px', fill: '#ff4444',
      stroke: '#000000', strokeThickness: 4
    });

    // 보스 HP바 표시
    this._bossTarget = monster;
    this.updateBossHPBar();
  }

  checkWaveCleared() {
    const alive = this.monsters.getChildren().filter(m => m.isAlive).length;
    if (alive > 0) return;

    const nextIdx = this._waveIdx + 1;
    if (nextIdx < this._waves.length) {
      this.showFloatText(DW / 2, DH / 2 - 40, '웨이브 클리어!', '#2ecc71', '22px');
      // 멀티: 호스트가 웨이브 진행 브로드캐스트
      if (this._isMulti && Network.isHost()) {
        Network.sendWaveCleared(nextIdx);
      }
      if (!this._isMulti || Network.isHost()) {
        this.time.delayedCall(3000, () => this.startWave(nextIdx));
      }
    } else {
      if (this._isMulti && Network.isHost()) Network.sendDungeonCleared();
      this.onDungeonClear();
    }
  }

  // ── 던전 클리어 ──────────────────────────────────────────
  onDungeonClear() {
    if (this._cleared) return;
    this._cleared = true;

    this.showWaveBanner('던전 클리어!', false, '#f1c40f');
    this.cameras.main.shake(400, 0.012);

    // 보상 상자 스폰
    this.time.delayedCall(1500, () => {
      this.spawnRewardChest();
      this.spawnReturnPortal();
    });
  }

  spawnRewardChest() {
    const cx = DW / 2, cy = DH / 2;

    // 보상 상자 비주얼
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(0x8B6914);  g.fillRect(cx - 22, cy - 16, 44, 32);
    g.fillStyle(0xDAA520);  g.fillRect(cx - 22, cy - 20, 44, 8);
    g.fillStyle(0xffd700);  g.fillRect(cx - 8,  cy - 6,  16, 12);
    g.lineStyle(2, 0x000000, 0.5); g.strokeRect(cx - 22, cy - 20, 44, 36);

    this.add.text(cx, cy + 26, '[E] 보상 열기', {
      fontSize: '13px', fill: '#ffd700', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);

    this._chestX = cx; this._chestY = cy;
    this._chestOpened = false;
  }

  openChest() {
    if (this._chestOpened) return;
    this._chestOpened = true;
    this.sound.play('sfx_item_box', { volume: 0.5 });

    // 보상 목록: 골드 + 랜덤 아이템 (난이도 배율 적용)
    const cfg        = this._diffCfg || DIFF_TABLE[1];
    const baseGold   = Phaser.Math.Between(200, 500);
    const gold       = Math.floor(baseGold * cfg.rewardMult);
    this.player.inventory.gold += gold;

    // 난이도별 보상 풀
    const itemPools = {
      1: ['hp_potion_medium', 'soldiers_sword', 'leather_boots', 'blood_crystal'],
      2: ['hp_potion_medium', 'soldiers_sword', 'iron_plate', 'swift_boots', 'chainmail'],
      3: ['crusader_sword', 'guard_helm', 'iron_plate', 'iron_gauntlets', 'abyss_pendant'],
      4: ['bloodkin_blade', 'bloodbound_armor', 'blood_crown', 'shadow_treads', 'abyss_ring'],
      5: ['demon_blade', 'void_bow', 'void_staff', 'abyss_plate', 'abyss_crown'],
    };
    const possibleItems = itemPools[this._difficulty] || itemPools[1];
    const count = Phaser.Math.Between(2, Math.min(3 + Math.floor(this._difficulty / 2), 5));
    const given = [];
    for (let i = 0; i < count; i++) {
      const key = possibleItems[Phaser.Math.Between(0, possibleItems.length - 1)];
      const added = this.inventorySystem.addItem(this.player.inventory, key, 1);
      if (added) given.push(ITEM_DATA[key]?.name ?? key);
    }

    this.events.emit('statsChanged', this.player);

    // 보상 텍스트
    let msg = `골드 +${gold}G`;
    if (given.length) msg += '\n' + given.join(', ');
    this.showFloatText(DW / 2, DH / 2 - 80, msg, '#ffd700', '16px');

    this._chestX = null; // 상자 비활성화
    SaveSystem.saveChar(this._charId, this.player);
  }

  spawnReturnPortal() {
    const px = DW / 2, py = DH / 2 + 100;
    this._portalX = px; this._portalY = py;

    // 포털 비주얼 (회전하는 원)
    const g = this.add.graphics().setDepth(10).setPosition(px, py);
    g.lineStyle(4, 0x00cfff, 0.9); g.strokeCircle(0, 0, 32);
    g.fillStyle(0x003366, 0.7);    g.fillCircle(0, 0, 28);
    g.fillStyle(0x00cfff, 0.4);    g.fillCircle(0, 0, 16);
    this.tweens.add({ targets: g, angle: 360, duration: 3000, repeat: -1, ease: 'Linear' });

    this.add.text(px, py + 48, '[E] 귀환', {
      fontSize: '13px', fill: '#00cfff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
  }

  // ── 이벤트 설정 ──────────────────────────────────────────
  setupEvents() {
    // 원거리 투사체
    this.events.on('playerShoot', ({ fromX, fromY, toX, toY, damage, isCrit, maxRange }) => {
      this._bullets.push(new Projectile(this, fromX, fromY, toX, toY, { damage, isCrit, maxRange }));
      if (isCrit) this.cameras.main.shake(60, 0.002);
    });

    // 근접 공격
    this.events.on('playerMelee', ({ x, y, range, damage, isCrit }) => {
      let hit = false;
      this.monsters.getChildren().forEach(m => {
        if (!m.isAlive) return;
        if (Phaser.Math.Distance.Between(x, y, m.x, m.y) <= range) {
          m.takeDamage(damage); hit = true;
        }
      });
      this.showMeleeEffect(x, y, range);
      if (isCrit && hit) this.cameras.main.shake(80, 0.003);
    });

    // 몬스터 사망
    this.events.on('monsterDied', ({ monster }) => {
      if (!monster.isAlive) return;
      monster.isAlive = false;
      this.handleMonsterDeath(monster);
      // 보스 HP바 갱신
      if (monster === this._bossTarget) this._bossTarget = null;
      if (monster.isBoss) {
        this.sound.stopByKey('bgm_dungeon');
        this.sound.play('sfx_dungeon_boss_die', { volume: 0.5 });
      }
      // 웨이브 클리어 체크 (약간 딜레이)
      this.time.delayedCall(500, () => this.checkWaveCleared());
    });

    // 레벨업
    this.events.on('levelUp', ({ player, level }) => {
      this.showLevelUpEffect(player, level);
      this.sound.play('sfx_levelup', { volume: 0.5 });
      SaveSystem.saveChar(this._charId, player);
    });

    // 직업 등급 상승
    this.events.on('rankUp', ({ player, rankName }) => {
      this.showFloatText(player.x, player.y - 90, `★ ${rankName} ★`, '#f1c40f', '22px');
      this.sound.play('bgm_field', { loop: false, volume: 0.5 });
    });

    // 플레이어 사망
    this.events.on('playerDied', ({ player }) => {
      player.die();
      this.time.delayedCall(2000, () => this.showDeathMessage());
    });

    // 스킬
    this.events.on('playerSkill', ({ player, skill, x, y, targetX, targetY }) => {
      this.handlePlayerSkill(player, skill, x, y, targetX, targetY);
    });

    this.events.on('skillFailed', () => {
      this.showFloatText(this.player.x, this.player.y - 30, 'MP 부족!', '#3498db', '13px');
    });

    this.events.on('defenseBreak', ({ monster }) => {
      this.showFloatText(monster.x, monster.y - 40, '방어 파훼!', '#f39c12', '16px');
    });

    this.events.on('thornReflect', ({ damage }) => {
      if (this.player?.isAlive) {
        this.player.takeDamage(damage, 0, null);
        this.showFloatText(this.player.x, this.player.y - 30, `↩ ${damage}`, '#e67e22', '13px');
      }
    });

    this.events.on('monsterEnraged', ({ monster }) => {
      this.showFloatText(monster.x, monster.y - 40, '격노!', '#e74c3c', '16px');
      monster.setTint(0xff4444);
    });
  }

  // ── HUD (던전 전용) ────────────────────────────────────────
  buildHUD() {


    // 반투명 상단 바
    this.add.rectangle(640, 20, 1280, 40, 0x000000, 0.55).setScrollFactor(0).setDepth(95);

    const _np = { padding: { top: 0, bottom: 0 } }; // 글로벌 패딩 패치 비적용

    // 웨이브 텍스트
    this._waveText = this.add.text(640, 20, '', {
      fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', ..._np
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96);

    // HP/MP 바 배경
    this.add.rectangle(130, 55, 240, 14, 0x111111).setScrollFactor(0).setDepth(95);
    this.add.rectangle(130, 72, 240, 10, 0x111111).setScrollFactor(0).setDepth(95);

    this._hpBar = this.add.rectangle(10, 48, 0, 14, 0xe74c3c).setScrollFactor(0).setDepth(96).setOrigin(0, 0);
    this._mpBar = this.add.rectangle(10, 65, 0, 10, 0x3498db).setScrollFactor(0).setDepth(96).setOrigin(0, 0);

    this._hpText = this.add.text(130, 55, '', { fontSize: '10px', fill: '#fff', ..._np }).setOrigin(0.5).setScrollFactor(0).setDepth(97);
    this._mpText = this.add.text(130, 72, '', { fontSize: '10px', fill: '#fff', ..._np }).setOrigin(0.5).setScrollFactor(0).setDepth(97);

    // 보스 HP 바 (숨김 시작)
    this._bossBarBg = this.add.rectangle(640, DH - 30, 600, 18, 0x330000).setScrollFactor(0).setDepth(95).setVisible(false);
    this._bossBar   = this.add.rectangle(340, DH - 30, 0,   16, 0xcc0033).setScrollFactor(0).setDepth(96).setOrigin(0, 0.5).setVisible(false);
    this._bossText  = this.add.text(640, DH - 30, '', { fontSize: '11px', fill: '#fff', fontStyle: 'bold', ..._np }).setOrigin(0.5).setScrollFactor(0).setDepth(97).setVisible(false);

    // ESC 힌트
    this.add.text(1270, 20, '[ESC] 귀환', {
      fontSize: '11px', fill: '#aaaaaa', ..._np
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(96);

    this.updateWaveHUD();
  }

  updateWaveHUD() {
    const wave = this._waves?.[this._waveIdx];
    if (!wave) return;
    const diffNames = { 1: '일반', 2: '고급', 3: '잔혹', 4: '악몽', 5: '심연' };
    const diffName  = diffNames[this._difficulty] ?? '일반';
    this._waveText.setText(`[ 던전 [${diffName}] — ${wave.label} / 총 ${this._waves.length}웨이브 ]`);
  }

  updateHUD() {
    const p = this.player;
    if (!p) return;

    const hpRatio = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    const mpRatio = Phaser.Math.Clamp(p.mp / p.maxMp, 0, 1);
    this._hpBar.setSize(hpRatio * 240, 14);
    this._mpBar.setSize(mpRatio * 240, 10);
    this._hpText.setText(`HP ${p.hp} / ${p.maxHp}`);
    this._mpText.setText(`MP ${Math.floor(p.mp)} / ${p.maxMp}`);

    this.updateBossHPBar();
  }

  updateBossHPBar() {
    const boss = this._bossTarget;
    if (!boss || !boss.isAlive) {
      this._bossBarBg.setVisible(false);
      this._bossBar.setVisible(false);
      this._bossText.setVisible(false);
      return;
    }
    this._bossBarBg.setVisible(true);
    this._bossBar.setVisible(true);
    this._bossText.setVisible(true);

    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this._bossBar.setSize(ratio * 600, 16);
    this._bossText.setText(`심연의 군주  ${boss.hp} / ${boss.maxHp}`);
  }

  // ── 스킬 라우터 (GameScene과 동일) ───────────────────────
  handlePlayerSkill(player, skill, x, y, targetX, targetY) {
    switch (skill) {
      case 'charge':       this.skillCharge(player, targetX, targetY);         break;
      case 'barrage':      this.skillBarrage(player, x, y, targetX, targetY);  break;
      case 'fireball':     this.skillFireball(player, x, y, targetX, targetY); break;
      case 'holy_light':   this.skillHolyLight(player);                         break;
      case 'poison_cloud': this.skillPoisonCloud(player, x, y);                break;
    }
  }

  skillCharge(player, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    const toX   = Phaser.Math.Clamp(player.x + Math.cos(angle) * 200, WALL + 10, DW - WALL - 10);
    const toY   = Phaser.Math.Clamp(player.y + Math.sin(angle) * 200, WALL + 10, DH - WALL - 10);
    const fromX = player.x, fromY = player.y;

    player.isDodging = true; player.setAlpha(0.65);
    this.tweens.add({
      targets: player, x: toX, y: toY, duration: 180, ease: 'Power2',
      onUpdate: () => {
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y) < 45) {
            const r = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
            m.takeDamage(r.damage * 1.5);
          }
        });
      },
      onComplete: () => { player.isDodging = false; player.setAlpha(1); },
    });
    const g = this.add.graphics().setDepth(18);
    g.lineStyle(4, 0x3498db, 0.7);
    g.beginPath(); g.moveTo(fromX, fromY); g.lineTo(toX, toY); g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  skillBarrage(player, x, y, targetX, targetY) {
    const base   = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const result = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
    for (let i = -2; i <= 2; i++) {
      const a  = base + i * 0.22;
      const tx = x + Math.cos(a) * 200;
      const ty = y + Math.sin(a) * 200;
      this._bullets.push(new Projectile(this, x, y, tx, ty, {
        damage: result.damage * 0.7, isCrit: result.isCrit, maxRange: 420, color: 0x2ecc71,
      }));
    }
  }

  skillFireball(player, x, y, targetX, targetY) {
    const result = this.combatSystem.calcPhysicalDamage(player, { stats: { defense: 0 }, level: 1 });
    const dmg    = result.damage * 2.5;
    this._bullets.push(new Projectile(this, x, y, targetX, targetY, {
      damage: dmg, speed: 260, maxRange: 520, color: 0xff4500, sizeScale: 2.2,
      onExplode: (ex, ey) => {
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(ex, ey, m.x, m.y) < 80) m.takeDamage(dmg * 0.6);
        });
        this.showExplosion(ex, ey);
      },
    }));
  }

  skillHolyLight(player) {
    const heal = Math.floor(player.maxHp * 0.3);
    player.hp  = Math.min(player.maxHp, player.hp + heal);
    this.events.emit('statsChanged', player);
    this.showFloatText(player.x, player.y - 45, `+${heal} HP`, '#f1c40f', '18px');
    const g = this.add.graphics().setDepth(18).setPosition(player.x, player.y);
    g.fillStyle(0xf1c40f, 0.28); g.fillCircle(0, 0, 70);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 600, onComplete: () => g.destroy() });
  }

  skillPoisonCloud(player, x, y) {
    const radius = 100;
    const g = this.add.graphics().setDepth(8).setPosition(x, y);
    g.fillStyle(0x27ae60, 0.2); g.fillCircle(0, 0, radius);
    g.lineStyle(2, 0x27ae60, 0.5); g.strokeCircle(0, 0, radius);
    this.time.addEvent({
      delay: 500, repeat: 5,
      callback: () => {
        this.monsters.getChildren().forEach(m => {
          if (!m.isAlive) return;
          if (Phaser.Math.Distance.Between(x, y, m.x, m.y) < radius)
            m.takeDamage(Math.max(5, player.totalStats.INT * 0.5));
        });
      },
    });
    this.tweens.add({ targets: g, alpha: 0, duration: 3000, onComplete: () => g.destroy() });
  }

  // ── 몬스터 사망 처리 ─────────────────────────────────────
  handleMonsterDeath(monster) {
    const data = monster.monsterData;

    this.levelSystem.gainXP(this.player, { base: data.xpReward, sourceLevel: data.level });

    const gold = Phaser.Math.Between(data.goldReward.min, data.goldReward.max);
    this.player.inventory.gold += Math.floor(gold * 1.5);

    if (data.dropTable) {
      data.dropTable.forEach(drop => {
        if (Math.random() < drop.chance * 1.2) {
          const qty = Phaser.Math.Between(drop.quantity[0], drop.quantity[1]);
          const added = this.inventorySystem.addItem(this.player.inventory, drop.itemKey, qty);
          if (added) {
            const itemName = ITEM_DATA[drop.itemKey]?.name ?? drop.itemKey;
            this._showPickupNotice(itemName, ITEM_DATA[drop.itemKey]?.grade);
          }
        }
      });
    }

    this.events.emit('statsChanged', this.player);
  }

  // ── 화면 고정 획득 알림 ─────────────────────────────────────
  _showPickupNotice(itemName, grade) {
    const GRADE_COLOR = {
      common: '#aaaaaa', uncommon: '#2ecc71', rare: '#3498db',
      epic: '#9b59b6', legendary: '#e67e22', abyss: '#c0392b',
    };
    const color = GRADE_COLOR[grade] ?? '#ffffff';

    if (!this._pickupLog) this._pickupLog = [];

    // 최대 5줄, 오래된 것 정리
    if (this._pickupLog.length >= 5) {
      const old = this._pickupLog.shift();
      if (old.active) old.destroy();
    }

    const yBase = 55;
    const lineH = 18;

    // 기존 항목 위로 올리기
    this._pickupLog.forEach((t, i) => {
      if (t.active) t.setY(yBase + i * lineH);
    });

    const t = this.add.text(DW - 10, yBase + this._pickupLog.length * lineH,
      `+ ${itemName}`,
      { fontSize: '12px', fill: color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
        padding: { top: 0, bottom: 0 } }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(97);

    this._pickupLog.push(t);

    // 3초 후 페이드 아웃
    this.tweens.add({
      targets: t, alpha: 0, duration: 600, delay: 2400,
      onComplete: () => {
        t.destroy();
        this._pickupLog = this._pickupLog.filter(x => x !== t);
        // 남은 항목 재정렬
        this._pickupLog.forEach((x, i) => { if (x.active) x.setY(yBase + i * lineH); });
      }
    });
  }

  // ── 이펙트 ───────────────────────────────────────────────
  showMeleeEffect(x, y, range) {
    const g = this.add.graphics().setDepth(20).setPosition(x, y);
    g.lineStyle(3, 0xe74c3c, 0.8); g.strokeCircle(0, 0, range);
    g.fillStyle(0xe74c3c, 0.12);   g.fillCircle(0, 0, range);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 200, onComplete: () => g.destroy() });
  }

  showExplosion(x, y) {
    const g = this.add.graphics().setDepth(20).setPosition(x, y);
    g.fillStyle(0xff6600, 0.75); g.fillCircle(0, 0, 80);
    g.fillStyle(0xffcc00, 0.9);  g.fillCircle(0, 0, 42);
    g.fillStyle(0xffffff, 0.6);  g.fillCircle(0, 0, 16);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 380, ease: 'Power2', onComplete: () => g.destroy() });
    this.cameras.main.shake(100, 0.005);
  }

  showLevelUpEffect(player, level) {
    const t = this.add.text(player.x, player.y - 50, `LEVEL UP! Lv.${level}`, {
      fontSize: '22px', fill: '#f1c40f', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: player.y - 120, alpha: 0, duration: 2000, onComplete: () => t.destroy() });
  }

  showFloatText(x, y, msg, color, size = '14px') {
    const t = this.add.text(x, y, msg, {
      fontSize: size, fill: color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }

  showWaveBanner(label, isBoss = false, color) {
    const col = color ?? (isBoss ? '#ff4444' : '#ffffff');
    const t = this.add.text(DW / 2, DH / 2, label, {
      fontSize: isBoss ? '42px' : '34px', fill: col, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    if (isBoss) this.cameras.main.shake(300, 0.01);

    this.tweens.add({
      targets: t, alpha: 0, y: DH / 2 - 60, duration: 2200, ease: 'Power2',
      onComplete: () => t.destroy()
    });
  }

  showDeathMessage() {
    const overlay = this.add.rectangle(DW / 2, DH / 2, 420, 200, 0x000000, 0.85).setScrollFactor(0).setDepth(210);
    const t1 = this.add.text(DW / 2, DH / 2 - 25, '사망했습니다', {
      fontSize: '28px', fill: '#e74c3c', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(211);
    const t2 = this.add.text(DW / 2, DH / 2 + 20, '[R] 재도전  |  [ESC] 귀환', {
      fontSize: '15px', fill: '#aaaaaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(211);

    this.input.keyboard.once('keydown-R', () => {
      overlay.destroy(); t1.destroy(); t2.destroy();
      // 재도전 전 HP/MP 풀 회복 저장 (0HP로 로드되는 버그 방지)
      if (this.player && this._charId) {
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;
        SaveSystem.saveChar(this._charId, this.player);
      }
      this.scene.restart({ jobKey: this._jobKey, charId: this._charId, loadSave: !!this._charId });
    });
  }

  // ── 던전 출입 ────────────────────────────────────────────
  exitDungeon(save = true) {
    if (save) SaveSystem.saveChar(this._charId, this.player);
    if (this._isMulti) Network.leaveRoom();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UIScene');
      if (this._isMulti) {
        this.scene.stop('DungeonScene');
        this.scene.start('LobbyScene', { jobKey: this._jobKey, charId: this._charId });
      } else {
        // 잠든 GameScene을 깨움 (재생성 없음) → wake 핸들러에서 UIScene 재시작 + 세이브 반영
        this.scene.wake('GameScene', { loadSave: save });
        this.scene.stop('DungeonScene');
      }
    });
  }

  // ── 메인 업데이트 ─────────────────────────────────────────
  update(time, delta) {
    if (!this.player) return;
    this.player.update(time, delta);
    this.monsters.getChildren().forEach(m => {
      if (m.active && m.update) m.update(time, delta);
    });

    // 투사체
    this._bullets = this._bullets.filter(b => {
      if (!b.active) return false;
      return b.tick(delta, this.monsters.getChildren(), this);
    });

    this.updateHUD();
    this.updateInteractables();
  }

  updateInteractables() {
    const p  = this.player;
    const eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // 보상 상자
    if (this._chestX && !this._chestOpened) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, this._chestX, this._chestY);
      if (dist < 80 && Phaser.Input.Keyboard.JustDown(eKey)) {
        this.openChest();
      }
    }

    // 귀환 포털
    if (this._portalX) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, this._portalX, this._portalY);
      if (dist < 60 && Phaser.Input.Keyboard.JustDown(eKey)) {
        this.exitDungeon(true);
      }
    }
  }

  // ════════════════════════════════════════════════
  // 멀티플레이 Co-op
  // ════════════════════════════════════════════════
  setupMultiplayer() {
    this._remotes = new Map();

    // 내 상태 60ms마다 송신
    this._netTimer = this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        const p = this.player;
        if (!p) return;
        Network.sendPlayerState({
          x: Math.round(p.x), y: Math.round(p.y),
          hp: Math.round(p.hp), maxHp: p.maxHp,
          level: p.level,
        });
      },
    });

    // 다른 플레이어 상태 수신
    this._cbStateUpdate   = ({ id, x, y, hp, maxHp }) => this._updateRemote(id, x, y, hp, maxHp);
    this._cbWaveSync      = ({ waveIdx }) => {
      this.showFloatText(DW / 2, DH / 2 - 40, '웨이브 클리어!', '#2ecc71', '22px');
      this.time.delayedCall(3000, () => {
        if (!this.scene.isActive('DungeonScene')) return;
        this.startWave(waveIdx);
      });
    };
    this._cbDungeonCleared = () => this.onDungeonClear();
    this._cbPlayerLeft    = ({ id }) => {
      const r = this._remotes.get(id);
      if (r) { r.gfx?.destroy(); r.nameTxt?.destroy(); r.hpBg?.destroy(); r.hpBr?.destroy(); }
      this._remotes.delete(id);
    };

    Network.on('playerStateUpdate', this._cbStateUpdate);
    Network.on('waveSync',          this._cbWaveSync);
    Network.on('dungeonClearedSync',this._cbDungeonCleared);
    Network.on('playerLeft',        this._cbPlayerLeft);

    // shutdown 시 Network 리스너 정리
    this.events.once('shutdown', () => {
      Network.off('playerStateUpdate', this._cbStateUpdate);
      Network.off('waveSync',          this._cbWaveSync);
      Network.off('dungeonClearedSync',this._cbDungeonCleared);
      Network.off('playerLeft',        this._cbPlayerLeft);
      this._netTimer?.remove();
      this._partyTimer?.remove();
      this._remotes?.forEach(r => {
        r.gfx?.destroy(); r.nameTxt?.destroy();
        r.hpBg?.destroy(); r.hpBr?.destroy();
      });
      this._remotes?.clear();
    });

    // 파티 HP 바
    this._buildPartyHUD();
    this._partyTimer = this.time.addEvent({ delay: 300, loop: true, callback: () => this._refreshPartyHUD() });
  }

  _updateRemote(id, x, y, hp, maxHp) {
    let r = this._remotes.get(id);
    const info = Network.room?.players?.find(p => p.id === id);
    if (!r) {
      const gfx    = this.add.graphics().setDepth(8);
      const nameTxt = this.add.text(x, y - 30, info?.name ?? '???', {
        fontSize: '11px', fill: '#5dade2', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(9);
      const hpBg = this.add.rectangle(x, y - 20, 34, 5, 0x333333).setDepth(9);
      const hpBr = this.add.rectangle(x - 17, y - 20, 34, 5, 0x2ecc71).setOrigin(0, 0.5).setDepth(10);
      r = { gfx, nameTxt, hpBg, hpBr, hp, maxHp };
      this._remotes.set(id, r);
    }
    Object.assign(r, { x, y, hp, maxHp });
    r.gfx.clear();
    r.gfx.fillStyle(0x5dade2, 0.85); r.gfx.fillCircle(x, y, 10);
    r.gfx.lineStyle(2, 0x2980b9);    r.gfx.strokeCircle(x, y, 10);
    r.nameTxt.setPosition(x, y - 30);
    r.hpBg.setPosition(x, y - 20);
    r.hpBr.setPosition(x - 17, y - 20).setSize(34 * Phaser.Math.Clamp(hp / (maxHp || 1), 0, 1), 5);
  }

  _buildPartyHUD() {
    const room = Network.room;
    if (!room) return;
    this._partyCards = [];
    const others = (room.players ?? []).filter(p => p.id !== Network.myId);
    others.forEach((p, i) => {
      const cy = DH - 60 - i * 50;
      this.add.rectangle(12 + 90, cy, 180, 40, 0x000000, 0.6).setScrollFactor(0).setDepth(95);
      this.add.text(12 + 8, cy - 10, p.name, { fontSize: '11px', fill: '#5dade2' }).setScrollFactor(0).setDepth(96);
      this.add.rectangle(12 + 8, cy + 8, 160, 6, 0x333333).setOrigin(0, 0.5).setScrollFactor(0).setDepth(96);
      const hpBr = this.add.rectangle(12 + 8, cy + 8, 160, 6, 0x2ecc71).setOrigin(0, 0.5).setScrollFactor(0).setDepth(97);
      this._partyCards.push({ id: p.id, hpBr });
    });
  }

  _refreshPartyHUD() {
    if (!this._partyCards) return;
    this._partyCards.forEach(card => {
      const r = this._remotes.get(card.id);
      if (!r) return;
      card.hpBr.setSize(160 * Phaser.Math.Clamp(r.hp / (r.maxHp || 1), 0, 1), 6);
    });
  }
}
