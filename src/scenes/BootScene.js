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
    [
    // 흡혈 슬라임 — 붉은 원형
    { key: 'monster_slime', draw(g) {
      g.fillStyle(0xe74c3c); g.fillCircle(16, 18, 14);
      g.fillStyle(0xffffff); g.fillCircle(11, 15, 3); g.fillCircle(21, 15, 3);
      g.fillStyle(0x000000); g.fillCircle(12, 15, 1.5); g.fillCircle(22, 15, 1.5);
    }},
    // 피박쥐 — 보라 날개
    { key: 'monster_bat', draw(g) {
      g.fillStyle(0x8e44ad); g.fillEllipse(8, 16, 14, 8); g.fillEllipse(24, 16, 14, 8);
      g.fillCircle(16, 16, 7);
      g.fillStyle(0xff4444); g.fillCircle(13, 14, 2); g.fillCircle(19, 14, 2);
    }},
    // 흡혈 늑대 — 회색 사각형 + 귀
    { key: 'monster_wolf', draw(g) {
      g.fillStyle(0x7f8c8d); g.fillRect(6, 12, 20, 16);
      g.fillTriangle(8, 12, 12, 2, 16, 12);   // 왼쪽 귀
      g.fillTriangle(16, 12, 20, 2, 24, 12);  // 오른쪽 귀
      g.fillStyle(0xff2200); g.fillCircle(11, 17, 2.5); g.fillCircle(21, 17, 2.5);
    }},
    // 혈족 전사 — 진한 빨강 갑옷형
    { key: 'monster_bloodkin', draw(g) {
      g.fillStyle(0xc0392b); g.fillRect(6, 8, 20, 20);
      g.fillStyle(0x7b241c); g.fillRect(6, 8, 20, 6);   // 투구
      g.fillStyle(0xff0000); g.fillCircle(12, 14, 3); g.fillCircle(20, 14, 3);
      g.fillStyle(0x888888); g.fillRect(2, 12, 4, 12);  // 방패
    }},
    // 붉은 독거미 — 갈적색 몸통 + 다리 8개
    { key: 'monster_spider', draw(g) {
      g.fillStyle(0x922b21);
      g.fillCircle(16, 20, 8);   // 배
      g.fillCircle(16, 11, 6);   // 머리
      g.fillStyle(0x641e16);
      // 다리 4쌍
      g.fillRect(2,  12, 8, 2); g.fillRect(22, 12, 8, 2);
      g.fillRect(2,  16, 8, 2); g.fillRect(22, 16, 8, 2);
      g.fillRect(3,  20, 7, 2); g.fillRect(22, 20, 7, 2);
      g.fillRect(4,  24, 6, 2); g.fillRect(22, 24, 6, 2);
      g.fillStyle(0xff4444); g.fillCircle(13, 10, 1.5); g.fillCircle(19, 10, 1.5);
    }},
    // 혈석 골렘 — 회갈색 육중한 사각형
    { key: 'monster_golem', draw(g) {
      g.fillStyle(0x6e2c0e); g.fillRect(4, 4, 24, 26);   // 몸통
      g.fillStyle(0x4a1a08); g.fillRect(4, 4, 24, 8);    // 머리 영역
      g.fillStyle(0xff6600); g.fillCircle(12, 9, 3); g.fillCircle(20, 9, 3);  // 눈 (용암)
      g.fillStyle(0x3d1506); g.fillRect(0, 14, 4, 10);   // 왼팔
      g.fillRect(28, 14, 4, 10);  // 오른팔
      // 균열 장식
      g.lineStyle(1, 0xff4400, 0.8);
      g.lineBetween(10, 14, 14, 22); g.lineBetween(18, 14, 22, 22);
    }},
    // 어둠 기사 — 검보라 갑옷, 날카로운 실루엣
    { key: 'monster_shadowknight', draw(g) {
      g.fillStyle(0x1a0030); g.fillRect(7, 8, 18, 20);   // 갑옷
      g.fillStyle(0x2e004f); g.fillRect(7, 8, 18, 7);    // 투구
      g.fillTriangle(7, 8, 7, 2, 13, 8);   // 투구 뿔 왼
      g.fillTriangle(25, 8, 19, 8, 25, 2); // 투구 뿔 오
      g.fillStyle(0xcc00ff); g.fillCircle(12, 13, 2.5); g.fillCircle(20, 13, 2.5); // 눈
      g.fillStyle(0x0d001a); g.fillRect(2, 12, 5, 14);   // 방패
      g.fillStyle(0x6600aa); g.fillRect(27, 10, 3, 18);  // 검
    }},
    ].forEach(({ key, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
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
