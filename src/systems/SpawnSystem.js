import Monster from '../entities/Monster.js';
import { MONSTER_DATA, HUNTER_WAVES } from '../data/monsters.js';
import { guildSystem } from './GuildSystem.js';

const MAP_W = 3200;
const MAP_H = 2400;

// ── 초기 몬스터 배치 ──────────────────────────────────────
export function spawnInitialMonsters(scene) {
  const spawnList = [
    { key: 'blood_slime',    count: 25 },
    { key: 'blood_bat',      count: 18 },
    { key: 'blood_archer',   count: 14, minDist: 400 },
    { key: 'bloodfang_wolf', count: 10, minDist: 600 },
    { key: 'crimson_spider', count: 10, minDist: 500 },
    { key: 'poison_mage',    count: 7,  minDist: 700 },
    { key: 'blood_golem',    count: 5,  minDist: 800, outerZone: true },
    { key: 'shadow_knight',  count: 5,  minDist: 800, outerZone: true },
    { key: 'blood_kin',      count: 4,  minDist: 800, outerZone: true, noElite: true },
    { key: 'blood_goblin',   count: 8,  minDist: 300, noElite: true },
  ];

  spawnList.forEach(({ key, count, minDist }) => {
    for (let i = 0; i < count; i++) {
      spawnMonster(scene, key, { minDist });
    }
  });
}

// ── 몬스터 단일 스폰 ──────────────────────────────────────
export function spawnMonster(scene, key, opts = {}) {
  const data = MONSTER_DATA[key];
  if (!data) return;

  let x = opts.x, y = opts.y;

  // 좌표가 지정되지 않은 경우 랜덤 생성
  if (x === undefined || y === undefined) {
    const minDist = opts.minDist ?? 300;
    if (opts.outerZone) {
      const margin = 400;
      do {
        const side = Phaser.Math.Between(0, 3);
        if (side === 0)      { x = Phaser.Math.Between(100, margin);                  y = Phaser.Math.Between(100, MAP_H - 100); }
        else if (side === 1) { x = Phaser.Math.Between(MAP_W - margin, MAP_W - 100);  y = Phaser.Math.Between(100, MAP_H - 100); }
        else if (side === 2) { x = Phaser.Math.Between(100, MAP_W - 100);             y = Phaser.Math.Between(100, margin); }
        else                 { x = Phaser.Math.Between(100, MAP_W - 100);             y = Phaser.Math.Between(MAP_H - margin, MAP_H - 100); }
      } while (scene.player && Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y) < minDist);
    } else {
      do {
        x = Phaser.Math.Between(100, MAP_W - 100);
        y = Phaser.Math.Between(100, MAP_H - 100);
      } while (Phaser.Math.Distance.Between(x, y, MAP_W / 2, MAP_H / 2) < minDist);
    }
  }

  const monster = new Monster(scene, x, y, data);
  monster.target = scene.player;
  scene.monsters.add(monster);

  // 10% 확률로 엘리트화 (skipElite=true이면 건너뜀 — 네트워크 수신 스폰 시)
  if (!opts.noElite && !opts.skipElite && Math.random() < 0.10) _makeElite(monster);

  return monster;
}

/** 엘리트 속성 적용 (네트워크 수신 측에서도 사용) */
export function applyElite(monster) {
  _makeElite(monster);
}

// ── 몬스터 리스폰 (타이머 루프) ───────────────────────────
// 반환값: 새로 스폰된 몬스터 배열 (멀티플레이 브로드캐스트용)
export function respawnMonsters(scene) {
  const alive   = scene.monsters.getChildren().filter(m => m.isAlive).length;
  const toSpawn = Math.max(0, 35 - alive);
  const spawned = [];
  for (let i = 0; i < toSpawn; i++) {
    const roll = Math.random();
    let key, opts;
    if      (roll < 0.25) { key = 'blood_slime';    opts = {}; }
    else if (roll < 0.45) { key = 'blood_bat';      opts = {}; }
    else if (roll < 0.60) { key = 'crimson_spider'; opts = { minDist: 400 }; }
    else if (roll < 0.75) { key = 'bloodfang_wolf'; opts = { minDist: 500 }; }
    else if (roll < 0.87) { key = 'blood_golem';    opts = { minDist: 700, outerZone: true }; }
    else if (roll < 0.91) { key = 'shadow_knight';  opts = { minDist: 700, outerZone: true }; }
    else if (roll < 0.97) { key = 'blood_kin';      opts = { minDist: 700, noElite: true }; }
    else                  { key = 'blood_goblin';   opts = { minDist: 200, noElite: true }; }
    const m = spawnMonster(scene, key, opts);
    if (m) spawned.push(m);
  }
  return spawned;
}

