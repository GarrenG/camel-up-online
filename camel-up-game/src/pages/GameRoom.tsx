import React, { useState } from 'react';
import { Crown, Users, Settings, ArrowLeft, Play, UserCheck, UserX, Bot, Plus } from 'lucide-react';
import { GameRoom as GameRoomType, Player } from '../types/game';
import { BotDifficulty } from '../utils/botAI';

interface GameRoomProps {
  room: GameRoomType;
  currentPlayer: Player;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onToggleReady: () => void;
  onKickPlayer?: (playerId: string) => void;
  onAddBot?: (difficulty: BotDifficulty) => void;
  onRemoveBot?: (botId: string) => void;
}

const GameRoom: React.FC<GameRoomProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
  onStartGame,
  onToggleReady,
  onKickPlayer,
  onAddBot,
  onRemoveBot
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(room.maxPlayers);
  
  const isHost = currentPlayer.isHost;
  const allPlayersReady = room.players.every(p => p.isReady || p.isHost);
  const canStartGame = room.players.length >= 3 && allPlayersReady;
  
  const handleUpdateSettings = () => {
    // 这里应该发送更新房间设置的请求
    setShowSettings(false);
  };
  
  return (
    <div className="desert-gradient" style={{minHeight: '100vh', padding: '16px'}}>
      <div className="container">
        {/* 房间标题栏 */}
        <div className="card" style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <button
                onClick={onLeaveRoom}
                className="btn btn-secondary"
                style={{padding: '8px'}}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>{room.name}</h1>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6b7280', marginTop: '4px'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <Users size={16} />
                    {room.players.length}/{room.maxPlayers} 玩家
                  </span>
                  <span style={{color: '#16a34a'}}>等待中</span>
                  {room.password && (
                    <span style={{color: '#dc2626'}}>🔒 私人房间</span>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{display: 'flex', gap: '8px'}}>
              {isHost && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn btn-secondary"
                  style={{padding: '8px'}}
                >
                  <Settings size={20} />
                </button>
              )}
              
              {isHost ? (
                <button
                    onClick={onStartGame}
                    disabled={!canStartGame}
                    className="btn btn-success"
                    style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px'}}
                >
                  <Play size={20} />
                  开始游戏
                </button>
              ) : (
                <button
                  onClick={onToggleReady}
                  className={`btn flex items-center gap-2 ${
                    currentPlayer.isReady ? 'btn-danger' : 'btn-success'
                  }`}
                  style={{padding: '8px 24px'}}
                >
                  {currentPlayer.isReady ? (
                    <>
                      <UserX size={20} />
                      取消准备
                    </>
                  ) : (
                    <>
                      <UserCheck size={20} />
                      准备就绪
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '24px'}}>
          {/* 左侧：玩家列表 */}
          <div style={{gridColumn: 'span 2'}}>
            <div className="card">
              <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>玩家列表</h2>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px'}}>
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className={`player-card ${
                      player.isReady || player.isHost ? 'player-ready' : 'player-waiting'
                    }`}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                          <span style={{fontWeight: '600'}}>
                            {player.name}
                          </span>
                          {player.isHost && (
                            <Crown size={16} style={{color: '#eab308'}} />
                          )}
                          {player.isBot && (
                            <Bot size={16} style={{color: '#8b5cf6'}} />
                          )}
                          {player.id === currentPlayer.id && (
                            <span className="player-badge">
                              你
                            </span>
                          )}
                        </div>
                        
                        <div style={{fontSize: '14px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                          <div>金币: {player.coins}</div>
                          <div className={`font-medium ${
                            player.isReady || player.isHost
                              ? 'text-green'
                              : 'text-yellow'
                          }`}>
                            {player.isBot ? '机器人' : player.isHost ? '房主' : player.isReady ? '已准备' : '未准备'}
                          </div>
                        </div>
                      </div>
                      
                      {isHost && !player.isHost && (
                        <button
                          onClick={() => {
                            if (player.isBot && onRemoveBot) {
                              onRemoveBot(player.id);
                            } else if (!player.isBot && onKickPlayer) {
                              onKickPlayer(player.id);
                            }
                          }}
                          style={{color: '#ef4444', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.3s ease'}}
                          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#b91c1c'}
                          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#ef4444'}
                        >
                          {player.isBot ? '移除' : '踢出'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 空位显示 */}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="empty-slot"
                  >
                    <div style={{textAlign: 'center'}}>
                      <Users size={24} style={{margin: '0 auto 8px', opacity: 0.5}} />
                      <div style={{fontSize: '14px', marginBottom: '12px'}}>等待玩家加入</div>
                      {isHost && onAddBot && (
                        <button
                          onClick={() => onAddBot(BotDifficulty.MEDIUM)}
                          className="btn btn-secondary"
                          style={{fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto'}}
                        >
                          <Bot size={14} />
                          添加机器人
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 侧边栏 */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            {/* 游戏状态 */}
            <div className="card">
              <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>游戏状态</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#6b7280'}}>房间状态:</span>
                  <span style={{fontWeight: '600', color: '#16a34a'}}>等待中</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#6b7280'}}>玩家数量:</span>
                  <span style={{fontWeight: '600'}}>{room.players.length}/{room.maxPlayers}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#6b7280'}}>准备状态:</span>
                  <span style={{fontWeight: '600', color: allPlayersReady ? '#16a34a' : '#ca8a04'}}>
                    {room.players.filter(p => p.isReady || p.isHost).length}/{room.players.length}
                  </span>
                </div>
              </div>
              
              {!canStartGame && (
                <div style={{marginTop: '16px', padding: '12px', borderRadius: '6px', background: '#fefce8', border: '1px solid #eab308'}}>
                  <div style={{fontSize: '14px', color: '#a16207'}}>
                    {room.players.length < 3 && '至少需要3名玩家才能开始游戏'}
                    {room.players.length >= 3 && !allPlayersReady && '等待所有玩家准备就绪'}
                  </div>
                </div>
              )}
            </div>
            
            {/* 游戏规则提示 */}
            <div className="card">
              <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>游戏提示</h3>
              <div style={{fontSize: '14px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div>• 3-8名玩家参与游戏</div>
                <div>• 预测骆驼比赛结果获得金币</div>
                <div>• 可以下注单轮冠军或总冠军</div>
                <div>• 放置加速/减速瓦片影响比赛</div>
                <div>• 游戏结束时金币最多的玩家获胜</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 房间设置弹窗 */}
        {showSettings && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>房间设置</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div>
                  <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px'}}>
                    最大玩家数 (3-8)
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="input"
                    style={{width: '100%'}}
                  >
                    {[3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num}人</option>
                    ))}
                  </select>
                </div>
                
                <div style={{display: 'flex', gap: '12px', paddingTop: '16px'}}>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="btn btn-secondary"
                    style={{flex: 1}}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdateSettings}
                    className="btn btn-primary"
                    style={{flex: 1}}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;