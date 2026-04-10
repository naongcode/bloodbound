// SaveSystem — 멀티캐릭터 세이브/로드
import { calcMaxHp, calcMaxMp } from '../data/jobs.js';
import AuthManager from './AuthManager.js';

const CHARS_KEY  = 'bloodbound_chars_v1';
const LEGACY_KEY = 'bloodbound_v1';
export const MAX_CHARS = 5;

export default class SaveSystem {

  static _newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ── 전체 캐릭터 목록 (로컬, 동기) ──────────────────────────
  static loadAllCharsSync() {
    try {
      const raw = localStorage.getItem(CHARS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch {}

    // 구형 단일 세이브 마이그레이션
    try {
      const oldRaw = localStorage.getItem(LEGACY_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        if (old && old.jobKey) {
          const migrated = [{ ...old, charId: this._newId(), savedAt: Date.now() }];
          this._saveAllCharsLocal(migrated);
          localStorage.removeItem(LEGACY_KEY);
          return migrated;
        }
      }
    } catch {}

    return [];
  }

  static _saveAllCharsLocal(chars) {
    try { localStorage.setItem(CHARS_KEY, JSON.stringify(chars)); } catch {}
  }

  // ── 캐릭터 생성 (슬롯 추가만, 게임 시작 전) ─────────────────
  static createChar(jobKey) {
    const chars = this.loadAllCharsSync();
    if (chars.length >= MAX_CHARS) return null;
    const charId = this._newId();
    chars.push({ charId, jobKey, level: 1, savedAt: Date.now() });
    this._saveAllCharsLocal(chars);
    return charId;
  }

  // ── 저장 ──────────────────────────────────────────────────
  static async saveChar(charId, player) {
    if (!charId) return false;
    const chars = this.loadAllCharsSync();
    const data = {
      charId,
      jobKey:      player.jobKey,
      level:       player.level,
      xp:          player.xp,
      hp:          player.hp,
      mp:          player.mp,
      stats:       { ...player.stats },
      baseStats:   { ...player.baseStats },
      skillPoints: player.skillPoints,
      gold:        player.inventory.gold,
      slots:       player.inventory.slots,
      equipment:   player.inventory.equipment,
      savedAt:     Date.now(),
    };
    const idx = chars.findIndex(c => c.charId === charId);
    if (idx >= 0) chars[idx] = data;
    else chars.push(data);
    this._saveAllCharsLocal(chars);

    if (AuthManager.isLoggedIn()) {
      await AuthManager.saveGameData({ characters: chars }, player.jobKey).catch(() => {});
    }
    return true;
  }

  // ── 로드 (동기, 로컬) ──────────────────────────────────────
  static loadCharSync(charId) {
    return this.loadAllCharsSync().find(c => c.charId === charId) ?? null;
  }

  // ── 로드 (비동기, 클라우드 우선) ───────────────────────────
  static async loadChar(charId) {
    if (AuthManager.isLoggedIn()) {
      try {
        const cloudData = await AuthManager.loadGameData();
        if (cloudData?.characters) {
          this._saveAllCharsLocal(cloudData.characters);
          return cloudData.characters.find(c => c.charId === charId) ?? null;
        }
      } catch (e) {
        console.warn('[SaveSystem] 클라우드 로드 실패:', e);
      }
    }
    return this.loadCharSync(charId);
  }

  // ── 삭제 ──────────────────────────────────────────────────
  static async deleteChar(charId) {
    const chars = this.loadAllCharsSync().filter(c => c.charId !== charId);
    this._saveAllCharsLocal(chars);
    if (AuthManager.isLoggedIn()) {
      await AuthManager.saveGameData(
        { characters: chars },
        chars[0]?.jobKey ?? 'warrior'
      ).catch(() => {});
    }
  }

  // ── 세이브 존재 여부 ───────────────────────────────────────
  static hasSave() {
    return this.loadAllCharsSync().length > 0;
  }

  // ── 플레이어에 세이브 데이터 적용 ─────────────────────────
  static apply(player, data, inventorySystem) {
    // stats 없는 신규 캐릭터 스텁은 무시 (기본 장비 경로로 fallback)
    if (!data || !data.stats) return;
    player.level       = data.level       ?? 1;
    player.xp          = data.xp          ?? 0;
    player.stats       = { ...data.stats };
    player.baseStats   = { ...(data.baseStats ?? data.stats) };
    player.skillPoints = data.skillPoints ?? 0;

    player.inventory.gold      = data.gold      ?? 0;
    player.inventory.slots     = data.slots     ?? new Array(30).fill(null);
    player.inventory.equipment = data.equipment ?? {};

    player.maxHp = calcMaxHp(player.jobData, player.stats, player.level);
    player.maxMp = calcMaxMp(player.jobData, player.stats, player.level);
    player.hp    = Math.min(data.hp ?? player.maxHp, player.maxHp);
    player.mp    = Math.min(data.mp ?? player.maxMp, player.maxMp);

    inventorySystem.recalcStats(player);
  }
}
