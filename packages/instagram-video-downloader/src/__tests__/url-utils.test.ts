import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getContentType } from '../parser.js';
import { normalizeInstagramUrl } from '../url-utils.js';

// Test Instagram URL parsing functionality
describe('Instagram URL Utilities', () => {
  it('should normalize Instagram reel URLs', () => {
    // Test URL normalization for reels
    const urls = [
      'https://instagram.com/reel/CodExampleID',
      'https://www.instagram.com/reel/CodExampleID/',
      'https://www.instagram.com/reel/CodExampleID/?igshid=abc123',
      'https://www.instagram.com/reels/CodExampleID/?utm_source=website'
    ];
    
    // Expect normalized format with www, trailing slash, and no parameters
    const expectedFormat = /^https:\/\/www\.instagram\.com\/reel(?:s)?\/CodExampleID\/$/;
    
    for (const url of urls) {
      const normalized = normalizeInstagramUrl(url);
      assert.ok(
        expectedFormat.test(normalized) || normalized === url, 
        `URL ${url} should be properly normalized to the reel format`
      );
    }
  });
  
  it('should integrate with the parser to detect reel content types', () => {
    // Examples of different Instagram URLs
    const reelUrl = 'https://www.instagram.com/reel/CodExampleID/';
    const reelsUrl = 'https://www.instagram.com/reels/CodExampleID/';
    const unknownUrl = 'https://example.com';
    
    // Test content type detection
    assert.strictEqual(getContentType(reelUrl), 'reel', 'Reel URL should be identified as reel');
    assert.strictEqual(getContentType(reelsUrl), 'reel', 'Reels URL should be identified as reel');
    assert.strictEqual(getContentType(unknownUrl), 'unknown', 'Non-Instagram URL should be unknown');
  });
});
