const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3007"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 静态文件服务 - 服务React构建文件
app.use(express.static(path.join(__dirname, '../build')));

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

    if (room.isGameStarted) {
      console.log(`房间 ${roomId} 游戏已经开始，忽略重复请求`);
      return; // 防止重复开始游戏
    }

    if (!room.canStartGame()) {
      socket.emit('error', { message: '还有玩家未准备' });
      return;
    }

    room.isGameStarted = true;
    
    // 初始化游戏状态
    const gameState = initializeGameState(room.players);
    gameState.id = roomId; // 设置正确的房间ID
    room.gameState = gameState;
    
    io.to(roomId).emit('game-started', { gameState });
    console.log(`房间 ${roomId} 游戏开始，状态:`, gameState.status);
  });

  // 统一游戏动作处理
  socket.on('game-action', (data) => {
    console.log('完整的data对象:', JSON.stringify(data, null, 2));
    const { roomId, playerId, action, actionData } = data;
    console.log('解构后的值:', { roomId, playerId, action, actionData });
    const room = rooms.get(roomId);
    
    if (!room || !room.gameState) {
      socket.emit('error', { message: '房间不存在或游戏未开始' });
      return;
    }
    
    if (room.gameState.currentPlayerId !== playerId) {
      socket.emit('error', { message: '不是你的回合' });
      return;
    }
    
    console.log(`收到游戏动作: ${action} 来自玩家 ${playerId} 房间 ${roomId}`, actionData);
    
    // 根据动作类型路由到相应的处理函数
    switch (action) {
      case 'roll-dice':
        handleRollDice(room, playerId, actionData.debugDice, actionData.debugSteps);
        break;
      case 'place-bet':
        handlePlaceBet(room, playerId, actionData.betCard);
        break;
      case 'place-champion-bet':
        handlePlaceChampionBet(room, playerId, actionData.camelColor);
        break;
      case 'place-loser-bet':
        handlePlaceLoserBet(room, playerId, actionData.camelColor);
        break;
      case 'place-track-tile':
        handlePlaceTrackTile(room, playerId, actionData.position, actionData.tileType);
        break;
      default:
        socket.emit('error', { message: '未知的游戏动作' });
    }
  });
  
  // 具体的游戏动作处理函数
  function handleRollDice(room, playerId, debugDice, debugSteps) {
    const result = rollDice(room.gameState, debugDice, debugSteps);
    if (result) {
      io.to(room.gameState.id).emit('game-state-updated', { gameState: room.gameState });
      console.log(`玩家 ${playerId} 掷骰子成功`);
    } else {
      io.to(room.gameState.id).emit('error', { message: '掷骰子失败' });
    }
  }
  
  function handlePlaceBet(room, playerId, betCard) {
    const success = placeBet(room.gameState, playerId, betCard);
    if (success) {
      io.to(room.gameState.id).emit('game-state-updated', { gameState: room.gameState });
      console.log(`玩家 ${playerId} 下注成功`);
    } else {
      io.to(room.gameState.id).emit('error', { message: '下注失败' });
    }
  }
  
  function handlePlaceChampionBet(room, playerId, camelColor) {
    const success = placeChampionBet(room.gameState, playerId, camelColor);
    if (success) {
      io.to(room.gameState.id).emit('game-state-updated', { gameState: room.gameState });
      console.log(`玩家 ${playerId} 下冠军注成功`);
    } else {
      io.to(room.gameState.id).emit('error', { message: '下冠军注失败' });
    }
  }
  
  function handlePlaceLoserBet(room, playerId, camelColor) {
    const success = placeLoserBet(room.gameState, playerId, camelColor);
    if (success) {
      io.to(room.gameState.id).emit('game-state-updated', { gameState: room.gameState });
      console.log(`玩家 ${playerId} 下末位注成功`);
    } else {
      io.to(room.gameState.id).emit('error', { message: '下末位注失败' });
    }
  }
  
  function handlePlaceTrackTile(room, playerId, position, tileType) {
    const success = placeTrackTile(room.gameState, playerId, position, tileType);
    if (success) {
      io.to(room.gameState.id).emit('game-state-updated', { gameState: room.gameState });
      console.log(`玩家 ${playerId} 放置赛道瓦片成功`);
    } else {
      io.to(room.gameState.id).emit('error', { message: '放置赛道瓦片失败' });
    }
  }

  // 保留原有的直接事件处理（向后兼容）
  socket.on('roll-dice', (data) => {
    const { roomId, playerId, debugDice, debugSteps } = data;
    const room = rooms.get(roomId);
    
    if (room && room.gameState && room.gameState.currentPlayerId === playerId) {
      const result = rollDice(room.gameState, debugDice, debugSteps);
      if (result) {
        io.to(roomId).emit('game-state-updated', { gameState: room.gameState });
      }
    } else {
      socket.emit('error', { message: '无效操作，请重试' });
    }
  });

  socket.on('place-bet', (data) => {
    const { roomId, playerId, betCard } = data;
    const room = rooms.get(roomId);
    
    if (room && room.gameState && room.gameState.currentPlayerId === playerId) {
      const success = placeBet(room.gameState, playerId, betCard);
      if (success) {
        io.to(roomId).emit('game-state-updated', { gameState: room.gameState });
      }
    } else {
      socket.emit('error', { message: '无效操作，请重试' });
    }
  });

  socket.on('place-champion-bet', (data) => {
    const { roomId, playerId, camelColor } = data;
    const room = rooms.get(roomId);
    
    if (room && room.gameState && room.gameState.currentPlayerId === playerId) {
      const success = placeChampionBet(room.gameState, playerId, camelColor);
      if (success) {
        io.to(roomId).emit('game-state-updated', { gameState: room.gameState });
      }
    } else {
      socket.emit('error', { message: '无效操作，请重试' });
    }
  });

  socket.on('place-loser-bet', (data) => {
    const { roomId, playerId, camelColor } = data;
    const room = rooms.get(roomId);
    
    if (room && room.gameState && room.gameState.currentPlayerId === playerId) {
      const success = placeLoserBet(room.gameState, playerId, camelColor);
      if (success) {
        io.to(roomId).emit('game-state-updated', { gameState: room.gameState });
      }
    } else {
      socket.emit('error', { message: '无效操作，请重试' });
    }
  });

  socket.on('place-track-tile', (data) => {
    const { roomId, playerId, position, tileType } = data;
    const room = rooms.get(roomId);
    
    if (room && room.gameState && room.gameState.currentPlayerId === playerId) {
      const success = placeTrackTile(room.gameState, playerId, position, tileType);
      if (success) {
        io.to(roomId).emit('game-state-updated', { gameState: room.gameState });
      }
    } else {
      socket.emit('error', { message: '无效操作，请重试' });
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

// 初始化7只骆驼（5只参赛骆驼 + 2只反向骆驼）
function initializeCamels() {
  const racingColors = ['red', 'yellow', 'blue', 'purple', 'green'];
  const reverseColors = ['black', 'white'];
  
  const racingCamels = racingColors.map((color, index) => {
    const position = Math.floor(Math.random() * 3) + 1; // 随机在1,2,3格中
    return {
      color,
      position,
      stackOrder: index,
      isReverse: false
    };
  });
  
  const reverseCamels = reverseColors.map((color, index) => {
    const position = Math.floor(Math.random() * 3) + 13; // 随机在13,14,15格中
    return {
      color,
      position,
      stackOrder: index + 5,
      isReverse: true
    };
  });
  
  return [...racingCamels, ...reverseCamels];
}

// 初始化投注卡
function initializeBetCards() {
  const cards = [];
  const colors = ['red', 'yellow', 'blue', 'purple', 'green'];
  
  // 为每种颜色创建单轮投注卡 (5, 3, 2, 2) - 每种颜色4张卡
  colors.forEach(color => {
    cards.push(
      { id: `round-${color}-5`, type: 'round', camelColor: color, value: 5 },
      { id: `round-${color}-3`, type: 'round', camelColor: color, value: 3 },
      { id: `round-${color}-2-1`, type: 'round', camelColor: color, value: 2 },
      { id: `round-${color}-2-2`, type: 'round', camelColor: color, value: 2 }
    );
  });
  
  return cards;
}

// 初始化游戏状态
function initializeGameState(players) {
  return {
    id: '', // 房间ID会在调用时设置
    name: '',
    maxPlayers: 5,
    status: 'playing',
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      coins: 0, // 修改：初始金币为0，与单人游戏保持一致
      isReady: true,
      isHost: p.isHost || false,
      isBot: false,
      betCards: [],
      trackTiles: [],
      championBets: [],
      loserBets: [],
      coinSources: [{
        type: 'initial',
        amount: 0, // 修改：初始金币为0
        description: '初始金币',
        round: 0
      }]
    })),
    currentPlayerId: players[0]?.id,
    round: 1,
    camels: initializeCamels(),
    availableDice: ['red', 'yellow', 'blue', 'purple', 'green', 'gray'],
    usedDice: [],
    roundBetCards: initializeBetCards(),
    winnerBetCards: [],
    loserBetCards: [],
    trackTiles: [],
    lastDiceResult: null,
    actionHistory: [],
    roundSettlements: [],
    championBetOrder: [],
    loserBetOrder: []
  };
}

