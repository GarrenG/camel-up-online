import React, { useState } from 'react';
import { useGameStore } from './hooks/useGameStore';
import { useSocket } from './hooks/useSocket';
import { GameRoom, Player, GameStatus } from './types/game';
import { BotDifficulty } from './utils/botAI';
import GameLobby from './pages/GameLobby';
import GameRoomPage from './pages/GameRoom';
import GameBoard from './pages/GameBoard';
import GameRules from './components/GameRules';
import RoomManager from './components/RoomManager';
import RoomLobby from './components/RoomLobby';
import { toast, Toaster } from 'sonner';
import './App.css';
import './animations.css';

type GameState = 'lobby' | 'room' | 'playing' | 'online-lobby' | 'online-room' | 'online-playing';
type GameMode = 'local' | 'online';

function App() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [showRules, setShowRules] = useState(false);
  const [playerId] = useState(() => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [playerName, setPlayerName] = useState(() => `玩家${Math.floor(Math.random() * 1000)}`);
  const { currentRoom, currentPlayer, setCurrentRoom, setCurrentPlayer, initializeGame, addBot, removeBot } = useGameStore();
  
  // 在线模式的Socket连接
  const {
    socket,
    isConnected,
    currentRoom: onlineRoom,
    gameState: onlineGameState,
    isLoading,
    createRoom,
    joinRoom,
    setPlayerReady,
    startGame: startOnlineGame,
    sendGameAction,
    leaveRoom,
    lastRoomId
  } = useSocket(playerId);
  
  const handleJoinRoom = (room: GameRoom) => {
    // 找到当前玩家
    const player = room.players[room.players.length - 1];
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setGameState('room');
    toast.success(`成功加入房间: ${room.name}`);
  };
  
  // 生成随机玩家名
  const generateRandomPlayerName = () => {
    const adjectives = ['勇敢的', '聪明的', '幸运的', '神秘的', '快乐的', '冷静的', '机智的', '敏捷的'];
    const nouns = ['骑士', '探险家', '商人', '学者', '游侠', '法师', '战士', '盗贼'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj}${randomNoun}`;
  };

  // 生成随机房间名
  const generateRandomRoomName = () => {
    const themes = ['沙漠', '绿洲', '金字塔', '神庙', '宫殿', '市集', '驿站', '古城'];
    const descriptors = ['传奇', '神秘', '黄金', '古老', '失落', '辉煌', '秘密', '魔法'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomDesc = descriptors[Math.floor(Math.random() * descriptors.length)];
    const roomNumber = Math.floor(Math.random() * 9999) + 1;
    return `${randomDesc}${randomTheme}${roomNumber.toString().padStart(4, '0')}`;
  };

  const handleCreateRoom = (inputPlayerName?: string) => {
    // 快速匹配 - 创建一个默认房间
    const playerId = Date.now().toString();
    // 使用传入的玩家名，如果没有则使用当前状态的玩家名，最后才使用随机生成的名字
    const finalPlayerName = inputPlayerName || playerName.trim() || generateRandomPlayerName();
    
    const player: Player = {
      id: playerId,
      name: finalPlayerName,
      coins: 0, // 初始金币为0
      isReady: false,
      isHost: true,
      isBot: false,
      betCards: [],
      trackTiles: [],
      championBets: [],
      loserBets: [],
      coinSources: []
    };
    
    // 生成随机房间名
    const randomRoomName = generateRandomRoomName();
    
    const room: GameRoom = {
      id: Date.now().toString(),
      name: randomRoomName,
      maxPlayers: 6,
      players: [player],
      status: GameStatus.WAITING,
      round: 0,
      camels: [],
      availableDice: [],
      usedDice: [],
      roundBetCards: [],
      winnerBetCards: [],
      loserBetCards: [],
      trackTiles: [],
      actionHistory: [],
      roundSettlements: [],
      championBetOrder: [],
      loserBetOrder: []
    };
    
    // 更新玩家名
    setPlayerName(finalPlayerName);
    
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setGameState('room');
    toast.success(`房间创建成功！房间名：${randomRoomName}`);
  };
  
  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setGameState('lobby');
    toast.info('已离开房间');
  };
  
  const handleStartGame = () => {
    if (!currentRoom || !currentPlayer) return;
    
    // 初始化游戏
    initializeGame();
    setGameState('playing');
    toast.success('游戏开始！');
  };
  
  const handleLeaveGame = () => {
    if (!currentRoom) return;
    
    // 重置房间状态
    const resetRoom = {
      ...currentRoom,
      status: 'waiting' as any,
      round: 0,
      camels: [],
      availableDice: [],
      roundBetCards: [],
      trackTiles: [],
      lastDiceResult: undefined,
      roundSettlements: [],
      players: currentRoom.players.map(p => ({ ...p, isReady: p.isHost ? true : false, betCards: [], trackTiles: [] }))
    };
    
    setCurrentRoom(resetRoom);
    setGameState('room');
    toast.info('已退出游戏');
  };
  
  const handleToggleReady = () => {
    if (!currentRoom || !currentPlayer) return;
    
    const updatedPlayer = { ...currentPlayer, isReady: !currentPlayer.isReady };
    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.map(p => 
        p.id === currentPlayer.id ? updatedPlayer : p
      )
    };
    
    setCurrentPlayer(updatedPlayer);
    setCurrentRoom(updatedRoom);
    
    toast.success(updatedPlayer.isReady ? '已准备就绪' : '取消准备');
  };
  
  const handleKickPlayer = (playerId: string) => {
    if (!currentRoom || !currentPlayer?.isHost) return;
    
    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.filter(p => p.id !== playerId)
    };
    
    setCurrentRoom(updatedRoom);
    toast.success('玩家已被踢出');
  };
  
  const handleAddBot = (difficulty: BotDifficulty) => {
    if (!currentRoom || !currentPlayer?.isHost) return;
    if (currentRoom.players.length >= currentRoom.maxPlayers) {
      toast.error('房间已满，无法添加机器人');
      return;
    }
    
    addBot(difficulty);
    toast.success('机器人已添加');
  };
  
  const handleRemoveBot = (botId: string) => {
    if (!currentRoom || !currentPlayer?.isHost) return;
    
    removeBot(botId);
    toast.success('机器人已移除');
  };

  // 在线模式处理函数
  const handleSelectOnlineMode = (playerName: string) => {
    setPlayerName(playerName);
    setGameMode('online');
    setGameState('online-lobby');
  };

  const handleSelectLocalMode = () => {
    setGameMode('local');
    setGameState('lobby');
  };

  const handleOnlineRoomJoined = () => {
    setGameState('online-room');
  };

  const handleOnlineGameStart = () => {
    setGameState('online-playing');
  };

  const handleLeaveOnlineRoom = () => {
    leaveRoom();
    setGameState('online-lobby');
  };

  // 监听在线房间状态变化
  React.useEffect(() => {
    if (gameMode === 'online' && onlineRoom) {
      if (gameState === 'online-lobby') {
        setGameState('online-room');
      }
    }
  }, [onlineRoom, gameMode, gameState]);

  // 监听在线游戏状态变化
  React.useEffect(() => {
    console.log('在线游戏状态变化:', {
      gameMode,
      onlineGameState: onlineGameState ? {
        status: onlineGameState.status,
        id: onlineGameState.id
      } : null,
      currentGameState: gameState
    });
    
    // 只有当游戏模式为在线，游戏状态为PLAYING，且当前状态为online-room时才切换
    if (gameMode === 'online' && 
        onlineGameState && 
        onlineGameState.status === GameStatus.PLAYING && 
        gameState === 'online-room') {
      console.log('检测到游戏开始，切换到游戏界面');
      setGameState('online-playing');
    }
  }, [onlineGameState, gameMode]); // 移除gameState依赖，避免循环

  const handleBackToModeSelection = () => {
    setGameState('lobby');
    setGameMode('local');
  };
  
  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      
      {gameState === 'lobby' && (
        <GameLobby
          playerName={playerName}
          onCreateRoom={handleCreateRoom}
          onShowRules={() => setShowRules(true)}
          onSelectOnlineMode={handleSelectOnlineMode}
        />
      )}

      {gameState === 'online-lobby' && (
        <RoomManager
          playerId={playerId}
          playerName={playerName}
          isConnected={isConnected}
          isLoading={isLoading}
          createRoom={createRoom}
          joinRoom={joinRoom}
          onRoomJoined={handleOnlineRoomJoined}
          onBackToMainMenu={handleBackToModeSelection}
          lastRoomId={lastRoomId}
        />
      )}

      {gameState === 'online-room' && onlineRoom && (
        <RoomLobby
          playerId={playerId}
          playerName={playerName}
          room={onlineRoom}
          isConnected={isConnected}
          setPlayerReady={setPlayerReady}
          startGame={startOnlineGame}
          onGameStart={handleOnlineGameStart}
          onLeaveRoom={handleLeaveOnlineRoom}
          onBackToMainMenu={handleBackToModeSelection}
        />
      )}

      {gameState === 'online-playing' && onlineGameState && (
        <GameBoard
          room={onlineGameState}
          currentPlayer={onlineGameState.players.find(p => p.id === playerId) || onlineGameState.players[0]}
          onLeaveGame={handleLeaveOnlineRoom}
          isOnlineMode={true}
          socket={socket}
          sendGameAction={sendGameAction}
          onBackToMainMenu={handleBackToModeSelection}
        />
      )}
      
      {gameState === 'room' && currentRoom && currentPlayer && (
        <GameRoomPage
          room={currentRoom}
          currentPlayer={currentPlayer}
          onLeaveRoom={handleLeaveRoom}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onKickPlayer={handleKickPlayer}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
        />
      )}
      
      {gameState === 'playing' && currentRoom && currentPlayer && (
        <GameBoard
          room={currentRoom}
          currentPlayer={currentPlayer}
          onLeaveGame={handleLeaveGame}
          onBackToMainMenu={handleBackToModeSelection}
        />
      )}
      
      {showRules && (
        <GameRules onClose={() => setShowRules(false)} />
      )}
    </div>
  );
}

export default App;
