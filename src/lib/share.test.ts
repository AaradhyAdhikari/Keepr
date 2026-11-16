import { describe, it, expect } from "vitest";
import { pickSharedText } from "./share";

describe("pickSharedText", () => {
  it("prefers the url param when it holds a reel link", () => {
    expect(pickSharedText({ url: "https://www.instagram.com/reel/ABC123/?igsh=x", text: "hi" })).toBe(
      "https://www.instagram.com/reel/ABC123/?igsh=x",
    );
  });
  it("finds the reel link inside the text param (Android shares often put it there)", () => {
    const text = "Look at this https://www.instagram.com/reel/ABC123/?igsh=x";
    expect(pickSharedText({ text })).toBe(text);
  });
  it("returns null when nothing shared is a reel link", () => {
    expect(pickSharedText({ text: "hello", url: "https://example.com" })).toBeNull();
    expect(pickSharedText({})).toBeNull();
  });
});
