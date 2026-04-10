import { ITEM_DATA, ITEM_SLOTS } from '../data/items.js';
import { calcMaxHp, calcMaxMp, calcMoveSpeed } from '../data/jobs.js';

const INVENTORY_SIZE = 48;

export default class InventorySystem {
  constructor(scene) {
    this.scene = scene;
  }

  // 초기 인벤토리 상태
  createInventory() {
    return {
      slots: new Array(INVENTORY_SIZE).fill(null),
      equipment: Object.fromEntries(Object.values(ITEM_SLOTS).map(s => [s, null])),
      gold: 0,
    };
  }

  // 아이템 추가 (드롭/획득)
  addItem(inventory, itemKey, quantity = 1) {
    const template = ITEM_DATA[itemKey];
    if (!template) return false;

    if (template.stackable) {
      // 기존 스택에 추가
      const existing = inventory.slots.findIndex(s => s && s.key === itemKey);
      if (existing !== -1) {
        inventory.slots[existing].quantity = Math.min(
          template.maxStack,
          inventory.slots[existing].quantity + quantity
        );
        this.scene.events.emit('inventoryChanged', inventory);
        return true;
      }
    }

    // 빈 슬롯에 추가
    const empty = inventory.slots.findIndex(s => s === null);
    if (empty === -1) return false; // 인벤토리 가득 참

    inventory.slots[empty] = {
      ...template,
      quantity,
      enhance: 0,       // 강화 단계
      randomOptions: [] // 희귀 이상 장비의 랜덤 옵션
    };

    this.scene.events.emit('inventoryChanged', inventory);
    return true;
  }

  // 장비 착용
  equip(player, slotIndex) {
    const item = player.inventory.slots[slotIndex];
    if (!item || item.type !== 'equipment') return false;
    if (item.requiredLevel && player.level < item.requiredLevel) return false;

    const slot = item.slot;
    const current = player.inventory.equipment[slot];

    // 기존 장비 인벤토리로 반환
    if (current) {
      const emptyIdx = player.inventory.slots.findIndex(s => s === null);
      if (emptyIdx === -1) return false;
      player.inventory.slots[emptyIdx] = current;
    }

    // 장착
    player.inventory.equipment[slot] = item;
    player.inventory.slots[slotIndex] = null;

    // 스탯 재계산
    this.recalcStats(player);
    this.scene.events.emit('equipmentChanged', player);
    return true;
  }

  // 장비 해제
  unequip(player, slot) {
    const item = player.inventory.equipment[slot];
    if (!item) return false;

    const emptyIdx = player.inventory.slots.findIndex(s => s === null);
    if (emptyIdx === -1) return false;

    player.inventory.slots[emptyIdx] = item;
    player.inventory.equipment[slot] = null;

    this.recalcStats(player);
    this.scene.events.emit('equipmentChanged', player);
    return true;
  }

  // 소모품 사용
  useItem(player, slotIndex) {
    const item = player.inventory.slots[slotIndex];
    if (!item || item.type !== 'consumable') return false;

    const now = Date.now();
    if (item._lastUsed && now - item._lastUsed < item.cooldown) return false;

    const effect = item.effect;
    if (effect.type === 'heal_hp') {
      player.hp = Math.min(player.maxHp, player.hp + effect.amount);
      this.scene.events.emit('playerHealed', { player, amount: effect.amount });
    } else if (effect.type === 'heal_mp') {
      player.mp = Math.min(player.maxMp, player.mp + effect.amount);
    }

    item._lastUsed = now;
    item.quantity -= 1;
    if (item.quantity <= 0) player.inventory.slots[slotIndex] = null;

    this.scene.events.emit('inventoryChanged', player.inventory);
    return true;
  }

  // 장비 강화 (+1 ~ +5)
  enhance(player, equipSlot) {
    const item = player.inventory.equipment[equipSlot];
    if (!item || item.type !== 'equipment') return { success: false, reason: 'no_item' };

    const level = item.enhance ?? 0;
    if (level >= 5) return { success: false, reason: 'max_level' };

    // 비용: 100 × 2^level (100, 200, 400, 800, 1600G)
    const cost = 100 * Math.pow(2, level);
    if (player.inventory.gold < cost) return { success: false, reason: 'no_gold', cost };

    player.inventory.gold -= cost;

    // 성공률: +1~3 100%, +4 80%, +5 60%
    const successRate = level < 3 ? 1.0 : level === 3 ? 0.8 : 0.6;
    const success = Math.random() < successRate;

    if (success) {
      item.enhance = level + 1;
      if (item.stats) {
        Object.keys(item.stats).forEach(k => {
          item.stats[k] = Math.ceil(item.stats[k] * 1.15);
        });
      }
      this.recalcStats(player);
    }

    this.scene.events.emit('equipmentChanged', player);
    return { success, cost, newLevel: item.enhance ?? level };
  }

  // 장비 반영 스탯 재계산
  recalcStats(player) {
    const base = { ...player.baseStats };
    Object.values(player.inventory.equipment).forEach(item => {
      if (!item || !item.stats) return;
      Object.entries(item.stats).forEach(([k, v]) => {
        base[k] = (base[k] || 0) + v;
      });
    });
    player.totalStats = base;

    // HP/MP 재계산 (착용 시 최대치만 갱신, 현재값은 유지 or 최대치 초과 방지)
    player.maxHp = calcMaxHp(player.jobData, player.totalStats, player.level);
    player.maxMp = calcMaxMp(player.jobData, player.totalStats, player.level);
    player.hp    = Math.min(player.hp, player.maxHp);
    player.mp    = Math.min(player.mp, player.maxMp);

    // 이동속도 재계산 (AGI + 장비 moveSpeed 보너스)
    player.moveSpeed = calcMoveSpeed(player.totalStats.AGI || 10)
                     + Math.floor(player.totalStats.moveSpeed || 0);
  }
}
