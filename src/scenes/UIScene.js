// HUD + 인벤토리 UI 씬 (GameScene 위에 오버레이)
import { ITEM_DATA, gradeColor, gradeHexColor } from '../data/items.js';
import SaveSystem from '../systems/SaveSystem.js';
import { getJobRankName } from '../systems/LevelSystem.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    this.player = this.gameScene.player;

    this.buildHUD();
    this.buildSkillBar();
    this.buildInventoryPanel();
    this.buildStatusPanel();

    // GameScene 이벤트 구독 (참조 보관 → shutdown 시 해제)
    this._cbStats = () => this.refreshAll();
    this._cbLevel = () => this.refreshAll();
    this._cbInv   = () => this.refreshInventory();
    this._cbEquip = () => this.refreshEquipment();
    this.gameScene.events.on('statsChanged',     this._cbStats);
    this.gameScene.events.on('levelUp',          this._cbLevel);
    this.gameScene.events.on('inventoryChanged', this._cbInv);
    this.gameScene.events.on('equipmentChanged', this._cbEquip);
    // statusApplied → updateStatusIcons()에서 매 프레임 동적 갱신

    // UIScene이 중지될 때 gameScene 이벤트에서 콜백 제거 (좀비 리스너 방지)
    this.events.on('shutdown', () => {
      this.gameScene.events.off('statsChanged',     this._cbStats);
      this.gameScene.events.off('levelUp',          this._cbLevel);
      this.gameScene.events.off('inventoryChanged', this._cbInv);
      this.gameScene.events.off('equipmentChanged', this._cbEquip);
    });

    // I 키 → 인벤토리 토글
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());
    // C 키 → 캐릭터 창 토글
    this.input.keyboard.on('keydown-C', () => this.toggleCharPanel());
    // ESC 키 → 설정 메뉴 토글
    this.input.keyboard.on('keydown-ESC', () => this.toggleSettings());
    // 1~4 키 → 포션 퀵슬롯
    this.input.keyboard.on('keydown-ONE',   () => this._useQuickPotion(0));
    this.input.keyboard.on('keydown-TWO',   () => this._useQuickPotion(1));
    this.input.keyboard.on('keydown-THREE', () => this._useQuickPotion(2));
    this.input.keyboard.on('keydown-FOUR',  () => this._useQuickPotion(3));

    this.inventoryOpen = false;
    this.charPanelOpen = false;
    this.shopOpen      = false;
    this.enhOpen       = false;
    this.settingsOpen  = false;

    // 포션 퀵슬롯 정의 (고정 순서)
    this._quickSlotDefs = [
      { key: 'hp_potion_small',  label: '1' },
      { key: 'hp_potion_medium', label: '2' },
      { key: 'hp_potion_large',  label: '3' },
      { key: 'mp_potion_small',  label: '4' },
    ];
    // 슬롯별 쿨타임 추적 (ms 단위 남은 시간)
    this._quickSlotCdLeft = [0, 0, 0, 0];
    this._quickSlotCdMax  = [5000, 5000, 8000, 5000];

    this.buildPotionBar();
    this.buildShopPanel();
    this.buildEnhancePanel();
    this.buildSettingsPanel();
  }

  // ════════════════════════════════════════════════
  // HUD (항상 표시)
  // ════════════════════════════════════════════════
  buildHUD() {
    const pad = 12;

    // ── HP 바 ──────────────────────────────────────
    this.add.text(pad, pad, 'HP', { fontSize: '13px', fill: '#e74c3c' });
    this.hpBarBg = this.add.rectangle(pad + 24, pad + 7, 200, 14, 0x333333).setOrigin(0, 0.5);
    this.hpBar   = this.add.rectangle(pad + 24, pad + 7, 200, 14, 0xe74c3c).setOrigin(0, 0.5);
    this.hpText  = this.add.text(pad + 232, pad, '', { fontSize: '12px', fill: '#ffffff' });

    // ── MP 바 ──────────────────────────────────────
    this.add.text(pad, pad + 20, 'MP', { fontSize: '13px', fill: '#3498db' });
    this.mpBarBg = this.add.rectangle(pad + 24, pad + 27, 200, 14, 0x333333).setOrigin(0, 0.5);
    this.mpBar   = this.add.rectangle(pad + 24, pad + 27, 200, 14, 0x3498db).setOrigin(0, 0.5);
    this.mpText  = this.add.text(pad + 232, pad + 20, '', { fontSize: '12px', fill: '#ffffff' });

    // ── XP 바 ──────────────────────────────────────
    this.xpBarBg = this.add.rectangle(pad, pad + 44, 256, 6, 0x222222).setOrigin(0, 0);
    this.xpBar   = this.add.rectangle(pad, pad + 44, 0,   6, 0xf1c40f).setOrigin(0, 0);

    // ── 레벨 + 직업 ────────────────────────────────
    this.levelText = this.add.text(pad, pad + 54, '', {
      fontSize: '14px', fill: '#f1c40f', fontStyle: 'bold'
    });

    // ── 골드 ───────────────────────────────────────
    this.goldText = this.add.text(pad, pad + 72, '', { fontSize: '13px', fill: '#f39c12' });

    // ── 상태이상 아이콘 (동적 풀) ───────────────────
    this._statusIconGfx  = this.add.graphics();
    this._statusIconPool = [];
    for (let i = 0; i < 5; i++) {
      this._statusIconPool.push(
        this.add.text(0, 0, '', {
          fontSize: '9px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setVisible(false)
      );
    }

    // ── 강화소 버튼 (스킬 슬롯 좌측) ───────────────
    const enhBtn = this.add.rectangle(556, 672, 62, 32, 0x1a0020)
      .setStrokeStyle(2, 0x9b59b6).setInteractive({ useHandCursor: true });
    this.add.text(556, 672, '강화소', { fontSize: '12px', fill: '#cccccc', fontStyle: 'bold' }).setOrigin(0.5);
    enhBtn.on('pointerover', () => enhBtn.setFillStyle(0x2a0040));
    enhBtn.on('pointerout',  () => enhBtn.setFillStyle(0x1a0020));
    enhBtn.on('pointerdown', () => this.toggleEnhance());

    // ── 조작법 힌트 ────────────────────────────────
    // 박스: 우하단 (1270, 710) 기준, 280×50 → top=660, center=685
    this.add.rectangle(1280 - 10, 720 - 10, 280, 50, 0x000000, 0.55)
      .setOrigin(1, 1);

    // setOrigin(1, 0.5) → y가 텍스트 세로 중앙 기준
    this.add.text(1280 - 18, 676,
      '[WASD] 이동  [클릭/SPACE] 발사  [Q] 스킬',
      { fontSize: '12px', fill: '#dddddd', stroke: '#000000', strokeThickness: 2,
        padding: { top: 0, bottom: 0 } }
    ).setOrigin(1, 0.5);

    this.add.text(1280 - 18, 694,
      '[SHIFT] 회피  [I] 인벤토리  [C] 캐릭터',
      { fontSize: '12px', fill: '#dddddd', stroke: '#000000', strokeThickness: 2,
        padding: { top: 0, bottom: 0 } }
    ).setOrigin(1, 0.5);

    this.refreshAll();
  }

  // ════════════════════════════════════════════════
  // 스킬 슬롯 바 (하단 중앙)
  // ════════════════════════════════════════════════
  buildSkillBar() {
    const skill = this.player.skillDef;
    if (!skill) return;

    const cx = 640, cy = 672, size = 58;

    // 슬롯 배경
    this.add.rectangle(cx, cy, size, size, 0x1a1a2e).setStrokeStyle(2, 0x444466);

    // 스킬 색상 아이콘
    this.skillIcon = this.add.rectangle(cx, cy, size - 10, size - 10, skill.color, 0.45);

    // Q 라벨
    this.add.text(cx - size / 2 + 3, cy - size / 2 + 2, 'Q', {
      fontSize: '10px', fill: '#aaaaaa',
    });

    // 스킬명 (슬롯 아래)
    this.add.text(cx, cy + size / 2 + 4, skill.name, {
      fontSize: '11px', fill: '#cccccc',
    }).setOrigin(0.5, 0);

    // 쿨타임 오버레이 (Graphics — update에서 매 프레임 갱신)
    this.skillCdGfx  = this.add.graphics();
    this.skillCdText = this.add.text(cx, cy, '', {
      fontSize: '15px', fill: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  // ════════════════════════════════════════════════
  // 포션 퀵슬롯 바 (스킬 슬롯 오른쪽)
  // ════════════════════════════════════════════════
  buildPotionBar() {
    const size   = 52;   // 슬롯 크기
    const startX = 716;  // 스킬 슬롯(640) 오른쪽
    const cy     = 672;
    const gap    = 60;

    this._pSlotCdGfx   = [];
    this._pSlotCdText  = [];
    this._pSlotCntText = [];
    this._pSlotIcons   = [];

    this._quickSlotDefs.forEach((def, i) => {
      const cx   = startX + i * gap;
      const isMp = def.key.startsWith('mp');
      const clr  = isMp ? 0x2980b9 : 0xc0392b;

      // 슬롯 배경
      this.add.rectangle(cx, cy, size, size, 0x1a1a2e)
        .setStrokeStyle(2, isMp ? 0x3498db : 0x884444);

      // 아이템 아이콘 이미지
      const icon = this.add.image(cx, cy, isMp ? 'item_potion_mp' : 'item_potion')
        .setDisplaySize(size - 12, size - 12);
      this._pSlotIcons.push(icon);

      // 키 번호 라벨
      this.add.text(cx - size / 2 + 3, cy - size / 2 + 1, def.label, {
        fontSize: '10px', fill: '#aaaaaa',
      });

      // 이름 (슬롯 아래)
      const shortName = isMp ? 'MP(소)' : ['HP(소)', 'HP(중)', 'HP(대)'][i];
      this.add.text(cx, cy + size / 2 + 4, shortName, {
        fontSize: '10px', fill: '#aaaaaa',
      }).setOrigin(0.5, 0);

      // 쿨타임 오버레이
      const cdGfx = this.add.graphics();
      this._pSlotCdGfx.push(cdGfx);

      // 쿨타임 초 텍스트
      const cdTxt = this.add.text(cx, cy, '', {
        fontSize: '14px', fill: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);
      this._pSlotCdText.push(cdTxt);

      // 수량 (우하단)
      const cntTxt = this.add.text(cx + size / 2 - 2, cy + size / 2 - 2, '', {
        fontSize: '11px', fill: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1);
      this._pSlotCntText.push(cntTxt);
    });
  }

  // ── 퀵슬롯 포션 사용 ──────────────────────────────────────────
  _useQuickPotion(slot) {
    if (this._quickSlotCdLeft[slot] > 0) return;
    const p   = this.player;
    const key = this._quickSlotDefs[slot].key;

    // 인벤토리에서 해당 포션 슬롯 탐색
    const invIdx = p.inventory.slots.findIndex(it => it && it.key === key);
    if (invIdx < 0) return;

    const ok = this.gameScene.inventorySystem.useItem(p, invIdx);
    if (!ok) return;

    // 쿨타임 시작
    this._quickSlotCdLeft[slot] = this._quickSlotCdMax[slot];
  }

  // ════════════════════════════════════════════════
  // 인벤토리 패널
  // ════════════════════════════════════════════════
  buildInventoryPanel() {
    const pw = 420, ph = 560;
    const px = 1280 - pw - 10, py = (720 - ph) / 2;

    this.invPanel = this.add.container(px, py).setVisible(false);

    // 패널 배경
    const bg = this.add.rectangle(0, 0, pw, ph, 0x1a1a2e, 0.95)
      .setOrigin(0).setStrokeStyle(2, 0x444466);
    this.invPanel.add(bg);

    // 타이틀
    const title = this.add.text(pw / 2, 10, '인벤토리', {
      fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.invPanel.add(title);

    // 골드 표시
    this.invGoldText = this.add.text(pw - 10, 10, '', {
      fontSize: '13px', fill: '#f39c12'
    }).setOrigin(1, 0);
    this.invPanel.add(this.invGoldText);

    // ── 장비 슬롯 (상단) ────────────────────────────
    const equipY = 40;
    this.equipSlotGfx = {};
    const slots = [
      { key: 'weapon',   label: '무기',  x: 20,       y: equipY },
      { key: 'helmet',   label: '머리',  x: 100,      y: equipY },
      { key: 'armor',    label: '상체',  x: 180,      y: equipY },
      { key: 'pants',    label: '하체',  x: 260,      y: equipY },
      { key: 'gloves',   label: '장갑',  x: 20,       y: equipY + 60 },
      { key: 'boots',    label: '신발',  x: 100,      y: equipY + 60 },
      { key: 'ring1',    label: '반지1', x: 180,      y: equipY + 60 },
      { key: 'ring2',    label: '반지2', x: 260,      y: equipY + 60 },
      { key: 'necklace', label: '목걸이',x: 340,      y: equipY },
    ];

    slots.forEach(({ key, label, x, y }) => {
      const slotBg = this.add.rectangle(x, y, 52, 52, 0x2c2c4a).setOrigin(0).setStrokeStyle(1, 0x555577)
        .setInteractive({ useHandCursor: true });
      const slotLbl = this.add.text(x + 26, y + 54, label, { fontSize: '9px', fill: '#888888' }).setOrigin(0.5, 0);
      this.invPanel.add([slotBg, slotLbl]);
      this.equipSlotGfx[key] = { bg: slotBg, label: slotLbl, icon: null, x, y };

      slotBg.on('pointerover', () => {
        const item = this.player?.inventory?.equipment[key];
        if (item) {
          slotBg.setFillStyle(0x3a3a5a);
          const wx = this.invPanel.x + x;
          const wy = this.invPanel.y + y;
          this._showItemTooltip(item, wx, wy);
        }
      });
      slotBg.on('pointerout', () => {
        slotBg.setFillStyle(0x2c2c4a);
        this._hideItemTooltip();
      });
      slotBg.on('pointerdown', () => {
        const item = this.player?.inventory?.equipment[key];
        if (!item) return;
        const ok = this.gameScene.inventorySystem.unequip(this.player, key);
        if (!ok) {
          this._showFeedback('인벤토리가 가득 찼습니다', '#e74c3c');
        } else {
          this.refreshAll();
        }
      });
    });

    const divider = this.add.rectangle(0, equipY + 130, pw, 1, 0x444466).setOrigin(0);
    this.invPanel.add(divider);

    // ── 인벤토리 그리드 (48칸, 8열 6행) ─────────────
    const gridX = 20, gridY = equipY + 140;
    const cellSize = 44, cols = 8;
    this.invSlotGfx = [];

    for (let i = 0; i < 48; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = gridX + col * (cellSize + 4);
      const cy  = gridY + row * (cellSize + 4);

      const slotBg = this.add.rectangle(cx, cy, cellSize, cellSize, 0x2c2c4a)
        .setOrigin(0).setStrokeStyle(1, 0x444466).setInteractive();
      this.invPanel.add(slotBg);

      slotBg.on('pointerover', () => {
        slotBg.setFillStyle(0x3a3a5a);
        const item = this.player?.inventory?.slots[i];
        if (item) this._showItemTooltip(item, px + cx, py + cy);
      });
      slotBg.on('pointerout', () => {
        slotBg.setFillStyle(0x2c2c4a);
        this._hideItemTooltip();
      });
      slotBg.on('pointerdown', () => this.onInventorySlotClick(i));

      this.invSlotGfx.push({ bg: slotBg, icon: null, qty: null, cx, cy });
    }

    // 닫기 버튼
    const closeBtn = this.add.text(pw - 10, 5, '✕', {
      fontSize: '18px', fill: '#e74c3c'
    }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.toggleInventory());
    this.invPanel.add(closeBtn);
  }

  // ════════════════════════════════════════════════
  // 캐릭터 스탯 패널
  // ════════════════════════════════════════════════
  buildStatusPanel() {
    const pw = 220, ph = 320;
    const px = 10, py = (720 - ph) / 2;

    this.charPanel = this.add.container(px, py).setVisible(false);

    const bg = this.add.rectangle(0, 0, pw, ph, 0x1a1a2e, 0.95)
      .setOrigin(0).setStrokeStyle(2, 0x444466);
    this.charPanel.add(bg);

    const title = this.add.text(pw / 2, 10, '캐릭터 정보', {
      fontSize: '15px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.charPanel.add(title);

    // 스탯 텍스트들
    this.statLines = [];
    const statKeys = ['STR', 'AGI', 'INT', 'VIT', 'WIS', 'RES'];
    const statColors = {
      STR: '#e74c3c', AGI: '#2ecc71', INT: '#9b59b6',
      VIT: '#e67e22', WIS: '#3498db', RES: '#1abc9c'
    };
    statKeys.forEach((k, i) => {
      const label = this.add.text(16, 40 + i * 28, k, {
        fontSize: '13px', fill: statColors[k], fontStyle: 'bold', fixedWidth: 40
      });
      const val = this.add.text(60, 40 + i * 28, '', {
        fontSize: '13px', fill: '#ffffff'
      });
      // 스킬 포인트 배분 버튼
      const plusBtn = this.add.text(pw - 22, 40 + i * 28, '+', {
        fontSize: '15px', fill: '#f1c40f', fontStyle: 'bold',
      }).setInteractive({ useHandCursor: true });
      plusBtn.on('pointerdown', () => this.spendSkillPoint(k));
      plusBtn.on('pointerover', () => {
        plusBtn.setStyle({ fill: '#ffffff' });
        this._showStatTooltip(k, i, px, py);
      });
      plusBtn.on('pointerout', () => {
        plusBtn.setStyle({ fill: '#f1c40f' });
        this._hideStatTooltip();
      });

      this.charPanel.add([label, val, plusBtn]);
      this.statLines.push({ key: k, val, plusBtn });
    });

    // HP/MP 수치
    this.charHpText = this.add.text(16, 40 + 6 * 28, '', { fontSize: '12px', fill: '#e74c3c' });
    this.charMpText = this.add.text(16, 40 + 6 * 28 + 18, '', { fontSize: '12px', fill: '#3498db' });
    this.charPanel.add([this.charHpText, this.charMpText]);

    // SP (스킬 포인트)
    this.charSpText = this.add.text(16, 40 + 6 * 28 + 40, '', { fontSize: '12px', fill: '#f1c40f' });
    this.charPanel.add(this.charSpText);

    // 닫기
    const closeBtn = this.add.text(pw - 10, 5, '✕', {
      fontSize: '18px', fill: '#e74c3c'
    }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.toggleCharPanel());
    this.charPanel.add(closeBtn);
  }

  // ════════════════════════════════════════════════
  // 갱신 메서드
  // ════════════════════════════════════════════════
  update() {
    const p = this.player;
    if (!p) return;

    // HP 바
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this.hpBar.width = Math.round(200 * hpPct);
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);

    // MP 바
    const mpPct = Math.max(0, p.mp / p.maxMp);
    this.mpBar.width = Math.round(200 * mpPct);
    this.mpText.setText(`${Math.ceil(p.mp)} / ${p.maxMp}`);

    // XP 바
    const xp = p.getXPInfo();
    this.xpBar.width = Math.round(256 * xp.percent);

    // 레벨/골드
    this.levelText.setText(`Lv.${p.level}  ${getJobRankName(p)}`);
    this.goldText.setText(`💰 ${p.inventory.gold.toLocaleString()} G`);

    // 스킬 쿨타임 오버레이
    if (p.skillDef && this.skillCdGfx) {
      const cd    = p.skillCooldown;
      const maxCd = p.skillDef.cooldown;
      const cx = 640, cy = 672, size = 58;
      this.skillCdGfx.clear();
      if (cd > 0) {
        const pct = cd / maxCd;
        this.skillCdGfx.fillStyle(0x000000, 0.65);
        this.skillCdGfx.fillRect(cx - (size - 10) / 2, cy - (size - 10) / 2, size - 10, (size - 10) * pct);
        this.skillCdText.setText(`${(cd / 1000).toFixed(1)}`);
      } else {
        this.skillCdText.setText('');
      }
    }

    this.updateStatusIcons();
    this.updatePotionBar();
  }

  updatePotionBar() {
    if (!this._pSlotCdGfx) return;
    const p      = this.player;
    const size   = 52;
    const startX = 716;
    const cy     = 672;
    const gap    = 60;
    const delta  = this.game.loop.delta; // ms since last frame

    this._quickSlotDefs.forEach((def, i) => {
      const cx = startX + i * gap;

      // 쿨타임 감소
      if (this._quickSlotCdLeft[i] > 0) {
        this._quickSlotCdLeft[i] = Math.max(0, this._quickSlotCdLeft[i] - delta);
      }

      // 수량 표시
      const invItem = p.inventory.slots.find(it => it && it.key === def.key);
      const qty = invItem ? invItem.quantity : 0;
      this._pSlotCntText[i].setText(qty > 0 ? `×${qty}` : '');

      // 아이콘 투명도 (없으면 흐림)
      this._pSlotIcons[i].setAlpha(qty > 0 ? 1 : 0.3);

      // 쿨타임 오버레이
      const cdGfx = this._pSlotCdGfx[i];
      cdGfx.clear();
      const cd    = this._quickSlotCdLeft[i];
      const maxCd = this._quickSlotCdMax[i];
      if (cd > 0) {
        const pct = cd / maxCd;
        cdGfx.fillStyle(0x000000, 0.65);
        cdGfx.fillRect(cx - (size - 12) / 2, cy - (size - 12) / 2, size - 12, (size - 12) * pct);
        this._pSlotCdText[i].setText(`${(cd / 1000).toFixed(1)}`);
      } else {
        this._pSlotCdText[i].setText('');
      }
    });
  }

  updateStatusIcons() {
    const effects = this.player?.statusEffects ?? [];
    const seen    = new Map();
    effects.forEach(e => { if (!seen.has(e.type)) seen.set(e.type, e); });
    const active = [...seen.values()];

    this._statusIconGfx.clear();
    this._statusIconPool.forEach(t => t.setVisible(false));

    const COLORS = { blood_curse: 0x8e44ad, poison: 0x27ae60, freeze: 0x3498db };
    const LABELS = { blood_curse: '저주', poison: '독', freeze: '빙결' };

    active.forEach((effect, i) => {
      if (i >= this._statusIconPool.length) return;
      const color = COLORS[effect.type] ?? 0xff4444;
      const label = LABELS[effect.type] ?? effect.type;
      const x = 14 + i * 32, y = 100;
      this._statusIconGfx.fillStyle(color, 0.85);
      this._statusIconGfx.fillCircle(x, y, 12);
      this._statusIconGfx.lineStyle(1, 0xffffff, 0.4);
      this._statusIconGfx.strokeCircle(x, y, 12);
      this._statusIconPool[i].setPosition(x, y + 14).setText(label).setVisible(true);
    });
  }

  refreshAll() {
    this.update();
    if (this.inventoryOpen) this.refreshInventory();
    if (this.charPanelOpen) this.refreshCharPanel();
  }

  refreshInventory() {
    const inv = this.player.inventory;

    // 골드
    if (this.invGoldText) {
      this.invGoldText.setText(`💰 ${inv.gold.toLocaleString()} G`);
    }

    // 아이템 슬롯
    inv.slots.forEach((item, i) => {
      const gfx = this.invSlotGfx[i];
      if (!gfx) return;

      if (gfx.icon) { gfx.icon.destroy(); gfx.icon = null; }
      if (gfx.qty)  { gfx.qty.destroy();  gfx.qty  = null; }

      if (item) {
        gfx.icon = this.add.image(gfx.cx + 22, gfx.cy + 22, item.texture)
          .setOrigin(0.5).setDisplaySize(32, 32);
        this.invPanel.add(gfx.icon);

        if (item.stackable && item.quantity > 1) {
          gfx.qty = this.add.text(gfx.cx + 38, gfx.cy + 28, `${item.quantity}`, {
            fontSize: '10px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(1, 0);
          this.invPanel.add(gfx.qty);
        }

        // 등급 색상 테두리
        gfx.bg.setStrokeStyle(2, gradeHexColor(item.grade));
      } else {
        gfx.bg.setStrokeStyle(1, 0x444466);
      }
    });

    this.refreshEquipment();
  }

  refreshEquipment() {
    const equip = this.player.inventory.equipment;
    Object.entries(this.equipSlotGfx).forEach(([slot, gfx]) => {
      if (gfx.icon) { gfx.icon.destroy(); gfx.icon = null; }
      const item = equip[slot];
      if (item) {
        gfx.icon = this.add.image(gfx.x + 26, gfx.y + 26, item.texture)
          .setOrigin(0.5).setDisplaySize(36, 36);
        this.invPanel.add(gfx.icon);
        gfx.bg.setStrokeStyle(2, 0xf1c40f);
      } else {
        gfx.bg.setStrokeStyle(1, 0x555577);
      }
    });
  }

  refreshCharPanel() {
    const p = this.player;
    const t = p.totalStats;
    const hasSP = p.skillPoints > 0;

    this.statLines.forEach(({ key, val, plusBtn }) => {
      val.setText(`${Math.floor(t[key] || 0)}`);
      if (plusBtn) plusBtn.setVisible(hasSP);
    });
    this.charHpText.setText(`HP: ${Math.ceil(p.hp)} / ${p.maxHp}`);
    this.charMpText.setText(`MP: ${Math.ceil(p.mp)} / ${p.maxMp}`);
    this.charSpText.setText(`스킬 포인트: ${p.skillPoints}${hasSP ? '  (+ 버튼으로 배분)' : ''}`);
  }

  spendSkillPoint(stat) {
    const p = this.player;
    if (p.skillPoints <= 0) return;

    // 변화 전 수치 저장
    const beforeHp = p.maxHp, beforeMp = p.maxMp;

    p.skillPoints--;
    p.stats[stat]     = (p.stats[stat]    || 0) + 1;
    p.baseStats[stat] = (p.baseStats[stat] || 0) + 1;
    this.gameScene.inventorySystem.recalcStats(p);
    this.refreshCharPanel();
    this.gameScene.events.emit('statsChanged', p);

    // 배분 결과 플로팅 텍스트 (스탯 패널 우측)
    this._showStatUpFeedback(stat, p, beforeHp, beforeMp);
    this._hideStatTooltip(); // 툴팁 닫기
  }

  _showStatUpFeedback(stat, p, beforeHp, beforeMp) {
    const EFFECTS = {
      STR: `물리 공격력 +2.5`,
      AGI: `이동속도 +1 / 치명타율↑`,
      INT: `마법 위력 +3.0`,
      VIT: `최대 HP  ${beforeHp} → ${p.maxHp}`,
      WIS: `최대 MP  ${beforeMp} → ${p.maxMp}`,
      RES: `흡혈·상태이상 저항↑`,
    };
    const msg = `${stat} +1    ${EFFECTS[stat] || ''}`;

    if (this._statFeedbackTxt) this._statFeedbackTxt.destroy();
    this._statFeedbackTxt = this.add.text(240, 200, msg, {
      fontSize: '13px', fill: '#f1c40f', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(500).setScrollFactor(0);

    this.tweens.add({
      targets: this._statFeedbackTxt,
      y: 175, alpha: 0,
      duration: 1400,
      ease: 'Power1',
      onComplete: () => {
        if (this._statFeedbackTxt) { this._statFeedbackTxt.destroy(); this._statFeedbackTxt = null; }
      },
    });
  }

  // ── 스탯 호버 툴팁 ─────────────────────────────────────────
  _showStatTooltip(stat, rowIndex, panelX, panelY) {
    this._hideStatTooltip();
    const p = this.player;
    if (!p || p.skillPoints <= 0) return;

    const lines = this._getStatEffectLines(stat, p);
    const tx = panelX + 225;   // 패널 우측
    const ty = panelY + 36 + rowIndex * 28;
    const tw = 175, lh = 16;
    const th = 22 + lines.length * lh;

    const bg = this.add.rectangle(tx, ty, tw, th, 0x0a0a1e, 0.96)
      .setOrigin(0).setStrokeStyle(1, 0xf1c40f, 0.9).setDepth(500).setScrollFactor(0);

    const header = this.add.text(tx + tw / 2, ty + 4, `${stat}  +1 효과`, {
      fontSize: '11px', fill: '#f1c40f', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(500).setScrollFactor(0);

    const body = lines.map((line, i) =>
      this.add.text(tx + 8, ty + 18 + i * lh, line, {
        fontSize: '11px', fill: '#dddddd',
      }).setDepth(500).setScrollFactor(0)
    );

    this._statTooltip = [bg, header, ...body];
  }

  _hideStatTooltip() {
    if (this._statTooltip) {
      this._statTooltip.forEach(o => o.destroy());
      this._statTooltip = null;
    }
  }

  _getStatEffectLines(stat, p) {
    const t = p.totalStats;
    switch (stat) {
      case 'STR': return [
        `물리 공격력 +2.5`,
        `현재 기여: ${Math.floor((t.STR || 0) * 2.5)}  →  ${Math.floor(((t.STR || 0) + 1) * 2.5)}`,
      ];
      case 'AGI': return [
        `이동속도 +1`,
        `치명타율 +0.05%`,
      ];
      case 'INT': return [
        `마법 위력 +3.0`,
        `현재 기여: ${Math.floor((t.INT || 0) * 3.0)}  →  ${Math.floor(((t.INT || 0) + 1) * 3.0)}`,
      ];
      case 'VIT': return [
        `최대 HP +20`,
        `${p.maxHp}  →  ${p.maxHp + 20}`,
      ];
      case 'WIS': return [
        `최대 MP +15`,
        `${p.maxMp}  →  ${p.maxMp + 15}`,
      ];
      case 'RES': return [
        `흡혈 저항↑`,
        `상태이상 지속시간↓`,
      ];
      default: return [];
    }
  }

  // ════════════════════════════════════════════════
  // 인벤토리 슬롯 클릭
  // ════════════════════════════════════════════════
  onInventorySlotClick(index) {
    const item = this.player.inventory.slots[index];
    if (!item) return;

    if (item.type === 'equipment') {
      if (item.requiredLevel && this.player.level < item.requiredLevel) {
        this._showFeedback(`레벨 ${item.requiredLevel} 이상 착용 가능`, '#e74c3c');
        return;
      }
      const ok = this.gameScene.inventorySystem.equip(this.player, index);
      if (!ok) {
        this._showFeedback('인벤토리가 가득 찼습니다', '#e74c3c');
      }
      this.refreshAll();
    } else if (item.type === 'consumable') {
      this.gameScene.inventorySystem.useItem(this.player, index);
      this.refreshAll();
    }
  }

  _showFeedback(msg, color = '#ffffff') {
    if (this._feedbackTxt) {
      this._feedbackTxt.destroy();
      if (this._feedbackTimer) { this._feedbackTimer.remove(); this._feedbackTimer = null; }
    }
    this._feedbackTxt = this.add.text(640, 340, msg, {
      fontSize: '15px', fill: color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(400);
    this._feedbackTimer = this.time.delayedCall(1800, () => {
      if (this._feedbackTxt) { this._feedbackTxt.destroy(); this._feedbackTxt = null; }
    });
  }

  // ════════════════════════════════════════════════
  // 아이템 툴팁
  // ════════════════════════════════════════════════
  _showItemTooltip(item, slotWorldX, slotWorldY) {
    this._hideItemTooltip();

    const GRADE_LABEL = {
      common: '일반', uncommon: '고급', rare: '희귀',
      epic: '영웅', legendary: '전설', abyss: '심연',
    };
    const STAT_LABEL = {
      STR: '힘', AGI: '민첩', INT: '지능', VIT: '체력', WIS: '지혜',
      RES: '저항', defense: '방어', attackPower: '공격력',
      critRate: '치명타율', critDamage: '치명타 피해', moveSpeed: '이동속도',
    };

    const nameColor  = gradeColor(item.grade);
    const gradeLabel = GRADE_LABEL[item.grade] ?? '';
    const border     = gradeHexColor(item.grade);
    const tw = 190;

    // 텍스트 라인 구성
    const lines = [];
    lines.push({ text: item.name, size: '13px', fill: nameColor, bold: true });
    if (gradeLabel) lines.push({ text: gradeLabel, size: '10px', fill: nameColor });
    if (item.enhance > 0) lines.push({ text: `강화 +${item.enhance}`, size: '10px', fill: '#f1c40f' });
    lines.push({ text: '', size: '4px', fill: '' }); // 구분선 여백
    if (item.stats) {
      Object.entries(item.stats).forEach(([k, v]) => {
        const label = STAT_LABEL[k] ?? k;
        lines.push({ text: `${label}  +${v}`, size: '11px', fill: '#cccccc' });
      });
    }
    if (item.description) {
      lines.push({ text: '', size: '4px', fill: '' });
      lines.push({ text: item.description, size: '10px', fill: '#777799', wrap: tw - 16 });
    }
    const hint = item.type === 'equipment' ? '[클릭] 장착 / 해제' : '[클릭] 사용';
    lines.push({ text: '', size: '4px', fill: '' });
    lines.push({ text: hint, size: '10px', fill: '#555577' });

    // 높이 계산
    const lineH = lines.map(l => parseInt(l.size) + 3);
    const th = lineH.reduce((a, b) => a + b, 0) + 14;

    // 위치: 인벤토리 패널 왼쪽에 고정, y는 슬롯 기준
    const tx = slotWorldX - tw - 8;
    const ty = Math.max(4, Math.min(slotWorldY, 720 - th - 4));

    this._ttObjs = [];

    const bg = this.add.rectangle(tx, ty, tw, th, 0x08080f, 0.97)
      .setOrigin(0).setStrokeStyle(1, border).setDepth(299);
    this._ttObjs.push(bg);

    let curY = ty + 8;
    lines.forEach((line, i) => {
      if (!line.text) { curY += lineH[i]; return; }
      const style = {
        fontSize: line.size, fill: line.fill,
        fontStyle: line.bold ? 'bold' : 'normal',
        padding: { top: 0, bottom: 0 },
      };
      if (line.wrap) style.wordWrap = { width: line.wrap };
      const t = this.add.text(tx + 8, curY, line.text, style).setDepth(300);
      this._ttObjs.push(t);
      curY += lineH[i];
    });
  }

  _hideItemTooltip() {
    if (this._ttObjs) { this._ttObjs.forEach(o => o.destroy()); this._ttObjs = null; }
  }

  // ════════════════════════════════════════════════
  // 패널 토글
  // ════════════════════════════════════════════════
  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    this.invPanel.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
    else this._hideItemTooltip();
  }

  toggleCharPanel() {
    this.charPanelOpen = !this.charPanelOpen;
    this.charPanel.setVisible(this.charPanelOpen);
    if (this.charPanelOpen) this.refreshCharPanel();
  }

  // ════════════════════════════════════════════════
  // 상점 패널 (구매 / 판매 탭)
  // ════════════════════════════════════════════════
  buildShopPanel() {
    const pw = 400, ph = 520;
    const px = (1280 - pw) / 2, py = (720 - ph) / 2;

    this.shopPanel = this.add.container(px, py).setVisible(false);
    this._shopTab = 'buy';
    this._shopSellOffset = 0;

    const bg = this.add.rectangle(0, 0, pw, ph, 0x120f05, 0.97)
      .setOrigin(0).setStrokeStyle(2, 0xf39c12);
    this.shopPanel.add(bg);

    // 타이틀
    this.shopPanel.add(
      this.add.text(pw / 2, 12, '상인의 가게', {
        fontSize: '18px', fill: '#f39c12', fontStyle: 'bold',
      }).setOrigin(0.5, 0)
    );

    // 골드 표시
    this.shopGoldText = this.add.text(14, 12, '', {
      fontSize: '13px', fill: '#f39c12',
    }).setOrigin(0, 0);
    this.shopPanel.add(this.shopGoldText);

    // 닫기
    const closeBtn = this.add.text(pw - 10, 6, '✕', {
      fontSize: '18px', fill: '#e74c3c',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleShop());
    this.shopPanel.add(closeBtn);

    // 구분선
    this.shopPanel.add(this.add.rectangle(0, 38, pw, 1, 0x4a3a00).setOrigin(0));

    // 탭 버튼
    this._shopBuyTabBg  = this.add.rectangle(pw * 0.25, 44, pw * 0.46, 28, 0x3a2000).setOrigin(0.5, 0).setStrokeStyle(1, 0xf39c12).setInteractive({ useHandCursor: true });
    this._shopBuyTabTxt = this.add.text(pw * 0.25, 58, '구매', { fontSize: '13px', fill: '#f39c12', fontStyle: 'bold' }).setOrigin(0.5);
    this._shopSellTabBg  = this.add.rectangle(pw * 0.75, 44, pw * 0.46, 28, 0x1a0e00).setOrigin(0.5, 0).setStrokeStyle(1, 0x5a4000).setInteractive({ useHandCursor: true });
    this._shopSellTabTxt = this.add.text(pw * 0.75, 58, '판매', { fontSize: '13px', fill: '#888888' }).setOrigin(0.5);

    this._shopBuyTabBg.on('pointerdown',  () => this._switchShopTab('buy'));
    this._shopSellTabBg.on('pointerdown', () => this._switchShopTab('sell'));
    this.shopPanel.add([this._shopBuyTabBg, this._shopBuyTabTxt, this._shopSellTabBg, this._shopSellTabTxt]);

    // 탭 아래 구분선
    this.shopPanel.add(this.add.rectangle(0, 76, pw, 1, 0x4a3a00).setOrigin(0));

    // 구매 컨텐츠 컨테이너 (정적)
    this.shopBuyContainer = this.add.container(0, 0);
    this.shopPanel.add(this.shopBuyContainer);

    const SHOP_ITEMS = [
      { key: 'hp_potion_small',  price: 50   },
      { key: 'hp_potion_medium', price: 200  },
      { key: 'hp_potion_large',  price: 500  },
      { key: 'mp_potion_small',  price: 80   },
      { key: 'iron_sword',       price: 150  },
      { key: 'leather_armor',    price: 120  },
      { key: 'soldiers_sword',   price: 500  },
      { key: 'resistance_ring',  price: 1200 },
    ];

    SHOP_ITEMS.forEach((si, i) => {
      const data = ITEM_DATA[si.key];
      if (!data) return;
      const ry = 84 + i * 68;

      const rowBg = this.add.rectangle(8, ry, pw - 16, 60, 0x1e1800).setOrigin(0).setStrokeStyle(1, 0x3a2800);
      const icon  = this.add.image(38, ry + 30, data.texture).setDisplaySize(36, 36).setOrigin(0.5);
      const nameT = this.add.text(64, ry + 10, data.name, { fontSize: '13px', fill: gradeColor(data.grade), fontStyle: 'bold' });
      const descT = this.add.text(64, ry + 30, data.description?.slice(0, 26) ?? '', { fontSize: '10px', fill: '#888888' });
      const priceT = this.add.text(pw - 110, ry + 22, `${si.price} G`, { fontSize: '14px', fill: '#f39c12', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const btn    = this.add.rectangle(pw - 42, ry + 30, 60, 30, 0x1a0e00).setStrokeStyle(2, 0xf39c12).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(pw - 42, ry + 30, '구매', { fontSize: '12px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x3a2000));
      btn.on('pointerout',  () => btn.setFillStyle(0x1a0e00));
      btn.on('pointerdown', () => this.buyItem(si.key, si.price));
      this.shopBuyContainer.add([rowBg, icon, nameT, descT, priceT, btn, btnTxt]);
    });

    // 판매 컨텐츠 컨테이너 (동적 — 탭 열릴 때마다 재빌드)
    this.shopSellContainer = this.add.container(0, 0).setVisible(false);
    this.shopPanel.add(this.shopSellContainer);
  }

  _switchShopTab(tab) {
    this._shopTab = tab;
    this._shopSellOffset = 0;
    const isBuy = tab === 'buy';
    this.shopBuyContainer.setVisible(isBuy);
    this.shopSellContainer.setVisible(!isBuy);
    // 탭 버튼 활성/비활성 스타일
    this._shopBuyTabBg.setFillStyle(isBuy ? 0x3a2000 : 0x1a0e00).setStrokeStyle(1, isBuy ? 0xf39c12 : 0x5a4000);
    this._shopBuyTabTxt.setStyle({ fill: isBuy ? '#f39c12' : '#888888', fontStyle: isBuy ? 'bold' : 'normal' });
    this._shopSellTabBg.setFillStyle(!isBuy ? 0x3a2000 : 0x1a0e00).setStrokeStyle(1, !isBuy ? 0xf39c12 : 0x5a4000);
    this._shopSellTabTxt.setStyle({ fill: !isBuy ? '#f39c12' : '#888888', fontStyle: !isBuy ? 'bold' : 'normal' });
    if (!isBuy) this._buildSellContent();
  }

  _buildSellContent() {
    const pw = 400;
    this.shopSellContainer.removeAll(true);

    const p = this.player;
    if (!p) return;

    // 인벤토리에서 팔 수 있는 아이템 수집
    const sellItems = [];
    p.inventory.slots.forEach((item, idx) => {
      if (item) sellItems.push({ item, idx });
    });

    if (sellItems.length === 0) {
      this.shopSellContainer.add(
        this.add.text(pw / 2, 200, '판매할 아이템이 없습니다.', {
          fontSize: '13px', fill: '#666666',
        }).setOrigin(0.5)
      );
      return;
    }

    const pageSize = 5;
    const offset   = this._shopSellOffset;
    const page     = sellItems.slice(offset, offset + pageSize);

    page.forEach(({ item, idx }, i) => {
      const ry    = 84 + i * 68;
      const price = this._getSellPrice(item);
      const qty   = item.stackable && item.quantity > 1 ? ` ×${item.quantity}` : '';

      const rowBg  = this.add.rectangle(8, ry, pw - 16, 60, 0x150a0a).setOrigin(0).setStrokeStyle(1, 0x3a1400);
      const icon   = this.add.image(38, ry + 30, item.texture).setDisplaySize(34, 34).setOrigin(0.5);
      const nameT  = this.add.text(64, ry + 8, item.name + qty, { fontSize: '12px', fill: gradeColor(item.grade ?? 'common'), fontStyle: 'bold' });
      const descT  = this.add.text(64, ry + 28, item.description?.slice(0, 28) ?? '', { fontSize: '10px', fill: '#666666' });
      const priceT = this.add.text(pw - 115, ry + 30, `${price.toLocaleString()} G`, { fontSize: '13px', fill: '#f39c12', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const btn    = this.add.rectangle(pw - 42, ry + 30, 60, 30, 0x1a0000).setStrokeStyle(2, 0xe74c3c).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(pw - 42, ry + 30, '판매', { fontSize: '12px', fill: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x3a0000));
      btn.on('pointerout',  () => btn.setFillStyle(0x1a0000));
      btn.on('pointerdown', () => this._sellItem(idx, price));
      this.shopSellContainer.add([rowBg, icon, nameT, descT, priceT, btn, btnTxt]);
    });

    // 페이지 이동 버튼
    if (offset > 0) {
      const up = this.add.text(pw / 2, 80, '▲ 이전', { fontSize: '12px', fill: '#f39c12' }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
      up.on('pointerdown', () => { this._shopSellOffset -= pageSize; this._buildSellContent(); });
      this.shopSellContainer.add(up);
    }
    if (offset + pageSize < sellItems.length) {
      const down = this.add.text(pw / 2, 84 + pageSize * 68 + 4, `▼ 다음 (${sellItems.length - offset - pageSize}개 더)`, { fontSize: '12px', fill: '#f39c12' }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      down.on('pointerdown', () => { this._shopSellOffset += pageSize; this._buildSellContent(); });
      this.shopSellContainer.add(down);
    }
  }

  _getSellPrice(item) {
    if (!item) return 0;
    if (item.type === 'consumable') {
      const base = { hp_potion_small: 25, hp_potion_medium: 100 };
      return base[item.key] ?? 20;
    }
    if (item.type === 'material') {
      const unitPrice = { iron_ore: 15, leather: 12, blood_crystal: 30, abyss_stone: 80, bloodkin_emblem: 60 }[item.key] ?? 10;
      return unitPrice * (item.quantity ?? 1);
    }
    if (item.type === 'equipment') {
      // 판매가 = 레벨 × 2 × 등급배율 (구매가의 20~30% 수준 유지)
      const gradeVal = { common: 2, uncommon: 5, rare: 8, epic: 20, legendary: 50, abyss: 100 };
      return Math.max(5, Math.floor((item.requiredLevel ?? 1) * 2 * (gradeVal[item.grade] ?? 2)));
    }
    return 10;
  }

  _sellItem(slotIndex, price) {
    const p = this.player;
    p.inventory.slots[slotIndex] = null;
    p.inventory.gold += price;
    this.gameScene.events.emit('inventoryChanged', p.inventory);
    this.refreshShop();
    this.refreshAll();
    this._buildSellContent();
  }

  // ════════════════════════════════════════════════
  // 강화소 패널
  // ════════════════════════════════════════════════
  buildEnhancePanel() {
    const pw = 420, ph = 430;
    const px = (1280 - pw) / 2 - 210, py = (720 - ph) / 2;

    this.enhPanel = this.add.container(px, py).setVisible(false);
    this._enhSlotRows = [];

    const bg = this.add.rectangle(0, 0, pw, ph, 0x0a0816, 0.97)
      .setOrigin(0).setStrokeStyle(2, 0x9b59b6);
    this.enhPanel.add(bg);

    this.enhPanel.add(this.add.text(pw / 2, 12, '장비 강화소', {
      fontSize: '17px', fill: '#9b59b6', fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    this.enhPanel.add(this.add.text(pw / 2, 36, '비용 100×2^강화등급 G  |  +4 이상 실패 확률 있음', {
      fontSize: '10px', fill: '#8888aa',
    }).setOrigin(0.5, 0));

    this.enhPanel.add(this.add.rectangle(0, 54, pw, 1, 0x2a1a4a).setOrigin(0));

    const SLOTS = [
      { key: 'weapon',   label: '무기' }, { key: 'helmet',   label: '머리' },
      { key: 'armor',    label: '상체' }, { key: 'pants',    label: '하체' },
      { key: 'gloves',   label: '장갑' }, { key: 'boots',    label: '신발' },
      { key: 'ring1',    label: '반지1' }, { key: 'ring2',    label: '반지2' },
      { key: 'necklace', label: '목걸이' },
    ];

    // 레이아웃: 슬롯라벨(14) | 아이템명(60) | 강화비용·확률(pw-158) | 강화버튼(pw-44)
    SLOTS.forEach(({ key, label }, i) => {
      const ry = 60 + i * 38;

      const rowBg   = this.add.rectangle(6, ry, pw - 12, 34, 0x110d1a).setOrigin(0);
      const slotLbl = this.add.text(14, ry + 17, label, { fontSize: '11px', fill: '#999999' }).setOrigin(0, 0.5);
      const nameTxt = this.add.text(60, ry + 17, '—', { fontSize: '11px', fill: '#444444' }).setOrigin(0, 0.5);
      const costTxt = this.add.text(pw - 158, ry + 17, '', { fontSize: '11px', fill: '#f39c12' }).setOrigin(0, 0.5);

      const btn    = this.add.rectangle(pw - 40, ry + 17, 64, 26, 0x150020)
        .setStrokeStyle(1, 0x9b59b6).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(pw - 40, ry + 17, '강화', { fontSize: '11px', fill: '#cccccc', fontStyle: 'bold' }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x2a0040));
      btn.on('pointerout',  () => btn.setFillStyle(0x150020));
      btn.on('pointerdown', () => this.doEnhance(key));

      this.enhPanel.add([rowBg, slotLbl, nameTxt, costTxt, btn, btnTxt]);
      this._enhSlotRows.push({ key, nameTxt, costTxt, btn, btnTxt });
    });

    // 결과 텍스트
    this.enhResultTxt = this.add.text(pw / 2, ph - 18, '', {
      fontSize: '13px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.enhPanel.add(this.enhResultTxt);

    // 닫기
    const closeBtn = this.add.text(pw - 10, 6, '✕', { fontSize: '18px', fill: '#e74c3c' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleEnhance());
    this.enhPanel.add(closeBtn);
  }

  toggleEnhance() {
    this.enhOpen = !this.enhOpen;
    this.enhPanel.setVisible(this.enhOpen);
    if (this.enhOpen) this.refreshEnhance();
  }

  refreshEnhance() {
    const equip = this.player.inventory.equipment;
    this._enhSlotRows.forEach(({ key, nameTxt, costTxt, btn, btnTxt }) => {
      const item = equip[key];
      if (!item) {
        nameTxt.setText('—').setStyle({ fill: '#444444' });
        costTxt.setText('');
        btn.setAlpha(0.35); btnTxt.setText('강화');
        return;
      }
      const level = item.enhance ?? 0;
      const nameColor = gradeColor(item.grade);
      nameTxt.setText(`${item.name}${level > 0 ? ` +${level}` : ''}`).setStyle({ fill: nameColor });
      if (level >= 5) {
        costTxt.setText('최대').setStyle({ fill: '#f1c40f' });
        btn.setAlpha(0.35); btnTxt.setText('MAX');
      } else {
        const cost = 100 * Math.pow(2, level);
        const pct  = level >= 4 ? ' (60%)' : level === 3 ? ' (80%)' : '';
        costTxt.setText(`${cost}G${pct}`).setStyle({ fill: '#f39c12' });
        btn.setAlpha(1); btnTxt.setText('강화');
      }
    });
  }

  doEnhance(equipSlot) {
    const result = this.gameScene.inventorySystem.enhance(this.player, equipSlot);
    if (!result) return;

    if (result.reason === 'no_item')  { this._showEnhResult('장비를 먼저 착용하세요', '#e74c3c'); return; }
    if (result.reason === 'max_level'){ this._showEnhResult('이미 최대 강화입니다', '#f1c40f');  return; }
    if (result.reason === 'no_gold')  { this._showEnhResult(`골드 부족 (${result.cost}G 필요)`, '#e74c3c'); return; }

    this.refreshEnhance();
    this.refreshAll();

    if (result.success) {
      this._showEnhResult(`✓ +${result.newLevel} 강화 성공!`, '#2ecc71');
    } else {
      this._showEnhResult('✗ 강화 실패', '#e74c3c');
    }
  }

  _showEnhResult(msg, color) {
    if (!this.enhResultTxt) return;
    this.enhResultTxt.setText(msg).setStyle({ fill: color });
    this.time.delayedCall(2000, () => { if (this.enhResultTxt) this.enhResultTxt.setText(''); });
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    this.shopPanel.setVisible(this.shopOpen);
    if (this.shopOpen) {
      this._switchShopTab('buy');
      this.refreshShop();
    }
  }

  refreshShop() {
    if (this.shopGoldText) {
      this.shopGoldText.setText(`💰 ${this.player.inventory.gold.toLocaleString()} G`);
    }
  }

  buyItem(key, price) {
    const p = this.player;
    if (p.inventory.gold < price) {
      // 골드 부족 표시 (짧게 깜빡)
      if (this.shopGoldText) {
        this.shopGoldText.setStyle({ fill: '#e74c3c' });
        this.time.delayedCall(500, () => this.shopGoldText.setStyle({ fill: '#f39c12' }));
      }
      return;
    }
    const ok = this.gameScene.inventorySystem.addItem(p.inventory, key);
    if (ok) {
      p.inventory.gold -= price;
      this.refreshShop();
      this.refreshAll();
    }
  }

  // ════════════════════════════════════════════════
  // 설정 메뉴 (ESC)
  // ════════════════════════════════════════════════
  buildSettingsPanel() {
    const W = 360, H = 380;
    const px = (1280 - W) / 2, py = (720 - H) / 2;

    this.settingsPanel = this.add.container(px, py).setVisible(false).setDepth(300);

    // 배경 오버레이 (전체화면 반투명)
    const overlay = this.add.rectangle(-px, -py, 1280, 720, 0x000000, 0.55).setOrigin(0).setDepth(299);
    this.settingsPanel.add(overlay);

    // 패널 본체
    const bg = this.add.rectangle(0, 0, W, H, 0x0d0d1e, 0.97).setOrigin(0).setStrokeStyle(2, 0x4a4a7a);
    this.settingsPanel.add(bg);

    // 타이틀
    this.settingsPanel.add(
      this.add.text(W / 2, 18, '설정', { fontSize: '20px', fill: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0)
    );

    // 구분선
    const line = this.add.graphics();
    line.lineStyle(1, 0x4a4a7a, 0.6); line.beginPath();
    line.moveTo(20, 50); line.lineTo(W - 20, 50); line.strokePath();
    this.settingsPanel.add(line);

    // ── 볼륨 슬라이더 (마스터) ──────────────────────
    this._buildVolumeSlider(W / 2, 90, '마스터 볼륨', 'master');
    this._buildVolumeSlider(W / 2, 145, 'BGM 볼륨', 'bgm');
    this._buildVolumeSlider(W / 2, 200, 'SFX 볼륨', 'sfx');

    // ── 조작법 안내 ────────────────────────────────
    this.settingsPanel.add(
      this.add.text(W / 2, 252, '조작법', { fontSize: '13px', fill: '#cccccc', fontStyle: 'bold' }).setOrigin(0.5, 0)
    );
    const controls = [
      'WASD — 이동      Shift — 구르기',
      'Click / Space — 공격    Q — 스킬',
      'I — 인벤토리    C — 캐릭터창',
      'E — NPC / 포털 상호작용',
    ];
    controls.forEach((line, i) => {
      this.settingsPanel.add(
        this.add.text(W / 2, 272 + i * 18, line, { fontSize: '11px', fill: '#aaaaaa' }).setOrigin(0.5, 0)
      );
    });

    // ── 버튼들 ────────────────────────────────────
    const btnY = H - 48;

    // 계속하기
    const resumeBtn = this.add.rectangle(W / 2 - 76, btnY, 130, 32, 0x0d2e0d)
      .setOrigin(0.5).setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
    const resumeTxt = this.add.text(W / 2 - 76, btnY, '계속하기', { fontSize: '13px', fill: '#2ecc71', fontStyle: 'bold' }).setOrigin(0.5);
    resumeBtn.on('pointerover', () => resumeBtn.setFillStyle(0x1a4a1a));
    resumeBtn.on('pointerout',  () => resumeBtn.setFillStyle(0x0d2e0d));
    resumeBtn.on('pointerdown', () => this.toggleSettings());

    // 처음으로
    const titleBtn = this.add.rectangle(W / 2 + 76, btnY, 130, 32, 0x2e0d0d)
      .setOrigin(0.5).setStrokeStyle(2, 0xe74c3c).setInteractive({ useHandCursor: true });
    const titleTxt = this.add.text(W / 2 + 76, btnY, '처음으로', { fontSize: '13px', fill: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5);
    titleBtn.on('pointerover', () => titleBtn.setFillStyle(0x4a1a1a));
    titleBtn.on('pointerout',  () => titleBtn.setFillStyle(0x2e0d0d));
    titleBtn.on('pointerdown', () => {
      SaveSystem.saveChar(this.gameScene._charId, this.player);
      this.scene.stop('UIScene');
      this.gameScene.scene.stop('GameScene');
      this.gameScene.scene.start('JobSelectScene');
    });

    this.settingsPanel.add([resumeBtn, resumeTxt, titleBtn, titleTxt]);
  }

  _buildVolumeSlider(cx, y, label, key) {
    const W = 360;
    const stored = parseFloat(localStorage.getItem(`vol_${key}`) ?? '1.0');

    this.settingsPanel.add(
      this.add.text(30, y - 14, label, { fontSize: '12px', fill: '#cccccc' })
    );

    // 슬라이더 트랙
    const trackW = 200, trackX = W - 30 - trackW;
    const track = this.add.rectangle(trackX, y, trackW, 6, 0x333355).setOrigin(0, 0.5);
    this.settingsPanel.add(track);

    // 슬라이더 채움
    const fill = this.add.rectangle(trackX, y, trackW * stored, 6, 0x9b59b6).setOrigin(0, 0.5);
    this.settingsPanel.add(fill);

    // 핸들
    let handleX = trackX + trackW * stored;
    const handle = this.add.circle(handleX, y, 9, 0xbb88ff)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.settingsPanel.add(handle);

    // 볼륨 값 텍스트
    const valTxt = this.add.text(trackX + trackW + 8, y, `${Math.round(stored * 100)}%`, {
      fontSize: '11px', fill: '#aaaaaa'
    }).setOrigin(0, 0.5);
    this.settingsPanel.add(valTxt);

    handle.on('drag', (pointer, dragX) => {
      // settingsPanel 오프셋 보정
      const panelX = (1280 - 360) / 2;
      const localDragX = Phaser.Math.Clamp(pointer.x - panelX, trackX, trackX + trackW);
      const ratio = (localDragX - trackX) / trackW;
      fill.setSize(trackW * ratio, 6);
      handle.setPosition(trackX + trackW * ratio, y);
      valTxt.setText(`${Math.round(ratio * 100)}%`);
      localStorage.setItem(`vol_${key}`, ratio.toFixed(2));
      // Phaser 사운드 볼륨 적용 (사운드 추가 시 활성화)
      // if (key === 'master') this.sound.setVolume(ratio);
    });
  }

  toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    this.settingsPanel.setVisible(this.settingsOpen);

    // 설정 창 열릴 때 게임 일시정지
    if (this.settingsOpen) {
      this.gameScene.scene.pause('GameScene');
    } else {
      this.gameScene.scene.resume('GameScene');
    }
  }
}
