import React, { useState, useEffect } from 'react';
import { Users, Plus, LogIn, Wifi, WifiOff } from 'lucide-react';
import './RoomManager.css';

interface RoomManagerProps {
  playerId: string;
  playerName: string;
  isConnected: boolean;
  isLoading: boolean;
  createRoom: (playerId: string, playerName: string) => void;
  joinRoom: (roomId: string, playerId: string, playerName: string) => void;
  onRoomJoined: () => void;
}

interface RoomInfo {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isGameStarted: boolean;
  createdAt: string;
}

const RoomManager: React.FC<RoomManagerProps> = ({ 
  playerId, 
  playerName, 
  isConnected, 
  isLoading, 
  createRoom, 
  joinRoom, 
  onRoomJoined 
}) => {
  const [roomId, setRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  
  // 生成随机玩家名
  const generateRandomPlayerName = () => {
    const adjectives = ['勇敢的', '聪明的', '幸运的', '快速的', '神秘的', '强大的', '优雅的', '机智的'];
    const nouns = ['骑士', '法师', '游侠', '盗贼', '战士', '学者', '探险家', '商人'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomAdjective}${randomNoun}${randomNumber}`;
  };

  // 动态获取服务器URL，与useSocket保持一致
  const getServerUrl = () => {
    // 如果是开发环境或本地访问，使用localhost
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    // 生产环境使用当前域名的3001端口
    return `http://${window.location.hostname}:3001`;
  };

  // 获取可用房间列表
  const fetchAvailableRooms = async () => {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/rooms`);
      if (response.ok) {
        const rooms = await response.json();
        setAvailableRooms(rooms.filter((room: RoomInfo) => !room.isGameStarted));
      }
    } catch (error) {
      console.error('获取房间列表失败:', error);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchAvailableRooms();
      // 每10秒刷新一次房间列表
      const interval = setInterval(fetchAvailableRooms, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const handleCreateRoom = () => {
    if (!isConnected) {
      alert('请等待连接到服务器');
      return;
    }
    
    // 如果没有指定玩家名，使用随机生成的名字
    const finalPlayerName = playerName.trim() || generateRandomPlayerName();
    
    createRoom(playerId, finalPlayerName);
  };

  const handleJoinRoom = (targetRoomId?: string) => {
    if (!isConnected) {
      alert('请等待连接到服务器');
      return;
    }

    const finalRoomId = targetRoomId || roomId.trim().toUpperCase();
    if (!finalRoomId) {
      alert('请输入房间号');
      return;
    }

    // 如果没有指定玩家名，使用随机生成的名字
    const finalPlayerName = playerName.trim() || generateRandomPlayerName();

    joinRoom(finalRoomId, playerId, finalPlayerName);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '刚刚创建';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${Math.floor(diffHours / 24)}天前`;
  };

  return (
    <div className="room-manager">
      <div className="room-manager-container">
        {/* 标题和连接状态 */}
        <div className="header-section">
          <h1 className="main-title">骆驼快跑 - 多人在线</h1>
          <div className="connection-status">
            {isConnected ? (
              <>
                <Wifi className="icon-md" />
                <span className="status-connected">已连接到服务器</span>
              </>
            ) : (
              <>
                <WifiOff className="icon-md" />
                <span className="status-connecting">连接服务器中...</span>
              </>
            )}
          </div>
          <p className="player-info">玩家: <span className="player-name">{playerName}</span></p>
        </div>

        <div className="actions-grid">
          {/* 创建房间 */}
          <div className="action-card">
            <h2 className="card-title">
              <Plus className="icon-lg" />
              创建房间
            </h2>
            <p className="card-description">
              创建一个新的游戏房间，邀请朋友一起游戏
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={!isConnected || isLoading}
              className="create-button"
            >
              <Plus className="icon-md" />
              {isLoading ? '创建中...' : '创建房间'}
            </button>
          </div>

          {/* 加入房间 */}
          <div className="action-card">
            <h2 className="card-title">
              <LogIn className="icon-lg" />
              加入房间
            </h2>
            <p className="card-description">
              输入房间号加入现有游戏
            </p>
            <div className="join-input-group">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="输入房间号"
                className="room-id-input"
                maxLength={6}
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={!isConnected || isLoading || !roomId.trim()}
                className="join-button"
              >
                加入
              </button>
            </div>
          </div>
        </div>

        {/* 可用房间列表 */}
        <div className="rooms-section">
          <div className="rooms-header">
            <h2 className="rooms-title">
              <Users className="icon-lg" />
              可用房间
            </h2>
            <button
              onClick={fetchAvailableRooms}
              disabled={!isConnected}
              className="refresh-button"
            >
              刷新
            </button>
          </div>
          
          {availableRooms.length === 0 ? (
            <div className="empty-rooms">
              <Users className="empty-rooms-icon" />
              <p>暂无可用房间</p>
              <p className="subtitle">创建一个新房间开始游戏吧！</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {availableRooms.map((room) => (
                <div
                  key={room.id}
                  className="room-item"
                >
                  <div className="room-content">
                    <div className="room-info">
                      <div className="room-header-info">
                        <span className="room-id">
                          房间 {room.id}
                        </span>
                        <span className="room-time">
                          {formatTime(room.createdAt)}
                        </span>
                      </div>
                      <div className="room-details">
                        <span className="room-host">房主: {room.hostName}</span>
                        <span className="room-players">
                          <Users className="icon-sm" />
                          {room.playerCount}/{room.maxPlayers}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={!isConnected || isLoading || room.playerCount >= room.maxPlayers}
                      className="room-join-button"
                    >
                      {room.playerCount >= room.maxPlayers ? '已满' : '加入'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomManager;