export type Direction = {
  dx: number;
  dy: number;
};

export class InputManager {
  private onMove: ((direction: Direction) => void) | null = null;
  private onRestart: (() => void) | null = null;
  private onAction: (() => void) | null = null;
  private enabled = true;

  constructor() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
  }

  setMoveHandler(handler: (direction: Direction) => void): void {
    this.onMove = handler;
  }

  setRestartHandler(handler: () => void): void {
    this.onRestart = handler;
  }

  setActionHandler(handler: () => void): void {
    this.onAction = handler;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.onRestart?.();
      return;
    }

    if (!this.enabled) return;

    if (event.key === " ") {
      event.preventDefault();
      this.onAction?.();
      return;
    }

    const direction = this.directionForKey(event.key);
    if (!direction) return;

    event.preventDefault();
    this.onMove?.(direction);
  }

  private directionForKey(key: string): Direction | null {
    switch (key.toLowerCase()) {
      case "arrowup":
      case "w":
        return { dx: 0, dy: -1 };
      case "arrowdown":
      case "s":
        return { dx: 0, dy: 1 };
      case "arrowleft":
      case "a":
        return { dx: -1, dy: 0 };
      case "arrowright":
      case "d":
        return { dx: 1, dy: 0 };
      default:
        return null;
    }
  }
}
