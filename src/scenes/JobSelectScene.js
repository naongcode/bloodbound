import { JOB_DATA } from '../data/jobs.js';
import { SKILL_DATA } from '../data/skills.js';
import SaveSystem from '../systems/SaveSystem.js';

const JOB_COLORS = {
  warrior:   0x3498db,
  archer:    0x2ecc71,
  mage:      0x9b59b6,
  priest:    0xf1c40f,
  alchemist: 0xe67e22,
};

export default class JobSelectScene extends Phaser.Scene {
  constructor() { super('JobSelectScene'); }

  create() {
    const W = 1280, H = 720;

    // 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a18);

    // 배경 별
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.35 + 0.05);
      g.fillCircle(x, y, Math.random() * 1.4 + 0.3);
    }

    // 타이틀
    this.add.text(W / 2, 62, 'Bloodbound Realm', {
      fontSize: '42px', fill: '#e74c3c', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 118, '직업을 선택하세요', {
      fontSize: '18px', fill: '#888888',
    }).setOrigin(0.5);

    // 카드 배치 (5개)
    const jobs   = Object.values(JOB_DATA);
    const cardW  = 190;
    const gap    = 16;
    const totalW = jobs.length * cardW + (jobs.length - 1) * gap;
    const startCX = (W - totalW) / 2 + cardW / 2;
    const cardCY  = H / 2 + 45;
    const cardH   = 330;

    jobs.forEach((job, i) => {
      const cx = startCX + i * (cardW + gap);
      this._makeJobCard(cx, cardCY, cardW, cardH, job);
    });

    // 계속하기 버튼 (세이브 존재 시) — loadSync으로 즉시 표시, 이후 클라우드 데이터 동기화
    if (SaveSystem.hasSave()) {
      const syncSave = SaveSystem.loadSync();
      if (syncSave) this._makeContinueButton(syncSave);
    }

    // 멀티플레이 버튼
    this._makeMultiButton();

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  _makeContinueButton(save) {
    const W = 1280, H = 720;
    const jobName = JOB_DATA[save.jobKey]?.name ?? save.jobKey;

    const btn = this.add.rectangle(W / 2, H - 44, 240, 38, 0x0d1f0d)
      .setStrokeStyle(2, 0x2ecc71)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(W / 2, H - 44, `계속하기  ${jobName} Lv.${save.level}`, {
      fontSize: '14px', fill: '#2ecc71', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => { btn.setFillStyle(0x1a3a1a); txt.setStyle({ fill: '#ffffff' }); });
    btn.on('pointerout',  () => { btn.setFillStyle(0x0d1f0d); txt.setStyle({ fill: '#2ecc71' }); });
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { jobKey: save.jobKey, loadSave: true });
      });
    });
  }

  _makeMultiButton() {
    const W = 1280, H = 720;

    // 직업 선택 후 로비로 이동하는 버튼 (우측 하단)
    const btn = this.add.rectangle(W - 130, H - 44, 220, 38, 0x0d001f)
      .setStrokeStyle(2, 0x9b59b6)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(W - 130, H - 44, '🌐 멀티플레이', {
      fontSize: '14px', fill: '#bb88ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => { btn.setFillStyle(0x1a003a); txt.setStyle({ fill: '#ffffff' }); });
    btn.on('pointerout',  () => { btn.setFillStyle(0x0d001f); txt.setStyle({ fill: '#bb88ff' }); });
    btn.on('pointerdown', () => {
      const savedJob = SaveSystem.loadSync()?.jobKey ?? 'warrior';
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LobbyScene', { jobKey: savedJob });
      });
    });
  }

  _makeJobCard(cx, cy, w, h, job) {
    const accent  = JOB_COLORS[job.key] ?? 0x888888;
    const skill   = SKILL_DATA[job.key];
    const meleeJobs = ['warrior', 'knight', 'berserker', 'priest', 'alchemist'];
    const isRanged  = !meleeJobs.includes(job.key);

    // ── 카드 배경 ────────────────────────────────────
    const bg = this.add.rectangle(cx, cy, w, h, 0x13132a)
      .setStrokeStyle(2, 0x2a2a4a)
      .setInteractive({ useHandCursor: true });

    // 상단 색상 띠
    this.add.rectangle(cx, cy - h / 2 + 8, w, 16, accent, 0.35);

    // 직업 스프라이트
    this.add.image(cx, cy - h / 2 + 70, job.texture).setScale(3.5);

    // 직업명
    this.add.text(cx, cy - h / 2 + 118, job.name, {
      fontSize: '22px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 공격 타입 뱃지
    const typeLabel = isRanged ? '원거리' : '근접';
    this.add.rectangle(cx, cy - h / 2 + 142, 58, 18, accent, 0.22);
    this.add.text(cx, cy - h / 2 + 142, typeLabel, {
      fontSize: '11px', fill: '#cccccc',
    }).setOrigin(0.5);

    // 직업 설명
    this.add.text(cx, cy - h / 2 + 162, job.description, {
      fontSize: '11px', fill: '#aaaaaa',
      wordWrap: { width: w - 22 }, align: 'center',
    }).setOrigin(0.5, 0);

    // 스킬 정보
    if (skill) {
      this.add.rectangle(cx, cy - h / 2 + 220, w - 20, 1, 0x2a2a4a);
      this.add.text(cx, cy - h / 2 + 230, `[Q] ${skill.name}`, {
        fontSize: '13px', fill: '#f1c40f', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(cx, cy - h / 2 + 250, skill.description, {
        fontSize: '10px', fill: '#888888',
        wordWrap: { width: w - 22 }, align: 'center',
      }).setOrigin(0.5, 0);
    }

    // 선택 버튼
    const btn = this.add.rectangle(cx, cy + h / 2 - 26, w - 24, 32, 0x0a0a18)
      .setStrokeStyle(2, accent)
      .setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(cx, cy + h / 2 - 26, '선택', {
      fontSize: '15px', fill: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── 이벤트 ──────────────────────────────────────
    const onOver = () => {
      bg.setFillStyle(0x1e1e3a).setStrokeStyle(2, accent);
      btn.setFillStyle(accent);
    };
    const onOut = () => {
      bg.setFillStyle(0x13132a).setStrokeStyle(2, 0x2a2a4a);
      btn.setFillStyle(0x0a0a18);
    };
    const onSelect = () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { jobKey: job.key });
      });
    };

    bg.on('pointerover', onOver).on('pointerout', onOut).on('pointerdown', onSelect);
    btn.on('pointerover', onOver).on('pointerout', onOut).on('pointerdown', onSelect);
  }
}
