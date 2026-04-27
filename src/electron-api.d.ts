import type { ProjectFileResult, ProjectInfo } from "./engine/ProjectStorage";

declare global {
  interface Window {
    desktopProject?: {
      newProject(): Promise<ProjectInfo>;
      openProject(): Promise<ProjectFileResult>;
      confirmOpen(): Promise<ProjectInfo>;
      discardPendingOpen(): Promise<ProjectInfo>;
      saveProject(json: string): Promise<ProjectFileResult>;
      saveProjectAs(json: string): Promise<ProjectFileResult>;
      getCurrentProjectInfo(): Promise<ProjectInfo>;
      setDirty(isDirty: boolean): Promise<ProjectInfo>;
    };
  }
}

export {};
