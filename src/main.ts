/**
 * アプリケーションのエントリーポイント。
 * HTML上のCanvasとUI要素を取得し、ゲームとシーンを起動する。
 */
import "./style.css";
import { Game } from "./engine/Game";
import { MainScene } from "./game/MainScene";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const mapOverlayElement = document.querySelector<HTMLElement>("#map-overlay");
const statusElement = document.querySelector<HTMLElement>("#status");
const logElement = document.querySelector<HTMLElement>("#log");

if (!canvas || !mapOverlayElement || !statusElement || !logElement) {
  throw new Error("Required DOM elements are missing.");
}

// Gameはエンジン本体、MainSceneはサンプルゲームの初期化を担当する。
const game = new Game(canvas, mapOverlayElement, statusElement, logElement);
const scene = new MainScene(game);

// 入力イベントから、再開始と階段移動のゲーム処理へつなぐ。
game.setRestartHandler(() => scene.load());
game.setActionHandler(() => scene.goToNextFloor());
scene.load();
