import { Player, GameRoom, CamelColor, DiceColor, BetType, TrackTileType, ActionType } from '../types/game';

// 机器人难度等级
export enum BotDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// 机器人行动决策
export interface BotAction {
  type: ActionType;
  data?: any;
}

// 机器人AI类
export class BotAI {
  private difficulty: BotDifficulty;
  private playerId: string;

  constructor(playerId: string, difficulty: BotDifficulty = BotDifficulty.MEDIUM) {
    this.playerId = playerId;
    this.difficulty = difficulty;
  }

  // 决定机器人的下一步行动
  decideAction(room: GameRoom, player: Player): BotAction {
    const availableActions = this.getAvailableActions(room, player);
    
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return this.easyStrategy(room, player, availableActions);
      case BotDifficulty.MEDIUM:
        return this.mediumStrategy(room, player, availableActions);
      case BotDifficulty.HARD:
        return this.hardStrategy(room, player, availableActions);
      default:
        return this.mediumStrategy(room, player, availableActions);
    }
  }

  // 获取可用行动
  private getAvailableActions(room: GameRoom, player: Player): ActionType[] {
    const actions: ActionType[] = [];
    
    // 总是可以摇骰子
    if (room.availableDice.length > 0) {
      actions.push(ActionType.ROLL_DICE);
    }
    
    // 可以投注（如果有可用的投注卡）
    if (room.roundBetCards.some(card => !card.playerId)) {
      actions.push(ActionType.PLACE_BET);
    }
    
    // 可以放置赛道板块（如果玩家有板块）
    if (player.trackTiles.length > 0) {
      actions.push(ActionType.PLACE_TILE);
    }
    
    return actions;
  }

  // 简单策略：随机选择行动
  private easyStrategy(room: GameRoom, player: Player, availableActions: ActionType[]): BotAction {
    if (availableActions.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    
    switch (randomAction) {
      case ActionType.PLACE_BET:
        return this.randomBet(room);
      case ActionType.PLACE_TILE:
        return this.randomTilePlacement(room);
      default:
        return { type: ActionType.ROLL_DICE };
    }
  }

  // 中等策略：基于简单分析的决策
  private mediumStrategy(room: GameRoom, player: Player, availableActions: ActionType[]): BotAction {
    // 优先级：投注 > 放置板块 > 摇骰子
    if (availableActions.includes(ActionType.PLACE_BET) && Math.random() < 0.6) {
      return this.smartBet(room);
    }
    
    if (availableActions.includes(ActionType.PLACE_TILE) && Math.random() < 0.4) {
      return this.smartTilePlacement(room);
    }
    
    return { type: ActionType.ROLL_DICE };
  }

  // 困难策略：高级分析和策略
  private hardStrategy(room: GameRoom, player: Player, availableActions: ActionType[]): BotAction {
    const gameAnalysis = this.analyzeGameState(room);
    
    // 基于游戏分析做出最优决策
    if (availableActions.includes(ActionType.PLACE_BET) && gameAnalysis.shouldBet) {
      return this.strategicBet(room, gameAnalysis);
    }
    
    if (availableActions.includes(ActionType.PLACE_TILE) && gameAnalysis.shouldPlaceTile) {
      return this.strategicTilePlacement(room, gameAnalysis);
    }
    
    return { type: ActionType.ROLL_DICE };
  }

  // 随机投注
  private randomBet(room: GameRoom): BotAction {
    const availableBets = room.roundBetCards.filter(card => !card.playerId);
    if (availableBets.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    const randomBet = availableBets[Math.floor(Math.random() * availableBets.length)];
    return {
      type: ActionType.PLACE_BET,
      data: { 
        camelColor: randomBet.camelColor,
        betType: BetType.ROUND
      }
    };
  }

  // 智能投注
  private smartBet(room: GameRoom): BotAction {
    const availableBets = room.roundBetCards.filter(card => !card.playerId);
    if (availableBets.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    // 选择领先骆驼的投注卡
    const leadingCamel = this.getLeadingCamel(room);
    const leadingCamelBets = availableBets.filter(card => card.camelColor === leadingCamel);
    
    if (leadingCamelBets.length > 0) {
      // 选择价值最高的投注卡
      const bestBet = leadingCamelBets.reduce((best, current) => 
        current.value > best.value ? current : best
      );
      return {
        type: ActionType.PLACE_BET,
        data: { 
          camelColor: bestBet.camelColor,
          betType: BetType.ROUND
        }
      };
    }
    
    return this.randomBet(room);
  }

  // 策略性投注
  private strategicBet(room: GameRoom, analysis: GameAnalysis): BotAction {
    const availableBets = room.roundBetCards.filter(card => !card.playerId);
    if (availableBets.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    // 基于分析选择最佳投注
    const bestCamel = analysis.mostLikelyWinner;
    const bestBets = availableBets.filter(card => card.camelColor === bestCamel);
    
    if (bestBets.length > 0) {
      const bestBet = bestBets.reduce((best, current) => 
        current.value > best.value ? current : best
      );
      return {
        type: ActionType.PLACE_BET,
        data: { 
          camelColor: bestBet.camelColor,
          betType: BetType.ROUND
        }
      };
    }
    
    return this.smartBet(room);
  }

  // 随机放置板块
  private randomTilePlacement(room: GameRoom): BotAction {
    const availablePositions = this.getAvailableTilePositions(room);
    if (availablePositions.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    const randomPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const randomType = Math.random() < 0.5 ? TrackTileType.ACCELERATE : TrackTileType.DECELERATE;
    
    return {
      type: ActionType.PLACE_TILE,
      data: { position: randomPosition, type: randomType }
    };
  }

  // 智能放置板块
  private smartTilePlacement(room: GameRoom): BotAction {
    const availablePositions = this.getAvailableTilePositions(room);
    if (availablePositions.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    const leadingCamel = this.getLeadingCamel(room);
    const leadingCamelPosition = room.camels.find(c => c.color === leadingCamel)?.position || 0;
    
    // 在领先骆驼前方放置加速板块
    const targetPosition = leadingCamelPosition + 2;
    if (availablePositions.includes(targetPosition)) {
      return {
        type: ActionType.PLACE_TILE,
        data: { position: targetPosition, type: TrackTileType.ACCELERATE }
      };
    }
    
    return this.randomTilePlacement(room);
  }

  // 策略性放置板块
  private strategicTilePlacement(room: GameRoom, analysis: GameAnalysis): BotAction {
    const availablePositions = this.getAvailableTilePositions(room);
    if (availablePositions.length === 0) {
      return { type: ActionType.ROLL_DICE };
    }
    
    // 基于分析放置板块
    const bestPosition = analysis.bestTilePosition;
    const bestType = analysis.bestTileType;
    
    if (availablePositions.includes(bestPosition)) {
      return {
        type: ActionType.PLACE_TILE,
        data: { position: bestPosition, type: bestType }
      };
    }
    
    return this.smartTilePlacement(room);
  }

  // 获取可用的板块位置
  private getAvailableTilePositions(room: GameRoom): number[] {
    const occupiedPositions = room.trackTiles.map(tile => tile.position);
    const camelPositions = room.camels.map(camel => camel.position);
    const blockedPositions = [...occupiedPositions, ...camelPositions, 0, 15]; // 起点和终点不能放置
    
    const availablePositions: number[] = [];
    for (let i = 1; i < 15; i++) {
      if (!blockedPositions.includes(i)) {
        availablePositions.push(i);
      }
    }
    
    return availablePositions;
  }

  // 获取领先的骆驼
  private getLeadingCamel(room: GameRoom): CamelColor {
    const sortedCamels = [...room.camels].sort((a, b) => {
      if (a.position !== b.position) {
        return b.position - a.position;
      }
      return b.stackOrder - a.stackOrder;
    });
    
    return sortedCamels[0]?.color || CamelColor.RED;
  }

  // 分析游戏状态
  private analyzeGameState(room: GameRoom): GameAnalysis {
    const leadingCamel = this.getLeadingCamel(room);
    const camelPositions = room.camels.reduce((acc, camel) => {
      acc[camel.color] = camel.position;
      return acc;
    }, {} as Record<CamelColor, number>);
    
    // 计算每只骆驼获胜的概率
    const winProbabilities = this.calculateWinProbabilities(room);
    const mostLikelyWinner = Object.entries(winProbabilities)
      .reduce((best, [color, prob]) => 
        prob > winProbabilities[best] ? color as CamelColor : best
      , leadingCamel);
    
    return {
      leadingCamel,
      mostLikelyWinner,
      camelPositions,
      winProbabilities,
      shouldBet: Math.random() < 0.7,
      shouldPlaceTile: Math.random() < 0.3,
      bestTilePosition: this.calculateBestTilePosition(room),
      bestTileType: TrackTileType.ACCELERATE
    };
  }

  // 计算获胜概率（简化版）
  private calculateWinProbabilities(room: GameRoom): Record<CamelColor, number> {
    const probabilities: Record<CamelColor, number> = {
       [CamelColor.RED]: 0.2,
       [CamelColor.YELLOW]: 0.2,
       [CamelColor.BLUE]: 0.2,
       [CamelColor.PURPLE]: 0.2,
       [CamelColor.GREEN]: 0.2,
       [CamelColor.BLACK]: 0.0, // 反向骆驼不参与获胜
       [CamelColor.WHITE]: 0.0  // 反向骆驼不参与获胜
     };
    
    // 基于当前位置调整概率
    room.camels.forEach(camel => {
      const positionBonus = camel.position * 0.05;
      probabilities[camel.color] += positionBonus;
    });
    
    // 归一化概率
    const total = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0);
    Object.keys(probabilities).forEach(color => {
      probabilities[color as CamelColor] /= total;
    });
    
    return probabilities;
  }

  // 计算最佳板块位置
  private calculateBestTilePosition(room: GameRoom): number {
    const leadingCamel = this.getLeadingCamel(room);
    const leadingPosition = room.camels.find(c => c.color === leadingCamel)?.position || 0;
    return Math.min(14, leadingPosition + 3);
  }
}

// 游戏分析结果
interface GameAnalysis {
  leadingCamel: CamelColor;
  mostLikelyWinner: CamelColor;
  camelPositions: Record<CamelColor, number>;
  winProbabilities: Record<CamelColor, number>;
  shouldBet: boolean;
  shouldPlaceTile: boolean;
  bestTilePosition: number;
  bestTileType: TrackTileType;
}

// 创建机器人玩家
export const createBotPlayer = (id: string, name: string, difficulty: BotDifficulty = BotDifficulty.MEDIUM): Player => {
  return {
    id,
    name,
    coins: 3,
    isReady: true,
    isHost: false,
    isBot: true,
    betCards: [],
    trackTiles: [],
    championBets: [],
    loserBets: [],
    coinSources: []
  };
};

// 机器人名称列表
export const BOT_NAMES = [
  '智能骆驼',
  '沙漠之王',
  '赛道专家',
  '投注大师',
  '速度之神',
  '策略家',
  '幸运星',
  '冠军猎手'
];

// 获取随机机器人名称
export const getRandomBotName = (): string => {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
};