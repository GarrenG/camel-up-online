import React from 'react';
import { X, Dice1, Coins, Trophy, Plus, Minus } from 'lucide-react';

interface GameRulesProps {
  onClose: () => void;
}

const GameRules: React.FC<GameRulesProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#8b4513'}}>🐪 骆驼快跑 - 游戏规则</h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* 游戏概述 */}
          <section>
            <h3 className="section-title">
              <Trophy style={{color: '#fbbf24'}} size={24} />
              游戏概述
            </h3>
            <div className="info-box">
              <p style={{color: '#a0522d', lineHeight: '1.6'}}>
                骆驼快跑是一款充满策略和运气的赛驼游戏。玩家需要预测5只骆驼的比赛结果，通过下注和放置赛道瓦片来获得金币。
                游戏结束时金币最多的玩家获胜！
              </p>
            </div>
          </section>
          
          {/* 游戏设置 */}
          <section>
            <h3 className="section-title">游戏设置</h3>
            <div className="grid-2">
              <div className="info-card">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>玩家数量</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>3-8名玩家</p>
              </div>
              <div className="info-card">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>初始金币</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>每位玩家3枚金币</p>
              </div>
              <div className="info-card">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>赛道长度</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>16个格子的环形赛道</p>
              </div>
              <div className="info-card">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>骆驼数量</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>5只不同颜色的骆驼</p>
              </div>
            </div>
          </section>
          
          {/* 游戏流程 */}
          <section>
            <h3 className="section-title">游戏流程</h3>
            <div className="flow-steps">
              <div className="flow-step">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>1. 轮次开始</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>
                  每轮开始时，所有5个骰子都可用，玩家轮流进行行动。
                </p>
              </div>
              <div className="flow-step">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>2. 玩家行动</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>
                  每个回合，玩家必须选择以下行动之一：掷骰子、下注、或放置赛道瓦片。
                </p>
              </div>
              <div className="flow-step">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>3. 轮次结束</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>
                  当所有5个骰子都被掷完后，轮次结束，进行结算。
                </p>
              </div>
              <div className="flow-step">
                <h4 style={{fontWeight: '600', color: '#8b4513', marginBottom: '8px'}}>4. 游戏结束</h4>
                <p style={{fontSize: '14px', color: '#a0522d'}}>
                  当有骆驼到达或超过终点线（第16格）时，游戏结束。
                </p>
              </div>
            </div>
          </section>
          
          {/* 行动详解 */}
          <section>
            <h3 className="section-title">行动详解</h3>
            
            {/* 掷骰子 */}
            <div className="action-section">
              <h4 className="action-title">
                <Dice1 style={{color: '#3b82f6'}} size={20} />
                掷骰子
              </h4>
              <div className="action-box" style={{background: '#eff6ff'}}>
                <ul className="action-list" style={{color: '#1e40af'}}>
                  <li>• 随机选择一个可用的骰子并掷出</li>
                  <li>• 对应颜色的骆驼前进1-3步</li>
                  <li>• 获得1枚金币作为奖励</li>
                  <li>• 该颜色的骰子在本轮不能再使用</li>
                </ul>
              </div>
            </div>
            
            {/* 下注 */}
            <div className="action-section">
              <h4 className="action-title">
                <Coins style={{color: '#eab308'}} size={20} />
                下注
              </h4>
              <div className="bet-types">
                <div className="bet-card" style={{background: '#fefce8'}}>
                  <h5 style={{fontWeight: '600', color: '#a16207', marginBottom: '8px'}}>单轮投注</h5>
                  <ul className="bet-list" style={{color: '#a16207'}}>
                    <li>• 预测本轮结束时的领先骆驼</li>
                    <li>• 每种颜色投注卡价值：第1个投注者5金币，第2个3金币，第3、4个2金币</li>
                    <li>• 轮次结束时结算，猜对第一名获得对应金币，第二名获得1金币，其他失去1金币</li>
                  </ul>
                </div>
                <div className="bet-card" style={{background: '#f0fdf4'}}>
                  <h5 style={{fontWeight: '600', color: '#166534', marginBottom: '8px'}}>总冠军投注</h5>
                  <ul className="bet-list" style={{color: '#166534'}}>
                    <li>• 预测游戏结束时的冠军骆驼</li>
                    <li>• 每个骆驼只能投注一次（冠军或垫底）</li>
                    <li>• 可对多个不同骆驼投注冠军</li>
                    <li>• 按投注顺序奖励：第1个8币，第2个5币，第3个3币，第4个及以后2币</li>
                    <li>• 猜错扣除1金币</li>
                  </ul>
                </div>
                <div className="bet-card" style={{background: '#fef2f2'}}>
                  <h5 style={{fontWeight: '600', color: '#991b1b', marginBottom: '8px'}}>垫底投注</h5>
                  <ul className="bet-list" style={{color: '#991b1b'}}>
                    <li>• 预测游戏结束时的最后一名骆驼</li>
                    <li>• 每个骆驼只能投注一次（冠军或垫底）</li>
                    <li>• 可对多个不同骆驼投注垫底</li>
                    <li>• 按投注顺序奖励：第1个8币，第2个5币，第3个3币，第4个及以后2币</li>
                    <li>• 猜错扣除1金币</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 放置瓦片 */}
            <div className="action-section">
              <h4 className="action-title">放置赛道瓦片</h4>
              <div className="tile-types">
                <div className="tile-card" style={{background: '#f0fdf4'}}>
                  <h5 className="tile-title" style={{color: '#166534'}}>
                    <Plus style={{color: '#16a34a'}} size={16} />
                    加速瓦片
                  </h5>
                  <ul className="tile-list" style={{color: '#166534'}}>
                    <li>• 骆驼踩到后额外前进1步</li>
                    <li>• 放置者获得1金币</li>
                  </ul>
                </div>
                <div className="tile-card" style={{background: '#fef2f2'}}>
                  <h5 className="tile-title" style={{color: '#991b1b'}}>
                    <Minus style={{color: '#dc2626'}} size={16} />
                    减速瓦片
                  </h5>
                  <ul className="tile-list" style={{color: '#991b1b'}}>
                    <li>• 骆驼踩到后后退1步</li>
                    <li>• 放置者获得1金币</li>
                  </ul>
                </div>
              </div>
              <div className="tile-note">
                <p style={{fontSize: '14px', color: '#4b5563'}}>
                  <strong>注意：</strong> 瓦片只能放在没有骆驼和其他瓦片的格子上（第1格和第16格除外）
                </p>
              </div>
            </div>
          </section>
          
          {/* 骆驼移动规则 */}
          <section>
            <h3 className="section-title">骆驼移动规则</h3>
            <div className="movement-rules">
              <div className="rule-card" style={{background: '#fff7ed'}}>
                <h4 style={{fontWeight: '600', color: '#c2410c', marginBottom: '8px'}}>堆叠机制</h4>
                <ul className="rule-list" style={{color: '#c2410c'}}>
                  <li>• 多只骆驼可以在同一格子上堆叠</li>
                  <li>• 下方的骆驼移动时，会带着上方的所有骆驼一起移动</li>
                  <li>• 骆驼落到有其他骆驼的格子时，会堆叠在最上方</li>
                </ul>
              </div>
              <div className="rule-card" style={{background: '#faf5ff'}}>
                <h4 style={{fontWeight: '600', color: '#7c3aed', marginBottom: '8px'}}>赛道瓦片效果</h4>
                <ul className="rule-list" style={{color: '#7c3aed'}}>
                  <li>• 骆驼（连同堆叠）踩到瓦片时触发效果</li>
                  <li>• 加速瓦片：额外前进1步</li>
                  <li>• 减速瓦片：后退1步（最少到第1格）</li>
                  <li>• 瓦片触发后，放置者获得1金币</li>
                </ul>
              </div>
            </div>
          </section>
          
          {/* 计分规则 */}
          <section>
            <h3 className="section-title">计分规则</h3>
            <div className="scoring-rules">
              <div className="score-card" style={{background: '#fefce8'}}>
                <h4 style={{fontWeight: '600', color: '#a16207', marginBottom: '8px'}}>单轮投注结算</h4>
                <ul className="score-list" style={{color: '#a16207'}}>
                  <li>• 猜对第一名：获得投注卡上的金币数（5/3/2）</li>
                  <li>• 猜对第二名：获得1金币</li>
                  <li>• 其他情况：失去1金币</li>
                </ul>
              </div>
              <div className="score-card" style={{background: '#f0fdf4'}}>
                <h4 style={{fontWeight: '600', color: '#166534', marginBottom: '8px'}}>总冠军/垫底投注结算</h4>
                <ul className="score-list" style={{color: '#166534'}}>
                  <li>• 猜对：获得8金币</li>
                  <li>• 猜错：失去1金币</li>
                </ul>
              </div>
              <div className="score-card" style={{background: '#eff6ff'}}>
                <h4 style={{fontWeight: '600', color: '#1e40af', marginBottom: '8px'}}>其他金币来源</h4>
                <ul className="score-list" style={{color: '#1e40af'}}>
                  <li>• 掷骰子：获得1金币</li>
                  <li>• 赛道瓦片被触发：获得1金币</li>
                </ul>
              </div>
            </div>
          </section>
          
          {/* 获胜条件 */}
          <section>
            <h3 className="section-title">
              <Trophy style={{color: '#eab308'}} size={24} />
              获胜条件
            </h3>
            <div className="victory-box">
              <p style={{fontSize: '18px', textAlign: 'center', color: '#8b4513', fontWeight: '600'}}>
                游戏结束时，拥有最多金币的玩家获胜！
              </p>
              <p style={{fontSize: '14px', textAlign: 'center', color: '#a0522d', marginTop: '8px'}}>
                如果金币数相同，则共享胜利
              </p>
            </div>
          </section>
          
          {/* 策略提示 */}
          <section>
            <h3 className="section-title">策略提示</h3>
            <div className="strategy-grid">
              <div className="strategy-card" style={{background: '#eff6ff'}}>
                <h4 style={{fontWeight: '600', color: '#1e40af', marginBottom: '8px'}}>💡 投注策略</h4>
                <ul className="strategy-list" style={{color: '#1e40af'}}>
                  <li>• 观察骆驼位置和堆叠情况</li>
                  <li>• 早期投注单轮可获得更高价值</li>
                  <li>• 总冠军投注风险高但回报丰厚</li>
                </ul>
              </div>
              <div className="strategy-card" style={{background: '#f0fdf4'}}>
                <h4 style={{fontWeight: '600', color: '#166534', marginBottom: '8px'}}>🎯 瓦片策略</h4>
                <ul className="strategy-list" style={{color: '#166534'}}>
                  <li>• 在领先骆驼前方放置减速瓦片</li>
                  <li>• 在落后骆驼前方放置加速瓦片</li>
                  <li>• 考虑骆驼堆叠的影响</li>
                </ul>
              </div>
              <div className="strategy-card" style={{background: '#faf5ff'}}>
                <h4 style={{fontWeight: '600', color: '#7c3aed', marginBottom: '8px'}}>🎲 掷骰策略</h4>
                <ul className="strategy-list" style={{color: '#7c3aed'}}>
                  <li>• 稳定获得金币的方式</li>
                  <li>• 可能改变比赛局势</li>
                  <li>• 轮次末期更有价值</li>
                </ul>
              </div>
              <div className="strategy-card" style={{background: '#fef2f2'}}>
                <h4 style={{fontWeight: '600', color: '#991b1b', marginBottom: '8px'}}>⚠️ 风险管理</h4>
                <ul className="strategy-list" style={{color: '#991b1b'}}>
                  <li>• 平衡高风险和低风险投注</li>
                  <li>• 注意金币数量，避免破产</li>
                  <li>• 观察其他玩家的策略</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
        
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{width: '100%', padding: '12px', fontWeight: '600'}}
          >
            开始游戏！
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameRules;