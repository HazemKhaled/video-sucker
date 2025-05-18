// Basic tests for the Instagram parser functions
import { getContentType, extractPostId, extractUsername } from "../parser.js";

describe("Instagram Parser functions", () => {
  test("getContentType should correctly identify reel URLs", () => {
    expect(getContentType("https://www.instagram.com/reel/CodExampleID/")).toBe(
      "reel"
    );
    expect(getContentType("https://instagram.com/reel/CodExampleID/")).toBe(
      "reel"
    );
  });

  test("getContentType should return unknown for non-Instagram URLs", () => {
    expect(getContentType("https://example.com")).toBe("unknown");
  });

  test("extractPostId should extract correct IDs from different URL formats", () => {
    expect(extractPostId("https://instagram.com/reel/CodExampleID/")).toBe(
      "CodExampleID"
    );
  });

  test("extractUsername should return unknown_user for non-story URLs without HTML", () => {
    expect(extractUsername("https://www.instagram.com/p/CodExampleID/")).toBe(
      "unknown_user"
    );
  });
});
