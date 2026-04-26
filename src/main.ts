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
const appElement = document.querySelector<HTMLElement>("#app");
const gameShellElement = document.querySelector<HTMLElement>("#game-shell");
const mapOverlayElement = document.querySelector<HTMLElement>("#map-overlay");
const statusElement = document.querySelector<HTMLElement>("#status");
const logElement = document.querySelector<HTMLElement>("#log");
const configPanelElement = document.querySelector<HTMLElement>("#config-panel");
const startScreenElement = document.querySelector<HTMLElement>("#start-screen");

if (!canvas || !appElement || !gameShellElement || !mapOverlayElement || !statusElement || !logElement || !configPanelElement || !startScreenElement) {
  throw new Error("Required DOM elements are missing.");
}

const startScreen = startScreenElement;
const appRoot = appElement;
const gameShell = gameShellElement;

// Gameはエンジン本体、MainSceneはサンプルゲームの初期化を担当する。
const game = new Game(canvas, mapOverlayElement, statusElement, logElement, sampleGameConfig);
const scene = new MainScene(game, sampleGameConfig);
let isEditingStartedGame = false;
let configPanel: ConfigPanel;

function startOrRestartGame(): void {
  appRoot.classList.remove("setup-mode");
  gameShell.classList.remove("setup-mode");
  startScreen.classList.add("is-hidden");

  if (isEditingStartedGame) {
    isEditingStartedGame = false;
    game.resumeAfterConfigChange();
    return;
  }

  scene.load(1);
}

function returnToSetup(): void {
  isEditingStartedGame = false;
  appRoot.classList.add("setup-mode");
  gameShell.classList.add("setup-mode");
  startScreen.classList.remove("is-hidden");
  game.resetToUnstarted();
}

function openConfigFromGame(): void {
  isEditingStartedGame = true;
  appRoot.classList.add("setup-mode");
  gameShell.classList.add("setup-mode");
  startScreen.classList.remove("is-hidden");
  game.pauseForConfig();
  configPanel.refresh();
}

function quitGameToSetup(): void {
  isEditingStartedGame = false;
  appRoot.classList.add("setup-mode");
  gameShell.classList.add("setup-mode");
  startScreen.classList.remove("is-hidden");
  game.resetToUnstarted();
  configPanel.refresh();
}

// 入力イベントから、再開始と階段移動のゲーム処理へつなぐ。
game.setRestartHandler(() => scene.load());
game.setActionHandler(() => scene.goToNextFloor());
game.setOpenConfigHandler(openConfigFromGame);
game.setQuitGameHandler(quitGameToSetup);
configPanel = new ConfigPanel(
  configPanelElement,
  sampleGameConfig,
  new DesktopProjectStorage(),
  startOrRestartGame,
  () => isEditingStartedGame ? "ゲーム再開" : "ゲームスタート",
  returnToSetup,
);
