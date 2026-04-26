/**
 * ゲームログを管理するファイル。
 * 戦闘やアイテム取得など、プレイヤーに知らせたい出来事を保存する。
 */
/** 表示件数を制限しながらログメッセージを保持するクラス。 */
export class Logger {
  private messages: string[] = [];

  constructor(private maxMessages = 12) {}

  /** 新しいログを先頭に追加し、古いログは最大件数を超えたら捨てる。 */
  add(message: string): void {
    this.messages.unshift(message);
    this.messages = this.messages.slice(0, this.maxMessages);
  }

  /** UI表示用に現在のログ一覧を返す。 */
  all(): string[] {
    return [...this.messages];
  }
}
