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

    // 절차적 효과음 생성 (오디오 파일 없이 실행 가능)
    this.createProceduralSounds();

    // 실제 사운드 파일 로드
    this.load.audio('bgm_field',         'assets/sounds/1. base bgm - jojos-golden-wind_kL2WElB.mp3');
    this.load.audio('bgm_dungeon',        'assets/sounds/11. dungeon bgm - passo-bem-solto-slowed.mp3');
    this.load.audio('sfx_boss_popup',     'assets/sounds/3. dungeon boss popup - gongseubgyeongbo_lfHPliG.mp3');
    this.load.audio('sfx_item_box',       'assets/sounds/4. dungeon item box - ta-da_yrvBrlS.mp3');
    this.load.audio('sfx_dungeon_boss_die','assets/sounds/8. dungeon boss died - jabassjyo.mp3');
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
    // 혈령 궁수 — 초록빛 로브 + 활
    { key: 'monster_archer', draw(g) {
      g.fillStyle(0x1d6b38); g.fillRect(8, 10, 16, 18);  // 로브
      g.fillStyle(0x27ae60); g.fillRect(8, 10, 16, 5);   // 어깨
      g.fillStyle(0xf5cba7); g.fillCircle(16, 7, 6);     // 얼굴
      g.fillStyle(0x1a5c30); g.fillRect(5, 12, 3, 14);   // 활대
      g.lineStyle(1, 0xd4b896); g.lineBetween(5, 13, 5, 25); // 시위
      g.fillStyle(0xe74c3c); g.fillCircle(13, 6, 1.5); g.fillCircle(19, 6, 1.5); // 눈
    }},
    // 혈계 고블린 — 작은 초록 몸통, 귀 크게
    { key: 'monster_goblin', draw(g) {
      g.fillStyle(0x27ae60); g.fillEllipse(16, 20, 14, 16);   // 몸통
      g.fillStyle(0x1e8449); g.fillCircle(16, 11, 7);         // 머리
      g.fillTriangle(9,  8,  6,  1, 13, 8);   // 왼쪽 귀 (뾰족)
      g.fillTriangle(23, 8, 19,  8, 26, 1);   // 오른쪽 귀
      g.fillStyle(0xff4444); g.fillCircle(13, 10, 2); g.fillCircle(19, 10, 2); // 눈
      g.fillStyle(0xf39c12); g.fillRect(13, 14, 6, 2);        // 이빨
    }},
    // 독액 마법사 — 어두운 보라 로브 + 지팡이
    { key: 'monster_mage', draw(g) {
      g.fillStyle(0x4a1580); g.fillRect(7, 10, 18, 18);  // 로브
      g.fillStyle(0x6c3483); g.fillRect(7, 10, 18, 6);   // 어깨망토
      g.fillStyle(0xd5d8dc); g.fillCircle(16, 7, 6);     // 얼굴
      g.fillStyle(0x5b2c6f); g.fillRect(3, 8, 3, 20);    // 지팡이
      g.fillStyle(0x00e5ff); g.fillCircle(4, 7, 4);      // 마법 구슬
      g.fillStyle(0xff4c00); g.fillCircle(14, 6, 2); g.fillCircle(18, 6, 2); // 눈
    }},
    ].forEach(({ key, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, 32, 32);
      g.destroy();
    });

    // 타일 텍스처
    // tile_grass — 부드러운 초록 + 은은한 점박이
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x2ecc71); g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x27ae60, 0.4);
      g.fillCircle(6,  7,  4); g.fillCircle(22, 5,  3);
      g.fillCircle(14, 18, 3.5); g.fillCircle(4,  25, 3);
      g.fillCircle(26, 22, 4); g.fillCircle(18, 29, 2.5);
      g.fillStyle(0x58d68d, 0.3);
      g.fillCircle(10, 12, 2.5); g.fillCircle(28, 14, 2);
      g.fillCircle(8,  28, 2);  g.fillCircle(24, 30, 2);
      g.lineStyle(1, 0x000000, 0.12); g.strokeRect(0, 0, 32, 32);
      g.generateTexture('tile_grass', 32, 32); g.destroy();
    }

    // tile_dirt — 황토색 + 흙 점박이
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x8B6914); g.fillRect(0, 0, 32, 32);
      g.fillStyle(0xa07820, 0.6);
      g.fillCircle(8,  8,  3); g.fillCircle(24, 6,  2.5);
      g.fillCircle(5,  22, 2); g.fillCircle(20, 26, 3);
      g.fillCircle(15, 15, 2.5); g.fillCircle(28, 18, 2);
      g.fillStyle(0x6b4f0f, 0.5);
      g.fillCircle(12, 4,  1.5); g.fillCircle(28, 28, 2);
      g.fillCircle(3,  30, 1.5); g.fillCircle(26, 14, 1.5);
      g.lineStyle(1, 0x000000, 0.15); g.strokeRect(0, 0, 32, 32);
      g.generateTexture('tile_dirt', 32, 32); g.destroy();
    }

    // tile_wall — 진한 네이비 + 벽돌 패턴
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x2c3e50); g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x1a252f, 0.9);
      // 가로 줄
      g.lineBetween(0, 8,  32, 8);
      g.lineBetween(0, 16, 32, 16);
      g.lineBetween(0, 24, 32, 24);
      // 세로 줄 (홀짝 엇갈림)
      g.lineBetween(16, 0,  16, 8);
      g.lineBetween(8,  8,  8,  16);
      g.lineBetween(24, 8,  24, 16);
      g.lineBetween(16, 16, 16, 24);
      g.lineBetween(8,  24, 8,  32);
      g.lineBetween(24, 24, 24, 32);
      g.lineStyle(1, 0x3d5166, 0.4);
      g.strokeRect(1, 1, 30, 30);
      g.lineStyle(1, 0x000000, 0.3); g.strokeRect(0, 0, 32, 32);
      g.generateTexture('tile_wall', 32, 32); g.destroy();
    }

    // tile_stone — 중간 회색 + 균열선 (장애물용)
    {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x7f8c8d); g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x95a5a6, 0.5);
      g.fillRect(2, 2, 13, 13); g.fillRect(17, 17, 13, 13);
      g.lineStyle(1, 0x566573, 0.8);
      g.lineBetween(0, 16, 32, 16);
      g.lineBetween(16, 0, 16, 32);
      g.lineStyle(1, 0x4d6068, 0.5);
      g.lineBetween(5, 2, 9, 14); g.lineBetween(22, 18, 26, 30);
      g.lineBetween(19, 3, 22, 12); g.lineBetween(3, 21, 7, 29);
      g.lineStyle(2, 0x000000, 0.25); g.strokeRect(0, 0, 32, 32);
      g.generateTexture('tile_stone', 32, 32); g.destroy();
    }

    // 아이템 텍스처 — 각 슬롯별 고유 실루엣
    const _mkItem = (key, fn) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x1a1a2e); g.fillRect(0, 0, 24, 24);
      fn(g);
      g.generateTexture(key, 24, 24); g.destroy();
    };

    // 검 — 날+손잡이
    _mkItem('item_sword', g => {
      g.fillStyle(0x95a5a6); g.fillRect(11, 2, 3, 14);   // 날
      g.fillStyle(0x7f8c8d); g.fillRect(7,  14, 11, 3);  // 가드
      g.fillStyle(0x6d4c41); g.fillRect(11, 17, 3, 5);   // 손잡이
    });
    // 활 — 곡선 + 시위
    _mkItem('item_bow', g => {
      g.fillStyle(0x8d6e3f); g.fillRect(5, 2, 3, 20);    // 활대
      g.fillStyle(0x6d4c20); g.fillRect(5, 2, 5, 3); g.fillRect(5, 19, 5, 3);
      g.lineStyle(1, 0xd4b896, 1.0);
      g.lineBetween(15, 3, 15, 21);                       // 시위
      g.lineBetween(8,  3, 15, 3); g.lineBetween(8, 21, 15, 21);
    });
    // 지팡이 — 막대 + 구슬
    _mkItem('item_staff', g => {
      g.fillStyle(0x6d4c41); g.fillRect(10, 6, 4, 18);   // 막대
      g.fillStyle(0x9b59b6); g.fillCircle(12, 5, 5);     // 마법 구슬
      g.fillStyle(0xd7bde2, 0.5); g.fillCircle(10, 3, 2); // 하이라이트
    });
    // 투구
    _mkItem('item_helmet', g => {
      g.fillStyle(0x7f8c8d); g.fillEllipse(12, 10, 16, 14); // 돔
      g.fillStyle(0x566573); g.fillRect(4, 14, 16, 5);       // 챙
      g.fillStyle(0x95a5a6, 0.4); g.fillEllipse(9, 8, 5, 4); // 광택
    });
    // 갑옷
    _mkItem('item_armor', g => {
      g.fillStyle(0x2980b9); g.fillRect(4, 6, 16, 14);   // 몸통
      g.fillStyle(0x1a5276); g.fillRect(4, 6, 16, 4);    // 어깨
      g.fillRect(4, 6, 3, 14); g.fillRect(17, 6, 3, 14); // 팔 연결부
      g.fillStyle(0x3498db, 0.4); g.fillRect(7, 9, 4, 8); // 광택
    });
    // 바지
    _mkItem('item_pants', g => {
      g.fillStyle(0x2471a3); g.fillRect(5, 3, 14, 8);    // 허리
      g.fillRect(5, 10, 6, 11);                          // 왼다리
      g.fillRect(13, 10, 6, 11);                         // 오른다리
      g.fillStyle(0x1a5276); g.fillRect(5, 3, 14, 2);    // 벨트
    });
    // 장갑
    _mkItem('item_gloves', g => {
      g.fillStyle(0x5d4037); g.fillRect(5, 8, 14, 10);   // 손등
      g.fillRect(5, 15, 3, 6); g.fillRect(9, 15, 3, 6);  // 손가락
      g.fillRect(13, 15, 3, 6); g.fillRect(17, 15, 3, 4);
      g.fillStyle(0x4e342e); g.fillRect(5, 8, 14, 3);    // 커프
    });
    // 부츠
    _mkItem('item_boots', g => {
      g.fillStyle(0x4e342e); g.fillRect(6, 3, 8, 13);    // 목
      g.fillStyle(0x5d4037); g.fillRect(4, 14, 14, 7);   // 발
      g.fillStyle(0x3e2723); g.fillRect(4, 19, 14, 2);   // 밑창
      g.fillStyle(0x6d4c41, 0.4); g.fillRect(7, 5, 3, 8); // 광택
    });
    // 반지
    _mkItem('item_ring', g => {
      g.lineStyle(3, 0xf39c12, 1.0); g.strokeCircle(12, 13, 7);
      g.fillStyle(0xe74c3c); g.fillCircle(12, 6, 4);     // 보석
      g.fillStyle(0xff8a8a, 0.6); g.fillCircle(11, 5, 2); // 하이라이트
    });
    // 목걸이
    _mkItem('item_necklace', g => {
      g.lineStyle(2, 0xf0d060, 0.9);
      g.strokeEllipse(12, 10, 16, 10);                   // 체인
      g.fillStyle(0x27aee0); g.fillEllipse(12, 18, 8, 6); // 펜던트
      g.fillStyle(0xaaddff, 0.5); g.fillCircle(11, 17, 2);
    });
    // 포션
    _mkItem('item_potion', g => {
      g.fillStyle(0x7f8c8d); g.fillRect(10, 2, 5, 4);    // 병목
      g.fillStyle(0xe74c3c); g.fillEllipse(12, 15, 14, 16); // 병몸통
      g.fillStyle(0xff8a8a, 0.4); g.fillEllipse(9, 12, 4, 6); // 광택
    });
    // HP 포션 (대) — 더 크고 진한 빨강
    _mkItem('item_potion_large', g => {
      g.fillStyle(0x7f8c8d); g.fillRect(9, 1, 6, 5);
      g.fillStyle(0xc0392b); g.fillEllipse(12, 14, 17, 19);
      g.fillStyle(0xe74c3c, 0.5); g.fillEllipse(9, 10, 5, 7);
      g.fillStyle(0xffffff, 0.2); g.fillEllipse(15, 18, 4, 4);
    });
    // MP 포션 (소) — 파란 병
    _mkItem('item_potion_mp', g => {
      g.fillStyle(0x7f8c8d); g.fillRect(10, 2, 5, 4);
      g.fillStyle(0x2980b9); g.fillEllipse(12, 15, 14, 16);
      g.fillStyle(0x74b9ff, 0.5); g.fillEllipse(9, 12, 4, 6);
    });

    // 재료 텍스처 — 장비와 구별되는 전용 아이콘
    // 철 광석 — 회색 덩어리
    _mkItem('mat_ore', g => {
      g.fillStyle(0x7f8c8d); g.fillEllipse(12, 14, 16, 12);
      g.fillStyle(0x95a5a6); g.fillEllipse(10, 11, 8, 6);
      g.fillStyle(0x566573); g.fillEllipse(16, 17, 6, 4);
    });
    // 단단한 가죽 — 갈색 타원형 가죽
    _mkItem('mat_leather', g => {
      g.fillStyle(0x8d6e3f); g.fillEllipse(12, 13, 18, 14);
      g.lineStyle(1, 0x6d4c20, 0.8);
      g.lineBetween(6, 10, 18, 10); g.lineBetween(6, 14, 18, 14); g.lineBetween(6, 18, 18, 18);
      g.fillStyle(0xa07840, 0.4); g.fillEllipse(9, 10, 6, 4);
    });
    // 흡혈 결정 — 붉은 다이아몬드 (fillPoints 사용)
    _mkItem('mat_crystal', g => {
      g.fillStyle(0xc0392b);
      g.fillPoints([
        { x: 12, y: 2 }, { x: 21, y: 12 },
        { x: 12, y: 22 }, { x: 3,  y: 12 },
      ], true);
      g.fillStyle(0xe74c3c, 0.6);
      g.fillPoints([
        { x: 12, y: 4 }, { x: 19, y: 11 },
        { x: 12, y: 11 },
      ], true);
      g.fillStyle(0xff6b6b, 0.4);
      g.fillPoints([
        { x: 12, y: 5 }, { x: 16, y: 9 },
        { x: 12, y: 9 },
      ], true);
    });
    // 심연석 원석 — 어두운 보라 육각형 (fillPoints 사용)
    _mkItem('mat_abyss', g => {
      g.fillStyle(0x4a235a);
      g.fillPoints([
        { x: 12, y: 2 }, { x: 21, y: 7 }, { x: 21, y: 17 },
        { x: 12, y: 22 }, { x: 3, y: 17 }, { x: 3, y: 7 },
      ], true);
      g.fillStyle(0x7d3c98, 0.5);
      g.fillPoints([
        { x: 12, y: 4 }, { x: 19, y: 8 }, { x: 12, y: 12 }, { x: 5, y: 8 },
      ], true);
      g.fillStyle(0xd7bde2, 0.3); g.fillCircle(10, 8, 2);
    });
    // 혈족의 문장 — 금/붉은 방패 문양
    _mkItem('mat_emblem', g => {
      g.fillStyle(0x922b21);
      g.fillTriangle(12, 2, 20, 7, 20, 17); g.fillTriangle(12, 2, 4, 7, 4, 17);
      g.fillRect(4, 16, 16, 4); g.fillTriangle(4, 19, 12, 23, 20, 19);
      g.fillStyle(0xf39c12); g.fillCircle(12, 11, 4);
      g.lineStyle(1, 0xe74c3c, 0.7);
      g.strokeCircle(12, 11, 4);
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

  // ── 절차적 효과음 생성 ─────────────────────────────────────
  createProceduralSounds() {
    const ctx = this.sound.context;
    if (!ctx) return;

    const mk = (duration, fn) => {
      const sr  = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.floor(sr * duration), sr);
      fn(buf.getChannelData(0), sr);
      return buf;
    };
    const add = (key, buf) => this.cache.audio.add(key, buf);

    // 1. 근접 공격 — 충격음 (노이즈 + 저음 펄스)
    add('sfx_melee', mk(0.15, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 25);
        d[i] = (Math.random() * 2 - 1) * e * 0.7
              + Math.sin(2 * Math.PI * 110 * t) * e * 0.5;
      }
    }));

    // 2. 원거리 발사 — 상승 "삐" (주파수 스윕)
    add('sfx_shoot', mk(0.12, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 20);
        d[i] = Math.sin(2 * Math.PI * (500 + 1000 * (t / 0.12)) * t) * e * 0.55;
      }
    }));

    // 3. 몬스터 피격 — 금속성 타격
    add('sfx_hit_monster', mk(0.1, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 40);
        d[i] = (Math.random() * 2 - 1) * e * 0.5
              + Math.sin(2 * Math.PI * 280 * t) * e * 0.4;
      }
    }));

    // 4. 플레이어 피격 — 둔탁한 저음 타격
    add('sfx_hit_player', mk(0.22, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 14);
        d[i] = (Math.random() * 2 - 1) * e * 0.35
              + Math.sin(2 * Math.PI * 75 * t) * e * 0.7;
      }
    }));

    // 5. 몬스터 사망 — 하강 노이즈
    add('sfx_monster_die', mk(0.35, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 9);
        const f = 200 - 130 * (t / 0.35);
        d[i] = (Math.random() * 2 - 1) * e * 0.3
              + Math.sin(2 * Math.PI * f * t) * e * 0.5;
      }
    }));

    // 6. 보스 사망 — 폭발 + 여운
    add('sfx_boss_die', mk(1.0, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 4);
        d[i] = ((Math.random() * 2 - 1) * 0.4
              + Math.sin(2 * Math.PI * 55 * t) * 0.45
              + Math.sin(2 * Math.PI * 85 * t) * 0.3) * e;
      }
    }));

    // 7. 레벨업 — 상승 아르페지오 (C5→E5→G5→C6)
    add('sfx_levelup', mk(0.7, (d, sr) => {
      const notes = [523, 659, 784, 1047];
      const step  = 0.175;
      for (let i = 0; i < d.length; i++) {
        const t  = i / sr;
        const ni = Math.min(Math.floor(t / step), 3);
        const nt = t - ni * step;
        const e  = Math.exp(-nt * 10);
        d[i] = Math.sin(2 * Math.PI * notes[ni] * t) * e * 0.6;
      }
    }));

    // 8. 플레이어 사망 — 하강 드론
    add('sfx_player_die', mk(1.1, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 2.8);
        const f = 280 - 200 * (t / 1.1);
        d[i] = Math.sin(2 * Math.PI * f * t) * e * 0.5
              + Math.sin(2 * Math.PI * (f * 0.5) * t) * e * 0.3;
      }
    }));

    // 9. 스킬 발동 — 에너지 스윕
    add('sfx_skill', mk(0.38, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.sin(Math.PI * t / 0.38);
        const f = 180 + 700 * Math.pow(t / 0.38, 0.5);
        d[i] = Math.sin(2 * Math.PI * f * t) * e * 0.55
              + (Math.random() * 2 - 1) * e * 0.12;
      }
    }));

    // 10. 구르기 — 빠른 스윙 노이즈
    add('sfx_dodge', mk(0.18, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.sin(Math.PI * t / 0.18);
        const f = 350 + 200 * Math.sin(Math.PI * t / 0.09);
        d[i] = (Math.random() * 2 - 1) * e * 0.35
              + Math.sin(2 * Math.PI * f * t) * e * 0.28;
      }
    }));
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