// 掷骰子
function rollDice(gameState, debugDiceColor, debugSteps) {
  if (!gameState || gameState.availableDice.length === 0) return null;
  
  // 检查是否已经掷了5个骰子（每轮最多掷5个，留1个不掷）
  if (gameState.usedDice.length >= 5) {
    calculateRoundResults(gameState);
    return null;
  }
  
  const currentPlayerId = gameState.currentPlayerId;
  
  // 选择骰子（调试模式或随机）
  let diceColor;
  let randomIndex;
  
  if (debugDiceColor && gameState.availableDice.includes(debugDiceColor)) {
    diceColor = debugDiceColor;
    randomIndex = gameState.availableDice.indexOf(debugDiceColor);
  } else {
    randomIndex = Math.floor(Math.random() * gameState.availableDice.length);
    diceColor = gameState.availableDice[randomIndex];
  }
  
  const steps = debugSteps || Math.floor(Math.random() * 3) + 1; // 1-3步
  
  let camelColor;
  let isReverse = false;
  
  // 根据骰子颜色确定移动的骆驼
  if (diceColor === 'gray') {
    camelColor = Math.random() < 0.5 ? 'black' : 'white';
    isReverse = true;
  } else {
    const diceColorToCamelColor = {
      'red': 'red',
      'yellow': 'yellow',
      'blue': 'blue',
      'purple': 'purple',
      'green': 'green'
    };
    camelColor = diceColorToCamelColor[diceColor];
  }
  
  const diceResult = {
    diceColor,
    camelColor,
    steps,
    isReverse
  };
  
  // 移除已使用的骰子，添加到已使用列表
  gameState.availableDice.splice(randomIndex, 1);
  gameState.usedDice.push(diceColor);
  gameState.lastDiceResult = diceResult;
  
  // 给当前玩家奖励1金币
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  if (currentPlayer) {
    currentPlayer.coins += 1;
    currentPlayer.coinSources.push({
      type: 'dice_roll',
      amount: 1,
      description: '掷骰子奖励',
      round: gameState.round
    });
  }
  
  // 移动骆驼
  moveCamel(gameState, camelColor, steps, isReverse);
  
  // 添加操作历史
  addActionHistory(gameState, currentPlayerId, 'roll_dice', 
    `掷出${diceColor}骰子，${camelColor}骆驼${isReverse ? '后退' : '前进'}${steps}步`);
  
  // 检查是否轮次结束
  if (gameState.usedDice.length >= 5) {
    setTimeout(() => calculateRoundResults(gameState), 1000);
  } else {
    nextPlayer(gameState);
  }
  
  return diceResult;
}

