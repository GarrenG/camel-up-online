// 骆驼颜色枚举
export enum CamelColor {
  RED = 'red',
  YELLOW = 'yellow',
  BLUE = 'blue',
  PURPLE = 'purple',
  GREEN = 'green',
  BLACK = 'black', // 反向骆驼
  WHITE = 'white'  // 反向骆驼
}

// 骰子颜色枚举
export enum DiceColor {
  RED = 'red',
  YELLOW = 'yellow',
  BLUE = 'blue',
  PURPLE = 'purple',
  GREEN = 'green',
  GRAY = 'gray' // 灰色骰子用于黑白骆驼
}

// 骆驼信息
export interface Camel {
  color: CamelColor;
  position: number; // 0-16 (17个格子，0为起点，16为终点)
  stackOrder: number; // 叠放顺序，0为最底层
  isReverse?: boolean; // 是否为反向骆驼（黑白骆驼）
}

// 投注卡类型
export enum BetType {
  ROUND = 'round', // 单轮投注
  WINNER = 'winner', // 冠军投注
  LOSER = 'loser' // 垫底投注
}

// 投注卡
export interface BetCard {
  id: string;
  type: BetType;
  camelColor: CamelColor;
  value: number; // 奖金值
  playerId?: string; // 拥有者ID
}

// 赛道板块类型
export enum TrackTileType {
  ACCELERATE = 'accelerate', // 加速 +1
  DECELERATE = 'decelerate' // 减速 -1
}

// 赛道板块
export interface TrackTile {
  id: string;
  type: TrackTileType;
  position: number;
  playerId: string;
}

// 玩家行动类型
export enum ActionType {
  PLACE_BET = 'place_bet', // 投注
  ROLL_DICE = 'roll_dice', // 摇骰子
  PLACE_TILE = 'place_tile', // 放置赛道板块
  ROUND_END = 'round_end' // 轮次结束
}

// 金币来源详情
export interface CoinSource {
  type: 'initial' | 'dice_roll' | 'round_bet' | 'champion_bet' | 'loser_bet' | 'tile_reward' | 'penalty';
  amount: number;
  description: string;
  round?: number;
}

// 玩家
export interface Player {
  id: string;
  name: string;
  coins: number;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean; // 是否为机器人
  betCards: BetCard[];
  trackTiles: TrackTile[];
  championBets: CamelColor[]; // 冠军投注的骆驼颜色列表
  loserBets: CamelColor[]; // 垫底投注的骆驼颜色列表
  coinSources: CoinSource[]; // 金币来源详情
}

// 游戏状态
export enum GameStatus {
  WAITING = 'waiting', // 等待玩家
  PLAYING = 'playing', // 游戏中
  ROUND_END = 'round_end', // 单轮结束
  GAME_END = 'game_end' // 游戏结束
}

// 骰子结果
export interface DiceResult {
  diceColor: DiceColor;
  camelColor: CamelColor;
  steps: number; // 1-3步
  isReverse?: boolean; // 是否为反向移动
}

// 操作历史记录
export interface ActionHistory {
  id: string;
  playerId: string;
  action: ActionType;
  description: string;
  timestamp: Date;
  round: number;
}

// 轮次结算详情
export interface RoundSettlement {
  round: number;
  details: string[];
  timestamp: Date;
}

// 游戏房间
export interface GameRoom {
  id: string;
  name: string;
  password?: string;
  maxPlayers: number;
  players: Player[];
  status: GameStatus;
  currentPlayerId?: string;
  round: number;
  camels: Camel[];
  availableDice: DiceColor[]; // 本轮剩余骰子
  usedDice: DiceColor[]; // 已使用的骰子
  roundBetCards: BetCard[]; // 单轮投注卡
  winnerBetCards: BetCard[]; // 冠军投注卡
  loserBetCards: BetCard[]; // 垫底投注卡
  trackTiles: TrackTile[];
  lastDiceResult?: DiceResult;
  actionHistory: ActionHistory[]; // 操作历史
  roundSettlements: RoundSettlement[]; // 轮次结算详情
  championBetOrder: { playerId: string; camelColor: CamelColor; order: number }[]; // 冠军投注顺序
  loserBetOrder: { playerId: string; camelColor: CamelColor; order: number }[]; // 垫底投注顺序
}

// 游戏行动
export interface GameAction {
  type: ActionType;
  playerId: string;
  data: any; // 具体行动数据
}

// 游戏结果
export interface GameResult {
  finalRanking: CamelColor[]; // 最终排名
  playerScores: { [playerId: string]: number };
  roundResults: RoundResult[];
}

// 单轮结果
export interface RoundResult {
  round: number;
  leadingCamel: CamelColor;
  playerEarnings: { [playerId: string]: number };
}