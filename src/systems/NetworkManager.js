// NetworkManager — Supabase Realtime 기반 멀티플레이 싱글턴
// server.js / Socket.io 불필요. 브라우저에서 직접 Supabase에 연결.
import { supabase } from './supabase.js';

class NetworkManager {
  constructor() {
    this.connected   = false;
    this.myId        = null;   // 로컬 생성 UUID (소켓 id 대체)
    this.room        = null;   // 현재 참가 중인 룸 (직렬화된 객체)
    this.playerName  = '';
    this.jobKey      = 'warrior';

    this._handlers   = {};     // event → Set<fn>
    this._roomCh     = null;   // Supabase Realtime 채널
    this._dbRoom     = null;   // DB rooms 행 (raw)
  }

  // ── 연결 (즉시 완료, 비동기 없음) ───────────────
  connect() {
    if (this.connected) return;
    // 짧은 고유 ID 생성 (소켓 id 역할)
    this.myId      = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    this.connected = true;
    console.log('[Network] ready, myId:', this.myId);
  }

  disconnect() {
    this._leaveChannel();
    this.connected = false;
    this.room      = null;
    this._dbRoom   = null;
  }

  // ── 로컬 이벤트 에미터 ─────────────────────────
  on(event, cb)  { (this._handlers[event] ??= new Set()).add(cb); }
  off(event, cb) { this._handlers[event]?.delete(cb); }
  _emit(event, data) {
    this._handlers[event]?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[Network] handler error:', e); }
    });
  }

  // ── 룸 목록 조회 ────────────────────────────────
  async getRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('in_game', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) { console.warn('[Network] getRooms:', error.message); return; }
    this._emit('roomList', (data ?? []).map(r => this._dbToRoom(r)));
  }

  // ── 룸 생성 ─────────────────────────────────────
  async createRoom(roomName) {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('rooms')
      .insert({ id, name: roomName, host_id: this.myId, player_count: 1 })
      .select()
      .single();

    if (error) { this._emit('joinError', '룸 생성 실패: ' + error.message); return; }

    this._dbRoom = data;
    await this._subscribeRoom(data.id);

    this.room = this._buildRoom();
    this._emit('roomCreated', { roomId: data.id, room: this.room });
  }

  // ── 룸 참가 ─────────────────────────────────────
  async joinRoom(roomId) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single();

    if (error || !data)       { this._emit('joinError', '존재하지 않는 룸입니다.'); return; }
    if (data.in_game)         { this._emit('joinError', '이미 게임이 시작되었습니다.'); return; }
    if (data.player_count >= 5) { this._emit('joinError', '룸이 가득 찼습니다 (최대 5인).'); return; }

    // 카운트 증가
    await supabase
      .from('rooms')
      .update({ player_count: data.player_count + 1 })
      .eq('id', data.id);

    this._dbRoom = { ...data, player_count: data.player_count + 1 };
    await this._subscribeRoom(data.id);

    this.room = this._buildRoom();
    this._emit('roomJoined', { roomId: data.id, room: this.room });
  }

  // ── 룸 퇴장 ─────────────────────────────────────
  async leaveRoom() {
    if (!this._dbRoom) return;
    const { id, player_count, host_id } = this._dbRoom;

    if (player_count <= 1) {
      // 마지막 플레이어 → 룸 삭제
      await supabase.from('rooms').delete().eq('id', id);
    } else {
      await supabase.from('rooms').update({ player_count: player_count - 1 }).eq('id', id);
      // 호스트가 나가면 다음 플레이어에게 위임
      if (host_id === this.myId) {
        const others = this._getPresencePlayers().filter(p => p.id !== this.myId);
        if (others.length > 0) {
          const newHost = others[0].id;
          await supabase.from('rooms').update({ host_id: newHost }).eq('id', id);
          this._roomCh?.send({
            type: 'broadcast', event: 'hostChanged', payload: { newHost },
          });
        }
      }
    }

    this._leaveChannel();
    this.room    = null;
    this._dbRoom = null;
  }

  // ── 게임 시작 (호스트 전용) ──────────────────────
  async startGame(mode = 'field') {
    if (!this.isHost() || !this._dbRoom) return;

    await supabase.from('rooms').update({
      in_game: true, in_dungeon: mode === 'dungeon',
    }).eq('id', this._dbRoom.id);

    const room = this._buildRoom();
    this.room   = room;

    // 다른 플레이어에게 브로드캐스트
    this._roomCh?.send({ type: 'broadcast', event: 'gameStarted', payload: { mode, room } });
    // 호스트 자신도 처리
    this._emit('gameStarted', { mode, room });
  }

  // ── 인게임 동기화 ────────────────────────────────
  sendPlayerState(data) {
    this._roomCh?.send({
      type: 'broadcast', event: 'playerState',
      payload: { id: this.myId, ...data },
    });
  }

  sendWaveCleared(waveIdx) {
    if (!this.isHost()) return;
    this._roomCh?.send({ type: 'broadcast', event: 'waveCleared', payload: { waveIdx } });
  }

  sendDungeonCleared() {
    if (!this.isHost()) return;
    this._roomCh?.send({ type: 'broadcast', event: 'dungeonCleared', payload: {} });
    this._emit('dungeonClearedSync', {}); // 호스트 자신도 처리
  }

  sendChat(msg) {
    this._roomCh?.send({
      type: 'broadcast', event: 'chat',
      payload: { name: this.playerName, msg },
    });
    this._emit('chatMsg', { name: this.playerName, msg }); // 본인도 채팅창에 표시
  }

  // ── 길드 공지 (멀티) ─────────────────────────────
  sendGuildNotice(msg) {
    this._roomCh?.send({ type: 'broadcast', event: 'guildNotice', payload: { msg } });
  }

  // ── 헬퍼 ────────────────────────────────────────
  isHost()   { return this._dbRoom?.host_id === this.myId; }
  isInRoom() { return !!this.room; }
  isMulti()  { return this.isInRoom() && (this.room?.players?.length ?? 0) > 1; }

  _getPresencePlayers() {
    if (!this._roomCh) return [];
    return Object.values(this._roomCh.presenceState()).flat();
  }

  /** DB 행 → 씬에서 사용하는 room 객체 */
  _dbToRoom(dbRow, players = []) {
    return {
      id:        dbRow.id,
      name:      dbRow.name,
      host:      dbRow.host_id,
      players,
      inGame:    dbRow.in_game,
      inDungeon: dbRow.in_dungeon,
      count:     dbRow.player_count ?? players.length,
    };
  }

  /** 현재 presence 상태를 반영한 room 객체 생성 */
  _buildRoom() {
    if (!this._dbRoom) return null;
    const players = this._getPresencePlayers();
    return { ...this._dbToRoom(this._dbRoom), players, count: players.length };
  }

  // ── Realtime 채널 구독 ───────────────────────────
  async _subscribeRoom(roomId) {
    this._roomCh = supabase.channel(`room:${roomId}`, {
      config: {
        presence:  { key: this.myId },
        broadcast: { self: false },   // 자신이 보낸 broadcast는 수신 안 함 (필요시 직접 _emit)
      },
    });

    // ── Presence 이벤트 ────────────────────────────
    this._roomCh
      .on('presence', { event: 'sync' }, () => {
        if (!this.room) return;
        const players = this._getPresencePlayers();
        this.room = { ...this.room, players, count: players.length };
      })
      .on('presence', { event: 'join' }, () => {
        const players = this._getPresencePlayers();
        if (this.room) {
          this.room = { ...this.room, players, count: players.length };
          this._emit('playerJoined', { room: this.room });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftId  = leftPresences[0]?.id;
        const players = this._getPresencePlayers();
        if (this.room) {
          this.room = { ...this.room, players, count: players.length };
          this._emit('playerLeft', { id: leftId, room: this.room });
        }
      })

    // ── Broadcast 이벤트 ───────────────────────────
      .on('broadcast', { event: 'chat' },          ({ payload }) => this._emit('chatMsg', payload))
      .on('broadcast', { event: 'gameStarted' },   ({ payload }) => {
        this.room = payload.room;
        this._emit('gameStarted', payload);
      })
      .on('broadcast', { event: 'playerState' },   ({ payload }) => this._emit('playerStateUpdate', payload))
      .on('broadcast', { event: 'waveCleared' },   ({ payload }) => this._emit('waveSync', payload))
      .on('broadcast', { event: 'dungeonCleared'}, ()           => this._emit('dungeonClearedSync', {}))
      .on('broadcast', { event: 'guildNotice' },   ({ payload }) => this._emit('guildNotice', payload))
      .on('broadcast', { event: 'hostChanged' },   ({ payload }) => {
        if (this._dbRoom) this._dbRoom.host_id = payload.newHost;
        if (this.room)    this.room.host        = payload.newHost;
      });

    // ── 구독 + Presence 등록 완료까지 대기 ──────────
    await new Promise(resolve => {
      let resolved = false;

      // sync는 구독 즉시 발생할 수 있으므로 먼저 등록
      this._roomCh.on('presence', { event: 'sync' }, () => {
        if (!resolved) { resolved = true; resolve(); }
      });

      this._roomCh.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await this._roomCh.track({
            id:     this.myId,
            name:   this.playerName,
            jobKey: this.jobKey,
            x: 1600, y: 1200,
            hp: 0, maxHp: 0, level: 1,
          });
          // sync가 늦게 오면 500ms 후 강제 resolve
          setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 500);
        }
      });
    });
  }

  _leaveChannel() {
    if (!this._roomCh) return;
    this._roomCh.untrack();
    this._roomCh.unsubscribe();
    this._roomCh = null;
  }
}

export default new NetworkManager();
