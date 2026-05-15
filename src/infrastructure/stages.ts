import type { FriendDefinition, StageDefinition } from "../domain/types.js";

export class StageRepository {
  private readonly stages: readonly StageDefinition[] = [
    {
      id: 1,
      name: "Stage 0001",
      kinds: 5,
      enemyHp: [5000],
      enemyAtk: [270],
      enemyTurn: [3],
      shape: ["nnnnnnnn", "________", "__xxx___", "__xxx___", "__xxx___", "________", "________", "________"],
      info: ["________", "________", "__aaa___", "__aAa___", "__aaa___", "________", "________", "________"],
    },
    {
      id: 2,
      name: "Stage 0002",
      kinds: 4,
      enemyHp: [1000, 5000, 1000, 5000],
      enemyAtk: [90, 270, 90, 270],
      enemyTurn: [2, 2, 2, 2],
      shape: ["XXXnnnXXX", "XXX___XXX", "XXX___XXX", "nnn___nnn", "_________", "_________", "XXX___XXX", "XXX___XXX", "XXX___XXX"],
      info: ["aaa___bbb", "aAa___bBb", "aaa___bbb", "_________", "_________", "_________", "ccc___ddd", "cCc___dDd", "ccc___ddd"],
    },
    {
      id: 3,
      name: "Stage 0003",
      kinds: 4,
      enemyHp: [6000],
      enemyAtk: [270],
      enemyTurn: [4],
      shape: ["XXXXXXXXX", "XXXXXXXXX", "XXXXXXXXX", "nnnnnnnnn", "_X_____X_", "_X_____X_", "_X_____X_", "_X_____X_", "_________"],
      info: ["aaaaaaaaa", "aAaaaaaAa", "aaaaaaaaa", "_________", "_________", "_________", "_________", "_________", "_________"],
    },
    {
      id: 4,
      name: "Stage 0004",
      kinds: 5,
      enemyHp: [1000, 1000, 1000],
      enemyAtk: [75, 75, 75],
      enemyTurn: [1, 1, 1],
      shape: ["nnnnnnnnn", "_________", "_X____X__", "_X____X__", "_________", "_________", "XXXXXXXXX", "XXXXXXXXX", "XXXXXXXXX"],
      info: ["_________", "_________", "_________", "_________", "_________", "_________", "aaabbbccc", "aAabBbcCc", "aaabbbccc"],
    },
    {
      id: 5,
      name: "Stage 0005",
      kinds: 4,
      enemyHp: [1200, 1200, 1200, 1200],
      enemyAtk: [100, 100, 100, 100],
      enemyTurn: [2, 2, 2, 2],
      shape: ["XXXnnnXXX", "XXX___XXX", "XXX___XXX", "nnn___nnn", "_________", "_________", "XXX___XXX", "XXX___XXX", "XXX___XXX"],
      info: [],
    },
  ];

  all(): readonly StageDefinition[] {
    return this.stages;
  }

  byIndex(index: number): StageDefinition {
    const stage = this.stages[index];
    if (!stage) throw new Error(`Unknown stage index: ${index}`);
    return stage;
  }
}

export const defaultFriends: readonly FriendDefinition[] = [
  { name: "Jibanyan", kind: 0, atk: 220 },
  { name: "Shishimaru", kind: 2, atk: 200 },
  { name: "Onigiri", kind: 1, atk: 220 },
];
