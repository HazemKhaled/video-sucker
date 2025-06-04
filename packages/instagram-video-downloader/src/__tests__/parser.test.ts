// Basic tests for the Instagram parser functions
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  getContentType,
  extractPostId,
  extractReelId,
  extractUsername,
} from "../parser.js";

describe("Instagram Parser functions", () => {
  it("getContentType should correctly identify reel URLs", () => {
    assert.strictEqual(
      getContentType("https://www.instagram.com/reel/CodExampleID/"),
      "reel",
    );
    assert.strictEqual(
      getContentType("https://instagram.com/reel/CodExampleID/"),
      "reel",
    );
  });

  it("getContentType should return unknown for non-Instagram URLs", () => {
    assert.strictEqual(getContentType("https://example.com"), "unknown");
  });

  it("extractPostId should extract correct IDs from reel URLs", () => {
    // Test with a reel URL
    assert.strictEqual(
      extractPostId("https://instagram.com/reel/CodExampleID/"),
      "CodExampleID",
    );

    // Test with URL parameters
    assert.strictEqual(
      extractPostId(
        "https://www.instagram.com/reel/CodExampleID/?utm_source=ig_web_copy_link",
      ),
      "CodExampleID",
    );

    // Test with /reels/ format
    assert.strictEqual(
      extractPostId("https://www.instagram.com/reels/CodExampleID/"),
      "CodExampleID",
    );
  });

  it("extractUsername should return unknown_user for non-reel URLs", () => {
    assert.strictEqual(
      extractUsername("https://www.instagram.com/p/CodExampleID/"),
      "unknown_user",
    );
  });

  it("extractUsername should return unknown_user for reel URLs without HTML", () => {
    assert.strictEqual(
      extractUsername("https://www.instagram.com/reel/CodExampleID/"),
      "unknown_user",
    );
  });

  it("extractReelId should extract the same IDs as extractPostId", () => {
    // Test with a reel URL
    assert.strictEqual(
      extractReelId("https://instagram.com/reel/CodExampleID/"),
      "CodExampleID",
    );

    // Test with URL parameters
    assert.strictEqual(
      extractReelId(
        "https://www.instagram.com/reel/CodExampleID/?utm_source=ig_web_copy_link",
      ),
      "CodExampleID",
    );

    // Test with /reels/ format
    assert.strictEqual(
      extractReelId("https://www.instagram.com/reels/CodExampleID/"),
      "CodExampleID",
    );
  });
});
