const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const { countries, rounds, labels } = require('./game-data.cjs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const rooms = new Map();
app.use(express.static('public'));
app.get('/health', (_, res) => res.json({ ok: true, app: 'VisaQuest' }));
function code() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function safePlayer(p) { return { id:p.id, name:p.name, country:p.country, stats:p.stats, answered:!!p.answer, answer:p.answer, history:p.history, isHost:p.isHost, connected:p.connected }; }
function publicRoom(room) {
  return { code:room.code, status:room.status, roundIndex:room.roundIndex, roundCount:rounds.length,
    deadline:room.deadline, players:[...room.players.values()].map(safePlayer),
    question: room.status === 'playing' || room.status === 'reveal' ? rounds[room.roundIndex] : null,
    hostId:room.hostId, labels };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function beginRound(room) {
  clearTimeout(room.timeout);
  room.status = 'playing'; room.deadline = Date.now() + 30000;
  for (const p of room.players.values()) { p.answer = null; }
  emitRoom(room);
  room.timeout = setTimeout(() => revealRound(room), 30000);
}
function revealRound(room) {
  if (!room || room.status !== 'playing') return;
  clearTimeout(room.timeout); room.status = 'reveal'; room.deadline = null;
  emitRoom(room);
}
function maybeReveal(room) {
  const connected = [...room.players.values()].filter(p => p.connected);
  if (connected.length && connected.every(p => p.answer !== null)) revealRound(room);
}
io.on('connection', socket => {
  socket.on('room:create', ({name, country}, cb = () => {}) => {
    const roomCode = code();
    const player = makePlayer(socket.id, name, country, true);
    const room = { code:roomCode, hostId:socket.id, players:new Map([[socket.id, player]],), status:'lobby', roundIndex:0, deadline:null, timeout:null };
    rooms.set(roomCode, room); socket.join(roomCode); socket.data.roomCode = roomCode;
    cb({ok:true, code:roomCode, playerId:socket.id}); emitRoom(room);
  });
  socket.on('room:join', ({code:rawCode, name, country}, cb = () => {}) => {
    const roomCode = String(rawCode || '').trim().toUpperCase(); const room = rooms.get(roomCode);
    if (!room) return cb({ok:false, error:'Nem található ilyen szobakód.'});
    if (room.status === 'finished') return cb({ok:false, error:'Ez a játék már véget ért.'});
    if (room.players.size >= 60) return cb({ok:false, error:'A szoba elérte a 60 fős limitet.'});
    const player = makePlayer(socket.id, name, country, false);
    room.players.set(socket.id, player); socket.join(roomCode); socket.data.roomCode = roomCode;
    cb({ok:true, code:roomCode, playerId:socket.id}); emitRoom(room);
  });
  socket.on('game:start', () => {
    const room = roomFor(socket); if (!room || socket.id !== room.hostId || room.status !== 'lobby') return;
    beginRound(room);
  });
  socket.on('game:answer', ({choiceIndex}) => {
    const room = roomFor(socket); if (!room || room.status !== 'playing') return;
    const p = room.players.get(socket.id); if (!p || p.answer !== null) return;
    const r = rounds[room.roundIndex];
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= r.options.length) return;
    const option = r.options[choiceIndex];
    p.answer = choiceIndex;
    Object.entries(option.d).forEach(([k,v]) => p.stats[k] = Math.max(0, Math.min(100, p.stats[k] + v)));
    p.history.push({ title:r.title, choice:option.label, note:option.note, concept:r.concept });
    emitRoom(room); maybeReveal(room);
  });
  socket.on('game:next', () => {
    const room = roomFor(socket); if (!room || socket.id !== room.hostId || room.status !== 'reveal') return;
    if (room.roundIndex < rounds.length - 1) { room.roundIndex++; beginRound(room); }
    else { room.status = 'finished'; room.deadline = null; emitRoom(room); }
  });
  socket.on('game:restart', () => {
    const room = roomFor(socket); if (!room || socket.id !== room.hostId || room.status !== 'finished') return;
    clearTimeout(room.timeout); room.status='lobby'; room.roundIndex=0; room.deadline=null;
    for (const p of room.players.values()) { p.stats={...countries[p.country].stats}; p.history=[]; p.answer=null; }
    emitRoom(room);
  });
  socket.on('disconnect', () => {
    const room = roomFor(socket); if (!room) return;
    const p = room.players.get(socket.id); if (p) p.connected = false;
    // Keep disconnected players in the roster, but transfer host role if needed.
    if (room.hostId === socket.id) {
      const replacement = [...room.players.values()].find(x => x.connected);
      if (replacement) { room.hostId = replacement.id; replacement.isHost = true; }
    }
    emitRoom(room);
    if (![...room.players.values()].some(x => x.connected)) { clearTimeout(room.timeout); rooms.delete(room.code); }
  });
});
function makePlayer(id, name, country, isHost) {
  const key = countries[country] ? country : 'Novera';
  return { id, name:String(name || 'Játékos').trim().slice(0,28) || 'Játékos', country:key,
    stats:{...countries[key].stats}, history:[], answer:null, isHost, connected:true };
}
function roomFor(socket) { const c = socket.data.roomCode; return c ? rooms.get(c) : null; }
server.listen(PORT, '0.0.0.0', () => console.log(`VisaQuest running on ${PORT}`));
