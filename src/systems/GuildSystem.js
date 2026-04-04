// GuildSystem — 길드 데이터 관리 (localStorage 기반)
import { GUILD_LEVEL_DATA, GUILD_QUEST_POOL, GUILD_BUFFS, GUILD_CREATE_REQUIREMENTS } from '../data/guilds.js';

const SAVE_KEY = 'bloodbound_guild_v1';

export default class GuildSystem {
  constructor() {
    this.guild = null; // 현재 가입한 길드 데이터
    this._load();
  }

  // ── 저장 / 로드 ──────────────────────────────
  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) this.guild = JSON.parse(raw);
    } catch { this.guild = null; }
    this._refreshDailyQuests();
  }

  _save() {
    if (this.guild) localStorage.setItem(SAVE_KEY, JSON.stringify(this.guild));
  }

  // ── 길드 생성 ────────────────────────────────
  create(player, guildName) {
    if (this.guild) return { ok: false, reason: '이미 길드에 가입되어 있습니다.' };
    if (player.level < GUILD_CREATE_REQUIREMENTS.minLevel)
      return { ok: false, reason: `레벨 ${GUILD_CREATE_REQUIREMENTS.minLevel} 이상이어야 합니다.` };
    if (player.inventory.gold < GUILD_CREATE_REQUIREMENTS.goldCost)
      return { ok: false, reason: `골드 ${GUILD_CREATE_REQUIREMENTS.goldCost.toLocaleString()} G가 필요합니다.` };

    player.inventory.gold -= GUILD_CREATE_REQUIREMENTS.goldCost;

    this.guild = {
      name:         guildName.trim(),
      level:        1,
      exp:          0,
      fund:         0,
      contribution: 0,
      members:      [{ name: player.jobData?.name ?? '???', role: '길드마스터', joinedAt: Date.now() }],
      warehouse:    new Array(30).fill(null),
      activeBuff:   null,
      dailyQuests:  [],
      questProgress:{},
      lastQuestDate:'',
    };

    this._refreshDailyQuests();
    this._save();
    return { ok: true };
  }

  // ── 길드 가입 (서버 연동용 — 로컬에서는 NPC 자동 가입) ──
  joinNPC(guildName) {
    if (this.guild) return { ok: false, reason: '이미 길드에 가입되어 있습니다.' };
    this.guild = {
      name:         guildName,
      level:        1,
      exp:          0,
      fund:         0,
      contribution: 0,
      members:      [{ name: '나', role: '신입', joinedAt: Date.now() }],
      warehouse:    new Array(30).fill(null),
      activeBuff:   null,
      dailyQuests:  [],
      questProgress:{},
      lastQuestDate:'',
    };
    this._refreshDailyQuests();
    this._save();
    return { ok: true };
  }

  // ── 길드 탈퇴 ────────────────────────────────
  leave() {
    this.guild = null;
    localStorage.removeItem(SAVE_KEY);
  }

  hasGuild() { return !!this.guild; }

  // ── 길드 레벨업 ──────────────────────────────
  addExp(amount) {
    if (!this.guild) return;
    this.guild.exp += amount;
    this.guild.contribution += Math.floor(amount * 0.5);

    // 레벨업 체크
    const nextData = GUILD_LEVEL_DATA.find(d => d.level === this.guild.level + 1);
    if (nextData && this.guild.exp >= nextData.expNeeded) {
      this.guild.level += 1;
      this._save();
      return { levelUp: true, newLevel: this.guild.level };
    }
    this._save();
    return { levelUp: false };
  }

  // ── 현재 레벨 혜택 ───────────────────────────
  getPerks() {
    const lv = this.guild?.level ?? 0;
    // GUILD_LEVEL_DATA에서 현재 레벨 이하 중 가장 높은 항목 선택
    const data = [...GUILD_LEVEL_DATA].reverse().find(d => d.level <= lv)
      ?? GUILD_LEVEL_DATA[0];
    return {
      goldBonus:  data.goldBonus  ?? 0,
      dropBonus:  data.dropBonus  ?? 0,
      xpBonus:    data.xpBonus    ?? 0,
      speedBonus: data.speedBonus ?? 0,
    };
  }

  // 버프 포함 최종 혜택
  getEffectivePerks() {
    const base = this.getPerks();
    const buff = this.guild?.activeBuff;
    if (!buff || buff.expiresAt < Date.now()) {
      if (buff) { this.guild.activeBuff = null; this._save(); }
      return base;
    }
    const e = buff.effect ?? {};
    return {
      goldBonus:    (base.goldBonus  || 0) + (e.goldBonus  || 0),
      dropBonus:    (base.dropBonus  || 0) + (e.dropBonus  || 0),
      xpBonus:      (base.xpBonus   || 0) + (e.xpBonus    || 0),
      speedBonus:   (base.speedBonus || 0) + (e.speedBonus || 0),
      attackBonus:  e.attackBonus  ?? 0,
      defenseBonus: e.defenseBonus ?? 0,
      skillCdBonus: e.skillCdBonus ?? 0,
    };
  }

  // ── 길드 버프 발동 ───────────────────────────
  activateBuff(buffKey, guildFund) {
    const buff = GUILD_BUFFS.find(b => b.key === buffKey);
    if (!buff) return { ok: false, reason: '존재하지 않는 버프' };
    if (!this.guild) return { ok: false, reason: '길드 없음' };
    if (this.guild.fund < buff.cost) return { ok: false, reason: `길드 자금 부족 (${buff.cost.toLocaleString()} G 필요)` };

    this.guild.fund -= buff.cost;
    this.guild.activeBuff = {
      ...buff,
      activatedAt: Date.now(),
      expiresAt:   Date.now() + buff.duration,
    };
    this._save();
    return { ok: true, buff };
  }

  // ── 길드 자금 기부 ───────────────────────────
  donate(player, amount) {
    if (!this.guild) return { ok: false };
    if (player.inventory.gold < amount) return { ok: false, reason: '골드 부족' };
    player.inventory.gold -= amount;
    this.guild.fund += amount;
    // 기부 기여도 (1000G당 50)
    this.guild.contribution += Math.floor(amount / 1000) * 50;
    this._save();
    return { ok: true };
  }

  // ── 일일 퀘스트 ──────────────────────────────
  _refreshDailyQuests() {
    if (!this.guild) return;
    const today = new Date().toDateString();
    if (this.guild.lastQuestDate === today) return;

    // 매일 3개 랜덤 선택
    const shuffled = [...GUILD_QUEST_POOL].sort(() => Math.random() - 0.5);
    this.guild.dailyQuests  = shuffled.slice(0, 3);
    this.guild.questProgress = {};
    this.guild.lastQuestDate = today;
    this._save();
  }

  getDailyQuests() { return this.guild?.dailyQuests ?? []; }
  getQuestProgress(id) { return this.guild?.questProgress[id] ?? 0; }

  // 퀘스트 진행도 갱신 (게임 씬에서 호출)
  progressQuest(type, target, amount = 1) {
    if (!this.guild) return;
    const quests = this.guild.dailyQuests ?? [];
    let changed = false;
    quests.forEach(q => {
      if (q.type !== type) return;
      if (type === 'kill' && q.target !== target) return;
      const id  = q.id;
      const cur = this.guild.questProgress[id] ?? 0;
      if (cur >= q.count) return; // 이미 완료
      this.guild.questProgress[id] = Math.min(q.count, cur + amount);
      changed = true;
    });
    if (changed) this._save();
  }

  // 퀘스트 완료 보상 수령
  claimQuest(player, questId) {
    if (!this.guild) return { ok: false };
    const quest = (this.guild.dailyQuests ?? []).find(q => q.id === questId);
    if (!quest) return { ok: false, reason: '퀘스트 없음' };
    if ((this.guild.questProgress[questId] ?? 0) < quest.count)
      return { ok: false, reason: '아직 완료되지 않았습니다.' };
    // 이미 수령했으면 questProgress를 -1로 표시
    if (this.guild.questProgress[questId] === -1)
      return { ok: false, reason: '이미 보상을 수령했습니다.' };

    player.inventory.gold += quest.goldReward;
    this.addExp(quest.guildXp);
    this.guild.questProgress[questId] = -1; // 수령 완료 표시
    this._save();
    return { ok: true, goldReward: quest.goldReward, guildXp: quest.guildXp };
  }

  // ── 길드 창고 ────────────────────────────────
  warehouseDeposit(player, slotIndex) {
    if (!this.guild) return false;
    const item = player.inventory.slots[slotIndex];
    if (!item) return false;

    const emptyIdx = this.guild.warehouse.findIndex(s => s === null);
    if (emptyIdx === -1) return false;

    this.guild.warehouse[emptyIdx] = { ...item };
    player.inventory.slots[slotIndex] = null;
    this._save();
    return true;
  }

  warehouseWithdraw(player, warehouseIdx) {
    if (!this.guild) return false;
    const item = this.guild.warehouse[warehouseIdx];
    if (!item) return false;

    const emptySlot = player.inventory.slots.findIndex(s => s === null);
    if (emptySlot === -1) return false;

    player.inventory.slots[emptySlot] = { ...item };
    this.guild.warehouse[warehouseIdx] = null;
    this._save();
    return true;
  }

  getWarehouse() { return this.guild?.warehouse ?? []; }
}

// 싱글턴
export const guildSystem = new GuildSystem();
