// GuildScene — 길드 홀 UI (탭: 정보/퀘스트/창고/버프)
import { guildSystem } from '../systems/GuildSystem.js';
import { GUILD_BUFFS, GUILD_CREATE_REQUIREMENTS, GUILD_LEVEL_DATA } from '../data/guilds.js';

const W = 1280, H = 720;

export default class GuildScene extends Phaser.Scene {
  constructor() { super('GuildScene'); }

  init(data) {
    this._jobKey    = data?.jobKey  ?? 'warrior';
    this._charId    = data?.charId  ?? null;
    this._playerRef = data?.player  ?? null;
  }

  create() {
    this._tab = 'info'; // 'info' | 'quest' | 'warehouse' | 'buff'

    // 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x080818);
    this._drawDeco();

    // ── 타이틀 바 ───────────────────────────────
    this.add.rectangle(W / 2, 32, W, 64, 0x0d0d28, 0.95);
    this.add.text(W / 2, 32, '⚔  길드 홀  ⚔', {
      fontSize: '22px', fill: '#f1c40f', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // 돌아가기 버튼
    const backBtn = this.add.rectangle(68, 32, 110, 34, 0x1a1a2e)
      .setStrokeStyle(2, 0x4a4a7a).setInteractive({ useHandCursor: true });
    this.add.text(68, 32, '← 돌아가기', { fontSize: '13px', fill: '#aaa' }).setOrigin(0.5);
    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.wake('GameScene');  // 잠든 GameScene을 재개 (재생성 없음)
        this.scene.stop();             // GuildScene 종료
      });
    });

    // ── 길드 없으면 가입/창설 화면 ─────────────
    if (!guildSystem.hasGuild()) {
      this._buildNoGuildView();
      return;
    }

    // ── 탭 버튼 ─────────────────────────────────
    this._buildTabs();

    // ── 메인 콘텐츠 영역 ─────────────────────────
    this._content = this.add.container(0, 0);
    this._showTab('info');

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  _drawDeco() {
    // 배경 장식 (길드 홀 느낌)
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(1, 0x2a2a4a, 0.4);
    for (let x = 0; x < W; x += 80) { g.lineBetween(x, 0, x, H); }
    for (let y = 0; y < H; y += 80) { g.lineBetween(0, y, W, y); }
  }

  // ── 길드 없을 때 ─────────────────────────────
  _buildNoGuildView() {
    this.add.text(W / 2, H / 2 - 80, '길드에 가입되어 있지 않습니다.', {
      fontSize: '20px', fill: '#888'
    }).setOrigin(0.5);

    // NPC 길드 자동 가입
    const joinBtn = this.add.rectangle(W / 2, H / 2, 240, 44, 0x0d1f0d)
      .setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
    const joinTxt = this.add.text(W / 2, H / 2, '[ 혈맹 ] 길드 가입', {
      fontSize: '15px', fill: '#2ecc71', fontStyle: 'bold'
    }).setOrigin(0.5);
    joinBtn.on('pointerover', () => joinBtn.setFillStyle(0x1a3a1a));
    joinBtn.on('pointerout',  () => joinBtn.setFillStyle(0x0d1f0d));
    joinBtn.on('pointerdown', () => {
      const result = guildSystem.joinNPC('혈맹');
      if (result.ok) {
        this.scene.restart({ jobKey: this._jobKey, loadSave: this._loadSave, player: this._playerRef });
      }
    });

    // 길드 창설 버튼
    const createInfo = `창설 조건: Lv.${GUILD_CREATE_REQUIREMENTS.minLevel} 이상 / ${GUILD_CREATE_REQUIREMENTS.goldCost.toLocaleString()} G`;
    this.add.text(W / 2, H / 2 + 60, createInfo, { fontSize: '12px', fill: '#666' }).setOrigin(0.5);

    const createBtn = this.add.rectangle(W / 2, H / 2 + 90, 240, 44, 0x1a001a)
      .setStrokeStyle(2, 0x9b59b6).setInteractive({ useHandCursor: true });
    const createTxt = this.add.text(W / 2, H / 2 + 90, '새 길드 창설', {
      fontSize: '15px', fill: '#bb88ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    createBtn.on('pointerover', () => createBtn.setFillStyle(0x2a003a));
    createBtn.on('pointerout',  () => createBtn.setFillStyle(0x1a001a));
    createBtn.on('pointerdown', () => {
      const name = prompt('길드 이름을 입력하세요 (2~16자):');
      if (!name || name.trim().length < 2) return;
      const player = this._playerRef;
      if (!player) { alert('플레이어 정보 없음'); return; }
      const result = guildSystem.create(player, name);
      if (result.ok) {
        this.scene.restart({ jobKey: this._jobKey, loadSave: this._loadSave, player });
      } else {
        alert(result.reason);
      }
    });

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  // ── 탭 버튼 ──────────────────────────────────
  _buildTabs() {
    const tabs = [
      { key: 'info',      label: '길드 정보' },
      { key: 'quest',     label: '일일 퀘스트' },
      { key: 'warehouse', label: '길드 창고' },
      { key: 'buff',      label: '길드 버프' },
    ];
    this._tabBtns = {};
    tabs.forEach((tab, i) => {
      const x = 160 + i * 250;
      const bg = this.add.rectangle(x, 78, 220, 34, 0x0d0d1e)
        .setStrokeStyle(2, 0x2a2a4a).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 78, tab.label, { fontSize: '14px', fill: '#aaa', fontStyle: 'bold' }).setOrigin(0.5);
      bg.on('pointerdown', () => this._showTab(tab.key));
      this._tabBtns[tab.key] = { bg, txt };
    });
  }

  _setActiveTab(key) {
    Object.entries(this._tabBtns).forEach(([k, btn]) => {
      const active = k === key;
      btn.bg.setFillStyle(active ? 0x1a1a3a : 0x0d0d1e).setStrokeStyle(2, active ? 0x9b59b6 : 0x2a2a4a);
      btn.txt.setStyle({ fill: active ? '#f1c40f' : '#aaa' });
    });
  }

  _showTab(key) {
    this._tab = key;
    this._setActiveTab(key);
    this._content.removeAll(true);

    switch (key) {
      case 'info':      this._buildInfoTab();      break;
      case 'quest':     this._buildQuestTab();     break;
      case 'warehouse': this._buildWarehouseTab(); break;
      case 'buff':      this._buildBuffTab();      break;
    }
  }

  // ════════════════════════════════════════════════
  // 탭 — 길드 정보
  // ════════════════════════════════════════════════
  _buildInfoTab() {
    const guild = guildSystem.guild;
    const perks  = guildSystem.getPerks();
    const py = 110, pw = W - 80;

    const bg = this.add.rectangle(W / 2, py + 280, pw, 520, 0x0d0d1e, 0.95).setStrokeStyle(2, 0x2a2a4a);
    this._content.add(bg);

    // 길드명 + 레벨
    this._content.add(
      this.add.text(W / 2, py + 20, `[ ${guild.name} ]`, {
        fontSize: '26px', fill: '#f1c40f', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5)
    );
    this._content.add(
      this.add.text(W / 2, py + 54, `길드 레벨  ${guild.level}`, {
        fontSize: '16px', fill: '#aaa'
      }).setOrigin(0.5)
    );

    // EXP 바
    const curLvData  = GUILD_LEVEL_DATA.find(d => d.level === guild.level);
    const nextLvData = GUILD_LEVEL_DATA.find(d => d.level === guild.level + 1);
    const expRatio   = nextLvData ? (guild.exp - (curLvData?.expNeeded ?? 0)) / (nextLvData.expNeeded - (curLvData?.expNeeded ?? 0)) : 1;

    const barW = 400;
    this._content.add(this.add.rectangle(W / 2, py + 80, barW, 10, 0x222222).setOrigin(0.5));
    this._content.add(this.add.rectangle(W / 2 - barW / 2, py + 80, barW * Phaser.Math.Clamp(expRatio, 0, 1), 10, 0x9b59b6).setOrigin(0, 0.5));
    this._content.add(this.add.text(W / 2, py + 92, `${guild.exp.toLocaleString()} / ${(nextLvData?.expNeeded ?? '최대').toLocaleString()} EXP`, {
      fontSize: '11px', fill: '#888'
    }).setOrigin(0.5, 0));

    // 통계 (2열)
    const stats = [
      ['길드 자금', `${guild.fund.toLocaleString()} G`],
      ['기여도',   `${guild.contribution.toLocaleString()}`],
      ['구성원',   `${guild.members.length}명`],
      ['활성 버프', (() => { const n = Object.values(guild.buffLevels ?? {}).filter(v => v > 0).length; return n ? `${n}종 적용 중` : '없음'; })()],
    ];
    stats.forEach(([label, val], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = col === 0 ? W / 2 - 200 : W / 2 + 50;
      const y = py + 120 + row * 50;
      this._content.add(this.add.text(x, y, label, { fontSize: '13px', fill: '#888' }));
      this._content.add(this.add.text(x, y + 18, val,   { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }));
    });

    // 현재 레벨 혜택
    this._content.add(this.add.text(W / 2, py + 240, '현재 레벨 혜택', {
      fontSize: '14px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5));

    const perkList = [
      `골드 획득 +${Math.round(perks.goldBonus * 100)}%`,
      `아이템 드롭 +${Math.round(perks.dropBonus * 100)}%`,
      `경험치 +${Math.round(perks.xpBonus * 100)}%`,
      `이동속도 +${Math.round(perks.speedBonus * 100)}%`,
    ];
    perkList.forEach((txt, i) => {
      this._content.add(this.add.text(W / 2 + (i < 2 ? -180 : 20), py + 264 + (i % 2) * 22, txt, {
        fontSize: '13px', fill: '#2ecc71'
      }));
    });

    // 탈퇴 버튼
    const leaveBtn = this.add.rectangle(W / 2, py + 460, 180, 36, 0x2e0d0d)
      .setStrokeStyle(2, 0xe74c3c).setInteractive({ useHandCursor: true });
    const leaveTxt = this.add.text(W / 2, py + 460, '길드 탈퇴', {
      fontSize: '13px', fill: '#e74c3c', fontStyle: 'bold'
    }).setOrigin(0.5);
    leaveBtn.on('pointerdown', () => {
      if (confirm('정말 길드를 탈퇴하시겠습니까?')) {
        guildSystem.leave();
        this.scene.restart({ jobKey: this._jobKey, loadSave: this._loadSave });
      }
    });
    this._content.add([leaveBtn, leaveTxt]);
  }

  // ════════════════════════════════════════════════
  // 탭 — 일일 퀘스트
  // ════════════════════════════════════════════════
  _buildQuestTab() {
    const quests  = guildSystem.getDailyQuests();
    const py = 110, pw = W - 80;

    const bg = this.add.rectangle(W / 2, py + 280, pw, 520, 0x0d0d1e, 0.95).setStrokeStyle(2, 0x2a2a4a);
    this._content.add(bg);

    this._content.add(
      this.add.text(W / 2, py + 20, '오늘의 길드 퀘스트', {
        fontSize: '18px', fill: '#f1c40f', fontStyle: 'bold'
      }).setOrigin(0.5)
    );
    this._content.add(
      this.add.text(W / 2, py + 46, '매일 자정 초기화됩니다', {
        fontSize: '12px', fill: '#555'
      }).setOrigin(0.5)
    );

    quests.forEach((quest, i) => {
      const qy  = py + 90 + i * 148;
      const prog = guildSystem.getQuestProgress(quest.id);
      const done = prog >= quest.count;
      const claimed = prog === -1;

      const cardBg = this.add.rectangle(W / 2, qy + 50, pw - 60, 126, claimed ? 0x071a07 : 0x0d0d28)
        .setStrokeStyle(2, claimed ? 0x2ecc71 : done ? 0xf1c40f : 0x333355);
      this._content.add(cardBg);

      this._content.add(this.add.text(100, qy + 16, quest.title, {
        fontSize: '16px', fill: claimed ? '#2ecc71' : done ? '#f1c40f' : '#ffffff', fontStyle: 'bold'
      }));
      this._content.add(this.add.text(100, qy + 38, quest.desc, {
        fontSize: '12px', fill: '#888'
      }));

      // 진행 바
      const barW = pw - 400;
      const ratio = claimed ? 1 : Phaser.Math.Clamp((prog) / quest.count, 0, 1);
      this._content.add(this.add.rectangle(100, qy + 70, barW, 10, 0x1a1a1a).setOrigin(0, 0.5));
      this._content.add(this.add.rectangle(100, qy + 70, barW * ratio, 10, 0x9b59b6).setOrigin(0, 0.5));
      this._content.add(this.add.text(100 + barW + 10, qy + 70, claimed ? '완료' : `${Math.min(prog, quest.count)} / ${quest.count}`, {
        fontSize: '12px', fill: claimed ? '#2ecc71' : '#aaa'
      }).setOrigin(0, 0.5));

      // 보상 표시
      this._content.add(this.add.text(100, qy + 88, `보상: 골드 ${quest.goldReward.toLocaleString()} G  |  길드 EXP ${quest.guildXp.toLocaleString()}`, {
        fontSize: '11px', fill: '#888'
      }));

      // 수령 버튼
      if (done && !claimed) {
        const claimBtn = this.add.rectangle(W - 140, qy + 50, 140, 34, 0x0d2e0d)
          .setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
        const claimTxt = this.add.text(W - 140, qy + 50, '보상 수령', {
          fontSize: '13px', fill: '#2ecc71', fontStyle: 'bold'
        }).setOrigin(0.5);
        claimBtn.on('pointerdown', () => {
          const result = guildSystem.claimQuest(this._playerRef, quest.id);
          if (result.ok) this._showTab('quest'); // 새로고침
        });
        this._content.add([claimBtn, claimTxt]);
      } else if (claimed) {
        this._content.add(this.add.text(W - 140, qy + 50, '✓ 수령 완료', {
          fontSize: '13px', fill: '#2ecc71', fontStyle: 'bold'
        }).setOrigin(0.5));
      }
    });
  }

  // ════════════════════════════════════════════════
  // 탭 — 길드 창고
  // ════════════════════════════════════════════════
  _buildWarehouseTab() {
    const py = 110, pw = W - 80;
    const bg = this.add.rectangle(W / 2, py + 280, pw, 520, 0x0d0d1e, 0.95).setStrokeStyle(2, 0x2a2a4a);
    this._content.add(bg);

    this._content.add(
      this.add.text(W / 2, py + 20, '길드 창고 (30슬롯)', {
        fontSize: '18px', fill: '#f1c40f', fontStyle: 'bold'
      }).setOrigin(0.5)
    );
    this._content.add(
      this.add.text(W / 2, py + 46, '클릭 → 인벤토리로 꺼내기', {
        fontSize: '12px', fill: '#555'
      }).setOrigin(0.5)
    );

    const warehouse = guildSystem.getWarehouse();
    const cols = 10, rows = 3, slotSize = 52, startX = 80, startY = py + 76;

    for (let i = 0; i < 30; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const sx = startX + col * (slotSize + 4);
      const sy = startY + row * (slotSize + 4);
      const item = warehouse[i];

      const slotBg = this.add.rectangle(sx + slotSize / 2, sy + slotSize / 2, slotSize, slotSize, 0x111122)
        .setStrokeStyle(1, item ? 0x4a4a7a : 0x222233).setInteractive({ useHandCursor: !!item });
      this._content.add(slotBg);

      if (item) {
        const icon = this.add.image(sx + slotSize / 2, sy + slotSize / 2, item.texture)
          .setDisplaySize(36, 36);
        this._content.add(icon);

        slotBg.on('pointerdown', () => {
          if (guildSystem.warehouseWithdraw(this._playerRef, i)) {
            this._showTab('warehouse');
          }
        });
        slotBg.on('pointerover', () => slotBg.setFillStyle(0x1a1a3a));
        slotBg.on('pointerout',  () => slotBg.setFillStyle(0x111122));
      }
    }

    // 기부 안내
    this._content.add(
      this.add.text(W / 2, startY + rows * (slotSize + 4) + 20,
        '인벤토리 아이템을 창고에 넣으려면 인벤토리(I)에서 아이템을 우클릭하세요.',
        { fontSize: '11px', fill: '#555', align: 'center', wordWrap: { width: pw - 80 } }
      ).setOrigin(0.5, 0)
    );
  }

  // ════════════════════════════════════════════════
  // 탭 — 길드 버프
  // ════════════════════════════════════════════════
  _buildBuffTab() {
    const py = 110, pw = W - 80;
    const bg = this.add.rectangle(W / 2, py + 280, pw, 550, 0x0d0d1e, 0.95).setStrokeStyle(2, 0x2a2a4a);
    this._content.add(bg);

    this._content.add(
      this.add.text(W / 2, py + 20, '길드 버프', {
        fontSize: '18px', fill: '#f1c40f', fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    // 길드 자금 표시
    this._content.add(
      this.add.text(W / 2, py + 48, `길드 자금: ${guildSystem.guild.fund.toLocaleString()} G`, {
        fontSize: '14px', fill: '#f39c12'
      }).setOrigin(0.5)
    );

    // 기부 버튼
    const donateBtn = this.add.rectangle(W - 140, py + 48, 160, 30, 0x1a1a00)
      .setStrokeStyle(1, 0xf1c40f).setInteractive({ useHandCursor: true });
    const donateTxt = this.add.text(W - 140, py + 48, '자금 기부', {
      fontSize: '12px', fill: '#f1c40f'
    }).setOrigin(0.5);
    donateBtn.on('pointerdown', () => {
      const amt = parseInt(prompt('기부할 골드 금액:') ?? '0');
      if (!isNaN(amt) && amt > 0 && this._playerRef) {
        const res = guildSystem.donate(this._playerRef, amt);
        if (res.ok) {
          // UIScene HUD 골드 즉시 갱신
          const gameScene = this.scene.get('GameScene');
          if (gameScene) gameScene.events.emit('inventoryChanged', this._playerRef.inventory);
          this._showTab('buff');
        } else {
          alert(res.reason ?? '골드 부족');
        }
      }
    });
    this._content.add([donateBtn, donateTxt]);

    const effectLabel = { attackBonus: '공격력', defenseBonus: '방어력', dropBonus: '드롭률', speedBonus: '이동속도', xpBonus: 'EXP', skillCdBonus: '스킬쿨타임' };
    const fmtEffect = e => Object.entries(e).map(([k, v]) => `${effectLabel[k] ?? k} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join('  |  ');

    // 버프 카드 목록 (레벨 1~3 강화형)
    GUILD_BUFFS.forEach((buff, i) => {
      const by = py + 80 + i * 100;
      const curLv = guildSystem.getBuffLevel(buff.key); // 0~3
      const isMax = curLv >= 3;

      const cardBg = this.add.rectangle(W / 2, by + 36, pw - 60, 92,
        curLv > 0 ? 0x0a1a0a : 0x0d0d28
      ).setStrokeStyle(2, curLv > 0 ? 0x2ecc71 : 0x2a2a4a);
      this._content.add(cardBg);

      // 버프명 + 레벨 표시
      const lvStars = '★'.repeat(curLv) + '☆'.repeat(3 - curLv);
      this._content.add(this.add.text(100, by + 10, `${buff.name}  ${lvStars}  (Lv.${curLv}/3)`, {
        fontSize: '14px', fill: curLv > 0 ? '#2ecc71' : '#ffffff', fontStyle: 'bold'
      }));

      // 현재 효과
      if (curLv > 0) {
        this._content.add(this.add.text(100, by + 30, `현재: ${fmtEffect(buff.levels[curLv - 1].effect)}`, {
          fontSize: '11px', fill: '#2ecc71'
        }));
      }

      // 다음 레벨 효과 + 비용
      if (!isMax) {
        const next = buff.levels[curLv];
        this._content.add(this.add.text(100, by + curLv > 0 ? 48 : 30, `다음: ${fmtEffect(next.effect)}  |  비용: ${next.cost.toLocaleString()} G`, {
          fontSize: '11px', fill: '#888'
        }));
      } else {
        this._content.add(this.add.text(100, by + 48, '최대 레벨 달성', { fontSize: '11px', fill: '#f1c40f' }));
      }

      // 강화 버튼
      if (!isMax) {
        const btnColor = curLv === 0 ? 0x0d1a00 : 0x001a1a;
        const btnStroke = curLv === 0 ? 0x8bc34a : 0x00bcd4;
        const btnTxt = curLv === 0 ? '발동' : '강화';
        const actBtn = this.add.rectangle(W - 155, by + 36, 140, 36, btnColor)
          .setStrokeStyle(2, btnStroke).setInteractive({ useHandCursor: true });
        const actTxt = this.add.text(W - 155, by + 36, btnTxt, {
          fontSize: '13px', fill: curLv === 0 ? '#8bc34a' : '#00bcd4', fontStyle: 'bold'
        }).setOrigin(0.5);
        actBtn.on('pointerover', () => actBtn.setFillStyle(btnColor + 0x111100));
        actBtn.on('pointerout',  () => actBtn.setFillStyle(btnColor));
        actBtn.on('pointerdown', () => {
          const res = guildSystem.activateBuff(buff.key);
          if (res.ok) this._showTab('buff');
          else alert(res.reason ?? '강화 실패');
        });
        this._content.add([actBtn, actTxt]);
      }
    });
  }
}
