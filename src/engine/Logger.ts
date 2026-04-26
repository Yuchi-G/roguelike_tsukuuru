export class Logger {
  private messages: string[] = [];

  constructor(private maxMessages = 12) {}

  add(message: string): void {
    this.messages.unshift(message);
    this.messages = this.messages.slice(0, this.maxMessages);
  }

  all(): string[] {
    return [...this.messages];
  }
}
