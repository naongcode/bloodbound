// HUD + 인벤토리 UI 씬 (GameScene 위에 오버레이)
import { ITEM_DATA, ITEM_GRADES } from '../data/items.js';
import SaveSystem from '../systems/SaveSystem.js';

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

    this.inventoryOpen = false;
    this.charPanelOpen = false;
    this.shopOpen      = false;
    this.enhOpen       = false;
    this.settingsOpen  = false;

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
    this.add.rectangle(1280 - 10, 720 - 10, 280, 44, 0x000000, 0.55)
      .setOrigin(1, 1);

    this.add.text(1280 - 18, 720 - 36,
      '[WASD] 이동  [클릭/SPACE] 발사  [Q] 스킬',
      { fontSize: '12px', fill: '#dddddd', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(1, 0);

    this.add.text(1280 - 18, 720 - 18,
      '[SHIFT] 회피  [I] 인벤토리  [C] 캐릭터',
      { fontSize: '12px', fill: '#dddddd', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(1, 0);

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
  // 인벤토리 패널
  // ════════════════════════════════════════════════
  buildInventoryPanel() {
    const pw = 420, ph = 480;
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
      const slotBg = this.add.rectangle(x, y, 52, 52, 0x2c2c4a).setOrigin(0).setStrokeStyle(1, 0x555577);
      const slotLbl = this.add.text(x + 26, y + 54, label, { fontSize: '9px', fill: '#888888' }).setOrigin(0.5, 0);
      this.invPanel.add([slotBg, slotLbl]);
      this.equipSlotGfx[key] = { bg: slotBg, label: slotLbl, icon: null, x, y };
    });

    const divider = this.add.rectangle(0, equipY + 130, pw, 1, 0x444466).setOrigin(0);
    this.invPanel.add(divider);

    // ── 인벤토리 그리드 (30칸, 5×6) ─────────────────
    const gridX = 20, gridY = equipY + 140;
    const cellSize = 44, cols = 8;
    this.invSlotGfx = [];

    for (let i = 0; i < 30; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = gridX + col * (cellSize + 4);
      const cy  = gridY + row * (cellSize + 4);

      const slotBg = this.add.rectangle(cx, cy, cellSize, cellSize, 0x2c2c4a)
        .setOrigin(0).setStrokeStyle(1, 0x444466).setInteractive();
      this.invPanel.add(slotBg);

      slotBg.on('pointerover', () => slotBg.setFillStyle(0x3a3a5a));
      slotBg.on('pointerout',  () => slotBg.setFillStyle(0x2c2c4a));
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
      plusBtn.on('pointerover', () => plusBtn.setStyle({ fill: '#ffffff' }));
      plusBtn.on('pointerout',  () => plusBtn.setStyle({ fill: '#f1c40f' }));

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
    this.levelText.setText(`Lv.${p.level}  ${p.jobData.name}`);
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
        const gradeColors = {
          common: 0x888888, uncommon: 0x2ecc71, rare: 0x3498db,
          epic: 0x9b59b6, legendary: 0xe67e22, abyss: 0xc0392b
        };
        gfx.bg.setStrokeStyle(2, gradeColors[item.grade] || 0x444466);
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
    p.skillPoints--;
    p.stats[stat]    = (p.stats[stat]    || 0) + 1;
    p.baseStats[stat] = (p.baseStats[stat] || 0) + 1;
    this.gameScene.inventorySystem.recalcStats(p);
    this.refreshCharPanel();
    this.gameScene.events.emit('statsChanged', p);
  }

  // ════════════════════════════════════════════════
  // 인벤토리 슬롯 클릭
  // ════════════════════════════════════════════════
  onInventorySlotClick(index) {
    const item = this.player.inventory.slots[index];
    if (!item) return;

    if (item.type === 'equipment') {
      this.gameScene.inventorySystem.equip(this.player, index);
      this.refreshAll();
    } else if (item.type === 'consumable') {
      this.gameScene.inventorySystem.useItem(this.player, index);
      this.refreshAll();
    }
  }

  // ════════════════════════════════════════════════
  // 패널 토글
  // ════════════════════════════════════════════════
  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    this.invPanel.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) this.refreshInventory();
  }

  toggleCharPanel() {
    this.charPanelOpen = !this.charPanelOpen;
    this.charPanel.setVisible(this.charPanelOpen);
    if (this.charPanelOpen) this.refreshCharPanel();
  }

  // ════════════════════════════════════════════════
  // 상점 패널
  // ════════════════════════════════════════════════
  buildShopPanel() {
    const pw = 390, ph = 480;
    const px = (1280 - pw) / 2, py = (720 - ph) / 2;

    this.shopPanel = this.add.container(px, py).setVisible(false);

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
    this.shopGoldText = this.add.text(pw - 12, 12, '', {
      fontSize: '13px', fill: '#f39c12',
    }).setOrigin(1, 0);
    this.shopPanel.add(this.shopGoldText);

    // 구분선
    this.shopPanel.add(
      this.add.rectangle(0, 40, pw, 1, 0x4a3a00).setOrigin(0)
    );

    // 판매 목록
    const SHOP_ITEMS = [
      { key: 'hp_potion_small',  price: 50  },
      { key: 'hp_potion_medium', price: 200 },
      { key: 'iron_sword',       price: 150 },
      { key: 'leather_armor',    price: 120 },
      { key: 'soldiers_sword',   price: 500 },
      { key: 'resistance_ring',  price: 800 },
    ];

    const gradeColors = {
      common: '#aaaaaa', uncommon: '#2ecc71', rare: '#3498db',
      epic: '#9b59b6', legendary: '#e67e22',
    };

    SHOP_ITEMS.forEach((si, i) => {
      const data = ITEM_DATA[si.key];
      if (!data) return;
      const ry = 48 + i * 68;

      // 행 배경
      const rowBg = this.add.rectangle(8, ry, pw - 16, 60, 0x1e1800).setOrigin(0);
      rowBg.setStrokeStyle(1, 0x3a2800);
      this.shopPanel.add(rowBg);

      // 아이콘
      const icon = this.add.image(38, ry + 30, data.texture)
        .setDisplaySize(36, 36).setOrigin(0.5);
      this.shopPanel.add(icon);

      // 이름 (등급 색상)
      const nameColor = gradeColors[data.grade] ?? '#ffffff';
      this.shopPanel.add(this.add.text(64, ry + 10, data.name, {
        fontSize: '13px', fill: nameColor, fontStyle: 'bold',
      }));

      // 설명
      this.shopPanel.add(this.add.text(64, ry + 30, data.description?.slice(0, 26) ?? '', {
        fontSize: '10px', fill: '#888888',
      }));

      // 가격
      this.shopPanel.add(this.add.text(pw - 110, ry + 22, `${si.price} G`, {
        fontSize: '14px', fill: '#f39c12', fontStyle: 'bold',
      }).setOrigin(0, 0.5));

      // 구매 버튼
      const btn = this.add.rectangle(pw - 42, ry + 30, 60, 30, 0x1a0e00)
        .setStrokeStyle(2, 0xf39c12).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(pw - 42, ry + 30, '구매', {
        fontSize: '12px', fill: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x3a2000));
      btn.on('pointerout',  () => btn.setFillStyle(0x1a0e00));
      btn.on('pointerdown', () => this.buyItem(si.key, si.price));

      this.shopPanel.add([btn, btnTxt]);
    });

    // 닫기
    const closeBtn = this.add.text(pw - 10, 6, '✕', {
      fontSize: '18px', fill: '#e74c3c',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleShop());
    this.shopPanel.add(closeBtn);
  }

  // ════════════════════════════════════════════════
  // 강화소 패널
  // ════════════════════════════════════════════════
  buildEnhancePanel() {
    const pw = 360, ph = 430;
    const px = (1280 - pw) / 2 - 210, py = (720 - ph) / 2;

    this.enhPanel = this.add.container(px, py).setVisible(false);
    this._enhSlotRows = [];

    const bg = this.add.rectangle(0, 0, pw, ph, 0x0a0816, 0.97)
      .setOrigin(0).setStrokeStyle(2, 0x9b59b6);
    this.enhPanel.add(bg);

    this.enhPanel.add(this.add.text(pw / 2, 12, '장비 강화소', {
      fontSize: '17px', fill: '#9b59b6', fontStyle: 'bold',
    }).setOrigin(0.5, 0));

    this.enhPanel.add(this.add.text(pw / 2, 36, '비용 100×2^강화등급 G  |  +4이상 실패 확률 있음', {
      fontSize: '10px', fill: '#555555',
    }).setOrigin(0.5, 0));

    this.enhPanel.add(this.add.rectangle(0, 54, pw, 1, 0x2a1a4a).setOrigin(0));

    const SLOTS = [
      { key: 'weapon',   label: '무기' }, { key: 'helmet',   label: '머리' },
      { key: 'armor',    label: '상체' }, { key: 'pants',    label: '하체' },
      { key: 'gloves',   label: '장갑' }, { key: 'boots',    label: '신발' },
      { key: 'ring1',    label: '반지1' }, { key: 'ring2',    label: '반지2' },
      { key: 'necklace', label: '목걸이' },
    ];

    SLOTS.forEach(({ key, label }, i) => {
      const ry = 60 + i * 38;

      const rowBg = this.add.rectangle(6, ry, pw - 12, 34, 0x110d1a).setOrigin(0);
      const slotLbl = this.add.text(14, ry + 17, label, { fontSize: '11px', fill: '#777777' }).setOrigin(0, 0.5);
      const nameTxt = this.add.text(68, ry + 17, '—',  { fontSize: '11px', fill: '#444444' }).setOrigin(0, 0.5);
      const costTxt = this.add.text(pw - 130, ry + 17, '', { fontSize: '11px', fill: '#f39c12' }).setOrigin(0, 0.5);

      const btn    = this.add.rectangle(pw - 36, ry + 17, 56, 26, 0x150020)
        .setStrokeStyle(1, 0x9b59b6).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(pw - 36, ry + 17, '강화', { fontSize: '11px', fill: '#cccccc', fontStyle: 'bold' }).setOrigin(0.5);

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
    const GRADE_COLORS = { common: '#aaaaaa', uncommon: '#2ecc71', rare: '#3498db', epic: '#9b59b6', legendary: '#e67e22' };

    this._enhSlotRows.forEach(({ key, nameTxt, costTxt, btn, btnTxt }) => {
      const item = equip[key];
      if (!item) {
        nameTxt.setText('—').setStyle({ fill: '#444444' });
        costTxt.setText('');
        btn.setAlpha(0.35); btnTxt.setText('강화');
        return;
      }
      const level = item.enhance ?? 0;
      const nameColor = GRADE_COLORS[item.grade] ?? '#ffffff';
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
    if (this.shopOpen) this.refreshShop();
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
      SaveSystem.save(this.player);
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
