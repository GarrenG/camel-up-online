import React, { useState } from 'react';
import { Users, Gamepad2, BookOpen, BarChart3 } from 'lucide-react';
import './GameLobby.css';

interface GameLobbyProps {
  playerName: string;
  onCreateRoom: (playerName: string) => void;
  onSelectOnlineMode?: () => void;
  onShowRules?: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  playerName: initialPlayerName,
  onCreateRoom,
  onSelectOnlineMode,
  onShowRules
}) => {
  const [playerName, setPlayerName] = useState(initialPlayerName || '');
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  // 生成随机玩家名的函数
  const generateRandomPlayerName = () => {
    const adjectives = ['勇敢的', '聪明的', '幸运的', '神秘的', '快乐的', '冷静的', '机智的', '敏捷的'];
    const nouns = ['骑士', '探险家', '商人', '学者', '游侠', '法师', '战士', '盗贼'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj}${randomNoun}`;
  };

  // 处理本地游戏创建
  const handleLocalGameStart = () => {
    const finalPlayerName = playerName.trim() || generateRandomPlayerName();
    onCreateRoom(finalPlayerName);
  };
  
  return (
    <div className="game-lobby">
      {/* 背景装饰 */}
      <div className="background-decoration">
        <div className="background-orb-1"></div>
        <div className="background-orb-2"></div>
      </div>
      
      <div className="main-container">
        {/* 主标题 */}
        <div className="title-section">
          <h1 className="main-title">
            🐪 骆驼快跑
          </h1>
          <p className="subtitle">
            经典桌游线上版 · 预测赛驼结果，赢取丰厚奖励
          </p>
        </div>

        {/* 主要内容区域 */}
        <div className="content-card">
          {/* 玩家昵称输入 */}
          <div className="player-input-section">
            <div className="input-container">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="player-input"
                placeholder="玩家昵称"
                maxLength={20}
              />
              <label className={`floating-label ${
                isInputFocused || playerName ? 'focused' : 'normal'
              }`}>
                玩家昵称
              </label>
              {!playerName && (
                <p className="input-hint">
                  留空将自动生成随机昵称
                </p>
              )}
            </div>
          </div>

          {/* 游戏模式选择 */}
          <div className="game-modes-grid">
            {/* 本地游戏 */}
            <div 
              onClick={handleLocalGameStart}
              className="game-mode-card local-game-card"
            >
              <div className="card-overlay"></div>
              <div className="card-content">
                <div className="icon-container local-icon">
                  <Gamepad2 size={32} style={{color: 'white'}} />
                </div>
                <h3 className="card-title">本地游戏</h3>
                <p className="card-description">
                  与朋友在同一设备上游戏
                  <br />
                  支持添加AI机器人对手
                </p>
                <div className="card-action local-action">
                  开始游戏
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 在线对战 */}
            <div 
              onClick={onSelectOnlineMode}
              className="game-mode-card online-game-card"
            >
              <div className="card-overlay"></div>
              <div className="card-content">
                <div className="icon-container online-icon">
                  <Users size={32} style={{color: 'white'}} />
                </div>
                <h3 className="card-title">在线对战</h3>
                <p className="card-description">
                  与全球玩家实时对战
                  <br />
                  创建或加入在线房间
                </p>
                <div className="card-action online-action">
                  进入大厅
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 底部功能区 */}
          <div className="bottom-features">
            {/* 游戏规则 */}
            <div 
              onClick={onShowRules}
              className="feature-card"
            >
              <div className="feature-content">
                <div className="feature-icon rules-icon">
                  <BookOpen size={24} style={{color: 'white'}} />
                </div>
                <div className="feature-text">
                  <h4>游戏规则</h4>
                  <p>了解骆驼快跑的游戏规则</p>
                </div>
              </div>
            </div>

            {/* 游戏统计 */}
            <div className="feature-card">
              <div className="feature-content">
                <div className="feature-icon stats-icon">
                  <BarChart3 size={24} style={{color: 'white'}} />
                </div>
                <div className="feature-text">
                  <h4>游戏统计</h4>
                  <p>查看您的游戏记录和成就</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;