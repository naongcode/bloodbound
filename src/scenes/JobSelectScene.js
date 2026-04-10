import { JOB_DATA } from '../data/jobs.js';
import { SKILL_DATA } from '../data/skills.js';
import SaveSystem, { MAX_CHARS } from '../systems/SaveSystem.js';

const W = 1280, H = 720;
const JOB_COLORS = {
  warrior:   0x3498db,
  archer:    0x2ecc71,
  mage:      0x9b59b6,
  priest:    0xf1c40f,
  alchemist: 0xe67e22,
};
const JOB_NAMES = {
  warrior: '전사', archer: '궁수', mage: '마법사', priest: '성직자', alchemist: '연금술사',
};

export default class JobSelectScene extends Phaser.Scene {
  constructor() { super('JobSelectScene'); }

  create() {
    this._deleteTarget = null; // 삭제 확인 대기 중인 charId
    this._charGroup = null;
    this._jobGroup  = null;

    this._buildBackground();
    this._buildTitle();
    this._buildCharListView();
    this._buildJobSelectView(); // 숨김 상태로 생성

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ── 배경 ─────────────────────────────────────────────────
  _buildBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a18);
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.3 + 0.05);
      g.fillCircle(x, y, Math.random() * 1.3 + 0.3);
    }
  }

  // ── 타이틀 ───────────────────────────────────────────────
  _buildTitle() {
    this.add.text(W / 2, 54, 'Bloodbound Realm', {
      fontSize: '40px', fill: '#e74c3c', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);
  }

  // ════════════════════════════════════════════════════════
  // 캐릭터 목록 화면
  // ════════════════════════════════════════════════════════
  _buildCharListView() {
    if (this._charGroup) { this._charGroup.destroy(true); }
    this._charGroup = this.add.group();

    const sub = this.add.text(W / 2, 106, '캐릭터 선택', {
      fontSize: '17px', fill: '#888888',
    }).setOrigin(0.5);
    this._charGroup.add(sub);

    // 슬롯 배치: 최대 5개 가로
    const slotW = 210, slotH = 340, gap = 12;
    const chars  = SaveSystem.loadAllCharsSync();
    const total  = MAX_CHARS;
    const totalW = total * slotW + (total - 1) * gap;
    const startX = (W - totalW) / 2 + slotW / 2;
    const slotCY = H / 2 + 48;

    for (let i = 0; i < total; i++) {
      const cx  = startX + i * (slotW + gap);
      const char = chars[i] ?? null;
      this._buildSlot(cx, slotCY, slotW, slotH, char, i);
    }

    // 멀티플레이 버튼 (우측 하단)
    const firstChar = chars[0] ?? null;
    if (firstChar) {
      const mb  = this.add.rectangle(W - 130, H - 38, 220, 36, 0x0d001f)
        .setStrokeStyle(2, 0x9b59b6).setInteractive({ useHandCursor: true });
      const mt  = this.add.text(W - 130, H - 38, '🌐 멀티플레이', {
        fontSize: '14px', fill: '#bb88ff', fontStyle: 'bold',
      }).setOrigin(0.5);
      mb.on('pointerover', () => mb.setFillStyle(0x1a003a));
      mb.on('pointerout',  () => mb.setFillStyle(0x0d001f));
      mb.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('LobbyScene', { jobKey: firstChar.jobKey, charId: firstChar.charId });
        });
      });
      this._charGroup.addMultiple([mb, mt]);
    }
  }

  _buildSlot(cx, cy, sw, sh, char, idx) {
    if (char) {
      this._buildFilledSlot(cx, cy, sw, sh, char, idx);
    } else {
      this._buildEmptySlot(cx, cy, sw, sh);
    }
  }

  // ── 기존 캐릭터 슬롯 ────────────────────────────────────
  _buildFilledSlot(cx, cy, sw, sh, char, idx) {
    const accent = JOB_COLORS[char.jobKey] ?? 0x888888;
    const job    = JOB_DATA[char.jobKey];

    const bg = this.add.rectangle(cx, cy, sw, sh, 0x13132a)
      .setStrokeStyle(2, 0x2a2a4a).setInteractive({ useHandCursor: true });
    this._charGroup.add(bg);

    // 상단 색상 띠
    const band = this.add.rectangle(cx, cy - sh / 2 + 7, sw, 14, accent, 0.4);
    this._charGroup.add(band);

    // 직업 아이콘
    const icon = this.add.image(cx, cy - sh / 2 + 66, job.texture).setScale(3.2);
    this._charGroup.add(icon);

    // 직업명
    const nameT = this.add.text(cx, cy - sh / 2 + 108, JOB_NAMES[char.jobKey] ?? char.jobKey, {
      fontSize: '20px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._charGroup.add(nameT);

    // 레벨
    const lvT = this.add.text(cx, cy - sh / 2 + 134, `Lv. ${char.level ?? 1}`, {
      fontSize: '15px', fill: '#aaaaaa',
    }).setOrigin(0.5);
    this._charGroup.add(lvT);

    // 저장일
    const dateStr = char.savedAt
      ? new Date(char.savedAt).toLocaleDateString('ko-KR')
      : '';
    const dateT = this.add.text(cx, cy - sh / 2 + 158, dateStr, {
      fontSize: '11px', fill: '#555555',
    }).setOrigin(0.5);
    this._charGroup.add(dateT);

    // 시작 버튼
    const playBtn = this.add.rectangle(cx, cy + sh / 2 - 54, sw - 24, 34, 0x0a0a18)
      .setStrokeStyle(2, accent).setInteractive({ useHandCursor: true });
    const playTxt = this.add.text(cx, cy + sh / 2 - 54, '▶  시작', {
      fontSize: '15px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._charGroup.addMultiple([playBtn, playTxt]);

    // 삭제 버튼
    const delBtn  = this.add.rectangle(cx, cy + sh / 2 - 16, sw - 24, 24, 0x1a0000)
      .setStrokeStyle(1, 0x5a1a1a).setInteractive({ useHandCursor: true });
    const delTxt  = this.add.text(cx, cy + sh / 2 - 16, '삭제', {
      fontSize: '12px', fill: '#884444',
    }).setOrigin(0.5);
    this._charGroup.addMultiple([delBtn, delTxt]);

    // ── 이벤트 ──────────────────────────────────────────
    const onOver = () => {
      bg.setFillStyle(0x1e1e3a).setStrokeStyle(2, accent);
      playBtn.setFillStyle(accent);
    };
    const onOut = () => {
      bg.setFillStyle(0x13132a).setStrokeStyle(2, 0x2a2a4a);
      playBtn.setFillStyle(0x0a0a18);
    };
    bg.on('pointerover', onOver).on('pointerout', onOut);
    playBtn.on('pointerover', onOver).on('pointerout', onOut);

    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          jobKey: char.jobKey,
          charId: char.charId,
          loadSave: true,
        });
      });
    });

    // 삭제 (2단계 확인)
    delBtn.on('pointerdown', () => {
      if (this._deleteTarget === char.charId) {
        // 2번째 클릭 → 실제 삭제
        SaveSystem.deleteChar(char.charId).then(() => {
          this._deleteTarget = null;
          this._buildCharListView();
        });
      } else {
        // 1번째 클릭 → 확인 요청
        this._deleteTarget = char.charId;
        delTxt.setText('확인?').setStyle({ fill: '#ff4444' });
        delBtn.setStrokeStyle(1, 0xff4444);
        this.time.delayedCall(2500, () => {
          if (this._deleteTarget === char.charId) {
            this._deleteTarget = null;
            delTxt.setText('삭제').setStyle({ fill: '#884444' });
            delBtn.setStrokeStyle(1, 0x5a1a1a);
          }
        });
      }
    });
  }

  // ── 빈 슬롯 (새 캐릭터 생성) ────────────────────────────
  _buildEmptySlot(cx, cy, sw, sh) {
    const chars  = SaveSystem.loadAllCharsSync();
    const canAdd = chars.length < MAX_CHARS;

    const bg = this.add.rectangle(cx, cy, sw, sh, 0x0d0d1e)
      .setStrokeStyle(2, 0x2a2a3a);
    this._charGroup.add(bg);

    if (!canAdd) {
      const t = this.add.text(cx, cy, '슬롯 없음', {
        fontSize: '14px', fill: '#444444',
      }).setOrigin(0.5);
      this._charGroup.add(t);
      return;
    }

    bg.setInteractive({ useHandCursor: true });

    const plus = this.add.text(cx, cy - 20, '+', {
      fontSize: '48px', fill: '#333355',
    }).setOrigin(0.5);
    const label = this.add.text(cx, cy + 30, '새 캐릭터', {
      fontSize: '14px', fill: '#444466',
    }).setOrigin(0.5);
    this._charGroup.addMultiple([plus, label]);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x14142e).setStrokeStyle(2, 0x4a4a7a);
      plus.setStyle({ fill: '#7777bb' });
      label.setStyle({ fill: '#8888cc' });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x0d0d1e).setStrokeStyle(2, 0x2a2a3a);
      plus.setStyle({ fill: '#333355' });
      label.setStyle({ fill: '#444466' });
    });
    bg.on('pointerdown', () => this._showJobSelect());
  }

  // ════════════════════════════════════════════════════════
  // 직업 선택 오버레이
  // ════════════════════════════════════════════════════════
  _buildJobSelectView() {
    if (this._jobGroup) { this._jobGroup.destroy(true); }
    this._jobGroup = this.add.group();

    // 어두운 오버레이 (depth 50)
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
      .setDepth(50).setInteractive(); // 클릭 차단
    this._jobGroup.add(overlay);

    // 패널 배경
    const panelW = 1100, panelH = 460;
    const panel  = this.add.rectangle(W / 2, H / 2 + 20, panelW, panelH, 0x10102a)
      .setStrokeStyle(2, 0x3a3a5a).setDepth(51);
    this._jobGroup.add(panel);

    // 뒤로 버튼
    const backBtn = this.add.rectangle(72, 38, 120, 32, 0x1a1a2e)
      .setStrokeStyle(2, 0x4a4a7a).setInteractive({ useHandCursor: true }).setDepth(52);
    const backTxt = this.add.text(72, 38, '← 뒤로', { fontSize: '13px', fill: '#aaa' })
      .setOrigin(0.5).setDepth(52);
    this._jobGroup.addMultiple([backBtn, backTxt]);
    backBtn.on('pointerdown', () => this._hideJobSelect());

    // 안내
    const sub2 = this.add.text(W / 2, H / 2 - panelH / 2 + 28, '직업을 선택하세요', {
      fontSize: '16px', fill: '#888888',
    }).setOrigin(0.5).setDepth(52);
    this._jobGroup.add(sub2);

    // 직업 카드
    const jobs   = Object.values(JOB_DATA);
    const cardW  = 172, cardH = 300, cardGap = 12;
    const totalW = jobs.length * cardW + (jobs.length - 1) * cardGap;
    const startX = (W - totalW) / 2 + cardW / 2;
    const cardCY = H / 2 + 32;

    jobs.forEach((job, i) => {
      const cx = startX + i * (cardW + cardGap);
      this._buildJobCard(cx, cardCY, cardW, cardH, job);
    });

    // 초기에는 숨김
    this._setJobViewVisible(false);
  }

  _setJobViewVisible(visible) {
    this._jobGroup?.getChildren().forEach(obj => obj.setVisible(visible));
  }

  _showJobSelect() {
    this._setJobViewVisible(true);
  }

  _hideJobSelect() {
    this._setJobViewVisible(false);
    this._deleteTarget = null;
  }

  // ── 직업 카드 ────────────────────────────────────────────
  _buildJobCard(cx, cy, w, h, job) {
    const accent    = JOB_COLORS[job.key] ?? 0x888888;
    const skill     = SKILL_DATA[job.key];
    const meleeJobs = ['warrior', 'knight', 'berserker', 'priest', 'alchemist'];
    const isRanged  = !meleeJobs.includes(job.key);

    const D = 52; // 카드 depth (오버레이 위)

    const bg = this.add.rectangle(cx, cy, w, h, 0x13132a)
      .setStrokeStyle(2, 0x2a2a4a).setInteractive({ useHandCursor: true }).setDepth(D);
    this._jobGroup.add(bg);

    const items = [];

    // 상단 색상 띠
    items.push(this.add.rectangle(cx, cy - h / 2 + 8, w, 14, accent, 0.35).setDepth(D));

    // 직업 아이콘
    items.push(this.add.image(cx, cy - h / 2 + 58, job.texture).setScale(3.0).setDepth(D + 1));

    // 직업명
    items.push(this.add.text(cx, cy - h / 2 + 100, job.name, {
      fontSize: '19px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D + 1));

    // 공격 타입
    items.push(this.add.rectangle(cx, cy - h / 2 + 120, 52, 16, accent, 0.22).setDepth(D + 1));
    items.push(this.add.text(cx, cy - h / 2 + 120, isRanged ? '원거리' : '근접', {
      fontSize: '10px', fill: '#cccccc',
    }).setOrigin(0.5).setDepth(D + 1));

    // 직업 설명
    items.push(this.add.text(cx, cy - h / 2 + 136, job.description, {
      fontSize: '10px', fill: '#aaaaaa',
      wordWrap: { width: w - 18 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(D + 1));

    // 스킬
    if (skill) {
      items.push(this.add.rectangle(cx, cy - h / 2 + 192, w - 18, 1, 0x2a2a4a).setDepth(D + 1));
      items.push(this.add.text(cx, cy - h / 2 + 200, `[Q] ${skill.name}`, {
        fontSize: '12px', fill: '#f1c40f', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D + 1));
      items.push(this.add.text(cx, cy - h / 2 + 218, skill.description, {
        fontSize: '9px', fill: '#888888',
        wordWrap: { width: w - 18 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(D + 1));
    }

    // 선택 버튼
    const btn = this.add.rectangle(cx, cy + h / 2 - 22, w - 20, 30, 0x0a0a18)
      .setStrokeStyle(2, accent).setInteractive({ useHandCursor: true }).setDepth(D + 1);
    const btnTxt = this.add.text(cx, cy + h / 2 - 22, '선택', {
      fontSize: '14px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(D + 1);

    items.push(btn, btnTxt);
    this._jobGroup.addMultiple(items);

    const onOver = () => {
      bg.setFillStyle(0x1e1e3a).setStrokeStyle(2, accent);
      btn.setFillStyle(accent);
    };
    const onOut = () => {
      bg.setFillStyle(0x13132a).setStrokeStyle(2, 0x2a2a4a);
      btn.setFillStyle(0x0a0a18);
    };
    const onSelect = () => {
      const charId = SaveSystem.createChar(job.key);
      if (!charId) return; // 슬롯 초과 (이미 체크됨)
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { jobKey: job.key, charId });
      });
    };

    bg.on('pointerover', onOver).on('pointerout', onOut).on('pointerdown', onSelect);
    btn.on('pointerover', onOver).on('pointerout', onOut).on('pointerdown', onSelect);
  }
}
