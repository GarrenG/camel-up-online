import React, { useState } from 'react';
import { Users, Crown, Check, X, Play, Copy, LogOut, Wifi, WifiOff } from 'lucide-react';
import { Player, GameRoom } from '../types/game';
import './RoomLobby.css';

interface RoomLobbyProps {
  playerId: string;
  playerName: string;
  room: GameRoom;
  isConnected: boolean;
  setPlayerReady: (ready: boolean) => void;
  startGame: () => void;
  onGameStart: () => void;
  onLeaveRoom: () => void;
}



const RoomLobby: React.FC<RoomLobbyProps> = ({ 
  playerId, 
  playerName, 
  room,
  isConnected,
  setPlayerReady,
  startGame,
  onGameStart, 
  onLeaveRoom 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    setPlayerReady(newReadyState);
  };

  const handleStartGame = () => {
    if (isStarting) return; // 防止重复点击
    setIsStarting(true);
    startGame();
    // 游戏开始后会跳转到游戏界面，组件会卸载，不需要手动重置状态
  };

  const handleLeaveRoom = () => {
    onLeaveRoom();
  };

  const copyRoomId = async () => {
    if (room) {
      try {
        await navigator.clipboard.writeText(room.id);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    }
  };

  if (!room) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">加载房间信息中...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find((p: Player) => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;
  const canStartGame = room.players.length >= 2 && 
                      room.players.every((p: Player) => p.isReady || p.isHost);

  return (
    <div className="room-lobby">
      <div className="room-lobby-container">
        {/* 房间标题和连接状态 */}
        <div className="room-card">
          <div className="room-header">
            <div className="room-title-section">
              <h1 className="room-title">房间 {room.id}</h1>
              <button
                onClick={copyRoomId}
                className="copy-button"
                title="复制房间号"
              >
                <Copy className="icon-sm" />
                {copySuccess ? '已复制!' : '复制'}
              </button>
            </div>
            <div className="status-section">
              <div className="connection-status">
                {isConnected ? (
                  <>
                    <Wifi className="icon-md" />
                    <span className="connection-connected">已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="icon-md" />
                    <span className="connection-disconnected">连接中断</span>
                  </>
                )}
              </div>
              <button
                onClick={handleLeaveRoom}
                className="leave-button"
              >
                <LogOut className="icon-sm" />
                离开房间
              </button>
            </div>
          </div>
          
          <div className="room-info">
            <span className="room-info-item">
              <Users className="icon-sm" />
              {room.players.length}/{room.maxPlayers} 玩家
            </span>
            <span>等待游戏开始...</span>
          </div>
        </div>

        {/* 玩家列表 */}
        <div className="room-card players-section">
          <h2 className="players-title">
            <Users className="icon-lg" />
            玩家列表
          </h2>
          
          <div className="players-grid">
            {room.players.map((player: Player) => (
              <div
                key={player.id}
                className={`player-item ${
                  player.id === playerId 
                    ? 'current-player' 
                    : 'other-player'
                }`}
              >
                <div className="player-info">
                  <div className="player-details">
                    {player.isHost && (
                      <Crown className="icon-md icon-yellow" />
                    )}
                    <span className={`player-name ${
                      player.id === playerId ? 'current' : 'other'
                    }`}>
                      {player.name}
                      {player.id === playerId && ' (你)'}
                    </span>
                  </div>
                </div>
                
                <div className="player-status">
                  {player.isHost ? (
                    <span className="status-host">房主</span>
                  ) : (
                    <div className={player.isReady ? 'status-ready' : 'status-not-ready'}>
                      {player.isReady ? (
                        <>
                          <Check className="icon-sm" />
                          <span>已准备</span>
                        </>
                      ) : (
                        <>
                          <X className="icon-sm" />
                          <span>未准备</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 游戏控制 */}
        <div className="room-card">
          <div className="game-controls">
            <div className="controls-info">
              <h3>游戏控制</h3>
              <p>
                {isHost 
                  ? '作为房主，你可以在所有玩家准备后开始游戏' 
                  : '等待房主开始游戏，请先设置你的准备状态'
                }
              </p>
            </div>
            
            <div className="controls-buttons">
              {!isHost && (
                <button
                  onClick={handleReadyToggle}
                  disabled={!isConnected}
                  className={`ready-button ${
                    isReady ? 'ready' : 'not-ready'
                  }`}
                >
                  {isReady ? (
                    <>
                      <Check className="icon-md" />
                      已准备
                    </>
                  ) : (
                    <>
                      <X className="icon-md" />
                      未准备
                    </>
                  )}
                </button>
              )}
              
              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={!isConnected || !canStartGame || isStarting}
                  className="start-button"
                >
                  <Play className="icon-md" />
                  {isStarting ? '启动中...' : (canStartGame ? '开始游戏' : '等待玩家准备')}
                </button>
              )}
            </div>
          </div>
          
          {/* 游戏规则提示 */}
          <div className="rules-hint">
            <h4>游戏规则提示</h4>
            <ul className="rules-list">
              <li>• 需要至少2名玩家才能开始游戏</li>
              <li>• 最多支持8名玩家同时游戏</li>
              <li>• 所有玩家都需要准备后才能开始</li>
              <li>• 游戏过程中断线的玩家可以重新连接</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;