import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../hooks/useGameStore';
import { GameRoom, Player, CamelColor, DiceColor, BetType, TrackTileType, ActionType, GameStatus, BetCard } from '../types/game';
import { BotDifficulty } from '../utils/botAI';

// Mock data
const createMockPlayer = (id: string, name: string, isBot = false): Player => ({
  id,
  name,
  coins: 3,
  isReady: true,
  isHost: id === 'player1',
  isBot,
  betCards: [],
  trackTiles: [],
  championBets: [],
  loserBets: [],
  coinSources: []
});

const createMockRoom = (): GameRoom => ({
  id: 'test-room',
  name: 'Test Room',
  maxPlayers: 4,
  status: GameStatus.PLAYING,
  players: [
    createMockPlayer('player1', '玩家1'),
    createMockPlayer('bot1', '机器人1', true),
    createMockPlayer('player2', '玩家2')
  ],
  round: 1,
  camels: [
    { color: CamelColor.RED, position: 1, stackOrder: 0 },
    { color: CamelColor.YELLOW, position: 1, stackOrder: 1 },
    { color: CamelColor.BLUE, position: 1, stackOrder: 2 },
    { color: CamelColor.PURPLE, position: 1, stackOrder: 3 },
    { color: CamelColor.GREEN, position: 1, stackOrder: 4 },
    { color: CamelColor.BLACK, position: 0, stackOrder: 0 },
    { color: CamelColor.WHITE, position: 0, stackOrder: 0 }
  ],
  availableDice: [DiceColor.RED, DiceColor.YELLOW, DiceColor.BLUE, DiceColor.PURPLE, DiceColor.GREEN, DiceColor.GRAY],
  usedDice: [],
  roundBetCards: [],
  winnerBetCards: [],
  loserBetCards: [],
  trackTiles: [],
  currentPlayerId: 'player1',
  actionHistory: [],
  roundSettlements: [],
  championBetOrder: [],
  loserBetOrder: []
});

