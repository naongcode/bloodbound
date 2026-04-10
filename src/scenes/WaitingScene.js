// WaitingScene — 게임 시작 대기실 (파티원 목록, 채팅, 시작 버튼)
import Network from '../systems/NetworkManager.js';
import { JOB_DATA } from '../data/jobs.js';

const W = 1280, H = 720;

const JOB_COLORS = {
  warrior:   0x3498db,
  archer:    0x2ecc71,
  mage:      0x9b59b6,
  priest:    0xf1c40f,
  alchemist: 0xe67e22,
};

export default class WaitingScene extends Phaser.Scene {
  constructor() { super('WaitingScene'); }

  init(data) {
    this._room   = data.room;
    this._jobKey = data.jobKey ?? 'warrior';
    this._charId = data.charId ?? null;
    Network.room = this._room;
  }

  create() {
    this._chatLines = [];
    this._mode      = 'field'; // 'field' | 'dungeon'

    // 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a18);
    this._drawStars();

    // 타이틀
    this.add.text(W / 2, 38, this._room.name, {
      fontSize: '28px', fill: '#ffffff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, 76, `룸 ID: ${this._room.id}  |  최대 5인`, {
      fontSize: '14px', fill: '#666',
    }).setOrigin(0.5);

    // 패널들
    this._buildPlayerList();
    this._buildChatPanel();
    this._buildControlPanel();

    // 이벤트
    this._setupNetworkEvents();

    // 엔터 키 → 채팅
    this.input.keyboard.on('keydown-ENTER', () => this._sendChat());

    // 초기 플레이어 목록 렌더
    this._refreshPlayers();

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  _drawStars() {
    for (let i = 0; i < 80; i++) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.2 + 0.04);
      g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Math.random() * 1.2 + 0.3);
    }
  }

  // ── 플레이어 목록 (좌측) ─────────────────────
  _buildPlayerList() {
    const px = 60, py = 110, pw = 400, ph = 420;

    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x12122a, 0.94)
      .setStrokeStyle(2, 0x2a2a4a);

    this.add.text(px + pw / 2, py + 14, '파티원', {
      fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // 5슬롯
    this._playerCards = [];
    for (let i = 0; i < 5; i++) {
      const cy = py + 60 + i * 72;
      const accent = 0x2a2a4a;

      const cardBg = this.add.rectangle(px + pw / 2, cy, pw - 30, 60, 0x0d0d1e)
        .setStrokeStyle(1, accent);

      const hostIcon = this.add.text(px + 22, cy - 10, '', {
        fontSize: '13px', fill: '#f1c40f'
      });
      const nameTxt = this.add.text(px + 44, cy - 10, '', {
        fontSize: '15px', fill: '#fff', fontStyle: 'bold'
      });
      const jobTxt  = this.add.text(px + 44, cy + 8, '', {
        fontSize: '12px', fill: '#aaa'
      });
      const lvlTxt  = this.add.text(px + pw - 50, cy, '', {
        fontSize: '14px', fill: '#f1c40f', fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this._playerCards.push({ cardBg, hostIcon, nameTxt, jobTxt, lvlTxt });
    }
  }

  _refreshPlayers() {
    const players = this._room?.players ?? [];
    this._playerCards.forEach((card, i) => {
      const p = players[i];
      if (p) {
        const isHost  = p.id === this._room.host;
        const isMe    = p.id === Network.myId;
        const accent  = JOB_COLORS[p.jobKey] ?? 0x888888;
        const job     = JOB_DATA[p.jobKey];

        card.cardBg.setStrokeStyle(2, isMe ? 0x3498db : accent).setFillStyle(0x0d0d1e);
        card.hostIcon.setText(isHost ? '♛' : '').setStyle({ fill: '#f1c40f' });
        card.nameTxt.setText(isMe ? `${p.name} (나)` : p.name).setStyle({ fill: isMe ? '#5dade2' : '#fff' });
        card.jobTxt.setText(job?.name ?? p.jobKey);
        card.lvlTxt.setText(`Lv.${p.level}`);
      } else {
        card.cardBg.setFillStyle(0x070710).setStrokeStyle(1, 0x1a1a2a);
        card.hostIcon.setText('');
        card.nameTxt.setText('—').setStyle({ fill: '#333' });
        card.jobTxt.setText('');
        card.lvlTxt.setText('');
      }
    });
  }

  // ── 채팅 (우측) ─────────────────────────────
  _buildChatPanel() {
    const px = 490, py = 110, pw = 500, ph = 420;

    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x12122a, 0.94)
      .setStrokeStyle(2, 0x2a2a4a);

    this.add.text(px + pw / 2, py + 14, '채팅', {
      fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // 채팅 텍스트 라인 (최대 14줄)
    this._chatTextObjs = [];
    for (let i = 0; i < 14; i++) {
      this._chatTextObjs.push(
        this.add.text(px + 14, py + 42 + i * 25, '', {
          fontSize: '12px', fill: '#ccc', wordWrap: { width: pw - 28 }
        })
      );
    }

    // 입력창 (HTML DOM)
    this._chatInput = this.add.dom(px + pw / 2 - 30, py + ph - 20).createFromHTML(`
      <input id="chatInput" type="text" maxlength="60" placeholder="Enter 로 전송"
        style="width:340px;padding:6px 10px;background:#0d0d1e;border:1px solid #333;
               color:#fff;font-size:12px;border-radius:4px;outline:none;" />
    `);

    const sendBtn = this.add.rectangle(px + pw - 42, py + ph - 20, 68, 28, 0x1a1a3a)
      .setStrokeStyle(1, 0x4a4a7a).setInteractive({ useHandCursor: true });
    const sendTxt = this.add.text(px + pw - 42, py + ph - 20, '전송', {
      fontSize: '12px', fill: '#aaa'
    }).setOrigin(0.5);
    sendBtn.on('pointerdown', () => this._sendChat());
  }

  _sendChat() {
    const el = document.getElementById('chatInput');
    const msg = (el?.value ?? '').trim();
    if (!msg) return;
    Network.sendChat(msg);
    if (el) el.value = '';
  }

  _addChatLine(line, color = '#ccc') {
    this._chatLines.push({ line, color });
    if (this._chatLines.length > 14) this._chatLines.shift();
    this._chatTextObjs.forEach((t, i) => {
      const entry = this._chatLines[i];
      if (entry) {
        t.setText(entry.line).setStyle({ fill: entry.color });
      } else {
        t.setText('');
      }
    });
  }

  // ── 컨트롤 패널 (하단) ───────────────────────
  _buildControlPanel() {
    const by = H - 72;

    // 모드 선택 (필드 / 던전)
    this.add.text(W / 2 - 280, by - 16, '게임 모드:', {
      fontSize: '13px', fill: '#aaa'
    }).setOrigin(0, 0.5);

    // 필드 버튼
    this._fieldBtn = this.add.rectangle(W / 2 - 140, by - 16, 120, 30, 0x0a2a0a)
      .setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
    this._fieldTxt = this.add.text(W / 2 - 140, by - 16, '필드 플레이', {
      fontSize: '12px', fill: '#2ecc71'
    }).setOrigin(0.5);
    this._fieldBtn.on('pointerdown', () => this._setMode('field'));

    // 던전 버튼
    this._dungeonBtn = this.add.rectangle(W / 2 - 5, by - 16, 120, 30, 0x1a001a)
      .setStrokeStyle(2, 0x9b59b6).setInteractive({ useHandCursor: true });
    this._dungeonTxt = this.add.text(W / 2 - 5, by - 16, '던전 Co-op', {
      fontSize: '12px', fill: '#9b59b6'
    }).setOrigin(0.5);
    this._dungeonBtn.on('pointerdown', () => this._setMode('dungeon'));

    this._setMode('field');

    // 나가기 버튼
    const leaveBtn = this.add.rectangle(80, by, 120, 38, 0x2e0d0d)
      .setStrokeStyle(2, 0xe74c3c).setInteractive({ useHandCursor: true });
    const leaveTxt = this.add.text(80, by, '나가기', {
      fontSize: '14px', fill: '#e74c3c', fontStyle: 'bold'
    }).setOrigin(0.5);
    leaveBtn.on('pointerover', () => leaveBtn.setFillStyle(0x4a1a1a));
    leaveBtn.on('pointerout',  () => leaveBtn.setFillStyle(0x2e0d0d));
    leaveBtn.on('pointerdown', () => {
      Network.leaveRoom();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LobbyScene', { jobKey: this._jobKey, charId: this._charId });
      });
    });

    // 시작 버튼 (호스트만 활성)
    this._startBtn = this.add.rectangle(W / 2 + 340, by, 180, 44, 0x0d2e0d)
      .setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
    this._startTxt = this.add.text(W / 2 + 340, by, '게임 시작', {
      fontSize: '16px', fill: '#2ecc71', fontStyle: 'bold'
    }).setOrigin(0.5);
    this._startBtn.on('pointerover', () => { if (Network.isHost()) this._startBtn.setFillStyle(0x1a4a1a); });
    this._startBtn.on('pointerout',  () => this._startBtn.setFillStyle(0x0d2e0d));
    this._startBtn.on('pointerdown', () => {
      if (!Network.isHost()) return;
      Network.startGame(this._mode);
    });

    // 대기 힌트
    this._waitText = this.add.text(W / 2 + 340, by + 28, '', {
      fontSize: '11px', fill: '#666'
    }).setOrigin(0.5, 0);

    this._updateStartBtn();
  }

  _setMode(mode) {
    this._mode = mode;
    this._fieldBtn.setFillStyle(mode === 'field' ? 0x1a3a1a : 0x0a2a0a);
    this._dungeonBtn.setFillStyle(mode === 'dungeon' ? 0x2a1a3a : 0x1a001a);
  }

  _updateStartBtn() {
    const isHost = Network.isHost();
    const alpha  = isHost ? 1.0 : 0.4;
    this._startBtn.setAlpha(alpha);
    this._startTxt.setAlpha(alpha);
    this._waitText.setText(isHost ? '' : '호스트가 시작할 때까지 대기 중...');
  }

  // ── 네트워크 이벤트 ─────────────────────────
  _setupNetworkEvents() {
    const guard = fn => (...args) => {
      if (!this.scene?.isActive('WaitingScene')) return;
      fn(...args);
    };

    this._onRoomSync = guard(({ room }) => {
      this._room = room;
      Network.room = room;
      this._refreshPlayers();
      this._updateStartBtn();
    });

    this._onPlayerJoined = guard(({ room, newPresences }) => {
      this._room = room;
      Network.room = room;
      this._refreshPlayers();
      this._updateStartBtn();
      const newcomer = newPresences?.[0];
      if (newcomer && newcomer.id !== Network.myId) {
        this._addChatLine(`▶ ${newcomer.name} 님이 입장했습니다.`, '#2ecc71');
      }
    });

    this._onPlayerLeft = guard(({ room }) => {
      this._room = room;
      Network.room = room;
      this._refreshPlayers();
      this._updateStartBtn();
      this._addChatLine(`◀ 플레이어가 퇴장했습니다.`, '#e74c3c');
    });

    this._onChatMsg = guard(({ name, msg }) => {
      const isMe = (name === Network.playerName);
      this._addChatLine(`${name}: ${msg}`, isMe ? '#5dade2' : '#ccc');
    });

    this._onGameStarted = ({ mode, room }) => {
      Network.room = room;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        ['nameInput', 'chatInput'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.blur();
        });

        // 이전 게임 씬 정리
        this.scene.stop('UIScene');

        if (mode === 'dungeon') {
          this.scene.start('DungeonScene', { jobKey: this._jobKey, charId: this._charId, loadSave: true, multi: true });
        } else {
          this.scene.start('GameScene', { jobKey: this._jobKey, charId: this._charId, loadSave: true, multi: true });
          this.scene.launch('UIScene', { gameScene: this.scene.get('GameScene') });
        }
      });
    };

    Network.on('roomSync',     this._onRoomSync);
    Network.on('playerJoined', this._onPlayerJoined);
    Network.on('playerLeft',   this._onPlayerLeft);
    Network.on('chatMsg',      this._onChatMsg);
    Network.on('gameStarted',  this._onGameStarted);

    // 씬 종료 시 리스너 정리
    this.events.once('shutdown', () => {
      Network.off('roomSync',     this._onRoomSync);
      Network.off('playerJoined', this._onPlayerJoined);
      Network.off('playerLeft',   this._onPlayerLeft);
      Network.off('chatMsg',      this._onChatMsg);
      Network.off('gameStarted',  this._onGameStarted);
    });
  }
}
