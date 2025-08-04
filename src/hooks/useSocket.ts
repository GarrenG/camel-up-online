import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameRoom, GameStatus, Player } from '../types/game';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: GameRoom | null;
  gameState: GameRoom | null;
  isLoading: boolean;
  createRoom: (playerId: string, playerName: string) => void;
  joinRoom: (roomId: string, playerId: string, playerName: string) => void;
  setPlayerReady: (ready: boolean) => void;
  startGame: () => void;
  sendGameAction: (action: string, data?: any) => void;
  leaveRoom: () => void;
  reconnectToRoom: (roomId: string, playerId: string, playerName: string) => void;
  lastRoomId: string | null;
}

// 动态获取服务器URL，支持本地开发和外部访问
const getServerUrl = () => {
  // 如果是开发环境或本地访问，使用localhost
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  // 生产环境使用当前域名的3001端口
  return `http://${window.location.hostname}:3001`;
};

const SERVER_URL = getServerUrl();

export const useSocket = (playerId?: string): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRoomId, setLastRoomId] = useState<string | null>(null);

  useEffect(() => {
    // 创建Socket连接
    socketRef.current = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // 连接事件
    socket.on('connect', () => {
      console.log('已连接到游戏服务器');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('与游戏服务器断开连接');
      setIsConnected(false);
      setIsLoading(false);
    });

    socket.on('connect_error', (error) => {
      console.error('连接服务器失败:', error);
      setIsLoading(false);
    });

    // 房间事件
    socket.on('room-created', (data) => {
      console.log('房间创建成功:', data);
      setCurrentRoom(data.room);
      setLastRoomId(data.room.id);
      setIsLoading(false);
    });

    socket.on('room-joined', (data) => {
      console.log('加入房间成功:', data);
      setCurrentRoom(data.room);
      setLastRoomId(data.room.id);
      setIsLoading(false);
    });

    socket.on('join-room-error', (data) => {
      console.error('加入房间失败:', data.error);
      alert(`加入房间失败: ${data.error}`);
      setIsLoading(false);
    });

    socket.on('create-room-error', (data) => {
      console.error('创建房间失败:', data.error);
      alert(`创建房间失败: ${data.error}`);
      setIsLoading(false);
    });

    socket.on('player-joined', (data) => {
      console.log('新玩家加入:', data);
      setCurrentRoom(data.room);
    });

    socket.on('player-left', (data) => {
      console.log('玩家离开:', data);
      setCurrentRoom(data.room);
    });

    socket.on('player-ready-changed', (data) => {
      console.log('玩家准备状态变更:', data);
      setCurrentRoom(data.room);
    });

    // 游戏事件
    socket.on('game-started', (data) => {
      console.log('游戏开始:', data);
      setGameState(data.gameState);
      setLastRoomId(data.gameState.id);
    });

    socket.on('game-state-updated', (data) => {
      console.log('游戏状态更新:', data);
      setGameState(data.gameState);
    });

    socket.on('invalid-action', (data: any) => {
      console.error('无效操作:', data);
      alert('操作无效，请重试');
    });

    socket.on('error', (data: any) => {
      console.error('服务器错误:', data);
      alert(`错误: ${data.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = (playerId: string, playerName: string) => {
    if (socketRef.current) {
      setIsLoading(true);
      socketRef.current.emit('create-room', { playerId, playerName });
    }
  };

  const joinRoom = (roomId: string, playerId: string, playerName: string) => {
    if (socketRef.current) {
      setIsLoading(true);
      socketRef.current.emit('join-room', { roomId, playerId, playerName });
    }
  };

  const setPlayerReady = (ready: boolean) => {
    if (socketRef.current && currentRoom && playerId) {
      socketRef.current.emit('player-ready', {
        roomId: currentRoom.id,
        playerId,
        ready
      });
    }
  };

  const startGame = () => {
    if (socketRef.current && currentRoom && playerId) {
      socketRef.current.emit('start-game', {
        roomId: currentRoom.id,
        playerId
      });
    }
  };

  const sendGameAction = (action: string, data?: any) => {
    if (socketRef.current && currentRoom && playerId) {
      socketRef.current.emit('game-action', {
        roomId: currentRoom.id,
        playerId,
        action,
        actionData: data || {}
      });
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('leave-room', {
        roomId: currentRoom.id,
        playerId
      });
      setCurrentRoom(null);
      setGameState(null);
    }
  };

  const reconnectToRoom = (roomId: string, playerId: string, playerName: string) => {
    if (socketRef.current) {
      setIsLoading(true);
      socketRef.current.emit('reconnect-room', { roomId, playerId, playerName });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    currentRoom,
    gameState,
    isLoading,
    createRoom,
    joinRoom,
    setPlayerReady,
    startGame,
    sendGameAction,
    leaveRoom,
    reconnectToRoom,
    lastRoomId
  };
};

export default useSocket;