// 移动骆驼
function moveCamel(gameState, camelColor, steps, isReverse = false) {
  const camel = gameState.camels.find(c => c.color === camelColor);
  if (!camel) return;
  
  let newPosition;
  
  // 黑白骆驼总是后退，其他骆驼前进
  if (camelColor === 'black' || camelColor === 'white') {
    newPosition = camel.position - steps;
  } else {
    newPosition = camel.position + steps;
  }
  
  // 应用赛道瓦片效果
  let tileOwnerReward = null;
  const trackTile = gameState.trackTiles.find(t => t.position === newPosition);
  if (trackTile) {
    tileOwnerReward = {
      playerId: trackTile.playerId,
      tileType: trackTile.type === 'accelerate' ? '加速' : '减速'
    };
    
    // 对于黑白骆驼，瓦片效果是反向的
    if (camelColor === 'black' || camelColor === 'white') {
      if (trackTile.type === 'accelerate') {
        newPosition -= 1;
      } else if (trackTile.type === 'decelerate') {
        newPosition += 1;
      }
    } else {
      if (trackTile.type === 'accelerate') {
        newPosition += 1;
      } else if (trackTile.type === 'decelerate') {
        newPosition -= 1;
      }
    }
  }
  
  // 确保骆驼不会超出赛道边界
  newPosition = Math.max(1, Math.min(16, newPosition));
  
  // 获取当前位置的所有骆驼，按stackOrder排序
  const camelsAtCurrentPosition = gameState.camels
    .filter(c => c.position === camel.position)
    .sort((a, b) => a.stackOrder - b.stackOrder);
  
  const camelIndex = camelsAtCurrentPosition.findIndex(c => c.color === camelColor);
  
  // 移动骆驼及其上方的所有骆驼
  const camelsToMove = camelsAtCurrentPosition.slice(camelIndex);
  
  // 更新移动骆驼的位置
  camelsToMove.forEach(c => {
    const targetCamel = gameState.camels.find(gc => gc.color === c.color);
    if (targetCamel) {
      targetCamel.position = newPosition;
    }
  });
  
  // 重新排序留在原位置的骆驼
  const remainingCamels = camelsAtCurrentPosition.slice(0, camelIndex);
  remainingCamels.forEach((c, index) => {
    const targetCamel = gameState.camels.find(gc => gc.color === c.color);
    if (targetCamel) {
      targetCamel.stackOrder = index;
    }
  });
  
  // 重新排序移动到新位置的骆驼
  const camelsAtNewPosition = gameState.camels.filter(c => c.position === newPosition);
  const existingCamelsAtNewPosition = camelsAtNewPosition.filter(c => 
    !camelsToMove.some(ctm => ctm.color === c.color));
  const movedCamels = camelsToMove.map(ctm => 
    gameState.camels.find(gc => gc.color === ctm.color)).filter(Boolean);
  
  existingCamelsAtNewPosition.sort((a, b) => a.stackOrder - b.stackOrder);
  
  const finalCamelsAtNewPosition = [...existingCamelsAtNewPosition, ...movedCamels];
  finalCamelsAtNewPosition.forEach((c, index) => {
    c.stackOrder = index;
  });
  
  // 处理瓦片奖励
  if (tileOwnerReward) {
    const tileOwner = gameState.players.find(p => p.id === tileOwnerReward.playerId);
    if (tileOwner) {
      tileOwner.coins += 1;
      tileOwner.coinSources.push({
        type: 'tile_reward',
        amount: 1,
        description: `${tileOwnerReward.tileType}瓦片奖励`,
        round: gameState.round
      });
    }
  }
  
  // 检查游戏是否结束
  if (checkGameEnd(gameState)) {
    setTimeout(() => calculateFinalResults(gameState), 1000);
  }
}

