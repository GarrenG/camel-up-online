const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3007"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 游戏房间存储
const rooms = new Map();

// 房间管理类
class GameRoom {
  constructor(id, hostId, hostName) {
    this.id = id;
    this.hostId = hostId;
    this.players = [{
      id: hostId,
      name: hostName,
      isHost: true,
      isReady: false,
      socketId: null
    }];
    this.gameState = null;
    this.isGameStarted = false;
    this.maxPlayers = 8;
    this.createdAt = new Date();
  }

  addPlayer(playerId, playerName, socketId) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: '房间已满' };
    }
    
    if (this.players.find(p => p.id === playerId)) {
      return { success: false, error: '玩家已在房间中' };
    }

    this.players.push({
      id: playerId,
      name: playerName,
      isHost: false,
      isReady: false,
      socketId: socketId
    });

    return { success: true };
  }

  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    this.players.splice(playerIndex, 1);
    
    // 如果房主离开，转移房主权限
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
      this.players[0].isHost = true;
    }

    return true;
  }

  setPlayerReady(playerId, ready) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = ready;
      return true;
    }
    return false;
  }

  canStartGame() {
    return this.players.length >= 2 && 
           this.players.every(p => p.isReady || p.isHost);
  }

  updateSocketId(playerId, socketId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.socketId = socketId;
      return true;
    }
    return false;
  }
}

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 创建房间
  socket.on('create-room', (data) => {
    const { playerId, playerName } = data;
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    
    const room = new GameRoom(roomId, playerId, playerName);
    room.updateSocketId(playerId, socket.id);
    rooms.set(roomId, room);
    
    socket.join(roomId);
    socket.emit('room-created', { roomId, room: room });
    
    console.log(`房间 ${roomId} 已创建，房主: ${playerName}`);
  });

  // 加入房间
  socket.on('join-room', (data) => {
    const { roomId, playerId, playerName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('join-room-error', { error: '房间不存在' });
      return;
    }

    if (room.isGameStarted) {
      socket.emit('join-room-error', { error: '游戏已开始' });
      return;
    }

    const result = room.addPlayer(playerId, playerName, socket.id);
    
    if (result.success) {
      socket.join(roomId);
      socket.emit('room-joined', { room });
      io.to(roomId).emit('player-joined', { 
        player: room.players[room.players.length - 1],
        room 
      });
      
      console.log(`玩家 ${playerName} 加入房间 ${roomId}`);
    } else {
      socket.emit('join-room-error', { error: result.error });
    }
  });

  // 玩家准备状态
  socket.on('player-ready', (data) => {
    const { roomId, playerId, ready } = data;
    const room = rooms.get(roomId);
    
    if (room && room.setPlayerReady(playerId, ready)) {
      io.to(roomId).emit('player-ready-changed', { 
        playerId, 
        ready,
        room,
        canStart: room.canStartGame()
      });
    }
  });

  // 开始游戏
  socket.on('start-game', (data) => {
    const { roomId, playerId } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (room.hostId !== playerId) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    if (!room.canStartGame()) {
      socket.emit('error', { message: '还有玩家未准备' });
      return;
    }

    room.isGameStarted = true;
    
    // 初始化游戏状态
    const gameState = initializeGameState(room.players);
    room.gameState = gameState;
    
    io.to(roomId).emit('game-started', { gameState });
    console.log(`房间 ${roomId} 游戏开始`);
  });

  // 游戏动作同步
  socket.on('game-action', (data) => {
    const { roomId, action, playerId } = data;
    const room = rooms.get(roomId);
    
    if (room && room.isGameStarted) {
      // 验证动作合法性
      if (validateGameAction(room.gameState, action, playerId)) {
        // 更新游戏状态
        room.gameState = applyGameAction(room.gameState, action);
        
        // 广播给房间内所有玩家
        io.to(roomId).emit('game-state-updated', {
          gameState: room.gameState,
          action
        });
      } else {
        socket.emit('invalid-action', { action });
      }
    }
  });

  // 断线处理
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    // 查找并处理断线的玩家
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        if (room.players.length === 1) {
          // 如果是最后一个玩家，删除房间
          rooms.delete(roomId);
          console.log(`房间 ${roomId} 已删除`);
        } else {
          // 移除玩家并通知其他玩家
          room.removePlayer(player.id);
          io.to(roomId).emit('player-left', { 
            playerId: player.id,
            room 
          });
          console.log(`玩家 ${player.name} 离开房间 ${roomId}`);
        }
        break;
      }
    }
  });
});

// 初始化游戏状态
function initializeGameState(players) {
  // 这里应该根据骆驼快跑游戏规则初始化游戏状态
  // 暂时返回基本结构
  return {
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      coins: 3,
      betCards: [],
      isBot: false
    })),
    currentPlayerId: players[0].id,
    round: 1,
    camels: [
      { color: 'RED', position: 0, stackOrder: 0 },
      { color: 'BLUE', position: 0, stackOrder: 1 },
      { color: 'GREEN', position: 0, stackOrder: 2 },
      { color: 'YELLOW', position: 0, stackOrder: 3 },
      { color: 'ORANGE', position: 0, stackOrder: 4 }
    ],
    availableDice: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE'],
    trackTiles: [],
    roundBetCards: [],
    winnerBetCards: [],
    loserBetCards: [],
    actionHistory: []
  };
}

// 验证游戏动作
function validateGameAction(gameState, action, playerId) {
  // 基本验证：是否轮到该玩家
  if (gameState.currentPlayerId !== playerId) {
    return false;
  }
  
  // 根据动作类型进行具体验证
  switch (action.type) {
    case 'ROLL_DICE':
      return gameState.availableDice.length > 0;
    case 'PLACE_BET':
      return true; // 简化验证
    case 'PLACE_TILE':
      return true; // 简化验证
    default:
      return false;
  }
}

// 应用游戏动作
function applyGameAction(gameState, action) {
  // 这里应该根据具体的游戏动作更新游戏状态
  // 暂时返回原状态
  const newState = { ...gameState };
  
  // 添加到历史记录
  newState.actionHistory.push({
    ...action,
    timestamp: new Date().toISOString()
  });
  
  return newState;
}

// API 路由
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    hostName: room.players.find(p => p.isHost)?.name || 'Unknown',
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    isGameStarted: room.isGameStarted,
    createdAt: room.createdAt
  }));
  
  res.json(roomList);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json(room);
  } else {
    res.status(404).json({ error: '房间不存在' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`骆驼快跑游戏服务器运行在端口 ${PORT}`);
});

// 定期清理空房间
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of rooms.entries()) {
    // 删除超过1小时的空房间
    if (room.players.length === 0 && 
        (now - room.createdAt) > 60 * 60 * 1000) {
      rooms.delete(roomId);
      console.log(`清理空房间: ${roomId}`);
    }
  }
}, 5 * 60 * 1000); // 每5分钟检查一次