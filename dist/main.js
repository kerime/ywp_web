import { PuzzleGame } from "./app/PuzzleGame.js";
import { defaultFriends, StageRepository } from "./infrastructure/stages.js";
import { GameView } from "./ui/GameView.js";
new PuzzleGame(new StageRepository(), defaultFriends, new GameView()).start();
