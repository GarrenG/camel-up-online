import React, { useState, useEffect } from 'react';
import { Dice1, Dice2, Dice3, Coins, Trophy, Users, ArrowLeft, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { GameRoom, Player, CamelColor, DiceColor, BetType, TrackTileType, DiceResult, BetCard, GameStatus } from '../types/game';
import { useGameStore } from '../hooks/useGameStore';
import GameEndModal from '../components/GameEndModal';

interface GameBoardProps {
  room: GameRoom;
  currentPlayer: Player;
  onLeaveGame: () => void;
  isOnlineMode?: boolean;
  socket?: any;
  sendGameAction?: (action: string, data?: any) => void;
  onBackToMainMenu?: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  room, 
  currentPlayer, 
  onLeaveGame, 
  isOnlineMode = false, 
  socket, 
  sendGameAction,
  onBackToMainMenu 
}) => {
  const { rollDice, placeBet, placeChampionBet, placeLoserBet, placeTrackTile } = useGameStore();
  const [selectedBetType, setSelectedBetType] = useState<BetType>(BetType.ROUND);
  const [selectedTileType, setSelectedTileType] = useState<TrackTileType>(TrackTileType.ACCELERATE);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [collapsedSettlementRounds, setCollapsedSettlementRounds] = useState<Set<number>>(new Set());
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [selectedDebugDice, setSelectedDebugDice] = useState<string | null>(null);
  const [selectedDebugSteps, setSelectedDebugSteps] = useState<number | null>(null);
  
  // 动画状态
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [movingCamels, setMovingCamels] = useState<Set<string>>(new Set());
  const [placingBet, setPlacingBet] = useState(false);
  const [placingTile, setPlacingTile] = useState(false);
  const [coinChange, setCoinChange] = useState<{playerId: string, amount: number} | null>(null);
  const [lastAction, setLastAction] = useState<string>('');
  
  // 检查是否为Garren用户
  const isGarren = currentPlayer.name === 'Garren';
  
  // 监听游戏状态变化，触发动画
  React.useEffect(() => {
    // 监听骆驼位置变化，触发移动动画
    const newMovingCamels = new Set<string>();
    room.camels.forEach((camel) => {
      // 这里可以添加更复杂的逻辑来检测位置变化
      if (lastAction.includes('roll')) {
        newMovingCamels.add(camel.color);
      }
    });
    
    if (newMovingCamels.size > 0) {
      setMovingCamels(newMovingCamels);
      setTimeout(() => setMovingCamels(new Set()), 1000);
    }
  }, [room.camels, lastAction]);
  
  // 监听玩家金币变化，触发金币动画
  React.useEffect(() => {
    const currentPlayerCoins = room.players.find(p => p.id === currentPlayer.id)?.coins;
    if (currentPlayerCoins !== undefined && lastAction) {
      setCoinChange({ playerId: currentPlayer.id, amount: currentPlayerCoins });
      setTimeout(() => setCoinChange(null), 400);
    }
  }, [room.players, currentPlayer.id, lastAction]);
  
  const isCurrentPlayerTurn = room.currentPlayerId === currentPlayer.id && room.status !== GameStatus.GAME_END;
  
  // 计算当前领先骆驼（排除黑白骆驼）
  const racingCamels = room.camels.filter(c => c.color !== CamelColor.BLACK && c.color !== CamelColor.WHITE);
  const currentRoundLeader = racingCamels.reduce((leader, camel) => {
    if (!leader) return camel;
    if (camel.position > leader.position) return camel;
    if (camel.position === leader.position && camel.stackOrder > leader.stackOrder) return camel;
    return leader;
  }, racingCamels[0]);
  
  // 骆驼颜色映射
  const camelColors = {
    red: 'camel red',
    yellow: 'camel yellow',
    blue: 'camel blue',
    purple: 'camel purple',
    green: 'camel green',
    black: 'camel black',
    white: 'camel white'
  };
  
  // 骆驼表情符号
  const camelEmojis = {
    red: '🐪',
    yellow: '🐫',
    blue: '🦙',
    purple: '🐪',
    green: '🐫',
    black: '🐪',
    white: '🦙'
  };
  
  // 骰子颜色映射
  const diceColors = {
    red: 'dice red',
    yellow: 'dice yellow',
    blue: 'dice blue',
    purple: 'dice purple',
    green: 'dice green',
    gray: 'dice gray'
  };
  
  const handleRollDice = () => {
    if (!isCurrentPlayerTurn) return;
    
    // 开始骰子滚动动画
    setIsDiceRolling(true);
    setLastAction('roll');
    
    // 延迟执行实际掷骰子逻辑，让动画播放
    setTimeout(() => {
      if (isOnlineMode && sendGameAction) {
        // 在线模式：发送游戏动作到服务器
        if (debugMode && isGarren && selectedDebugDice && selectedDebugSteps) {
          sendGameAction('roll-dice', { debugDice: selectedDebugDice, debugSteps: selectedDebugSteps });
          setSelectedDebugDice(null);
          setSelectedDebugSteps(null);
        } else {
          sendGameAction('roll-dice');
        }
      } else {
        // 本地模式：直接调用本地游戏逻辑
        if (debugMode && isGarren && selectedDebugDice && selectedDebugSteps) {
          rollDice(selectedDebugDice, selectedDebugSteps);
          setSelectedDebugDice(null);
          setSelectedDebugSteps(null);
        } else {
          rollDice();
        }
      }
      setIsDiceRolling(false);
    }, 800);
  };
  
  const handlePlaceBet = (camelColor: CamelColor, betType: BetType) => {
    if (!isCurrentPlayerTurn) return;
    
    // 开始下注动画
    setPlacingBet(true);
    setLastAction(`bet-${camelColor}-${betType}`);
    
    // 延迟执行实际下注逻辑
    setTimeout(() => {
      if (isOnlineMode && sendGameAction) {
        // 在线模式：发送游戏动作到服务器
        if (betType === BetType.WINNER) {
          sendGameAction('place-champion-bet', { camelColor });
        } else if (betType === BetType.LOSER) {
          sendGameAction('place-loser-bet', { camelColor });
        } else {
          const betCard: BetCard = {
            id: `${betType}-${camelColor}-${Date.now()}`,
            type: betType,
            camelColor,
            value: 5
          };
          sendGameAction('place-bet', { betCard });
        }
      } else {
        // 本地模式：直接调用本地游戏逻辑
        if (betType === BetType.WINNER) {
          placeChampionBet(currentPlayer.id, camelColor);
        } else if (betType === BetType.LOSER) {
          placeLoserBet(currentPlayer.id, camelColor);
        } else {
          const betCard: BetCard = {
            id: `${betType}-${camelColor}-${Date.now()}`,
            type: betType,
            camelColor,
            value: 5
          };
          placeBet(currentPlayer.id, betCard);
        }
      }
      setPlacingBet(false);
    }, 600);
  };
  
  const handlePlaceTrackTile = (position: number, tileType: TrackTileType) => {
    if (!isCurrentPlayerTurn || position < 1 || position > 15) return;
    
    // 开始瓦片放置动画
    setPlacingTile(true);
    setLastAction(`tile-${position}-${tileType}`);
    
    // 延迟执行实际放置逻辑
    setTimeout(() => {
      if (isOnlineMode && sendGameAction) {
        // 在线模式：发送游戏动作到服务器
        sendGameAction('place-track-tile', { position, tileType });
      } else {
        // 本地模式：直接调用本地游戏逻辑
        placeTrackTile(currentPlayer.id, position, tileType);
      }
      setPlacingTile(false);
    }, 500);
  };
  
  // 渲染赛道格子
  const renderTrackSquare = (position: number) => {
    const camelsAtPosition = room.camels.filter(camel => camel.position === position);
    const trackTile = room.trackTiles.find(tile => tile.position === position);
    
    return (
      <div
        key={position}
        className={`track-position cursor-pointer transition ${
          selectedPosition === position ? 'selected' : ''
        }`}
        onClick={() => setSelectedPosition(position)}
      >
        {/* 位置编号 */}
        <div className="position-number">
          {position}
        </div>
        
        {/* 终点线 */}
        {position === 16 && (
          <div className="finish-line">
            <Trophy style={{color: '#92400e'}} size={20} />
          </div>
        )}
        
        {/* 赛道瓦片 */}
        {trackTile && (
          <div className={`track-tile ${trackTile.type} transition-smooth hover-lift ${
            placingTile && lastAction.includes(`tile-${position}-${trackTile.type}`) ? 'placing animate-tile-place' : ''
          }`}>
            {trackTile.type === 'accelerate' ? '+' : '-'}
          </div>
        )}
        
        {/* 骆驼堆叠 */}
        {camelsAtPosition.length > 0 && (
          <div className="camel-stack">
            {camelsAtPosition
              .sort((a, b) => a.stackOrder - b.stackOrder)
              .map((camel, index) => (
                <div
                  key={camel.color}
                  className={`camel-piece ${camelColors[camel.color]} transition-smooth ${
                    movingCamels.has(camel.color) ? 'moving animate-camel-move' : ''
                  }`}
                  style={{ 
                    zIndex: index + 1,
                    transform: `translateY(-${index * 12}px)`
                  }}
                >
                  {camelEmojis[camel.color]}
                </div>
              ))
            }
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="animate-fade-in" style={{minHeight: '100vh', padding: '16px'}}>
      <div className="container animate-slide-in">
        {/* 游戏标题栏 */}
        <div className="card" style={{marginBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <button
                  onClick={onLeaveGame}
                  className="btn btn-secondary"
                  title="离开游戏"
                >
                  <ArrowLeft size={20} />
                </button>
                {onBackToMainMenu && (
                  <button
                    onClick={onBackToMainMenu}
                    className="btn btn-secondary"
                    title="返回主菜单"
                    style={{fontSize: '14px', padding: '8px 12px'}}
                  >
                    主菜单
                  </button>
                )}
              </div>
              <div>
                <h1 style={{fontSize: '20px', fontWeight: 'bold'}}>{room.name}</h1>
                <div className="game-status animate-fade-in" style={{color: '#6b7280'}}>
                  <span className="round-info animate-slide-in">第 {room.round + 1} 轮</span> | 
                  <span className={`current-player animate-status-change ${
                    room.currentPlayerId === currentPlayer.id ? 'animate-glow' : ''
                  }`}>
                    当前玩家: {room.players.find(p => p.id === room.currentPlayerId)?.name}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{textAlign: 'right'}}>
                <div style={{color: '#6b7280'}}>你的金币</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Coins size={20} style={{color: '#f59e0b'}} />
                  {currentPlayer.coins}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px'}}>
          {/* 赛道区域 */}
          <div>
            <div className="card" style={{marginBottom: '16px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>骆驼赛道</h2>
              
              {/* 赛道 */}
              <div className="camel-track">
                {/* 第一行: 位置 1-8 */}
                <div className="track-row">
                  {Array.from({ length: 8 }, (_, i) => renderTrackSquare(i + 1))}
                </div>
                {/* 第二行: 位置 16-9 (倒序) */}
                <div className="track-row">
                  {Array.from({ length: 8 }, (_, i) => renderTrackSquare(16 - i))}
                </div>
              </div>
              
              {/* 当前轮次领先者 */}
              {currentRoundLeader && (
                <div style={{marginTop: '16px', padding: '16px', borderRadius: '8px', background: '#fefce8', border: '1px solid #fde047'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Trophy size={16} style={{color: '#ca8a04'}} />
                    <span style={{color: '#a16207'}}>
                      当前领先: {camelEmojis[currentRoundLeader.color]} 
                      {currentRoundLeader.color.toUpperCase()} 骆驼 (位置 {currentRoundLeader.position})
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 玩家列表 */}
            <div className="card">
              <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>玩家状态</h2>
              
              {/* 排行榜 */}
              <div className="leaderboard animate-fade-in" style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151'}}>排行榜</h3>
                {room.players
                  .sort((a, b) => b.coins - a.coins)
                  .map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`leaderboard-item transition-smooth ${
                        coinChange?.playerId === player.id ? 'animate-ranking-update' : ''
                      }`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        marginBottom: '4px',
                        backgroundColor: index === 0 ? '#fef3c7' : '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: index === 0 ? '#f59e0b' : '#e5e7eb'
                      }}
                    >
                      <div className="rank" style={{fontWeight: '600', color: index === 0 ? '#92400e' : '#6b7280'}}>#{index + 1}</div>
                      <div className="player-name" style={{fontWeight: '500', color: '#374151'}}>{player.name}</div>
                      <div className={`player-coins ${
                        coinChange?.playerId === player.id ? 'animate-number-pop' : ''
                      }`} style={{fontWeight: '600', color: index === 0 ? '#92400e' : '#6b7280'}}>{player.coins}</div>
                    </div>
                  ))}
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px'}}>
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className={`transition-smooth ${
                      room.currentPlayerId === player.id ? 'animate-glow' : ''
                    }`}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: player.id === room.currentPlayerId ? '#10b981' : '#e5e7eb',
                      background: player.id === room.currentPlayerId ? '#f0fdf4' : '#f9fafb'
                    }}
                  >
                    <div style={{fontWeight: '600'}}>
                      {player.name}
                      {player.id === currentPlayer.id && ' (你)'}
                    </div>
                    <div className={`${
                      coinChange?.playerId === player.id ? 'animate-number-pop' : ''
                    }`} style={{color: '#6b7280', marginTop: '4px', fontSize: '14px'}}>
                      金币: {player.coins}
                    </div>
                    <div style={{color: '#6b7280', fontSize: '14px'}}>
                      投注: {player.betCards.length} 张
                    </div>
                    {/* 冠军/垫底投注状态 */}
                    <div style={{marginTop: '8px'}}>
                      <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>投注状态:</div>
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {/* 冠军/垫底投注状态 - 区分自己和其他玩家 */}
                        {player.id === currentPlayer.id ? (
                          /* 自己：显示5种色块，投注过的消失 */
                          <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                            <div style={{fontSize: '11px', color: '#6b7280', marginRight: '4px'}}>冠军/垫底:</div>
                            {Object.values(CamelColor).filter(color => color !== CamelColor.BLACK && color !== CamelColor.WHITE).map(color => {
                              const hasChampionBet = player.championBets?.includes(color);
                              const hasLoserBet = player.loserBets?.includes(color);
                              const hasBet = hasChampionBet || hasLoserBet;
                              
                              if (hasBet) return null; // 投注过的不显示
                              
                              return (
                                <div
                                  key={color}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '3px',
                                    backgroundColor: color === 'red' ? '#dc2626' :
                                                   color === 'yellow' ? '#eab308' :
                                                   color === 'blue' ? '#2563eb' :
                                                   color === 'purple' ? '#9333ea' :
                                                   color === 'green' ? '#16a34a' : '#000000',
                                    border: '1px solid #d1d5db'
                                  }}
                                  title={`${color} 骆驼可投注`}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          /* 其他玩家：只显示数字信息 */
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #0ea5e9',
                            fontSize: '11px',
                            color: '#0c4a6e'
                          }}>
                            冠军/垫底: {5 - ((player.championBets?.length || 0) + (player.loserBets?.length || 0))}/5
                          </div>
                        )}
                      </div>
                      
                      {/* 轮次投注历史 */}
                      {player.betCards.filter(bet => bet.type === 'round').length > 0 && (
                        <div style={{marginTop: '8px'}}>
                          <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>轮次投注:</div>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                            {player.betCards.filter(bet => bet.type === 'round').map((bet, index) => (
                              <span
                                key={index}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span 
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    backgroundColor: bet.camelColor === 'red' ? '#dc2626' :
                                                   bet.camelColor === 'yellow' ? '#eab308' :
                                                   bet.camelColor === 'blue' ? '#2563eb' :
                                                   bet.camelColor === 'purple' ? '#9333ea' :
                                                   bet.camelColor === 'green' ? '#16a34a' :
                                                   bet.camelColor === 'black' ? '#1f2937' :
                                                   bet.camelColor === 'white' ? '#f3f4f6' : '#000000',
                                    border: bet.camelColor === 'white' ? '1px solid #d1d5db' : 'none'
                                  }}
                                />
                                <span>{bet.value}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 操作历史 */}
            <div className="card" style={{marginTop: '16px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px'}}>操作历史</h2>
              <div style={{maxHeight: '400px', overflowY: 'auto', fontSize: '14px'}}>
                {room.actionHistory && room.actionHistory.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {(() => {
                      // 按轮次分组操作历史
                      const actionsByRound = room.actionHistory.reduce((acc, action) => {
                        if (!acc[action.round]) acc[action.round] = [];
                        acc[action.round].push(action);
                        return acc;
                      }, {} as Record<number, typeof room.actionHistory>);
                      
                      return Object.entries(actionsByRound)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a)) // 按轮次降序排列
                        .map(([roundStr, actions]) => {
                          const round = parseInt(roundStr);
                          const isCollapsed = collapsedRounds.has(round);
                          const toggleCollapse = () => {
                            const newCollapsed = new Set(collapsedRounds);
                            if (isCollapsed) {
                              newCollapsed.delete(round);
                            } else {
                              newCollapsed.add(round);
                            }
                            setCollapsedRounds(newCollapsed);
                          };
                          
                          return (
                            <div key={round} style={{border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden'}}>
                              {/* 轮次标题 */}
                              <button
                                onClick={toggleCollapse}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  backgroundColor: '#f9fafb',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#374151'
                                }}
                              >
                                <span>第 {round} 轮 ({actions.length} 个操作)</span>
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </button>
                              
                              {/* 操作列表 */}
                              {!isCollapsed && (
                                <div style={{padding: '8px'}}>
                                  {actions
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .map((action) => {
                                      const player = room.players.find(p => p.id === action.playerId);
                                      const playerName = action.playerId === 'system' ? '系统' : (player?.name || '未知玩家');
                                      return (
                                        <div
                                          key={action.id}
                                          style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            backgroundColor: action.playerId === 'system' ? '#f3f4f6' : '#e0f2fe',
                                            borderLeft: '3px solid',
                                            borderLeftColor: action.playerId === 'system' ? '#6b7280' : '#0ea5e9',
                                            marginBottom: '6px'
                                          }}
                                        >
                                          <div style={{fontWeight: '500', color: '#374151'}}>
                                            {playerName}
                                          </div>
                                          <div style={{color: '#6b7280', marginTop: '2px'}}>
                                            {action.description}
                                          </div>
                                          <div style={{color: '#9ca3af', fontSize: '12px', marginTop: '4px'}}>
                                            {new Date(action.timestamp).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        });
                    })()}
                  </div>
                ) : (
                  <div style={{color: '#6b7280', textAlign: 'center', padding: '20px'}}>
                    暂无操作历史
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 操作面板 */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {/* 行动选择 */}
            <div className="card">
              <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>
                {isCurrentPlayerTurn ? '你的回合' : (() => {
                  const currentPlayer = room.players.find(p => p.id === room.currentPlayerId);
                  return `等待 ${currentPlayer?.name || '其他玩家'} 操作`;
                })()}
              </h3>
              
              {isCurrentPlayerTurn && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  {/* 调试模式开关 - 仅对Garren可见 */}
                  {isGarren && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '6px'}}>
                      <input
                        type="checkbox"
                        id="debugMode"
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                        style={{marginRight: '4px'}}
                      />
                      <label htmlFor="debugMode" style={{fontSize: '12px', color: '#6b7280'}}>调试模式</label>
                    </div>
                  )}
                  
                  {/* 调试骰子选择 - 仅对Garren可见 */}
                  {debugMode && isGarren && (
                    <div style={{padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b'}}>
                      <div style={{fontSize: '12px', color: '#92400e', marginBottom: '8px'}}>选择骰子:</div>
                      <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px'}}>
                        {room.availableDice.map((diceColor, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedDebugDice(diceColor)}
                            className={`btn ${selectedDebugDice === diceColor ? 'btn-warning' : 'btn-secondary'}`}
                            style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: selectedDebugDice === diceColor ? '#f59e0b' : 
                                             diceColor === 'red' ? '#fecaca' : 
                                             diceColor === 'yellow' ? '#fef3c7' :
                                             diceColor === 'blue' ? '#bfdbfe' :
                                             diceColor === 'purple' ? '#e9d5ff' :
                                             diceColor === 'green' ? '#bbf7d0' : '#f3f4f6',
                              color: selectedDebugDice === diceColor ? 'white' :
                                   diceColor === 'red' ? '#dc2626' : 
                                   diceColor === 'yellow' ? '#d97706' :
                                   diceColor === 'blue' ? '#2563eb' :
                                   diceColor === 'purple' ? '#9333ea' :
                                   diceColor === 'green' ? '#16a34a' : '#6b7280'
                            }}
                          >
                            {diceColor.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <div style={{fontSize: '12px', color: '#92400e', marginBottom: '8px'}}>选择点数:</div>
                      <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                        {[1, 2, 3].map((steps) => (
                          <button
                            key={steps}
                            onClick={() => setSelectedDebugSteps(steps)}
                            className={`btn ${selectedDebugSteps === steps ? 'btn-warning' : 'btn-secondary'}`}
                            style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: selectedDebugSteps === steps ? '#f59e0b' : '#f3f4f6',
                              color: selectedDebugSteps === steps ? 'white' : '#6b7280'
                            }}
                          >
                            {steps}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 掷骰子 */}
                  <button
                    onClick={handleRollDice}
                    disabled={!isCurrentPlayerTurn || room.availableDice.length === 0 || (room.usedDice?.length || 0) >= 5 || room.status === GameStatus.GAME_END || (debugMode && isGarren && (!selectedDebugDice || !selectedDebugSteps)) || isDiceRolling}
                    className={`btn btn-primary transition-smooth hover-lift ${
                      isDiceRolling ? 'animate-pulse' : ''
                    }`}
                    style={{padding: '12px', width: '100%'}}
                    onMouseDown={(e) => e.currentTarget.classList.add('animate-button-press')}
                    onMouseUp={(e) => e.currentTarget.classList.remove('animate-button-press')}
                  >
                    <Dice1 size={20} />
                    {isDiceRolling ? '掷骰中...' : (debugMode && isGarren ? 
                      (selectedDebugDice && selectedDebugSteps ? 
                        `掷${selectedDebugDice.toUpperCase()}骰子(${selectedDebugSteps}点)` : 
                        '请选择骰子和点数') : 
                      '掷骰子')}
                  </button>
                  
                  {/* 投注区域 */}
                  <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
                    <h4 style={{fontWeight: '600', marginBottom: '8px'}}>下注</h4>
                    
                    {/* 投注类型选择 */}
                    <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
                      <button
                        onClick={() => setSelectedBetType(BetType.ROUND)}
                        disabled={room.status === GameStatus.GAME_END}
                        className={`btn ${selectedBetType === BetType.ROUND ? 'btn-primary' : 'btn-secondary'}`}
                        style={{flex: 1, fontSize: '14px'}}
                      >
                        单轮
                      </button>
                      <button
                        onClick={() => setSelectedBetType(BetType.WINNER)}
                        disabled={room.status === GameStatus.GAME_END}
                        className={`btn ${selectedBetType === BetType.WINNER ? 'btn-primary' : 'btn-secondary'}`}
                        style={{flex: 1, fontSize: '14px'}}
                      >
                        冠军
                      </button>
                      <button
                        onClick={() => setSelectedBetType(BetType.LOSER)}
                        disabled={room.status === GameStatus.GAME_END}
                        className={`btn ${selectedBetType === BetType.LOSER ? 'btn-primary' : 'btn-secondary'}`}
                        style={{flex: 1, fontSize: '14px'}}
                      >
                        垫底
                      </button>
                    </div>
                    
                    {/* 骆驼选择 */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '12px'}}>
                      {(['red', 'yellow', 'blue', 'purple', 'green'] as CamelColor[]).map((color) => {
                        let isDisabled = false;
                        let buttonText = '';
                        let hasAlreadyBet = false;
                        
                        if (selectedBetType === 'round') {
                           // 计算该骆驼剩余投注额度和收益
                           const camelBets = room.roundBetCards.filter(card => 
                             card.camelColor === color && !card.playerId
                           );
                           const remainingBets = camelBets.length;
                           isDisabled = remainingBets === 0 || room.status === GameStatus.GAME_END;
                           const nextReward = remainingBets > 0 ? 
                             (camelBets.length === 4 ? 5 : 
                              camelBets.length === 3 ? 3 : 2) : 0;
                           buttonText = `剩:${remainingBets}${nextReward > 0 ? ` 益:${nextReward}` : ''}`;
                         } else {
                           // 冠军或垫底投注 - 检查是否已经对该骆驼投注过（冠军或垫底任一种）
                           hasAlreadyBet = currentPlayer.championBets?.includes(color) || currentPlayer.loserBets?.includes(color);
                           isDisabled = hasAlreadyBet || room.status === GameStatus.GAME_END;
                           buttonText = hasAlreadyBet ? '已投注' : (selectedBetType === 'winner' ? '冠军' : '垫底');
                         }
                        
                        return (
                          <button
                            key={color}
                            onClick={() => handlePlaceBet(color, selectedBetType)}
                            className={`bet-card ${hasAlreadyBet ? 'btn-secondary' : camelColors[color]} transition-smooth hover-lift ${
                              placingBet && lastAction.includes(`bet-${color}-${selectedBetType}`) ? 'placing animate-card-fly-in' : ''
                            }`}
                            style={{
                              height: '80px',
                              fontSize: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              opacity: isDisabled ? 0.5 : 1,
                              backgroundColor: hasAlreadyBet ? '#6b7280' : undefined,
                              color: hasAlreadyBet ? 'white' : undefined
                            }}
                            disabled={isDisabled}
                          >
                            <div style={{fontSize: '24px'}}>{camelEmojis[color]}</div>
                            {buttonText && (
                              <div style={{fontSize: '9px', lineHeight: '1.1', textAlign: 'center', overflow: 'hidden'}}>
                                <div style={{whiteSpace: 'nowrap'}}>{buttonText}</div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* 放置瓦片 */}
                  <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '16px'}}>
                    <h4 style={{fontWeight: '600', marginBottom: '8px'}}>放置瓦片</h4>
                    
                    <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
                      <button
                        onClick={() => setSelectedTileType(TrackTileType.ACCELERATE)}
                        disabled={room.status === GameStatus.GAME_END}
                        className={`btn ${selectedTileType === TrackTileType.ACCELERATE ? 'btn-success' : 'btn-secondary'}`}
                        style={{flex: 1, fontSize: '14px'}}
                      >
                        <Plus size={16} />
                        加速
                      </button>
                      <button
                        onClick={() => setSelectedTileType(TrackTileType.DECELERATE)}
                        disabled={room.status === GameStatus.GAME_END}
                        className={`btn ${selectedTileType === TrackTileType.DECELERATE ? 'btn-danger' : 'btn-secondary'}`}
                        style={{flex: 1, fontSize: '14px'}}
                      >
                        <Minus size={16} />
                        减速
                      </button>
                    </div>
                    
                    {selectedPosition && selectedPosition >= 1 && selectedPosition <= 15 && (
                      <button
                        onClick={() => handlePlaceTrackTile(selectedPosition, selectedTileType)}
                        disabled={!isCurrentPlayerTurn || room.status === GameStatus.GAME_END || room.trackTiles.some(tile => tile.position === selectedPosition) || room.camels.some(camel => camel.position === selectedPosition)}
                        className="btn btn-primary"
                        style={{width: '100%'}}
                      >
                        在位置 {selectedPosition} 放置{selectedTileType === TrackTileType.ACCELERATE ? '加速' : '减速'}瓦片
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* 游戏信息 */}
            <div className="card">
              <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>游戏信息</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#6b7280'}}>当前轮次:</span>
                  <span style={{fontWeight: '600'}}>{room.round}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{color: '#6b7280'}}>剩余骰子:</span>
                  <span style={{fontWeight: '600'}}>{room.availableDice.length}/6 (已掷:{room.usedDice?.length || 0}/5)</span>
                </div>
                <div style={{marginTop: '8px'}}>
                  <div style={{color: '#6b7280', fontSize: '12px', marginBottom: '4px'}}>剩余骰子池:</div>
                  <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                    {room.availableDice.map((diceColor, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          backgroundColor: diceColor === 'red' ? '#fecaca' : 
                                         diceColor === 'yellow' ? '#fef3c7' :
                                         diceColor === 'blue' ? '#bfdbfe' :
                                         diceColor === 'purple' ? '#e9d5ff' :
                                         diceColor === 'green' ? '#bbf7d0' : '#f3f4f6',
                          color: diceColor === 'red' ? '#dc2626' : 
                               diceColor === 'yellow' ? '#d97706' :
                               diceColor === 'blue' ? '#2563eb' :
                               diceColor === 'purple' ? '#9333ea' :
                               diceColor === 'green' ? '#16a34a' : '#6b7280'
                        }}
                      >
                        {diceColor.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* 最后掷骰结果 */}
              {room.lastDiceResult && (
                <div style={{marginTop: '16px', padding: '16px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #3b82f6'}}>
                  <div style={{fontSize: '14px', color: '#1e40af'}}>
                    上次掷骰: 
                    <span className={`${diceColors[room.lastDiceResult.diceColor]} transition-smooth ${isDiceRolling ? 'rolling animate-dice-roll' : ''}`} style={{margin: '0 4px', padding: '2px 6px', borderRadius: '4px'}}>
                      🎲
                    </span>
                    → {camelEmojis[room.lastDiceResult.camelColor]} 
                    {room.lastDiceResult.camelColor.toUpperCase()} 
                    {room.lastDiceResult.isReverse ? '后退' : '前进'} {room.lastDiceResult.steps} 步
                  </div>
                </div>
              )}
              
              {/* 轮次结算详情 */}
              {room.roundSettlements && room.roundSettlements.length > 0 && (
                <div style={{marginTop: '16px'}}>
                  <h4 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#16a34a'}}>轮次结算详情</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto'}}>
                    {room.roundSettlements
                      .slice()
                      .sort((a, b) => b.round - a.round) // 按轮次降序排列
                      .map((settlement) => {
                        const isCollapsed = collapsedSettlementRounds.has(settlement.round);
                        const toggleCollapse = () => {
                          const newCollapsed = new Set(collapsedSettlementRounds);
                          if (isCollapsed) {
                            newCollapsed.delete(settlement.round);
                          } else {
                            newCollapsed.add(settlement.round);
                          }
                          setCollapsedSettlementRounds(newCollapsed);
                        };
                        
                        return (
                          <div key={settlement.round} style={{border: '1px solid #16a34a', borderRadius: '8px', overflow: 'hidden', background: '#f0fdf4'}}>
                            {/* 轮次标题 */}
                            <button
                              onClick={toggleCollapse}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#dcfce7',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#16a34a'
                              }}
                            >
                              <span>第 {settlement.round} 轮结算 ({settlement.details.length} 项)</span>
                              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </button>
                            
                            {/* 结算详情列表 */}
                            {!isCollapsed && (
                              <div style={{padding: '8px 16px'}}>
                                {settlement.details.map((detail, index) => (
                                  <div key={index} style={{fontSize: '12px', color: '#166534', marginBottom: '4px'}}>
                                    • {detail}
                                  </div>
                                ))}
                                <div style={{fontSize: '10px', color: '#9ca3af', marginTop: '8px', textAlign: 'right'}}>
                                  {settlement.timestamp.toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 游戏结束弹窗 */}
      <GameEndModal
        isOpen={room.status === GameStatus.GAME_END}
        players={room.players}
        onClose={onLeaveGame}
      />
      
      {/* 游戏结束状态显示 */}
      {room.status === GameStatus.GAME_END && (
        <div className="victory-display animate-zoom-in" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          textAlign: 'center',
          minWidth: '400px'
        }}>
          <h2 className="animate-bounce" style={{
            fontSize: '32px',
            marginBottom: '24px',
            color: '#059669'
          }}>🎉 游戏结束！</h2>
          <div className="final-rankings animate-slide-up">
            <h3 style={{
              fontSize: '20px',
              marginBottom: '16px',
              color: '#374151'
            }}>最终排名：</h3>
            {room.players
              .sort((a, b) => b.coins - a.coins)
              .map((player, index) => (
                <div 
                  key={player.id} 
                  className={`ranking-item animate-slide-in transition-smooth ${
                    index === 0 ? 'animate-glow' : ''
                  }`}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    backgroundColor: index === 0 ? '#fef3c7' : '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: index === 0 ? '#f59e0b' : '#e5e7eb'
                  }}
                >
                  <span className="rank" style={{
                    fontWeight: '600',
                    color: index === 0 ? '#92400e' : '#6b7280'
                  }}>#{index + 1}</span>
                  <span className="name" style={{
                    fontWeight: '500',
                    color: '#374151'
                  }}>{player.name}</span>
                  <span className="coins animate-number-pop" style={{
                    fontWeight: '600',
                    color: index === 0 ? '#92400e' : '#6b7280'
                  }}>{player.coins} 金币</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;