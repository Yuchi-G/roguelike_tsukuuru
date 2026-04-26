import "./style.css";
import { Game } from "./engine/Game";
import { MainScene } from "./game/MainScene";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const statusElement = document.querySelector<HTMLElement>("#status");
const logElement = document.querySelector<HTMLElement>("#log");

if (!canvas || !statusElement || !logElement) {
  throw new Error("Required DOM elements are missing.");
}

const game = new Game(canvas, statusElement, logElement);
const scene = new MainScene(game);

game.setRestartHandler(() => scene.load());
game.setActionHandler(() => scene.goToNextFloor());
scene.load();
