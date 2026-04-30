/**
 * アプリケーションのエントリーポイント。
 * HTML上のCanvasとUI要素を取得し、ゲームとシーンを起動する。
 */
import "./style.css";
import { ConfigPanel } from "./app/ui/ConfigPanel";
import { DesktopProjectStorage } from "./app/storage/DesktopProjectStorage";
import { Game } from "./engine/core/Game";
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
const tileMapEditorElement = document.querySelector<HTMLElement>("#tile-map-editor");
const toolPaletteElement = document.querySelector<HTMLElement>("#tool-palette");
const currentLayerElement = document.querySelector<HTMLElement>("#current-layer");
const selectionInspectorElement = document.querySelector<HTMLElement>("#selection-inspector");
const statusCoordinateElement = document.querySelector<HTMLElement>("#status-coordinate");
const statusToolElement = document.querySelector<HTMLElement>("#status-tool");
const statusLayerElement = document.querySelector<HTMLElement>("#status-layer");
const makerMenubarElement = document.querySelector<HTMLElement>(".maker-menubar");

if (!canvas || !appElement || !gameShellElement || !mapOverlayElement || !statusElement || !logElement || !configPanelElement || !startScreenElement) {
  throw new Error("Required DOM elements are missing.");
}

const startScreen = startScreenElement;
const appRoot = appElement;
const gameShell = gameShellElement;

const game = new Game(canvas, mapOverlayElement, statusElement, logElement, sampleGameConfig);
const scene = new MainScene(game, sampleGameConfig);
const editorState = {
  tool: "床",
  layer: "地形",
  marker: ".",
  x: 0,
  y: 0,
};

function renderEditorMap(): void {
  if (!tileMapEditorElement) return;

  const mapWidth = Math.min(sampleGameConfig.dungeon.width, 32);
  const mapHeight = Math.min(sampleGameConfig.dungeon.height, 22);
  tileMapEditorElement.style.setProperty("--map-width", String(mapWidth));
  tileMapEditorElement.innerHTML = Array.from({ length: mapWidth * mapHeight }, (_, tileIndex) => {
    const x = tileIndex % mapWidth;
    const y = Math.floor(tileIndex / mapWidth);
    const isOuterWall = x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1;
    return [
      `<button class="map-cell${isOuterWall ? " is-wall" : ""}"`,
      ` type="button" data-x="${x}" data-y="${y}" data-layer="${isOuterWall ? "地形" : ""}"`,
      ` aria-label="${x},${y}">`,
      isOuterWall ? "#" : "",
      "</button>",
    ].join("");
  }).join("");
}

function updateEditorChrome(): void {
  if (currentLayerElement) currentLayerElement.textContent = editorState.layer;
  if (statusCoordinateElement) statusCoordinateElement.textContent = `${editorState.x}, ${editorState.y}`;
  if (statusToolElement) statusToolElement.textContent = editorState.tool;
  if (statusLayerElement) statusLayerElement.textContent = editorState.layer;
  if (selectionInspectorElement) {
    selectionInspectorElement.innerHTML = [
      `<div><span>対象</span><strong>${editorState.tool}</strong></div>`,
      `<div><span>座標</span><strong>${editorState.x}, ${editorState.y}</strong></div>`,
      `<div><span>レイヤー</span><strong>${editorState.layer}</strong></div>`,
    ].join("");
  }
}

function selectTool(button: HTMLButtonElement): void {
  editorState.tool = button.dataset.tool ?? editorState.tool;
  editorState.layer = button.dataset.layer ?? editorState.layer;
  editorState.marker = button.dataset.marker ?? editorState.marker;
  toolPaletteElement?.querySelectorAll("button").forEach((toolButton) => {
    toolButton.classList.toggle("is-selected", toolButton === button);
  });
  updateEditorChrome();
}

function placeSelectedTool(cell: HTMLButtonElement): void {
  editorState.x = Number(cell.dataset.x ?? 0);
  editorState.y = Number(cell.dataset.y ?? 0);
  cell.textContent = editorState.marker;
  cell.dataset.tool = editorState.tool;
  cell.dataset.layer = editorState.layer;
  cell.classList.toggle("is-event", editorState.layer === "イベント");
  cell.classList.toggle("is-wall", editorState.tool === "壁");
  updateEditorChrome();
}

renderEditorMap();
updateEditorChrome();

toolPaletteElement?.addEventListener("click", (event) => {
  const toolButton = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-tool]")
    : null;
  if (!toolButton) return;
  selectTool(toolButton);
});

tileMapEditorElement?.addEventListener("click", (event) => {
  const mapCell = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>(".map-cell")
    : null;
  if (!mapCell) return;
  placeSelectedTool(mapCell);
});

makerMenubarElement?.addEventListener("click", (event) => {
  const menuButton = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-menu-command]")
    : null;
  if (!menuButton) return;

  const command = menuButton.dataset.menuCommand;
  if (command === "testplay") {
    startOrRestartGame();
    return;
  }

  if (command === "project" || command === "database" || command === "settings" || command === "map" || command === "event") {
    returnToSetup();
  }
});

// --- カスタムアイテム効果登録 ---
// fullHeal: 拾うとバッグに入り、使うとHPを最大まで回復する。
game.itemEffectRegistry.register("fullHeal", ({ game: activeGame, player, itemName, source }) => {
  if (source === "pickup") {
    activeGame.offerBagItem({
      name: itemName,
      effectId: "fullHeal",
      params: {},
      description: "HP全回復",
    });
    return;
  }
  const healed = player.heal(player.maxHp);
  activeGame.logger.add(activeGame.config.messages.itemUsed(itemName, healed));
});
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

  scene.loadDungeonFloor(1);
}

function returnToSetup(): void {
  isEditingStartedGame = false;
  appRoot.classList.add("setup-mode");
  gameShell.classList.add("setup-mode");
  startScreen.classList.remove("is-hidden");
  game.resetToUnstarted();
  configPanel.refresh();
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

game.setRestartHandler(() => scene.loadDungeonFloor());
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
