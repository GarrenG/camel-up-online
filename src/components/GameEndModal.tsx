import React, { useState } from 'react';
import { Player } from '../types/game';
import './GameEndModal.css';

interface GameEndModalProps {
  isOpen: boolean;
  players: Player[];
  onClose: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({ isOpen, players, onClose }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  if (!isOpen) return null;

  // 按金币数量排序玩家
  const sortedPlayers = [...players].sort((a, b) => b.coins - a.coins);
  
  // 处理点击显示金币详情
  const handleCoinClick = (playerId: string) => {
    setSelectedPlayer(selectedPlayer === playerId ? null : playerId);
  };
  
  const handleCloseDetail = () => {
    setSelectedPlayer(null);
  };
  
  // 获取金币组成详情
  const getCoinBreakdown = (player: Player) => {
    if (!player.coinSources || player.coinSources.length === 0) {
      return [{ type: 'initial', amount: player.coins, description: `总金币: ${player.coins}` }];
    }
    return player.coinSources;
  };

  // 获取排名奖牌图标
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  // 获取排名颜色
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700'; // 金色
      case 2: return '#c0c0c0'; // 银色
      case 3: return '#cd7f32'; // 铜色
      default: return '#6b7280'; // 灰色
    }
  };

  return (
    <div className="game-end-modal-overlay">
      <div className="game-end-modal">
        <div className="game-end-title">
          <h2>🎉 游戏结束 🎉</h2>
          <p>最终排行榜</p>
        </div>
        
        <div className="leaderboard">
          {sortedPlayers.map((player, index) => {
            const rank = index + 1;
            return (
              <div 
                key={player.id} 
                className={`leaderboard-item ${
                  rank === 1 ? 'rank-1' :
                  rank === 2 ? 'rank-2' :
                  rank === 3 ? 'rank-3' :
                  'rank-other'
                }`}
              >
                <div className="player-info">
                  <div 
                    className="rank-badge"
                    style={{ 
                      backgroundColor: getRankColor(rank),
                      color: rank <= 3 ? 'white' : 'black'
                    }}
                  >
                    {rank <= 3 ? getRankIcon(rank) : rank}
                  </div>
                  <div className="player-details">
                    <div className="player-name">{player.name}</div>
                    {player.isBot && (
                      <div className="bot-label">🤖 机器人</div>
                    )}
                  </div>
                </div>
                
                <div className="coin-info">
                  <div 
                    className="coin-amount"
                    onClick={() => handleCoinClick(player.id)}
                    title="点击查看金币详情"
                  >
                    💰 {player.coins}
                  </div>
                  <div className="coin-label">金币 (点击查看详情)</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div>
          <button
            onClick={onClose}
            className="return-button"
          >
            返回大厅
          </button>
        </div>
        
        <div className="congratulations">
          恭喜获胜者！感谢所有玩家的参与 🎊
        </div>
      </div>
      
      {/* 金币详情弹窗 */}
      {selectedPlayer && (
        <div className="coin-detail-overlay">
          <div className="coin-detail-modal">
            <div className="coin-detail-header">
              <h3>
                {sortedPlayers.find(p => p.id === selectedPlayer)?.name} 的金币详情
              </h3>
              <button
                onClick={handleCloseDetail}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="coin-breakdown">
              {getCoinBreakdown(sortedPlayers.find(p => p.id === selectedPlayer)!).map((source, index) => (
                <div key={index} className="coin-source-item">
                  <span className="coin-source-description">{source.description}</span>
                  <span className={`coin-source-amount ${
                    source.amount >= 0 ? 'positive' : 'negative'
                  }`}>
                    {source.amount >= 0 ? '+' : ''}{source.amount}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="coin-total">
              <span className="coin-total-label">总计:</span>
              <span className="coin-total-amount">
                💰 {sortedPlayers.find(p => p.id === selectedPlayer)?.coins}
              </span>
            </div>
            
            <button
              onClick={handleCloseDetail}
              className="detail-close-button"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameEndModal;