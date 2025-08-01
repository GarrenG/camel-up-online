import { create } from 'zustand';
import { GameRoom, Player, CamelColor, DiceColor, Camel, BetCard, BetType, TrackTile, TrackTileType, GameStatus, ActionType, DiceResult, ActionHistory, RoundSettlement, CoinSource } from '../types/game';
import { BotAI, BotDifficulty, createBotPlayer, getRandomBotName } from '../utils/botAI';

interface GameStore {
  // 当前游戏房间
  currentRoom: GameRoom | null;
  // 当前玩家
  currentPlayer: Player | null;
  // 是否连接中
  isConnecting: boolean;
  // 错误信息
  error: string | null;
  // 机器人AI实例
  botAIs: Map<string, BotAI>;
  
  // 行动
  setCurrentRoom: (room: GameRoom | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setError: (error: string | null) => void;
  setConnecting: (connecting: boolean) => void;
  
  // 机器人相关
  addBot: (difficulty?: BotDifficulty) => void;
  removeBot: (botId: string) => void;
  executeBotAction: (botId: string) => void;
  
  // 游戏逻辑
  initializeGame: () => void;
  rollDice: (debugDiceColor?: string, debugSteps?: number) => DiceResult | null;
  moveCamel: (camelColor: CamelColor, steps: number, isReverse?: boolean) => void;
  placeBet: (playerId: string, betCard: BetCard) => void;
  placeChampionBet: (playerId: string, camelColor: CamelColor) => void;
  placeLoserBet: (playerId: string, camelColor: CamelColor) => void;
  placeTrackTile: (playerId: string, position: number, type: TrackTileType) => void;
  nextPlayer: () => void;
  checkRoundEnd: () => boolean;
  calculateRoundResults: () => void;
  checkGameEnd: () => boolean;
  calculateFinalResults: () => void;
  addActionHistory: (playerId: string, action: ActionType, description: string) => void;
}

// 初始化7只骆驼（5只参赛骆驼 + 2只反向骆驼）
const initializeCamels = (): Camel[] => {
  const racingColors = [CamelColor.RED, CamelColor.YELLOW, CamelColor.BLUE, CamelColor.PURPLE, CamelColor.GREEN];
  const reverseColors = [CamelColor.BLACK, CamelColor.WHITE];
  
  const racingCamels = racingColors.map((color, index) => {
    const position = Math.floor(Math.random() * 3) + 1; // 随机在1,2,3格中
    return {
      color,
      position,
      stackOrder: index,
      isReverse: false
    };
  });
  
  const reverseCamels = reverseColors.map((color, index) => {
    const position = Math.floor(Math.random() * 3) + 13; // 随机在13,14,15格中
    return {
      color,
      position,
      stackOrder: index + 5,
      isReverse: true
    };
  });
  
  return [...racingCamels, ...reverseCamels];
};

// 初始化投注卡
const initializeBetCards = (): BetCard[] => {
  const cards: BetCard[] = [];
  const colors = [CamelColor.RED, CamelColor.YELLOW, CamelColor.BLUE, CamelColor.PURPLE, CamelColor.GREEN];
  
  // 为每种颜色创建单轮投注卡 (5, 3, 2, 2) - 每种颜色4张卡
  colors.forEach(color => {
    cards.push(
      { id: `round-${color}-5`, type: 'round' as any, camelColor: color, value: 5 },
      { id: `round-${color}-3`, type: 'round' as any, camelColor: color, value: 3 },
      { id: `round-${color}-2-1`, type: 'round' as any, camelColor: color, value: 2 },
      { id: `round-${color}-2-2`, type: 'round' as any, camelColor: color, value: 2 }
    );
  });
  
  return cards;
};

export const useGameStore = create<GameStore>((set, get) => ({
  currentRoom: null,
  currentPlayer: null,
  isConnecting: false,
  error: null,
  botAIs: new Map<string, BotAI>(),
  
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setError: (error) => set({ error }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  
  // 添加机器人
  addBot: (difficulty = BotDifficulty.MEDIUM) => {
    const { currentRoom } = get();
    if (!currentRoom || currentRoom.players.length >= currentRoom.maxPlayers) return;
    
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const botName = getRandomBotName();
    const botPlayer = createBotPlayer(botId, botName, difficulty);
    
    // 设置初始金币为0
    botPlayer.coins = 0;
    
    // 创建机器人AI实例
    const botAI = new BotAI(botId, difficulty);
    const { botAIs } = get();
    botAIs.set(botId, botAI);
    
    const updatedRoom = {
      ...currentRoom,
      players: [...currentRoom.players, botPlayer]
    };
    
    set({ currentRoom: updatedRoom, botAIs: new Map(botAIs) });
  },
  
  // 移除机器人
  removeBot: (botId: string) => {
    const { currentRoom, botAIs } = get();
    if (!currentRoom) return;
    
    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.filter(p => p.id !== botId)
    };
    
    botAIs.delete(botId);
    set({ currentRoom: updatedRoom, botAIs: new Map(botAIs) });
  },
  
  // 执行机器人行动
  executeBotAction: (botId: string) => {
    const { currentRoom, botAIs } = get();
    if (!currentRoom) return;
    
    const botAI = botAIs.get(botId);
    const botPlayer = currentRoom.players.find(p => p.id === botId);
    
    if (!botAI || !botPlayer || !botPlayer.isBot) return;
    
    const action = botAI.decideAction(currentRoom, botPlayer);
    
    // 执行机器人决定的行动
    switch (action.type) {
      case ActionType.ROLL_DICE:
        setTimeout(() => get().rollDice(), 1000); // 延迟1秒模拟思考
        break;
      case ActionType.PLACE_BET:
        if (action.data?.camelColor && action.data?.betType) {
          setTimeout(() => {
            const betCard: BetCard = {
              id: `bot-bet-${botId}-${Date.now()}`,
              type: action.data.betType,
              camelColor: action.data.camelColor,
              value: action.data.betType === BetType.ROUND ? 5 : 1
            };
            get().placeBet(botId, betCard);
          }, 1500);
        }
        break;
      case ActionType.PLACE_TILE:
        if (action.data?.position && action.data?.type) {
          setTimeout(() => {
            get().placeTrackTile(botId, action.data.position, action.data.type);
          }, 1200);
        }
        break;
    }
  },
  
  initializeGame: () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    // 初始化玩家的投注字段和金币来源
    const updatedPlayers = currentRoom.players.map(player => ({
      ...player,
      championBets: [],
      loserBets: [],
      coinSources: [{
        type: 'initial' as const,
        amount: player.coins,
        description: '初始金币',
        round: 0
      }]
    }));
    
    const updatedRoom: GameRoom = {
      ...currentRoom,
      players: updatedPlayers,
      status: GameStatus.PLAYING,
      round: 1,
      camels: initializeCamels(),
      availableDice: [DiceColor.RED, DiceColor.YELLOW, DiceColor.BLUE, DiceColor.PURPLE, DiceColor.GREEN, DiceColor.GRAY],
      usedDice: [],
      roundBetCards: initializeBetCards(),
      winnerBetCards: [],
      loserBetCards: [],
      trackTiles: [],
      currentPlayerId: currentRoom.players[0]?.id,
      actionHistory: [],
      roundSettlements: [],
      championBetOrder: [],
      loserBetOrder: []
    };
    
    set({ currentRoom: updatedRoom });
  },
  
  rollDice: (debugDiceColor?: string, debugSteps?: number) => {
    const { currentRoom } = get();
    if (!currentRoom || currentRoom.availableDice.length === 0) return null;
    
    // 检查是否已经掷了5个骰子（每轮最多掷5个，留1个不掷）
    if (currentRoom.usedDice.length >= 5) {
      // 自动结束小轮
      get().calculateRoundResults();
      return null;
    }
    
    // 保存当前玩家ID，避免在后续操作中被改变
    const currentPlayerId = currentRoom.currentPlayerId;
    
    // 选择骰子（调试模式或随机）
    let diceColor: DiceColor;
    let randomIndex: number;
    
    if (debugDiceColor && currentRoom.availableDice.includes(debugDiceColor as DiceColor)) {
      // 调试模式：使用指定的骰子
      diceColor = debugDiceColor as DiceColor;
      randomIndex = currentRoom.availableDice.indexOf(debugDiceColor as DiceColor);
    } else {
      // 正常模式：随机选择一个可用的骰子
      randomIndex = Math.floor(Math.random() * currentRoom.availableDice.length);
      diceColor = currentRoom.availableDice[randomIndex];
    }
    const steps = debugSteps || Math.floor(Math.random() * 3) + 1; // 1-3步，调试模式可指定
    
    let camelColor: CamelColor;
    let isReverse = false;
    
    // 根据骰子颜色确定移动的骆驼
    if (diceColor === DiceColor.GRAY) {
      // 灰色骰子随机选择黑色或白色骆驼
      camelColor = Math.random() < 0.5 ? CamelColor.BLACK : CamelColor.WHITE;
      isReverse = true;
    } else {
      // 其他骰子对应相同颜色的骆驼
      const diceColorToCamelColor: Record<DiceColor, CamelColor> = {
        [DiceColor.RED]: CamelColor.RED,
        [DiceColor.YELLOW]: CamelColor.YELLOW,
        [DiceColor.BLUE]: CamelColor.BLUE,
        [DiceColor.PURPLE]: CamelColor.PURPLE,
        [DiceColor.GREEN]: CamelColor.GREEN,
        [DiceColor.GRAY]: CamelColor.BLACK // 这个不会被使用，因为上面已经处理了
      };
      camelColor = diceColorToCamelColor[diceColor];
    }
    
    const diceResult: DiceResult = {
      diceColor,
      camelColor,
      steps,
      isReverse
    };
    
    // 移除已使用的骰子，添加到已使用列表
    const updatedAvailableDice = currentRoom.availableDice.filter((_, index) => index !== randomIndex);
    const updatedUsedDice: DiceColor[] = [...currentRoom.usedDice, diceColor];
    
    // 先给当前玩家奖励1金币，避免被moveCamel覆盖
    const playersWithReward = currentRoom.players.map(player => {
      if (player.id === currentPlayerId) {
        const newCoinSource = {
          type: 'dice_roll' as const,
          amount: 1,
          description: '掷骰子奖励',
          round: currentRoom.round
        };
        return { 
          ...player, 
          coins: player.coins + 1,
          coinSources: [...(player.coinSources || []), newCoinSource]
        };
      }
      return player;
    });
    
    const roomWithReward = {
      ...currentRoom,
      availableDice: updatedAvailableDice,
      usedDice: updatedUsedDice,
      lastDiceResult: diceResult,
      players: playersWithReward
    };
    
    set({ currentRoom: roomWithReward });
    
    // 然后移动骆驼以获取瓦片互动信息
    get().moveCamel(camelColor, steps, isReverse);
    
    // 获取更新后的房间状态以获取瓦片互动信息
    const { currentRoom: roomAfterMove } = get();
    if (!roomAfterMove) return diceResult;
    
    // 添加操作历史（包含瓦片互动信息）
    const currentPlayer = roomAfterMove.players.find(p => p.id === currentPlayerId);
    if (currentPlayer) {
      // 找到移动的骆驼
      const camel = currentRoom.camels.find(c => c.color === camelColor);
      if (camel) {
        // 检查是否有瓦片互动
        const targetPosition = isReverse ? camel.position - steps : camel.position + steps;
        const trackTile = currentRoom.trackTiles.find(t => t.position === targetPosition);
        const tileOwner = trackTile ? currentRoom.players.find(p => p.id === trackTile.playerId) : null;
        
        let description = `掷出${diceColor}骰子，${camelColor}骆驼${isReverse ? '后退' : '前进'}${steps}步`;
        
        if (trackTile && tileOwner) {
          const tileTypeText = trackTile.type === TrackTileType.ACCELERATE ? '加速' : '减速';
          let additionalMove;
          
          // 黑白骆驼的瓦片效果是反向的
          if (camelColor === CamelColor.BLACK || camelColor === CamelColor.WHITE) {
            additionalMove = trackTile.type === TrackTileType.ACCELERATE ? '后退一步' : '前进一步';
          } else {
            additionalMove = trackTile.type === TrackTileType.ACCELERATE ? '前进一步' : '后退一步';
          }
          
          description += `，触发了【${tileOwner.name}】的${tileTypeText}瓦片，${additionalMove}，【${tileOwner.name}】获得金币+1`;
        }
        
        if (currentPlayerId) {
          get().addActionHistory(
            currentPlayerId,
            ActionType.ROLL_DICE,
            description
          );
        }
      }
    }
    
    // 检查是否轮次结束（掷了5个骰子）
    if (updatedUsedDice.length >= 5) {
      // 延迟结算，让玩家看到最后一次掷骰结果
      setTimeout(() => {
        get().calculateRoundResults();
      }, 1000);
    } else {
      // 切换到下一个玩家
      get().nextPlayer();
    }
    
    return diceResult;
  },
  
  moveCamel: (camelColor: CamelColor, steps: number, isReverse = false) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const camel = currentRoom.camels.find(c => c.color === camelColor);
    if (!camel) return;
    
    let newPosition: number;
    
    // 黑白骆驼总是后退，其他骆驼前进
    if (camelColor === CamelColor.BLACK || camelColor === CamelColor.WHITE) {
      newPosition = camel.position - steps;
    } else {
      newPosition = camel.position + steps;
    }
    
    // 应用赛道瓦片效果（所有骆驼都会触发瓦片效果）
    let tileOwnerReward: { playerId: string; tileType: string } | null = null;
    const trackTile = currentRoom.trackTiles.find(t => t.position === newPosition);
    if (trackTile) {
      // 记录瓦片拥有者，用于后续奖励
      tileOwnerReward = {
        playerId: trackTile.playerId,
        tileType: trackTile.type === TrackTileType.ACCELERATE ? '加速' : '减速'
      };
      
      // 对于黑白骆驼，瓦片效果是反向的
      if (camelColor === CamelColor.BLACK || camelColor === CamelColor.WHITE) {
        if (trackTile.type === TrackTileType.ACCELERATE) {
          // 加速瓦片让黑白骆驼再后退1步
          newPosition -= 1;
        } else if (trackTile.type === TrackTileType.DECELERATE) {
          // 减速瓦片让黑白骆驼前进1步（减少后退距离）
          newPosition += 1;
        }
      } else {
        // 参赛骆驼的正常瓦片效果
        if (trackTile.type === TrackTileType.ACCELERATE) {
          newPosition += 1;
        } else if (trackTile.type === TrackTileType.DECELERATE) {
          newPosition -= 1;
        }
      }
    }
    
    // 确保骆驼不会超出赛道边界
    newPosition = Math.max(1, Math.min(16, newPosition));
    
    // 获取当前位置的所有骆驼，按stackOrder排序
    const camelsAtCurrentPosition = currentRoom.camels
      .filter(c => c.position === camel.position)
      .sort((a, b) => a.stackOrder - b.stackOrder);
    
    const camelIndex = camelsAtCurrentPosition.findIndex(c => c.color === camelColor);
    
    // 移动骆驼及其上方的所有骆驼（包括黑白骆驼驮着其他骆驼的情况）
    // 统一规则：所有骆驼移动时都只带着上方的骆驼一起移动，不影响下方的骆驼
    const camelsToMove: Camel[] = camelsAtCurrentPosition.slice(camelIndex);
    
    const updatedCamels = currentRoom.camels.map(c => {
      if (camelsToMove.some(ctm => ctm.color === c.color)) {
        return { ...c, position: newPosition };
      }
      return c;
    });
    
    // 重新排序留在原位置的骆驼
    const remainingCamels = camelsAtCurrentPosition.slice(0, camelIndex);
    remainingCamels.forEach((c, index) => {
      const camelToUpdate = updatedCamels.find(uc => uc.color === c.color);
      if (camelToUpdate) {
        camelToUpdate.stackOrder = index;
      }
    });
    
    // 重新排序移动到新位置的骆驼
    const camelsAtNewPosition = updatedCamels.filter(c => c.position === newPosition);
    const existingCamelsAtNewPosition = camelsAtNewPosition.filter(c => !camelsToMove.some(ctm => ctm.color === c.color));
    const movedCamels = camelsToMove.map(ctm => updatedCamels.find(uc => uc.color === ctm.color)!).filter(Boolean);
    
    // 对已存在的骆驼按stackOrder排序
    existingCamelsAtNewPosition.sort((a, b) => a.stackOrder - b.stackOrder);
    
    // 移动的骆驼保持原有的相对顺序，放在已存在骆驼的上方
    const finalCamelsAtNewPosition = [...existingCamelsAtNewPosition, ...movedCamels];
    finalCamelsAtNewPosition.forEach((c, index) => {
      c.stackOrder = index;
    });
    
    // 处理瓦片奖励
    const { currentRoom: latestRoom } = get();
    if (!latestRoom) return;
    
    let updatedPlayers = latestRoom.players; // 使用最新的玩家状态
    if (tileOwnerReward) {
      const rewardInfo = tileOwnerReward;
      
      updatedPlayers = latestRoom.players.map(player => {
        if (player.id === rewardInfo.playerId) {
          const newCoinSource = {
            type: 'tile_reward' as const,
            amount: 1,
            description: `${rewardInfo.tileType}瓦片奖励`,
            round: latestRoom.round
          };
          const updatedPlayer = { 
            ...player, 
            coins: player.coins + 1,
            coinSources: [...(player.coinSources || []), newCoinSource]
          };
          return updatedPlayer;
        }
        return player;
      });
    }
    
    const updatedRoom = {
      ...latestRoom,
      camels: updatedCamels,
      players: updatedPlayers
    };
    
    set({ currentRoom: updatedRoom });
    
    // 检查游戏是否结束（骆驼位置超过15格）
    if (get().checkGameEnd()) {
      // 延迟一下让玩家看到最后的移动结果
      setTimeout(() => {
        get().calculateFinalResults();
      }, 1000);
    }
  },
  
  placeBet: (playerId, betCard) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const player = currentRoom.players.find(p => p.id === playerId);
    if (!player) return;
    
    let updatedRoom = { ...currentRoom };
    let updatedPlayer = { ...player };
    
    // 根据投注类型更新相应的投注卡列表
    if (betCard.type === BetType.ROUND) {
      // 单轮投注 - 每个骆驼最多4张投注卡
      const camelBets = currentRoom.roundBetCards.filter(card => 
        card.camelColor === betCard.camelColor && !card.playerId
      );
      
      if (camelBets.length === 0) return; // 没有可用的投注卡
      
      // 选择价值最高的可用投注卡
      const availableBet = camelBets.reduce((best, current) => 
        current.value > best.value ? current : best
      );
      
      // 更新投注卡的拥有者
      updatedRoom.roundBetCards = currentRoom.roundBetCards.map(card => 
        card.id === availableBet.id ? { ...card, playerId } : card
      );
      
      // 添加到玩家的投注卡列表
      updatedPlayer.betCards = [...player.betCards, { ...availableBet, playerId }];
    } else if (betCard.type === BetType.WINNER) {
      // 冠军投注 - 检查是否已经对该骆驼投注过
      if (player.championBets?.includes(betCard.camelColor) || player.loserBets?.includes(betCard.camelColor)) {
        return; // 已经对该骆驼投注过，不允许重复投注
      }
      
      // 添加到冠军投注列表
      updatedPlayer.championBets = [...(player.championBets || []), betCard.camelColor];
      
      // 记录投注顺序
      const nextOrder = (currentRoom.championBetOrder?.filter(bet => bet.camelColor === betCard.camelColor).length || 0) + 1;
      updatedRoom.championBetOrder = [...(currentRoom.championBetOrder || []), {
        playerId,
        camelColor: betCard.camelColor,
        order: nextOrder
      }];
      
      updatedRoom.winnerBetCards = [...currentRoom.winnerBetCards, { ...betCard, playerId }];
    } else if (betCard.type === BetType.LOSER) {
      // 垫底投注 - 检查是否已经对该骆驼投注过
      if (player.championBets?.includes(betCard.camelColor) || player.loserBets?.includes(betCard.camelColor)) {
        return; // 已经对该骆驼投注过，不允许重复投注
      }
      
      // 添加到垫底投注列表
      updatedPlayer.loserBets = [...(player.loserBets || []), betCard.camelColor];
      
      // 记录投注顺序
      const nextOrder = (currentRoom.loserBetOrder?.filter(bet => bet.camelColor === betCard.camelColor).length || 0) + 1;
      updatedRoom.loserBetOrder = [...(currentRoom.loserBetOrder || []), {
        playerId,
        camelColor: betCard.camelColor,
        order: nextOrder
      }];
      
      updatedRoom.loserBetCards = [...currentRoom.loserBetCards, { ...betCard, playerId }];
    }
    
    // 更新房间中的玩家信息
    updatedRoom.players = currentRoom.players.map(p => 
      p.id === playerId ? updatedPlayer : p
    );
    
    set({ currentRoom: updatedRoom });
    
    // 添加操作历史
    let actionDescription = '';
    if (betCard.type === BetType.ROUND) {
      actionDescription = `对${betCard.camelColor}骆驼下注（轮次投注）`;
    } else if (betCard.type === BetType.WINNER) {
      actionDescription = `投注冠军`;
    } else if (betCard.type === BetType.LOSER) {
      actionDescription = `投注垫底`;
    }
    
    get().addActionHistory(
      playerId,
      ActionType.PLACE_BET,
      actionDescription
    );
    
    // 切换到下一个玩家
    get().nextPlayer();
  },
  
