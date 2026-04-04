import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// rooms: Map<roomId, Room>
// Room = { id, name, host(socketId), players: Map<socketId, PlayerInfo>, inGame, inDungeon }
const rooms     = new Map();
const socketRoom = new Map(); // socketId → roomId

function genId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function serializeRoom(room) {
  return {
    id:        room.id,
    name:      room.name,
    host:      room.host,
    players:   [...room.players.values()],
    inGame:    room.inGame,
    inDungeon: room.inDungeon,
    count:     room.players.size,
  };
}

function getRoomList() {
  return [...rooms.values()]
    .filter(r => !r.inGame)
    .map(serializeRoom);
}

function handleLeave(socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  socketRoom.delete(socket.id);
  socket.leave(roomId);

  const room = rooms.get(roomId);
  if (!room) return;
  room.players.delete(socket.id);

  if (room.players.size === 0) {
    rooms.delete(roomId);
  } else {
    // 호스트 이탈 시 다음 플레이어로 위임
    if (room.host === socket.id) {
      room.host = room.players.keys().next().value;
    }
    io.to(roomId).emit('playerLeft', { id: socket.id, room: serializeRoom(room) });
  }
  io.emit('roomList', getRoomList());
}

io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  // ── 룸 목록 조회 ─────────────────────────────
  socket.on('getRooms', () => {
    socket.emit('roomList', getRoomList());
  });

  // ── 룸 생성 ──────────────────────────────────
  socket.on('createRoom', ({ roomName, playerName, jobKey }) => {
    const roomId = genId();
    const room = {
      id:        roomId,
      name:      roomName || `${playerName}의 파티`,
      host:      socket.id,
      players:   new Map([[socket.id, {
        id: socket.id, name: playerName, jobKey,
        x: 1600, y: 1200, hp: 0, maxHp: 0, level: 1,
      }]]),
      inGame:    false,
      inDungeon: false,
    };
    rooms.set(roomId, room);
    socketRoom.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('roomCreated', { roomId, room: serializeRoom(room) });
    io.emit('roomList', getRoomList());
  });

  // ── 룸 참가 ──────────────────────────────────
  socket.on('joinRoom', ({ roomId, playerName, jobKey }) => {
    const room = rooms.get(roomId);
    if (!room)              { socket.emit('joinError', '존재하지 않는 룸입니다.');   return; }
    if (room.players.size >= 5) { socket.emit('joinError', '룸이 가득 찼습니다 (최대 5인).'); return; }
    if (room.inGame)        { socket.emit('joinError', '이미 게임이 시작되었습니다.'); return; }

    room.players.set(socket.id, {
      id: socket.id, name: playerName, jobKey,
      x: 1600, y: 1200, hp: 0, maxHp: 0, level: 1,
    });
    socketRoom.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('roomJoined', { roomId, room: serializeRoom(room) });
    io.to(roomId).emit('playerJoined', { room: serializeRoom(room) });
    io.emit('roomList', getRoomList());
  });

  // ── 룸 퇴장 ──────────────────────────────────
  socket.on('leaveRoom', () => handleLeave(socket));

  // ── 게임 시작 (호스트 전용) ───────────────────
  socket.on('startGame', ({ mode }) => {
    const roomId = socketRoom.get(socket.id);
    const room   = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;

    room.inGame    = true;
    room.inDungeon = (mode === 'dungeon');
    io.to(roomId).emit('gameStarted', { mode, room: serializeRoom(room) });
    io.emit('roomList', getRoomList());
  });

  // ── 플레이어 상태 동기화 (위치/HP/MP/레벨) ────
  socket.on('playerState', data => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room)   return;

    const p = room.players.get(socket.id);
    if (p) Object.assign(p, data);

    // 같은 룸의 다른 플레이어에게 브로드캐스트
    socket.to(roomId).emit('playerStateUpdate', { id: socket.id, ...data });
  });

  // ── 던전 웨이브 동기화 (호스트 권한) ─────────
  socket.on('waveCleared', ({ waveIdx }) => {
    const roomId = socketRoom.get(socket.id);
    const room   = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;
    socket.to(roomId).emit('waveSync', { waveIdx });
  });

  // ── 던전 클리어 동기화 ────────────────────────
  socket.on('dungeonCleared', () => {
    const roomId = socketRoom.get(socket.id);
    const room   = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;
    io.to(roomId).emit('dungeonClearedSync');
  });

  // ── 채팅 ─────────────────────────────────────
  socket.on('chat', ({ msg }) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    const name = room?.players.get(socket.id)?.name ?? '???';
    io.to(roomId).emit('chatMsg', { name, msg });
  });

  // ── 길드 퀘스트 완료 공지 (멀티) ──────────────
  socket.on('guildQuestComplete', ({ questTitle, playerName }) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit('guildNotice', { msg: `[길드] ${playerName} 님이 퀘스트 "${questTitle}" 완료!` });
  });

  // ── 길드 레벨업 공지 ──────────────────────────
  socket.on('guildLevelUp', ({ newLevel }) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit('guildNotice', { msg: `[길드] 길드 레벨 ${newLevel} 달성!` });
  });

  // ── 연결 해제 ─────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    handleLeave(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✔ Bloodbound Realm server running on :${PORT}`);
});
