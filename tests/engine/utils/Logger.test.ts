import { describe, it, expect } from "vitest";
import { Logger } from "../../../src/engine/utils/Logger";

describe("Logger.add()", () => {
  it("メッセージを先頭に追加する", () => {
    const logger = new Logger();
    logger.add("first");
    logger.add("second");
    expect(logger.all()[0]).toBe("second");
    expect(logger.all()[1]).toBe("first");
  });

  it("最大件数を超えた古いメッセージは捨てる", () => {
    const logger = new Logger(3);
    logger.add("a");
    logger.add("b");
    logger.add("c");
    logger.add("d");
    const messages = logger.all();
    expect(messages).toHaveLength(3);
    expect(messages[0]).toBe("d");
    expect(messages[2]).toBe("b");
  });
});

describe("Logger.all()", () => {
  it("空のとき空配列を返す", () => {
    const logger = new Logger();
    expect(logger.all()).toEqual([]);
  });

  it("返り値を変更しても内部状態に影響しない", () => {
    const logger = new Logger();
    logger.add("msg");
    const messages = logger.all();
    messages.push("injected");
    expect(logger.all()).toHaveLength(1);
  });
});
