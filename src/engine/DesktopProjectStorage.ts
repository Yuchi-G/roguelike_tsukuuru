import type { ProjectFileResult, ProjectInfo, ProjectStorage } from "./ProjectStorage";

export class DesktopProjectStorage implements ProjectStorage {
  private get api(): NonNullable<Window["desktopProject"]> {
    if (!window.desktopProject) {
      throw new Error("Desktop project API is not available.");
    }

    return window.desktopProject;
  }

  newProject(): Promise<ProjectInfo> {
    return this.api.newProject();
  }

  openProject(): Promise<ProjectFileResult> {
    return this.api.openProject();
  }

  saveProject(json: string): Promise<ProjectFileResult> {
    return this.api.saveProject(json);
  }

  saveProjectAs(json: string): Promise<ProjectFileResult> {
    return this.api.saveProjectAs(json);
  }

  getCurrentProjectInfo(): Promise<ProjectInfo> {
    return this.api.getCurrentProjectInfo();
  }

  setDirty(isDirty: boolean): Promise<ProjectInfo> {
    return this.api.setDirty(isDirty);
  }
}
