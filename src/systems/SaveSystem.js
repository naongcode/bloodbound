// SaveSystem — 세이브/로드 (Supabase 우선, localStorage 캐시)
import { calcMaxHp, calcMaxMp } from '../data/jobs.js';
import AuthManager from './AuthManager.js';

const CACHE_KEY = 'bloodbound_v1';

export default class SaveSystem {

  // ── 저장 ──────────────────────────────────────────
  static async save(player) {
    const data = {
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
    };

    // localStorage 캐시 (오프라인 대비)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}

    // Supabase 저장 (로그인된 경우)
    if (AuthManager.isLoggedIn()) {
      await AuthManager.saveGameData(data, player.jobKey);
    }

    return true;
  }

  // ── 로드 ──────────────────────────────────────────
  static async load() {
    // Supabase 우선
    if (AuthManager.isLoggedIn()) {
      const cloudData = await AuthManager.loadGameData();
      if (cloudData && Object.keys(cloudData).length > 0) {
        // 클라우드 데이터를 로컬 캐시에도 동기화
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cloudData)); } catch {}
        return cloudData;
      }
    }

    // 로컬 캐시 폴백
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ── 저장 여부 확인 ────────────────────────────────
  static hasSave() {
    if (AuthManager.isLoggedIn()) return AuthManager.hasSaveData();
    return !!localStorage.getItem(CACHE_KEY);
  }

  // ── 삭제 ──────────────────────────────────────────
  static deleteSave() {
    localStorage.removeItem(CACHE_KEY);
    // Supabase는 빈 객체로 덮어씀 (행 삭제 대신)
    if (AuthManager.isLoggedIn()) {
      AuthManager.saveGameData({}, AuthManager.getJobKey());
    }
  }

  // ── 플레이어에 세이브 데이터 적용 (동기, 기존과 동일) ──
  static apply(player, data, inventorySystem) {
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