// 投注
function placeBet(gameState, playerId, betCard) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;
  
  if (betCard.type === 'round') {
    const camelBets = gameState.roundBetCards.filter(card => 
      card.camelColor === betCard.camelColor && !card.playerId);
    
    if (camelBets.length === 0) return false;
    
    const availableBet = camelBets.reduce((best, current) => 
      current.value > best.value ? current : best);
    
    // 更新投注卡的拥有者
    const cardIndex = gameState.roundBetCards.findIndex(card => card.id === availableBet.id);
    if (cardIndex !== -1) {
      gameState.roundBetCards[cardIndex].playerId = playerId;
      player.betCards.push({ ...availableBet, playerId });
    }
  }
  
  addActionHistory(gameState, playerId, 'place_bet', `对${betCard.camelColor}骆驼下注（轮次投注）`);
  nextPlayer(gameState);
  return true;
}

// 冠军投注
function placeChampionBet(gameState, playerId, camelColor) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;
  
  if (player.championBets.includes(camelColor) || player.loserBets.includes(camelColor)) {
    return false;
  }
  
  player.championBets.push(camelColor);
  
  const nextOrder = gameState.championBetOrder.filter(bet => bet.camelColor === camelColor).length + 1;
  gameState.championBetOrder.push({
    playerId,
    camelColor,
    order: nextOrder
  });
  
  addActionHistory(gameState, playerId, 'place_bet', '投注冠军');
  nextPlayer(gameState);
  return true;
}

