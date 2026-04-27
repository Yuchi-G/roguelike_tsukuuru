// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigPanel } from "../../src/engine/ConfigPanel";
import type { ProjectStorage, ProjectInfo, ProjectFileResult } from "../../src/engine/ProjectStorage";
import { sampleGameConfig } from "../../src/game/sampleGameConfig";
import type { GameConfig } from "../../src/engine/GameConfig";

// ========================== モック ==========================

/** テスト用の ProjectStorage。全メソッドを vi.fn() で差し替え可能にする。 */
function makeStorage(overrides: Partial<ProjectStorage> = {}): ProjectStorage {
  const defaultInfo: ProjectInfo = { filePath: null, isDirty: false };
  return {
    newProject: vi.fn(async () => defaultInfo),
    openProject: vi.fn(async (): Promise<ProjectFileResult> => ({ canceled: true })),
    confirmOpen: vi.fn(async (): Promise<ProjectInfo> => ({ filePath: "/path/to/valid.json", isDirty: false })),
    discardPendingOpen: vi.fn(async (): Promise<ProjectInfo> => defaultInfo),
    saveProject: vi.fn(async (): Promise<ProjectFileResult> => ({ canceled: true })),
    saveProjectAs: vi.fn(async (): Promise<ProjectFileResult> => ({ canceled: true })),
    getCurrentProjectInfo: vi.fn(async () => defaultInfo),
    setDirty: vi.fn(async (): Promise<ProjectInfo> => ({ ...defaultInfo, isDirty: true })),
    ...overrides,
  };
}

/**
 * sampleGameConfig のコピーを返す。
 * messages に関数が含まれるため structuredClone は使えない。
 * ConfigPanel のコンストラクタが applyMessageTemplates で上書きするので浅いコピーで十分。
 */
function freshConfig(): GameConfig {
  return { ...sampleGameConfig, player: { ...sampleGameConfig.player } };
}

/** ConfigPanel が要求する最小限の DOM 要素を生成する。 */
function makeRoot(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  return root;
}

/** ConfigPanel 内の data-action ボタンをクリックする。 */
function clickAction(root: HTMLElement, action: string): void {
  const btn = root.querySelector(`[data-action="${action}"]`);
  if (btn instanceof HTMLElement) {
    btn.click();
  }
}

/** 非同期イベントハンドラの実行を待つ。 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ========================== テスト ==========================

describe("ConfigPanel: プロジェクトを開く", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    root = makeRoot();
    // confirmDiscardUnsaved の window.confirm をスキップ
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("正常なJSONを開いた時、confirmOpen が呼ばれてファイルパスが確定する", async () => {
    const config = freshConfig();
    const validJson = JSON.stringify({
      schemaVersion: 2,
      player: config.player,
      dungeon: config.dungeon,
    });

    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: false,
        json: validJson,
        filePath: "/path/to/valid.json",
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn());

    // 初期化の非同期処理を待つ
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(storage.confirmOpen).toHaveBeenCalledWith();
  });

  it("不正なJSONを開いた時、confirmOpen が呼ばれずファイルパスが変わらない", async () => {
    const config = freshConfig();

    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: false,
        json: "{ this is not valid json !!!",
        filePath: "/path/to/broken.json",
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn());
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(storage.confirmOpen).not.toHaveBeenCalled();
    expect(storage.discardPendingOpen).toHaveBeenCalled();
  });

  it("ファイル選択をキャンセルした時、confirmOpen が呼ばれない", async () => {
    const config = freshConfig();

    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: true,
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn());
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(storage.confirmOpen).not.toHaveBeenCalled();
  });

  it("ファイル読み込みエラーの時、confirmOpen が呼ばれない", async () => {
    const config = freshConfig();

    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: false,
        error: "ファイルが見つかりません",
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn());
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(storage.confirmOpen).not.toHaveBeenCalled();
  });

  it("正常なJSONを開いた後、onResetToSetup が呼ばれる", async () => {
    const config = freshConfig();
    const validJson = JSON.stringify({
      schemaVersion: 2,
      player: config.player,
    });

    const onResetToSetup = vi.fn();
    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: false,
        json: validJson,
        filePath: "/path/to/valid.json",
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn(), undefined, onResetToSetup);
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(onResetToSetup).toHaveBeenCalled();
  });

  it("不正なJSONを開いた後、onResetToSetup は呼ばれない", async () => {
    const config = freshConfig();
    const onResetToSetup = vi.fn();

    const storage = makeStorage({
      openProject: vi.fn(async (): Promise<ProjectFileResult> => ({
        canceled: false,
        json: "not json",
        filePath: "/path/to/broken.json",
      })),
    });

    new ConfigPanel(root, config, storage, vi.fn(), undefined, onResetToSetup);
    await flush();

    clickAction(root, "open-project");
    await flush();

    expect(onResetToSetup).not.toHaveBeenCalled();
  });
});