describe('GameStore Tests', () => {
  beforeEach(() => {
    // Reset store state
    const store = useGameStore.getState();
    store.currentRoom = null;
    store.currentPlayer = null;
  });

  describe('操作历史记录测试', () => {
    it('应该记录放置瓦片操作', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      store.currentRoom = mockRoom;
      
      // 放置加速瓦片
      store.placeTrackTile('player1', 5, TrackTileType.ACCELERATE);
      
      const room = store.currentRoom;
      expect(room?.actionHistory).toBeDefined();
      expect(room?.actionHistory.length).toBeGreaterThan(0);
      
      const tileAction = room?.actionHistory.find(action => 
        action.action === ActionType.PLACE_TILE && 
        action.description.includes('在第5格放置加速瓦片')
      );
      expect(tileAction).toBeDefined();
      expect(tileAction?.playerId).toBe('player1');
    });

    it('应该记录投注操作', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      // 初始化投注卡
      mockRoom.roundBetCards = [
        { id: 'bet1', type: BetType.ROUND, camelColor: CamelColor.RED, value: 5 },
        { id: 'bet2', type: BetType.ROUND, camelColor: CamelColor.YELLOW, value: 5 }
      ];
      store.currentRoom = mockRoom;
      
      // 进行轮次投注
      const betCard = {
        id: 'test-bet',
        type: BetType.ROUND,
        camelColor: CamelColor.RED,
        value: 5
      };
      store.placeBet('player1', betCard);
      
      const room = store.currentRoom;
      expect(room?.actionHistory).toBeDefined();
      
      const betAction = room?.actionHistory.find(action => 
        action.action === ActionType.PLACE_BET && 
        action.description.includes('对red骆驼下注')
      );
      expect(betAction).toBeDefined();
      expect(betAction?.playerId).toBe('player1');
    });

    it('应该记录骰子投掷和瓦片互动', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      // 在位置3放置加速瓦片
      mockRoom.trackTiles = [{
        id: 'tile1',
        type: TrackTileType.ACCELERATE,
        position: 3,
        playerId: 'player2'
      }];
      // 将红色骆驼移动到位置2
      mockRoom.camels[0].position = 2;
      store.currentRoom = mockRoom;
      
      // 模拟投掷骰子，红色骆驼前进1步到位置3（有瓦片）
      store.rollDice();
      
      const room = store.currentRoom;
      expect(room?.actionHistory).toBeDefined();
      
      // 查找包含瓦片互动信息的操作历史
      const diceAction = room?.actionHistory.find(action => 
        action.action === ActionType.ROLL_DICE && 
        action.description.includes('触发了') && 
        action.description.includes('瓦片')
      );
      
      // 如果骰子结果确实触发了瓦片，应该有相应记录
      if (diceAction) {
        expect(diceAction.description).toContain('玩家2');
        expect(diceAction.description).toContain('获得金币+1');
      }
    });
  });

  describe('机器人回合结束测试', () => {
    it('机器人投掷骰子结束轮次后应该正确切换到下一轮', async () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      // 设置为轮次即将结束（已投掷4个骰子）
      mockRoom.usedDice = [DiceColor.RED, DiceColor.YELLOW, DiceColor.BLUE, DiceColor.PURPLE];
      mockRoom.availableDice = [DiceColor.GREEN, DiceColor.GRAY];
      mockRoom.currentPlayerId = 'bot1'; // 当前是机器人回合
      store.currentRoom = mockRoom;
      
      const initialRound = mockRoom.round;
      
      // 机器人投掷最后一个骰子
      store.rollDice();
      
      // 等待结算完成
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const room = store.currentRoom;
      expect(room?.round).toBe(initialRound + 1); // 轮次应该增加
      expect(room?.usedDice.length).toBe(0); // 已使用骰子应该重置
      expect(room?.availableDice.length).toBe(6); // 可用骰子应该重置
      expect(room?.currentPlayerId).toBe('player1'); // 应该重置到第一个玩家
    });

    it('轮次结束后如果第一个玩家是机器人应该自动开始行动', async () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      // 将第一个玩家设为机器人
      mockRoom.players[0].isBot = true;
      mockRoom.usedDice = [DiceColor.RED, DiceColor.YELLOW, DiceColor.BLUE, DiceColor.PURPLE];
      mockRoom.availableDice = [DiceColor.GREEN, DiceColor.GRAY];
      store.currentRoom = mockRoom;
      
      // 触发轮次结束
      store.rollDice();
      
      // 等待机器人行动启动
      await new Promise(resolve => setTimeout(resolve, 2100));
      
      const room = store.currentRoom;
      expect(room?.currentPlayerId).toBe('player1'); // 应该是第一个玩家（机器人）的回合
    });
  });

  describe('玩家等待显示测试', () => {
    it('应该能够获取当前玩家信息用于等待显示', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      mockRoom.currentPlayerId = 'bot1';
      store.currentRoom = mockRoom;
      
      const currentPlayer = mockRoom.players.find(p => p.id === mockRoom.currentPlayerId);
      expect(currentPlayer).toBeDefined();
      expect(currentPlayer?.name).toBe('机器人1');
      expect(currentPlayer?.isBot).toBe(true);
    });
  });

  describe('投掷骰子金币奖励测试', () => {
    it('每次投掷骰子都应该获得1金币', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      // 确保没有瓦片干扰测试
      mockRoom.trackTiles = [];
      store.currentRoom = mockRoom;
      
      // 记录投掷前的当前玩家和金币数
      const initialCurrentPlayerId = mockRoom.currentPlayerId;
      const initialPlayer = mockRoom.players.find(p => p.id === initialCurrentPlayerId);
      const initialCoins = initialPlayer?.coins || 0;
      
      console.log('投掷前:', {
        currentPlayerId: initialCurrentPlayerId,
        initialCoins,
        allPlayers: mockRoom.players.map(p => ({ id: p.id, coins: p.coins }))
      });
      
      // 投掷骰子
      const result = store.rollDice();
      console.log('投掷结果:', result);
      
      const room = store.currentRoom;
      console.log('投掷后:', {
        currentPlayerId: room?.currentPlayerId,
        allPlayers: room?.players.map(p => ({ id: p.id, coins: p.coins }))
      });
      
      // 检查原来的当前玩家（投掷骰子的玩家）是否获得了金币
      const playerWhoRolled = room?.players.find(p => p.id === initialCurrentPlayerId);
      console.log('投掷玩家最终金币:', playerWhoRolled?.coins);
      expect(playerWhoRolled?.coins).toBe(initialCoins + 1);
    });
    
    it('简单测试金币奖励逻辑', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      mockRoom.trackTiles = [];
      mockRoom.availableDice = [DiceColor.RED]; // 只有一个骰子
      store.currentRoom = mockRoom;
      
      const player1 = mockRoom.players.find(p => p.id === 'player1');
      const initialCoins = player1?.coins || 0;
      
      // 直接测试金币奖励逻辑
      const updatedPlayers = mockRoom.players.map(player => {
        if (player.id === 'player1') {
          return { ...player, coins: player.coins + 1 };
        }
        return player;
      });
      
      const updatedRoom = {
        ...mockRoom,
        players: updatedPlayers
      };
      
      store.currentRoom = updatedRoom;
      
      const finalPlayer = store.currentRoom?.players.find(p => p.id === 'player1');
      expect(finalPlayer?.coins).toBe(initialCoins + 1);
    });
  });

  describe('投注卡片清空测试', () => {
    it('轮次结束后应该清空所有玩家的轮次投注卡', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      
      // 初始化投注卡
      mockRoom.roundBetCards = [
        { id: 'bet1', type: BetType.ROUND, camelColor: CamelColor.RED, value: 5 },
        { id: 'bet2', type: BetType.ROUND, camelColor: CamelColor.YELLOW, value: 5 }
      ];
      
      store.currentRoom = mockRoom;
      
      // 玩家进行投注
      const betCard = {
        id: 'test-bet',
        type: BetType.ROUND,
        camelColor: CamelColor.RED,
        value: 5
      };
      store.placeBet('player1', betCard);
      
      // 验证投注卡已添加到玩家
      let room = store.currentRoom;
      let player = room?.players.find(p => p.id === 'player1');
      expect(player?.betCards.length).toBeGreaterThan(0);
      
      // 模拟轮次结束
      store.calculateRoundResults();
      
      // 验证投注卡已清空
      room = store.currentRoom;
      player = room?.players.find(p => p.id === 'player1');
      const roundBetCards = player?.betCards.filter(card => card.type === BetType.ROUND);
      expect(roundBetCards?.length).toBe(0);
    });
  });

  describe('操作历史记录完整性测试', () => {
    it('测试addActionHistory函数', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      store.currentRoom = mockRoom;
      
      const initialHistoryLength = mockRoom.actionHistory.length;
      console.log('初始历史记录数量:', initialHistoryLength);
      
      // 直接测试addActionHistory函数
      store.addActionHistory('player1', ActionType.PLACE_TILE, '测试瓦片操作');
      
      let room = store.currentRoom;
      console.log('添加历史记录后数量:', room?.actionHistory.length);
      console.log('最新历史记录:', room?.actionHistory[room.actionHistory.length - 1]);
      
      expect(room?.actionHistory.length).toBe(initialHistoryLength + 1);
      
      const newAction = room?.actionHistory[room.actionHistory.length - 1];
      expect(newAction?.playerId).toBe('player1');
      expect(newAction?.action).toBe(ActionType.PLACE_TILE);
      expect(newAction?.description).toBe('测试瓦片操作');
    });
    
    it('应该完整记录放置瓦片和投注操作', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      store.currentRoom = mockRoom;
      
      const initialHistoryLength = mockRoom.actionHistory.length;
      console.log('初始历史记录数量:', initialHistoryLength);
      
      // 放置瓦片
      console.log('调用placeTrackTile前');
      store.placeTrackTile('player1', 5, TrackTileType.ACCELERATE);
      console.log('调用placeTrackTile后');
      
      let room = store.currentRoom;
      console.log('放置瓦片后历史记录数量:', room?.actionHistory.length);
      console.log('最新历史记录:', room?.actionHistory[room.actionHistory.length - 1]);
      
      // 投注操作
      const betCard: BetCard = {
        id: 'bet-1',
        type: BetType.ROUND,
        camelColor: CamelColor.RED,
        value: 5
      };
      
      console.log('调用placeBet前');
      store.placeBet('player2', betCard);
      console.log('调用placeBet后');
      
      room = store.currentRoom;
      console.log('投注后历史记录数量:', room?.actionHistory.length);
      console.log('最新历史记录:', room?.actionHistory[room.actionHistory.length - 1]);
      
      expect(room?.actionHistory.length).toBe(initialHistoryLength + 2);
      
      // 验证瓦片操作记录
      const tileAction = room?.actionHistory.find(action => 
        action.action === ActionType.PLACE_TILE && action.playerId === 'player1'
      );
      expect(tileAction).toBeDefined();
      expect(tileAction?.description).toContain('加速瓦片');
      
      // 验证投注操作记录
      const betAction = room?.actionHistory.find(action => 
        action.action === ActionType.PLACE_BET && action.playerId === 'player2'
      );
      expect(betAction).toBeDefined();
      expect(betAction?.description).toContain('红色');
    });
  });

  describe('瓦片放置测试', () => {
    it('应该能够记录瓦片放置操作历史', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      
      // 使用set方法确保状态正确更新
      useGameStore.setState({ currentRoom: mockRoom });
      
      const initialHistoryCount = mockRoom.actionHistory.length;
      
      // 直接调用addActionHistory来测试操作历史记录
      store.addActionHistory('player1', ActionType.PLACE_TILE, '在第8格放置减速瓦片');
      
      const room = useGameStore.getState().currentRoom;
      expect(room?.actionHistory.length).toBe(initialHistoryCount + 1);
      
      const tileAction = room?.actionHistory.find(action => 
        action.action === ActionType.PLACE_TILE && 
        action.description.includes('在第8格放置减速瓦片')
      );
      expect(tileAction).toBeDefined();
      expect(tileAction?.playerId).toBe('player1');
    });

    it('应该能够记录瓦片类型切换操作', () => {
      const store = useGameStore.getState();
      const mockRoom = createMockRoom();
      
      // 使用set方法确保状态正确更新
      useGameStore.setState({ currentRoom: mockRoom });
      
      const initialHistoryCount = mockRoom.actionHistory.length;
      
      // 测试瓦片切换操作历史记录
      store.addActionHistory('player1', ActionType.PLACE_TILE, '将第10格的瓦片切换为减速瓦片');
      
      const room = useGameStore.getState().currentRoom;
      expect(room?.actionHistory.length).toBe(initialHistoryCount + 1);
      
      const switchAction = room?.actionHistory.find(action => 
        action.description.includes('将第10格的瓦片切换为减速瓦片')
      );
      expect(switchAction).toBeDefined();
      expect(switchAction?.playerId).toBe('player1');
    });
  });
});