// 垫底投注
function placeLoserBet(gameState, playerId, camelColor) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;
  
  if (player.championBets.includes(camelColor) || player.loserBets.includes(camelColor)) {
    return false;
  }
  
  player.loserBets.push(camelColor);
  
  const nextOrder = gameState.loserBetOrder.filter(bet => bet.camelColor === camelColor).length + 1;
  gameState.loserBetOrder.push({
    playerId,
    camelColor,
    order: nextOrder
  });
  
  addActionHistory(gameState, playerId, 'place_bet', '投注垫底');
  nextPlayer(gameState);
  return true;
}

// 放置赛道瓦片
function placeTrackTile(gameState, playerId, position, type) {
  if (position <= 0 || position >= 16) return false;
  
  const hasCamelAtPosition = gameState.camels.some(camel => camel.position === position);
  if (hasCamelAtPosition) return false;
  
  const existingTile = gameState.trackTiles.find(tile => tile.position === position);
  if (existingTile && existingTile.playerId !== playerId) return false;
  
  if (existingTile && existingTile.playerId === playerId) {
    existingTile.type = type;
    const tileTypeText = type === 'accelerate' ? '加速' : '减速';
    addActionHistory(gameState, playerId, 'place_tile', 
      `将第${position}格的瓦片切换为${tileTypeText}瓦片`);
    nextPlayer(gameState);
    return true;
  }
  
  const hasAdjacentTile = gameState.trackTiles.some(tile => 
    Math.abs(tile.position - position) === 1);
  if (hasAdjacentTile) return false;
  
  // 移除该玩家之前放置的瓦片
  gameState.trackTiles = gameState.trackTiles.filter(tile => tile.playerId !== playerId);
  
  const newTile = {
    id: `tile-${playerId}-${position}-${Date.now()}`,
    type,
    position,
    playerId
  };
  
  gameState.trackTiles.push(newTile);
  
  const tileTypeText = type === 'accelerate' ? '加速' : '减速';
  addActionHistory(gameState, playerId, 'place_tile', `在第${position}格放置${tileTypeText}瓦片`);
  nextPlayer(gameState);
  return true;
}

// 下一个玩家
function nextPlayer(gameState) {
  const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayerId);
  const nextIndex = (currentIndex + 1) % gameState.players.length;
  gameState.currentPlayerId = gameState.players[nextIndex].id;
}

// 检查游戏是否结束
function checkGameEnd(gameState) {
  return gameState.camels.some(camel => camel.position >= 16);
}

// 添加操作历史
function addActionHistory(gameState, playerId, action, description) {
  gameState.actionHistory.push({
    id: `action-${Date.now()}-${Math.random()}`,
    playerId,
    action,
    description,
    timestamp: new Date(),
    round: gameState.round
  });
}

// 计算轮次结果
function calculateRoundResults(gameState) {
  // 重置骰子
  gameState.availableDice = ['red', 'yellow', 'blue', 'purple', 'green', 'gray'];
  gameState.usedDice = [];
  gameState.round += 1;
}

// 计算最终结果
function calculateFinalResults(gameState) {
  gameState.status = 'game_end';
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

// 捕获所有其他路由，返回React应用的index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
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