  placeChampionBet: (playerId, camelColor) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const player = currentRoom.players.find(p => p.id === playerId);
    if (!player) return;
    
    // 检查是否已经对该骆驼投注过
    if (player.championBets?.includes(camelColor) || player.loserBets?.includes(camelColor)) {
      return; // 已经对该骆驼投注过，不允许重复投注
    }
    
    const updatedPlayer = {
      ...player,
      championBets: [...(player.championBets || []), camelColor]
    };
    
    // 记录投注顺序
    const nextOrder = (currentRoom.championBetOrder?.filter(bet => bet.camelColor === camelColor).length || 0) + 1;
    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.map(p => p.id === playerId ? updatedPlayer : p),
      championBetOrder: [...(currentRoom.championBetOrder || []), {
        playerId,
        camelColor,
        order: nextOrder
      }]
    };
    
    set({ currentRoom: updatedRoom });
    
    // 添加操作历史
    get().addActionHistory(
      playerId,
      ActionType.PLACE_BET,
      `投注冠军`
    );
    
    // 切换到下一个玩家
    get().nextPlayer();
  },
  
  placeLoserBet: (playerId, camelColor) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const player = currentRoom.players.find(p => p.id === playerId);
    if (!player) return;
    
    // 检查是否已经对该骆驼投注过
    if (player.championBets?.includes(camelColor) || player.loserBets?.includes(camelColor)) {
      return; // 已经对该骆驼投注过，不允许重复投注
    }
    
    const updatedPlayer = {
      ...player,
      loserBets: [...(player.loserBets || []), camelColor]
    };
    
    // 记录投注顺序
    const nextOrder = (currentRoom.loserBetOrder?.filter(bet => bet.camelColor === camelColor).length || 0) + 1;
    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.map(p => p.id === playerId ? updatedPlayer : p),
      loserBetOrder: [...(currentRoom.loserBetOrder || []), {
        playerId,
        camelColor,
        order: nextOrder
      }]
    };
    
    set({ currentRoom: updatedRoom });
    
    // 添加操作历史
    get().addActionHistory(
      playerId,
      ActionType.PLACE_BET,
      `投注垫底`
    );
    
    // 切换到下一个玩家
    get().nextPlayer();
  },
  
  placeTrackTile: (playerId, position, type) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    // 检查位置是否有效（不能在起点、终点）
    if (position <= 0 || position >= 16) return;
    
    // 检查位置是否有骆驼
    const hasCamelAtPosition = currentRoom.camels.some(camel => camel.position === position);
    if (hasCamelAtPosition) return;
    
    // 检查该位置是否已有其他玩家的瓦片
    const existingTile = currentRoom.trackTiles.find(tile => tile.position === position);
    if (existingTile && existingTile.playerId !== playerId) return;
    
    // 如果是自己的瓦片，允许切换类型
    if (existingTile && existingTile.playerId === playerId) {
      // 切换瓦片类型
      const updatedTrackTiles = currentRoom.trackTiles.map(tile => 
        tile.id === existingTile.id ? { ...tile, type } : tile
      );
      
      const tileTypeText = type === TrackTileType.ACCELERATE ? '加速' : '减速';
      get().addActionHistory(
        playerId,
        ActionType.PLACE_TILE,
        `将第${position}格的瓦片切换为${tileTypeText}瓦片`
      );
      
      const updatedRoom = {
        ...currentRoom,
        trackTiles: updatedTrackTiles
      };
      
      set({ currentRoom: updatedRoom });
      get().nextPlayer();
      return;
    }
    
    // 检查是否与其他瓦片相邻
    const hasAdjacentTile = currentRoom.trackTiles.some(tile => 
      Math.abs(tile.position - position) === 1
    );
    if (hasAdjacentTile) return;
    
    // 移除该玩家之前放置的瓦片（每人只能有一张瓦片）
    const updatedTrackTiles = currentRoom.trackTiles.filter(tile => tile.playerId !== playerId);
    
    const newTile: TrackTile = {
      id: `tile-${playerId}-${position}-${Date.now()}`,
      type,
      position,
      playerId
    };
    
    const updatedRoom = {
      ...currentRoom,
      trackTiles: [...updatedTrackTiles, newTile]
    };
    
    set({ currentRoom: updatedRoom });
    
    // 添加操作历史
    const tileTypeText = type === TrackTileType.ACCELERATE ? '加速' : '减速';
    get().addActionHistory(
      playerId,
      ActionType.PLACE_TILE,
      `在第${position}格放置${tileTypeText}瓦片`
    );
    
    // 切换到下一个玩家
    get().nextPlayer();
  },
  
  nextPlayer: () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const currentIndex = currentRoom.players.findIndex(p => p.id === currentRoom.currentPlayerId);
    const nextIndex = (currentIndex + 1) % currentRoom.players.length;
    const nextPlayerId = currentRoom.players[nextIndex].id;
    
    const updatedRoom = {
      ...currentRoom,
      currentPlayerId: nextPlayerId
    };
    
    set({ currentRoom: updatedRoom });
    
    // 如果下一个玩家是机器人，执行机器人行动
    const nextPlayer = currentRoom.players[nextIndex];
    if (nextPlayer.isBot) {
      setTimeout(() => {
        const { currentRoom: latestRoom } = get();
        if (latestRoom && latestRoom.currentPlayerId === nextPlayer.id) {
          get().executeBotAction(nextPlayer.id);
        }
      }, 1500); // 延迟1.5秒执行机器人行动
    }
  },
  
  checkRoundEnd: () => {
    const { currentRoom } = get();
    if (!currentRoom) return false;
    
    // 当所有骰子都被使用时，单轮结束
    return currentRoom.availableDice.length === 0;
  },
  
  calculateRoundResults: () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    // 计算轮次投注结算
    const camels = [...currentRoom.camels].sort((a, b) => {
      if (a.position !== b.position) {
        return b.position - a.position; // 按位置降序排列
      }
      return b.stackOrder - a.stackOrder; // 同位置按堆叠顺序降序排列
    });
    
    // 只考虑参赛骆驼（排除黑白骆驼）
    const racingCamels = camels.filter(c => c.color !== CamelColor.BLACK && c.color !== CamelColor.WHITE);
    const firstPlace = racingCamels[0];
    const secondPlace = racingCamels[1];
    
    // 收集结算详情
    const settlementDetails: string[] = [];
    
    // 结算轮次投注 - 修正投注收益计算逻辑
    currentRoom.players.forEach(player => {
      const playerRoundBets = currentRoom.roundBetCards.filter(card => card.playerId === player.id);
      let playerEarnings = 0;
      
      playerRoundBets.forEach(bet => {
        let earnedCoins = 0;
        if (bet.camelColor === firstPlace?.color) {
          // 第一名的骆驼：根据投注卡的价值获得收益
          earnedCoins = bet.value;
        } else if (bet.camelColor === secondPlace?.color) {
          earnedCoins = 1; // 第二名获得1金币
        } else {
          earnedCoins = -1; // 其他情况失去1金币
        }
        
        player.coins += earnedCoins;
        playerEarnings += earnedCoins;
        
        // 添加金币来源记录
        if (earnedCoins !== 0) {
          const coinSource: CoinSource = {
            type: 'round_bet',
            amount: earnedCoins,
            description: `第${currentRoom.round}轮投注${bet.camelColor}骆驼${earnedCoins > 0 ? '获得' : '失去'}${Math.abs(earnedCoins)}金币`,
            round: currentRoom.round
          };
          player.coinSources.push(coinSource);
        }
        
        // 记录每笔结算详情
        const action = earnedCoins > 0 ? '获得' : '失去';
        settlementDetails.push(`${player.name}投注${bet.camelColor}骆驼${action}${Math.abs(earnedCoins)}金币`);
      });
      
      // 清空玩家的轮次投注卡
      player.betCards = player.betCards.filter(card => card.type !== BetType.ROUND);
    });
    
    // 创建轮次结算记录
    const roundSettlement: RoundSettlement = {
      round: currentRoom.round,
      details: settlementDetails,
      timestamp: new Date()
    };
    
    // 重置骰子和轮次投注
    const updatedRoom = {
      ...currentRoom,
      availableDice: [DiceColor.RED, DiceColor.YELLOW, DiceColor.BLUE, DiceColor.PURPLE, DiceColor.GREEN, DiceColor.GRAY],
      usedDice: [],
      roundBetCards: initializeBetCards(),
      round: currentRoom.round + 1,
      players: currentRoom.players.map(player => ({
        ...player,
        betCards: player.betCards.filter(card => card.type !== BetType.ROUND)
      })), // 清空所有玩家的轮次投注卡
      roundSettlements: [...currentRoom.roundSettlements, roundSettlement], // 保存结算详情
      currentPlayerId: currentRoom.players[0]?.id // 重置到第一个玩家
    };
    
    // 添加轮次结算历史
    get().addActionHistory(
      'system',
      ActionType.ROUND_END,
      `第${currentRoom.round}轮结束，第一名：${firstPlace?.color}，第二名：${secondPlace?.color}`
    );
    
    // 添加详细结算历史
    settlementDetails.forEach(detail => {
      get().addActionHistory(
        'system',
        ActionType.ROUND_END,
        detail
      );
    });
    
    set({ currentRoom: updatedRoom });
    
    // 如果第一个玩家是机器人，启动机器人行动
    const firstPlayer = currentRoom.players[0];
    if (firstPlayer?.isBot) {
      setTimeout(() => {
        const { currentRoom: latestRoom } = get();
        if (latestRoom && latestRoom.currentPlayerId === firstPlayer.id) {
          get().executeBotAction(firstPlayer.id);
        }
      }, 2000); // 延迟2秒执行机器人行动
    }
  },
  
  checkGameEnd: () => {
    const { currentRoom } = get();
    if (!currentRoom) return false;
    
    // 当有骆驼到达终点时游戏结束
    return currentRoom.camels.some(camel => camel.position >= 16);
  },
  
  calculateFinalResults: () => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    // 计算最终排名
    const camels = [...currentRoom.camels].sort((a, b) => {
      if (a.position !== b.position) {
        return b.position - a.position; // 按位置降序排列
      }
      return b.stackOrder - a.stackOrder; // 同位置按堆叠顺序降序排列
    });
    
    // 只考虑参赛骆驼（排除黑白骆驼）
    const racingCamels = camels.filter(c => c.color !== CamelColor.BLACK && c.color !== CamelColor.WHITE);
    const champion = racingCamels[0];
    const lastPlace = racingCamels[racingCamels.length - 1];
    
    // 收集最终结算详情
    const finalSettlementDetails: string[] = [];
    
    // 结算冠军投注
    const championBets = currentRoom.championBetOrder?.filter(bet => bet.camelColor === champion?.color) || [];
    championBets.forEach(bet => {
      const player = currentRoom.players.find(p => p.id === bet.playerId);
      if (player) {
        let reward = 0;
        switch (bet.order) {
          case 1: reward = 8; break;
          case 2: reward = 5; break;
          case 3: reward = 3; break;
          default: reward = 2; break;
        }
        player.coins += reward;
        
        // 添加金币来源记录
        const coinSource: CoinSource = {
          type: 'champion_bet',
          amount: reward,
          description: `冠军投注${champion?.color}骆驼获得${reward}金币（第${bet.order}个投注）`,
          round: currentRoom.round
        };
        player.coinSources.push(coinSource);
        
        finalSettlementDetails.push(`${player.name}冠军投注${champion?.color}骆驼获得${reward}金币`);
      }
    });
    
    // 结算垫底投注
    const loserBets = currentRoom.loserBetOrder?.filter(bet => bet.camelColor === lastPlace?.color) || [];
    loserBets.forEach(bet => {
      const player = currentRoom.players.find(p => p.id === bet.playerId);
      if (player) {
        let reward = 0;
        switch (bet.order) {
          case 1: reward = 8; break;
          case 2: reward = 5; break;
          case 3: reward = 3; break;
          default: reward = 2; break;
        }
        player.coins += reward;
        
        // 添加金币来源记录
        const coinSource: CoinSource = {
          type: 'loser_bet',
          amount: reward,
          description: `垫底投注${lastPlace?.color}骆驼获得${reward}金币（第${bet.order}个投注）`,
          round: currentRoom.round
        };
        player.coinSources.push(coinSource);
        
        finalSettlementDetails.push(`${player.name}垫底投注${lastPlace?.color}骆驼获得${reward}金币`);
      }
    });
    
    // 扣除错误投注的金币
    currentRoom.players.forEach(player => {
      // 检查错误的冠军投注
      const wrongChampionBets = player.championBets?.filter(color => color !== champion?.color) || [];
      if (wrongChampionBets.length > 0) {
        player.coins -= wrongChampionBets.length;
        
        // 添加金币来源记录
        const coinSource: CoinSource = {
          type: 'champion_bet',
          amount: -wrongChampionBets.length,
          description: `错误冠军投注失去${wrongChampionBets.length}金币`,
          round: currentRoom.round
        };
        player.coinSources.push(coinSource);
        
        finalSettlementDetails.push(`${player.name}错误冠军投注失去${wrongChampionBets.length}金币`);
      }
      
      // 检查错误的垫底投注
      const wrongLoserBets = player.loserBets?.filter(color => color !== lastPlace?.color) || [];
      if (wrongLoserBets.length > 0) {
        player.coins -= wrongLoserBets.length;
        
        // 添加金币来源记录
        const coinSource: CoinSource = {
          type: 'loser_bet',
          amount: -wrongLoserBets.length,
          description: `错误垫底投注失去${wrongLoserBets.length}金币`,
          round: currentRoom.round
        };
        player.coinSources.push(coinSource);
        
        finalSettlementDetails.push(`${player.name}错误垫底投注失去${wrongLoserBets.length}金币`);
      }
    });
    
    // 创建最终结算记录
    const finalSettlement: RoundSettlement = {
      round: currentRoom.round,
      details: [`游戏结束 - 冠军：${champion?.color}，垫底：${lastPlace?.color}`, ...finalSettlementDetails],
      timestamp: new Date()
    };
    
    const updatedRoom = {
      ...currentRoom,
      status: GameStatus.GAME_END,
      roundSettlements: [...currentRoom.roundSettlements, finalSettlement]
    };
    
    set({ currentRoom: updatedRoom });
  },
  
  addActionHistory: (playerId: string, action: ActionType, description: string) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    
    const newAction: ActionHistory = {
      id: Date.now().toString(),
      playerId,
      action,
      description,
      timestamp: new Date(),
      round: currentRoom.round
    };
    
    const updatedRoom = {
      ...currentRoom,
      actionHistory: [...currentRoom.actionHistory, newAction]
    };
    
    set({ currentRoom: updatedRoom });
  }
}));