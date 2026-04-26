/**
 * アプリケーションのエントリーポイント。
 * HTML上のCanvasとUI要素を取得し、ゲームとシーンを起動する。
 */
import "./style.css";
import { ConfigPanel } from "./engine/ConfigPanel";
import { DesktopProjectStorage } from "./engine/DesktopProjectStorage";
import { Game } from "./engine/Game";
import { MainScene } from "./game/MainScene";
import { sampleGameConfig } from "./game/sampleGameConfig";

if (!window.desktopProject) {
  document.body.innerHTML = '<div class="desktop-only">このアプリはElectronから起動してください。</div>';
  throw new Error("This app must be launched from Electron.");
}

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const mapOverlayElement = document.querySelector<HTMLElement>("#map-overlay");
const statusElement = document.querySelector<HTMLElement>("#status");
const logElement = document.querySelector<HTMLElement>("#log");
const configPanelElement = document.querySelector<HTMLElement>("#config-panel");
const startScreenElement = document.querySelector<HTMLElement>("#start-screen");

if (!canvas || !mapOverlayElement || !statusElement || !logElement || !configPanelElement || !startScreenElement) {
  throw new Error("Required DOM elements are missing.");
}

const startScreen = startScreenElement;

// Gameはエンジン本体、MainSceneはサンプルゲームの初期化を担当する。
const game = new Game(canvas, mapOverlayElement, statusElement, logElement, sampleGameConfig);
const scene = new MainScene(game, sampleGameConfig);
let hasStarted = false;

function startOrRestartGame(): void {
  hasStarted = true;
  startScreen.classList.add("is-hidden");
  scene.load(1);
}

function returnToSetup(): void {
  hasStarted = false;
  startScreen.classList.remove("is-hidden");
  game.resetToUnstarted();
}

// 入力イベントから、再開始と階段移動のゲーム処理へつなぐ。
game.setRestartHandler(() => scene.load());
game.setActionHandler(() => scene.goToNextFloor());
new ConfigPanel(
  configPanelElement,
  sampleGameConfig,
  new DesktopProjectStorage(),
  startOrRestartGame,
  () => hasStarted ? "設定を反映して最初から" : "ゲームスタート",
  returnToSetup,
);