// ── 몬스터 사망 처리 ──────────────────────────────────────
export function handleMonsterDeath(scene, monster) {
  const data = monster.monsterData;
  const bossMulti = monster.isFieldBoss ? 10 : 1;

  // 길드 퀘스트 진행도 갱신
  guildSystem.progressQuest('kill', data.key, 1);
  if (monster.isFieldBoss) guildSystem.progressQuest('boss', 'field_boss', 1);

  // 경험치 지급 (길드 XP 보너스 포함)
  const xpBonus = 1 + (guildSystem.hasGuild() ? guildSystem.getEffectivePerks().xpBonus : 0);
  scene.levelSystem.gainXP(scene.player, {
    base: Math.round(data.xpReward * bossMulti * xpBonus),
    sourceLevel: data.level
  });

  // 골드 드롭 (길드 골드 보너스 포함)
  const goldBonus = 1 + (guildSystem.hasGuild() ? guildSystem.getEffectivePerks().goldBonus : 0);
  const gold = Math.round(Phaser.Math.Between(data.goldReward.min, data.goldReward.max) * bossMulti * goldBonus);
  scene.player.inventory.gold += gold;
  guildSystem.progressQuest('gold', null, gold);

  // 아이템 드롭
  if (data.dropTable) {
    data.dropTable.forEach(drop => {
      if (Math.random() < drop.chance) {
        const qty = Phaser.Math.Between(drop.quantity[0], drop.quantity[1]);
        scene.inventorySystem.addItem(scene.player.inventory, drop.itemKey, qty);
        scene.spawnDropEffect(monster.x, monster.y, drop.itemKey);
      }
    });
  }

  // 분열 처리 (흡혈 슬라임)
  if (data.canSplit && monster.hp <= 0 && !monster._hasSplit) {
    monster._hasSplit = true;
    _splitSlime(scene, monster);
  }

  // 누적 처치 카운터 (필드 보스·헌터 제외)
  if (!monster.isFieldBoss && !monster._isHunter) {
    scene._killCount++;
    if (scene._killCount % 25 === 0) {
      scene.time.delayedCall(800, () => _spawnHunterMonster(scene));
    }
  }

  scene.events.emit('statsChanged', scene.player);
}

// ── 엘리트화 ──────────────────────────────────────────────
function _makeElite(monster) {
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

// ── 누적 처치 특별 몬스터 소환 ────────────────────────────
function _spawnHunterMonster(scene) {
  const lastWaveIdx = HUNTER_WAVES.length - 1;
  const waveIdx     = Math.min(scene._hunterWaveIdx, lastWaveIdx);
  const template    = HUNTER_WAVES[waveIdx];

  // 웨이브 4(군주) 반복 시 배율 누적
  const repeatBonus = scene._hunterWaveIdx > lastWaveIdx
    ? 1 + (scene._hunterWaveIdx - lastWaveIdx) * 0.3
    : 1;

  const baseMonster = MONSTER_DATA.shadow_knight;
  const monsterData = {
    ...baseMonster,
    key:            `hunter_${scene._hunterWaveIdx}`,
    name:           template.name,
    baseHp:         Math.floor(baseMonster.baseHp * template.hpMult  * repeatBonus),
    baseDamage:     Math.floor(baseMonster.baseDamage * template.dmgMult * repeatBonus),
    speed:          Math.floor(baseMonster.speed * template.speedMult),
    defense:        template.defense,
    magicResist:    template.magicResist,
    xpReward:       Math.floor(template.xpReward * repeatBonus),
    goldReward:     {
      min: Math.floor(template.goldReward.min * repeatBonus),
      max: Math.floor(template.goldReward.max * repeatBonus),
    },
    defenseState:   template.defenseState ?? null,
    dropTable:      template.dropTable,
    texture:        template.texture,
    attackRange:    60,
    attackCooldown: 900,
    aggroRange:     350,
    drainRate:      0.25,
    drainType:      'normal',
    patterns:       [],
  };

  // 플레이어 주변 500~700px 거리에 스폰
  let x, y, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Phaser.Math.Between(500, 700);
    x = Phaser.Math.Clamp(scene.player.x + Math.cos(angle) * dist, 100, MAP_W - 100);
    y = Phaser.Math.Clamp(scene.player.y + Math.sin(angle) * dist, 100, MAP_H - 100);
  } while (++tries < 20 && Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y) < 400);

  const hunter = new Monster(scene, x, y, monsterData);
  hunter.target    = scene.player;
  hunter._isHunter = true;
  hunter.setTint(template.tint);
  hunter.setScale(1.5);
  hunter.nameText.setText(`💀 ${template.name}`);
  hunter.nameText.setStyle({ fontSize: '12px', fill: '#ff4444', stroke: '#000', strokeThickness: 3 });
  scene.monsters.add(hunter);

  // 등장 연출
  scene.showFloatText(scene.player.x, scene.player.y - 80,
    `⚠ ${template.name} 출현! (${scene._killCount}킬)`, '#ff4444', '18px');
  scene.cameras.main.shake(300, 0.008);

  scene._hunterWaveIdx++;
}

// ── 슬라임 분열 ────────────────────────────────────────────
function _splitSlime(scene, parent) {
  for (let i = 0; i < 2; i++) {
    const offset = 40;
    const sx = parent.x + (i === 0 ? -offset : offset);
    const sy = parent.y;
    const splitData = {
      ...MONSTER_DATA.blood_slime,
      baseHp:     Math.floor(MONSTER_DATA.blood_slime.baseHp / 2),
      baseDamage: Math.floor(MONSTER_DATA.blood_slime.baseDamage * 0.7),
      xpReward:   Math.floor(MONSTER_DATA.blood_slime.xpReward / 2),
      canSplit:   false,
    };
    const baby = spawnMonster(scene, 'blood_slime');
    if (baby) {
      baby.setPosition(sx, sy);
      baby.maxHp = splitData.baseHp;
      baby.hp    = splitData.baseHp;
      baby.monsterData = splitData;
    }
  }
}
