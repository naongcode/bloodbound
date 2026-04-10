// LobbyScene — 멀티플레이 로비 (닉네임 입력, 룸 목록, 생성/참가)
import Network from '../systems/NetworkManager.js';
import { JOB_DATA } from '../data/jobs.js';
import SaveSystem from '../systems/SaveSystem.js';

const JOB_COLORS = {
  warrior: 0x3498db, archer: 0x2ecc71, mage: 0x9b59b6,
  priest: 0xf1c40f, alchemist: 0xe67e22, berserker: 0xe74c3c, knight: 0x95a5a6,
};
const JOB_NAMES = {
  warrior: '전사', archer: '궁수', mage: '마법사',
  priest: '성직자', alchemist: '연금술사', berserker: '광전사', knight: '나이트',
};

const W = 1280, H = 720;

export default class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }

  init(data) {
    this._jobKey = data?.jobKey ?? 'warrior';
    this._charId = data?.charId ?? null;
  }

  create() {
    this._rooms      = [];
    this._connecting = false;
    this._errMsg     = '';

    // 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a18);
    this._drawStars();

    // 타이틀
    this.add.text(W / 2, 48, 'Bloodbound Realm', {
      fontSize: '36px', fill: '#e74c3c', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 96, '멀티플레이 로비', {
      fontSize: '16px', fill: '#888',
    }).setOrigin(0.5);

    // ── 왼쪽: 내 정보 입력 ──────────────────────
    this._buildLeftPanel();

    // ── 오른쪽: 룸 목록 ─────────────────────────
    this._buildRoomList();

    // ── 하단 버튼 ────────────────────────────────
    this._buildBottomBar();

    // ── 에러 텍스트 ──────────────────────────────
    this._errText = this.add.text(W / 2, H - 20, '', {
      fontSize: '13px', fill: '#e74c3c', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1);

    // 연결 시도
    this._connect();

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  _drawStars() {
    for (let i = 0; i < 100; i++) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, Math.random() * 0.3 + 0.05);
      g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Math.random() * 1.2 + 0.3);
    }
  }

  _buildLeftPanel() {
    const px = 40, py = 130, pw = 360, ph = 480;
    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x12122a, 0.92)
      .setStrokeStyle(2, 0x2a2a4a);

    this.add.text(px + pw / 2, py + 16, '내 정보', {
      fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // ── 닉네임 입력 ──────────────────────────────
    this.add.text(px + 16, py + 44, '닉네임', { fontSize: '13px', fill: '#aaa' });
    this._nameInput = this.add.dom(px + pw / 2, py + 74).createFromHTML(`
      <input id="nameInput" type="text" maxlength="12" placeholder="닉네임 입력 (2~12자)"
        style="width:310px;padding:8px 12px;background:#0d0d1e;border:1px solid #444466;
               color:#fff;font-size:14px;border-radius:4px;outline:none;" />
    `);
    const saved = localStorage.getItem('bb_name') ?? '';
    if (saved) setTimeout(() => {
      const el = document.getElementById('nameInput');
      if (el) el.value = saved;
    }, 100);

    // ── 캐릭터 선택 ───────────────────────────────
    this.add.text(px + 16, py + 108, '캐릭터 선택', { fontSize: '13px', fill: '#aaa' });

    const chars = SaveSystem.loadAllCharsSync();
    this._charRows = [];
    const rowH = 34, rowGap = 5;
    const listTop = py + 128;

    if (chars.length === 0) {
      this.add.text(px + pw / 2, listTop + 60, '저장된 캐릭터가 없습니다.', {
        fontSize: '13px', fill: '#555', align: 'center'
      }).setOrigin(0.5);
    } else {
      chars.forEach((char, i) => {
        const ry   = listTop + i * (rowH + rowGap);
        const accent = JOB_COLORS[char.jobKey] ?? 0x888888;
        const isSelected = (char.charId === this._charId);

        const rowBg = this.add.rectangle(px + pw / 2, ry + rowH / 2, pw - 24, rowH,
          isSelected ? 0x1e2a3a : 0x0d0d20)
          .setStrokeStyle(2, isSelected ? accent : 0x2a2a44)
          .setInteractive({ useHandCursor: true });

        // 직업 색상 바
        this.add.rectangle(px + 12 + 5, ry + rowH / 2, 6, rowH - 8, accent, 0.9);

        const jobName  = JOB_NAMES[char.jobKey] ?? char.jobKey;
        const nameTxt  = this.add.text(px + 28, ry + rowH / 2,
          `${jobName}  Lv.${char.level ?? 1}`, {
          fontSize: '14px', fill: isSelected ? '#ffffff' : '#aaaaaa', fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        const levelTxt = null;

        // 선택 표시
        const checkTxt = this.add.text(px + pw - 28, ry + rowH / 2, isSelected ? '✔' : '', {
          fontSize: '14px', fill: '#2ecc71'
        }).setOrigin(1, 0.5);

        this._charRows.push({ rowBg, nameTxt, checkTxt, char, accent });

        rowBg.on('pointerover', () => {
          if (char.charId !== this._charId) rowBg.setFillStyle(0x1a1a30);
        });
        rowBg.on('pointerout', () => {
          rowBg.setFillStyle(char.charId === this._charId ? 0x1e2a3a : 0x0d0d20);
        });
        rowBg.on('pointerdown', () => this._selectChar(char));
      });
    }

    // ── 서버 연결 상태 ────────────────────────────
    const statusY = listTop + 5 * (rowH + rowGap) + 10;
    this.add.text(px + 16, statusY, '서버', { fontSize: '13px', fill: '#aaa' });
    this._connStatus = this.add.text(px + pw / 2, statusY + 20, '연결 중...', {
      fontSize: '13px', fill: '#f39c12', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // ── 솔로 플레이 버튼 ──────────────────────────
    const soloBtn = this.add.rectangle(px + pw / 2, py + ph - 32, pw - 40, 36, 0x0d1f0d)
      .setStrokeStyle(2, 0x2ecc71).setInteractive({ useHandCursor: true });
    const soloTxt = this.add.text(px + pw / 2, py + ph - 32, '솔로 플레이', {
      fontSize: '14px', fill: '#2ecc71', fontStyle: 'bold'
    }).setOrigin(0.5);
    soloBtn.on('pointerover', () => soloBtn.setFillStyle(0x1a3a1a));
    soloBtn.on('pointerout',  () => soloBtn.setFillStyle(0x0d1f0d));
    soloBtn.on('pointerdown', () => {
      Network.disconnect();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          jobKey: this._jobKey, charId: this._charId, loadSave: !!this._charId
        });
      });
    });
  }

  _selectChar(char) {
    this._charId = char.charId;
    this._jobKey = char.jobKey;
    Network.jobKey = char.jobKey;

    // 선택 표시 갱신
    this._charRows?.forEach(row => {
      const sel = row.char.charId === char.charId;
      row.rowBg.setFillStyle(sel ? 0x1e2a3a : 0x0d0d20)
               .setStrokeStyle(2, sel ? row.accent : 0x2a2a44);
      row.nameTxt.setStyle({ fill: sel ? '#ffffff' : '#aaaaaa' });
      row.checkTxt.setText(sel ? '✔' : '');
    });
  }

  _buildRoomList() {
    const px = 430, py = 130, pw = 810, ph = 480;
    this._listPanel = this.add.container(px, py);

    const bg = this.add.rectangle(pw / 2, ph / 2, pw, ph, 0x12122a, 0.92)
      .setStrokeStyle(2, 0x2a2a4a);
    this._listPanel.add(bg);

    this.add.text(px + pw / 2, py + 16, '룸 목록', {
      fontSize: '16px', fill: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // 룸 항목들 (최대 8개)
    this._roomRows = [];
    for (let i = 0; i < 8; i++) {
      const ry = 52 + i * 52;
      const rowBg = this.add.rectangle(pw / 2, ry + 20, pw - 30, 44, 0x0d0d1e)
        .setStrokeStyle(1, 0x333355).setInteractive({ useHandCursor: true });
      const nameTxt = this.add.text(20, ry + 8, '', { fontSize: '14px', fill: '#fff', fontStyle: 'bold' });
      const infoTxt = this.add.text(20, ry + 28, '', { fontSize: '11px', fill: '#888' });
      const cntTxt  = this.add.text(pw - 80, ry + 20, '', { fontSize: '18px', fill: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
      const joinBtn = this.add.rectangle(pw - 40, ry + 20, 56, 28, 0x0a2a1a)
        .setStrokeStyle(1, 0x2ecc71).setInteractive({ useHandCursor: true });
      const joinTxt = this.add.text(pw - 40, ry + 20, '참가', { fontSize: '12px', fill: '#2ecc71' }).setOrigin(0.5);

      this._listPanel.add([rowBg, nameTxt, infoTxt, cntTxt, joinBtn, joinTxt]);

      const row = { rowBg, nameTxt, infoTxt, cntTxt, joinBtn, joinTxt, roomData: null };
      this._roomRows.push(row);

      rowBg.on('pointerover', () => { if (row.roomData) rowBg.setFillStyle(0x1a1a3a); });
      rowBg.on('pointerout',  () => { if (row.roomData) rowBg.setFillStyle(0x0d0d1e); });

      const tryJoin = () => {
        if (!row.roomData) return;
        this._joinRoom(row.roomData.id);
      };
      rowBg.on('pointerdown', tryJoin);
      joinBtn.on('pointerdown', tryJoin);
      joinBtn.on('pointerover', () => joinBtn.setFillStyle(0x1a3a2a));
      joinBtn.on('pointerout',  () => joinBtn.setFillStyle(0x0a2a1a));
    }

    // 새로고침 버튼
    const refBtn = this.add.rectangle(pw - 60, 24, 88, 26, 0x1a1a2e)
      .setStrokeStyle(1, 0x4a4a7a).setInteractive({ useHandCursor: true });
    const refTxt = this.add.text(pw - 60, 24, '새로고침', { fontSize: '11px', fill: '#aaa' }).setOrigin(0.5);
    refBtn.on('pointerdown', () => Network.getRooms());
    this._listPanel.add([refBtn, refTxt]);

    // 빈 목록 텍스트
    this._emptyText = this.add.text(pw / 2, ph / 2, '룸이 없습니다.\n룸을 만들어 시작하세요!', {
      fontSize: '15px', fill: '#555', align: 'center'
    }).setOrigin(0.5).setVisible(false);
    this._listPanel.add(this._emptyText);

    // 채팅 패널 (하단)
    this._chatLines  = [];
    this._chatTexts  = [];
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(px + 16, py + ph + 8 + i * 18, '', {
        fontSize: '12px', fill: '#888', stroke: '#000', strokeThickness: 2
      });
      this._chatTexts.push(t);
    }
  }

  _buildBottomBar() {
    const barY = H - 58;

    // 룸 만들기 버튼
    const createBtn = this.add.rectangle(W / 2 - 80, barY, 220, 40, 0x1a001a)
      .setStrokeStyle(2, 0x9b59b6).setInteractive({ useHandCursor: true });
    const createTxt = this.add.text(W / 2 - 80, barY, '룸 만들기', {
      fontSize: '15px', fill: '#bb88ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    createBtn.on('pointerover', () => createBtn.setFillStyle(0x2a0040));
    createBtn.on('pointerout',  () => createBtn.setFillStyle(0x1a001a));
    createBtn.on('pointerdown', () => this._createRoom());

    // 직접 ID 참가 버튼
    const directBtn = this.add.rectangle(W / 2 + 80, barY, 220, 40, 0x001a2a)
      .setStrokeStyle(2, 0x3498db).setInteractive({ useHandCursor: true });
    const directTxt = this.add.text(W / 2 + 80, barY, 'ID로 참가', {
      fontSize: '15px', fill: '#5dade2', fontStyle: 'bold'
    }).setOrigin(0.5);
    directBtn.on('pointerover', () => directBtn.setFillStyle(0x00243a));
    directBtn.on('pointerout',  () => directBtn.setFillStyle(0x001a2a));
    directBtn.on('pointerdown', () => {
      const id = prompt('룸 ID를 입력하세요:');
      if (id) this._joinRoom(id.trim().toUpperCase());
    });
  }

  // ── 네트워크 연결 ─────────────────────────────
  _connect() {
    Network.connect();
    Network.jobKey = this._jobKey;

    // 씬이 살아있을 때만 실행하는 핸들러 래퍼
    const guard = fn => (...args) => {
      if (!this.scene?.isActive('LobbyScene')) return;
      fn(...args);
    };

    // 연결 상태 확인 (폴링)
    this.time.addEvent({
      delay: 500, repeat: 10,
      callback: () => {
        if (!this.scene?.isActive('LobbyScene')) return;
        if (Network.connected) {
          this._connStatus?.setText('● 연결됨').setStyle({ fill: '#2ecc71' });
          Network.getRooms();
          this.time.addEvent({ delay: 4000, loop: true, callback: () => {
            if (this.scene?.isActive('LobbyScene')) Network.getRooms();
          }});
        } else {
          this._connStatus?.setText('✕ 연결 실패 (서버 미실행)').setStyle({ fill: '#e74c3c' });
        }
      },
      callbackScope: this,
    });

    // 이벤트 구독 (씬 종료 시 off로 정리)
    this._onRoomList   = guard(rooms => { this._rooms = rooms; this._updateRoomList(); });
    this._onRoomCreated= guard(({ room }) => { Network.room = room; this._gotoWaiting(room); });
    this._onRoomJoined = guard(({ room }) => { Network.room = room; this._gotoWaiting(room); });
    this._onJoinError  = guard(msg => this._showError(msg));
    this._onChatMsg    = guard(({ name, msg }) => this._addChatLine(`${name}: ${msg}`));

    Network.on('roomList',    this._onRoomList);
    Network.on('roomCreated', this._onRoomCreated);
    Network.on('roomJoined',  this._onRoomJoined);
    Network.on('joinError',   this._onJoinError);
    Network.on('chatMsg',     this._onChatMsg);

    // 씬 종료 시 리스너 정리
    this.events.once('shutdown', () => {
      Network.off('roomList',    this._onRoomList);
      Network.off('roomCreated', this._onRoomCreated);
      Network.off('roomJoined',  this._onRoomJoined);
      Network.off('joinError',   this._onJoinError);
      Network.off('chatMsg',     this._onChatMsg);
    });
  }

  _updateRoomList() {
    if (!this.scene?.isActive('LobbyScene')) return;
    const rooms = this._rooms ?? [];

    this._emptyText?.setVisible(rooms.length === 0);
    this._roomRows.forEach((row, i) => {
      const room = rooms[i];
      row.roomData = room ?? null;
      if (room) {
        row.nameTxt.setText(room.name).setStyle({ fill: '#fff' });
        row.infoTxt.setText(`ID: ${room.id}  |  호스트 참가 대기 중`);
        row.cntTxt.setText(`${room.count}/5`);
        row.joinBtn.setVisible(true);
        row.joinTxt.setVisible(true);
        row.rowBg.setAlpha(1).setFillStyle(0x0d0d1e);
      } else {
        row.nameTxt.setText('');
        row.infoTxt.setText('');
        row.cntTxt.setText('');
        row.joinBtn.setVisible(false);
        row.joinTxt.setVisible(false);
        row.rowBg.setFillStyle(0x080810).setAlpha(0.4);
      }
    });
  }

  _getNameFromInput() {
    const el = document.getElementById('nameInput');
    const name = (el?.value ?? '').trim();
    return name;
  }

  _createRoom() {
    if (!Network.connected) { this._showError('서버에 연결되지 않았습니다.'); return; }
    const name = this._getNameFromInput();
    if (name.length < 2) { this._showError('닉네임을 2자 이상 입력하세요.'); return; }

    localStorage.setItem('bb_name', name);
    Network.playerName = name;
    Network.jobKey     = this._jobKey;

    const roomName = `${name}의 파티`;
    Network.createRoom(roomName);
  }

  _joinRoom(roomId) {
    if (!Network.connected) { this._showError('서버에 연결되지 않았습니다.'); return; }
    const name = this._getNameFromInput();
    if (name.length < 2) { this._showError('닉네임을 2자 이상 입력하세요.'); return; }

    localStorage.setItem('bb_name', name);
    Network.playerName = name;
    Network.jobKey     = this._jobKey;
    Network.joinRoom(roomId);
  }

  _gotoWaiting(room) {
    // DOM 입력창 정리
    const el = document.getElementById('nameInput');
    if (el) el.blur();

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WaitingScene', { room, jobKey: this._jobKey, charId: this._charId });
    });
  }

  _showError(msg) {
    this._errText?.setText(msg);
    this.time.delayedCall(3000, () => this._errText?.setText(''));
  }

  _addChatLine(line) {
    this._chatLines.push(line);
    if (this._chatLines.length > 3) this._chatLines.shift();
    this._chatTexts.forEach((t, i) => t.setText(this._chatLines[i] ?? ''));
  }
}
