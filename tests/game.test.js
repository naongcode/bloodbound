/**
 * Bloodbound Realm — 순수 로직 유닛 테스트
 * 실행: node tests/game.test.js
 * Phaser 불필요 — 순수 JS 로직만 검증
 */

import { JOB_DATA, BASE_STATS, calcMaxHp, calcMaxMp, getRequiredXP } from '../src/data/jobs.js';
import { ITEM_DATA, ITEM_SLOTS } from '../src/data/items.js';
import CombatSystem from '../src/systems/CombatSystem.js';
import LevelSystem from '../src/systems/LevelSystem.js';
import InventorySystem from '../src/systems/InventorySystem.js';

// ─── 테스트 헬퍼 ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅ ${label} → ${actual}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} → actual: ${actual}, expected: ${expected}`);
    failed++;
  }
}

function assertRange(actual, min, max, label) {
  const ok = actual >= min && actual <= max;
  if (ok) {
    console.log(`  ✅ ${label} → ${actual} (범위 ${min}~${max})`);
    passed++;
  } else {
    console.error(`  ❌ ${label} → actual: ${actual}, expected range: ${min}~${max}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

// ─── Phaser mock (최소한) ─────────────────────────────────────────────────────

const mockScene = {
  events: { emit: () => {} },
};

// ─── 플레이어 mock 생성 헬퍼 ─────────────────────────────────────────────────

function makePlayer(jobKey = 'warrior') {
  const jobData = JOB_DATA[jobKey];
  const stats   = { ...BASE_STATS };
  return {
    jobKey,
    jobData,
    level:       1,
    xp:          0,
    skillPoints: 0,
    stats:       { ...BASE_STATS },
    baseStats:   { ...BASE_STATS },
    totalStats:  { ...BASE_STATS },
    maxHp: calcMaxHp(jobData, stats, 1),
    maxMp: calcMaxMp(jobData, stats, 1),
    hp:    calcMaxHp(jobData, stats, 1),
    mp:    calcMaxMp(jobData, stats, 1),
    inventory: {
      slots:     new Array(30).fill(null),
      equipment: Object.fromEntries(Object.values(ITEM_SLOTS).map(s => [s, null])),
      gold:      0,
    },
    isAlive:      true,
    statusEffects: [],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. jobs.js — 순수 함수
// ═════════════════════════════════════════════════════════════════════════════

section('jobs.js — 기본 수식');

assertEqual(getRequiredXP(1), 100, 'Lv1 필요 XP = 100');
assertEqual(getRequiredXP(2), Math.floor(100 * Math.pow(2, 1.8)), 'Lv2 필요 XP 공식 검증');
assert(getRequiredXP(10) > getRequiredXP(9), 'XP 필요량은 레벨이 높을수록 증가');

const warrior = JOB_DATA.warrior;
assertEqual(
  calcMaxHp(warrior, { VIT: 10 }, 1),
  500 + 10 * 20 + 1 * 50,
  '전사 Lv1 MaxHP = baseHp + VIT*20 + level*50'
);
assertEqual(
  calcMaxMp(warrior, { WIS: 10 }, 1),
  100 + 10 * 15 + 1 * 20,
  '전사 Lv1 MaxMP = baseMp + WIS*15 + level*20'
);

// 레벨 20에서의 스탯 증가 검증
const highLvStats = { VIT: 60, WIS: 20 };
assert(
  calcMaxHp(warrior, highLvStats, 20) > calcMaxHp(warrior, { VIT: 10 }, 1),
  'HP는 레벨/스탯 증가에 따라 증가'
);

// ═════════════════════════════════════════════════════════════════════════════
// 2. CombatSystem — 데미지 계산
// ═════════════════════════════════════════════════════════════════════════════

section('CombatSystem — 데미지 계산');

const combat = new CombatSystem(mockScene);

// 기본 물리 데미지
const attacker = { totalStats: { STR: 20, AGI: 10, attackPower: 30 } };
const target   = { totalStats: { defense: 0 }, stats: { defense: 0 }, level: 1 };

// 1000번 반복으로 분포 확인
let results = [];
for (let i = 0; i < 1000; i++) {
  results.push(combat.calcPhysicalDamage(attacker, target).damage);
}
const minDmg = Math.min(...results);
const maxDmg = Math.max(...results);

assert(minDmg >= 1, `물리 데미지 최솟값 ≥ 1 (actual: ${minDmg})`);
assert(maxDmg > minDmg, '데미지에 랜덤 분산 존재');

// 방어력이 높을수록 피해 감소
const strongTarget  = { totalStats: { defense: 100 }, stats: { defense: 100 }, level: 1 };
const weakTarget    = { totalStats: { defense: 0   }, stats: { defense: 0   }, level: 1 };
const dmgVsStrong   = combat.calcPhysicalDamage(attacker, strongTarget).damage;
const dmgVsWeak     = combat.calcPhysicalDamage(attacker, weakTarget).damage;
assert(dmgVsStrong < dmgVsWeak, `방어력 있으면 피해 감소 (${dmgVsStrong} < ${dmgVsWeak})`);

// 치명타 발생 확인 — AGI=2000 → critChance = min(0.6, 2000×0.0005) = 0.6(60% 상한)
const highAgiAttacker = { totalStats: { STR: 20, AGI: 2000, attackPower: 0 } };
let critCount = 0;
for (let i = 0; i < 300; i++) {
  if (combat.calcPhysicalDamage(highAgiAttacker, weakTarget).isCrit) critCount++;
}
// 기대값 300×0.6=180, 최소 130 이상이면 통계적으로 안전
assert(critCount >= 130, `AGI 2000 → 60% 상한 치명타 → 300번 중 ${critCount}번`);

// ─── 흡혈 계산 ──────────────────────────────────────────────────────────────

section('CombatSystem — 흡혈(calcDrain)');

const drain0   = combat.calcDrain(100, 0.3, 0);    // RES=0
const drainHi  = combat.calcDrain(100, 0.3, 9999);  // RES 극대

assertEqual(drain0, Math.floor(100 * 0.3), 'RES=0이면 흡혈 감소 없음 → damage*rate');
assert(drainHi < drain0, `RES가 높으면 흡혈 감소 (${drainHi} < ${drain0})`);
assert(drainHi >= 0,     '흡혈량은 음수가 되지 않음');

// ─── 마법 데미지 ────────────────────────────────────────────────────────────

section('CombatSystem — 마법 데미지');

const mageAtk  = { totalStats: { INT: 50, AGI: 5 } };
const magicDmg = combat.calcMagicDamage(mageAtk, weakTarget, 100);
assert(magicDmg.damage >= 1, `마법 데미지 ≥ 1 (actual: ${magicDmg.damage})`);

const magicResTarget = { totalStats: { magicResist: 500 }, stats: {}, level: 1 };
const dmgNoRes  = combat.calcMagicDamage(mageAtk, weakTarget,    100).damage;
const dmgWithRes = combat.calcMagicDamage(mageAtk, magicResTarget, 100).damage;
assert(dmgWithRes < dmgNoRes, `마법 저항 있으면 피해 감소 (${dmgWithRes} < ${dmgNoRes})`);

// ─── 힐 계산 ────────────────────────────────────────────────────────────────

section('CombatSystem — 힐(calcHeal)');

const healer = { totalStats: { WIS: 40 } };
const heal   = combat.calcHeal(healer, 50, 1.0);
assertEqual(heal, Math.floor(40 * 3.5 + 50), '힐량 = WIS*3.5 + skillBase');

// ═════════════════════════════════════════════════════════════════════════════
// 3. LevelSystem — 경험치/레벨업
// ═════════════════════════════════════════════════════════════════════════════

section('LevelSystem — 경험치/레벨업');

const levelSys = new LevelSystem(mockScene);
const p1 = makePlayer('warrior');

// XP 소량 획득 → 레벨업 없음
const r1 = levelSys.gainXP(p1, { base: 10, sourceLevel: 1 });
assertEqual(r1.leveledUp, false, 'XP 소량 획득 → 레벨업 없음');
assertEqual(p1.xp, 10, 'XP 10 누적');
assertEqual(p1.level, 1, '레벨 여전히 1');

// XP 대량 획득 → 레벨업
const p2 = makePlayer('warrior');
const r2 = levelSys.gainXP(p2, { base: 200, sourceLevel: 1 }); // Lv1 필요 XP = 100
assertEqual(r2.leveledUp, true, 'XP 200 획득 → 레벨업');
assertEqual(p2.level, 2, '레벨 2로 상승');
assert(p2.xp < getRequiredXP(2), '레벨업 후 잉여 XP가 이월됨');
assert(p2.maxHp > calcMaxHp(JOB_DATA.warrior, BASE_STATS, 1), '레벨업 후 MaxHP 증가');

// 연속 레벨업
const p3 = makePlayer('archer');
levelSys.gainXP(p3, { base: 9999, sourceLevel: 1 });
assert(p3.level >= 5, `대량 XP → 연속 레벨업 (실제: Lv${p3.level})`);

// ═════════════════════════════════════════════════════════════════════════════
// 4. InventorySystem — 아이템/장비
// ═════════════════════════════════════════════════════════════════════════════

section('InventorySystem — addItem / equip');

const invSys = new InventorySystem(mockScene);
const p4 = makePlayer('warrior');

// 아이템 추가
invSys.addItem(p4.inventory, 'iron_sword');
assert(p4.inventory.slots[0] !== null,       '슬롯 0에 iron_sword 추가됨');
assertEqual(p4.inventory.slots[0].key, 'iron_sword', '슬롯 0 아이템 키 확인');

invSys.addItem(p4.inventory, 'leather_armor');
assert(p4.inventory.slots[1] !== null, '슬롯 1에 leather_armor 추가됨');

// 포션 스택 확인
invSys.addItem(p4.inventory, 'hp_potion_small', 5);
invSys.addItem(p4.inventory, 'hp_potion_small', 3);
assertEqual(p4.inventory.slots[2].quantity, 8, '포션 스택 합산 5+3=8');

// 장비 장착 — Bug 1 검증 (iron_sword)
const ok0 = invSys.equip(p4, 0);
assertEqual(ok0, true,                          'slot[0] iron_sword 장착 성공');
assertEqual(p4.inventory.equipment.weapon?.key, 'iron_sword', 'weapon 슬롯에 iron_sword');
assert(p4.inventory.slots[0] === null,          '장착 후 slot[0] = null');

// ★ Bug 1 검증: slot[0]은 이미 null, slot[1]에 leather_armor
// 수정 전에는 equip(p4, 0) 두 번 호출로 leather_armor 미장착 버그가 있었음
const slot1Item = p4.inventory.slots[1];
assert(slot1Item?.key === 'leather_armor', 'slot[1]에 leather_armor 존재 확인');

const ok1 = invSys.equip(p4, 1); // ← 수정 후: slot 1 지정
assertEqual(ok1, true,                          'slot[1] leather_armor 장착 성공');
assertEqual(p4.inventory.equipment.armor?.key, 'leather_armor', 'armor 슬롯에 leather_armor');

// 스탯 재계산 확인 (iron_sword: STR+5, attackPower+20 / leather_armor: VIT+5, defense+10)
assert(p4.totalStats.STR > BASE_STATS.STR,  '장비 후 STR 증가');
assert(p4.totalStats.VIT > BASE_STATS.VIT,  '장비 후 VIT 증가');

// 장비 해제
invSys.unequip(p4, 'weapon');
assert(p4.inventory.equipment.weapon === null, '해제 후 weapon = null');
const emptySlot = p4.inventory.slots.findIndex(s => s?.key === 'iron_sword');
assert(emptySlot !== -1, '해제된 iron_sword가 인벤토리로 복귀');

// ─── 강화 ────────────────────────────────────────────────────────────────────

section('InventorySystem — 강화(enhance)');

const p5 = makePlayer('warrior');
invSys.addItem(p5.inventory, 'iron_sword');
invSys.equip(p5, 0);
p5.inventory.gold = 1000;

const prevSTR = p5.totalStats.STR;
const r5 = invSys.enhance(p5, 'weapon');
assert(r5.success !== undefined, '강화 결과 반환');
assertEqual(r5.cost, 100, '+1 강화 비용 = 100G');
assert(p5.inventory.gold <= 900, '강화 비용 차감됨');

// +3 강화 → 성공률 100%
const p6 = makePlayer('warrior');
invSys.addItem(p6.inventory, 'iron_sword');
invSys.equip(p6, 0);
p6.inventory.gold = 999999;
for (let i = 0; i < 3; i++) invSys.enhance(p6, 'weapon');
assertEqual(p6.inventory.equipment.weapon.enhance, 3, '+3까지 성공률 100%로 강화됨');

// +5 최대치 이후 실패
for (let i = 0; i < 10; i++) invSys.enhance(p6, 'weapon'); // 5가 최대
assert(p6.inventory.equipment.weapon.enhance <= 5, '강화 최대치 +5 초과 불가');

// ─── 인벤토리 가득 찬 경우 ────────────────────────────────────────────────────

section('InventorySystem — 인벤토리 꽉 참');

const p7 = makePlayer('warrior');
// 30칸 모두 채우기
for (let i = 0; i < 30; i++) {
  p7.inventory.slots[i] = { key: 'filler', type: 'material' };
}
const overflowResult = invSys.addItem(p7.inventory, 'iron_sword');
assertEqual(overflowResult, false, '인벤토리 가득 차면 addItem 실패');

// ─── 소모품 사용 ─────────────────────────────────────────────────────────────

section('InventorySystem — 소모품 사용');

const p8 = makePlayer('warrior');
invSys.addItem(p8.inventory, 'hp_potion_small', 3);
p8.hp = 100; // HP 낮춤

invSys.useItem(p8, 0);
assert(p8.hp > 100, `HP 포션 사용 후 HP 회복 (${p8.hp})`);
assertEqual(p8.inventory.slots[0].quantity, 2, '포션 수량 3→2 감소');

// ═════════════════════════════════════════════════════════════════════════════
// 결과 요약
// ═════════════════════════════════════════════════════════════════════════════

const total = passed + failed;
console.log(`\n${'═'.repeat(56)}`);
console.log(`테스트 결과: ${passed}/${total} 통과  |  실패: ${failed}`);
console.log('═'.repeat(56));

if (failed > 0) process.exit(1);
