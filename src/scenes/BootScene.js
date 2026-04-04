// 에셋 로딩 씬 — 현재는 절차적 생성(그래픽스)으로 대체
// 나중에 실제 스프라이트로 교체

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 로딩바 배경
    const bar = this.add.graphics();
    bar.fillStyle(0x222222);
    bar.fillRect(440, 340, 400, 20);

    const fill = this.add.graphics();
    this.load.on('progress', (v) => {
      fill.clear();
      fill.fillStyle(0xc0392b);
      fill.fillRect(440, 340, 400 * v, 20);
    });

    this.add.text(540, 300, 'Bloodbound Realm', {
      fontSize: '28px', fill: '#e74c3c', fontStyle: 'bold'
    });
    this.add.text(590, 370, 'Loading...', { fontSize: '14px', fill: '#aaa' });

    // 절차적 텍스처 생성 (실제 이미지 없이 실행 가능)
    this.createProceduralTextures();
  }

  createProceduralTextures() {
    // 플레이어 텍스처 (직업별 색상)
    const jobs = [
      { key: 'player_warrior',    color: 0x3498db },
      { key: 'player_archer',     color: 0x2ecc71 },
      { key: 'player_mage',       color: 0x9b59b6 },
      { key: 'player_priest',     color: 0xf1c40f },
      { key: 'player_alchemist',  color: 0xe67e22 },
    ];

    jobs.forEach(({ key, color }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // 몸통
      g.fillStyle(color);
      g.fillRect(8, 12, 16, 16);
      // 머리
      g.fillStyle(0xf5cba7);
      g.fillCircle(16, 8, 8);
      // 무기 표시 (우측)
      g.fillStyle(0x95a5a6);
      g.fillRect(24, 14, 8, 4);
      g.generateTexture(key, 32, 32);
      g.destroy();
    });

    // 몬스터 텍스처
    const monsters = [
      { key: 'monster_slime',   color: 0xe74c3c, shape: 'circle' },
      { key: 'monster_bat',     color: 0x8e44ad, shape: 'bat'    },
      { key: 'monster_wolf',    color: 0x7f8c8d, shape: 'rect'   },
      { key: 'monster_bloodkin',color: 0xc0392b, shape: 'rect'   },
    ];

    monsters.forEach(({ key, color, shape }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      if (shape === 'circle') {
        g.fillCircle(16, 18, 14);
        // 눈
        g.fillStyle(0xffffff);
        g.fillCircle(11, 15, 3);
        g.fillCircle(21, 15, 3);
        g.fillStyle(0x000000);
        g.fillCircle(12, 15, 1.5);
        g.fillCircle(22, 15, 1.5);
      } else if (shape === 'bat') {
        // 날개
        g.fillStyle(color);
        g.fillEllipse(8, 16, 14, 8);
        g.fillEllipse(24, 16, 14, 8);
        // 몸
        g.fillCircle(16, 16, 7);
      } else {
        g.fillRect(6, 8, 20, 20);
        // 눈 (붉은색)
        g.fillStyle(0xff0000);
        g.fillCircle(12, 14, 3);
        g.fillCircle(20, 14, 3);
      }
      g.generateTexture(key, 32, 32);
      g.destroy();
    });

    // 타일 텍스처
    const tiles = [
      { key: 'tile_grass',  color: 0x27ae60 },
      { key: 'tile_dirt',   color: 0x8B6914 },
      { key: 'tile_wall',   color: 0x2c3e50 },
      { key: 'tile_stone',  color: 0x555555 },
    ];

    tiles.forEach(({ key, color }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x000000, 0.2);
      g.strokeRect(0, 0, 32, 32);
      g.generateTexture(key, 32, 32);
      g.destroy();
    });

    // 아이템 텍스처
    const items = [
      { key: 'item_sword',   color: 0x95a5a6 },
      { key: 'item_armor',   color: 0x2980b9 },
      { key: 'item_ring',    color: 0xf39c12 },
      { key: 'item_potion',  color: 0xe74c3c },
    ];

    items.forEach(({ key, color }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x1a1a2e);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(color);
      g.fillRect(4, 4, 16, 16);
      g.generateTexture(key, 24, 24);
      g.destroy();
    });

    // 일반 총알 (하늘색 타원)
    const bn = this.make.graphics({ x: 0, y: 0, add: false });
    bn.fillStyle(0x00cfff);
    bn.fillEllipse(8, 4, 16, 8);   // 가로로 긴 타원
    bn.fillStyle(0xffffff, 0.6);
    bn.fillEllipse(5, 3, 6, 4);    // 하이라이트
    bn.generateTexture('bullet_normal', 16, 8);
    bn.destroy();

    // 치명타 총알 (주황색 타원 + 빛남)
    const bc = this.make.graphics({ x: 0, y: 0, add: false });
    bc.fillStyle(0xf39c12);
    bc.fillEllipse(8, 4, 16, 8);
    bc.fillStyle(0xfff3cd, 0.8);
    bc.fillEllipse(5, 3, 7, 4);
    bc.generateTexture('bullet_crit', 16, 8);
    bc.destroy();

    // 파티클 (피해 이펙트)
    const particle = this.make.graphics({ x: 0, y: 0, add: false });
    particle.fillStyle(0xffffff);
    particle.fillCircle(4, 4, 4);
    particle.generateTexture('particle_hit', 8, 8);
    particle.destroy();

    const blood = this.make.graphics({ x: 0, y: 0, add: false });
    blood.fillStyle(0xc0392b);
    blood.fillCircle(4, 4, 4);
    blood.generateTexture('particle_blood', 8, 8);
    blood.destroy();
  }

  init(data) {
    this._fromAuth = data?.fromAuth ?? false;
    this._newUser  = data?.newUser  ?? false;
    this._jobKey   = data?.jobKey   ?? 'warrior';
  }

  create() {
    if (this._fromAuth && !this._newUser) {
      // 기존 유저 → 직업 선택 씬으로 (저장된 jobKey 전달)
      this.scene.start('JobSelectScene', { savedJobKey: this._jobKey });
    } else {
      this.scene.start('JobSelectScene');
    }
  }
}
