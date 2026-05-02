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
const editorGridElement = document.querySelector<HTMLElement>("#editor-map-grid");
const toolPaletteElement = document.querySelector<HTMLElement>("#tool-palette");
const editorCoordinateElement = document.querySelector<HTMLElement>("#editor-coordinate");
const editorToolElement = document.querySelector<HTMLElement>("#editor-tool");
const editorLayerLabelElement = document.querySelector<HTMLElement>("#editor-layer-label");
const editorLayerStatusElement = document.querySelector<HTMLElement>("#editor-layer-status");
const makerMenuElement = document.querySelector<HTMLElement>(".maker-menu");

if (!canvas || !appElement || !gameShellElement || !mapOverlayElement || !statusElement || !logElement || !configPanelElement || !startScreenElement) {
  throw new Error("Required DOM elements are missing.");
}

const startScreen = startScreenElement;
const appRoot = appElement;
const gameShell = gameShellElement;

const game = new Game(canvas, mapOverlayElement, statusElement, logElement, sampleGameConfig);
const scene = new MainScene(game, sampleGameConfig);
let selectedEditorTool = "床";
let selectedEditorLayer = "地形";

function updateEditorStatus(x = 0, y = 0): void {
  if (editorCoordinateElement) editorCoordinateElement.textContent = `${x}, ${y}`;
  if (editorToolElement) editorToolElement.textContent = selectedEditorTool;
  if (editorLayerLabelElement) editorLayerLabelElement.textContent = selectedEditorLayer;
  if (editorLayerStatusElement) editorLayerStatusElement.textContent = selectedEditorLayer;
}

function layerForTool(toolName: string): string {
  if (toolName === "敵" || toolName === "アイテム" || toolName === "罠") return "オブジェクト";
  return "地形";
}

function renderEditorGrid(): void {
  if (!editorGridElement) return;

  const width = Math.min(sampleGameConfig.dungeon.width, 32);
  const height = Math.min(sampleGameConfig.dungeon.height, 22);
  editorGridElement.style.setProperty("--map-columns", String(width));
  editorGridElement.innerHTML = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const edgeClass = x === 0 || y === 0 || x === width - 1 || y === height - 1 ? " is-wall" : "";
    return `<button class="editor-map-cell${edgeClass}" type="button" data-x="${x}" data-y="${y}" aria-label="x${x} y${y}"></button>`;
  }).join("");
}

function markerForTool(toolName: string): string {
  switch (toolName) {
    case "壁": return "#";
    case "階段": return ">";
    case "敵": return "E";
    case "アイテム": return "!";
    case "罠": return "^";
    default: return ".";
  }
}

renderEditorGrid();
updateEditorStatus();

toolPaletteElement?.addEventListener("click", (event) => {
  const clickedButton = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-tool]")
    : null;
  if (!clickedButton) return;

  selectedEditorTool = clickedButton.dataset.tool ?? selectedEditorTool;
  selectedEditorLayer = layerForTool(selectedEditorTool);
  toolPaletteElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", button === clickedButton));
  updateEditorStatus(
    Number(editorCoordinateElement?.textContent.split(",")[0] ?? 0),
    Number(editorCoordinateElement?.textContent.split(",")[1] ?? 0),
  );
});

editorGridElement?.addEventListener("click", (event) => {
  const clickedCell = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>(".editor-map-cell")
    : null;
  if (!clickedCell) return;

  const x = Number(clickedCell.dataset.x ?? 0);
  const y = Number(clickedCell.dataset.y ?? 0);
  clickedCell.textContent = markerForTool(selectedEditorTool);
  clickedCell.dataset.tool = selectedEditorTool;
  clickedCell.classList.toggle("has-object", selectedEditorLayer === "オブジェクト");
  updateEditorStatus(x, y);
});

makerMenuElement?.addEventListener("click", (event) => {
  const clickedButton = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-menu-action]")
    : null;
  if (!clickedButton) return;

  const action = clickedButton.dataset.menuAction;
  if (action === "testplay") {
    startOrRestartGame();
    return;
  }

  if (action === "database" || action === "settings" || action === "project") {
    returnToSetup();
    configPanel.refresh();
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
