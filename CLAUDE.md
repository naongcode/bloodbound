# Bloodbound Realm — Claude 작업 가이드

## 프로젝트 개요
- **엔진**: Phaser 3 (v3.90.0) + Vite
- **장르**: 웹 ARPG, 솔로 + 4~5인 Co-op 던전
- **맵 크기**: 3200 × 2400

## 구현 사항 기록 규칙

> **구현을 추가하거나 수정할 때마다 반드시 [PROGRESS.md](./PROGRESS.md)를 업데이트할 것.**

- 새 기능 완료 → `- [ ] ❌` 를 `- [x] ✅` 로 변경
- 진행 중인 작업 → `- [ ] 🔧` 로 표시
- 파일 하단 `_마지막 업데이트:` 날짜도 갱신

## 주요 파일 구조

```
src/
├── main.js                  # Phaser 설정, 씬 목록
├── scenes/
│   ├── BootScene.js         # 절차적 텍스처 생성 (이미지 파일 없음)
│   ├── GameScene.js         # 메인 게임 루프, 이벤트 허브
│   └── UIScene.js           # HUD, 인벤토리, 스탯 패널
├── entities/
│   ├── Player.js            # 플레이어 입력/이동/전투/스탯
│   ├── Monster.js           # 몬스터 AI/흡혈/방어파훼
│   └── Projectile.js        # 투사체 (순수 JS + Graphics, 물리엔진 없음)
├── systems/
│   ├── CombatSystem.js      # 데미지/흡혈/이펙트 계산
│   ├── LevelSystem.js       # XP/레벨업/스탯 성장
│   └── InventorySystem.js   # 아이템/장비/골드
└── data/
    ├── jobs.js              # 직업 5종 스탯 테이블
    ├── monsters.js          # 몬스터 데이터
    └── items.js             # 아이템 데이터
```

## 핵심 설계 결정 (변경 주의)

### 투사체 시스템
- `Projectile`은 `Phaser.Physics.Arcade.Sprite`를 **상속하지 않음**
- `scene.add.graphics()`로 직접 그리고, `tick(delta, monsters, scene)` 수동 호출
- `GameScene.checkProjectiles(delta)` → `b.tick(delta, monsterList, this)` 순서 필수

### 몬스터 그룹
- `this.monsters = this.add.group()` 사용 (**`physics.add.group()` 절대 사용 금지**)
- Monster 자체가 `physics.add.existing(this)`로 바디를 가짐
- physics.add.group()으로 add()하면 바디가 충돌하여 이동 불가 버그 발생

### 직업별 공격 타입
```js
// Player.js
const meleeJobs = ['warrior', 'knight', 'berserker', 'priest', 'alchemist'];
this.attackType = meleeJobs.includes(jobKey) ? 'melee' : 'ranged';
```

### 이벤트 흐름
```
Player.shoot()
  → scene.events.emit('playerShoot' or 'playerMelee')
  → GameScene.setupEvents() 핸들러
  → Projectile 생성 or 근접 범위 체크
```

## 개발 명령어

```bash
npm run dev    # 개발 서버 (localhost:5173)
npm run build  # 프로덕션 빌드
```

## 다음 구현 우선순위

1. 직업 선택 화면
2. 스킬 시스템 (직업별 액티브 1~2개)
3. 상점 / NPC
4. 세이브/로드 (localStorage)
5. 던전 시스템 (Phase 2)
