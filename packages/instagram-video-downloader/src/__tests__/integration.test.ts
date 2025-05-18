import assert from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeInstagramUrl } from '../url-utils.js';
import { getContentType, extractReelId } from '../parser.js';

// Integration tests to show how different components work together
describe('Instagram Downloader Integration', () => {
  it('should process a reel URL through the entire pipeline', () => {
    // Sample URL for testing
    const reelUrl = 'https://instagram.com/reel/CodExampleID?igshid=tracking123';
    
    // Step 1: Normalize the URL
    const normalizedUrl = normalizeInstagramUrl(reelUrl);
    
    // Verify the URL was normalized correctly
    assert.ok(normalizedUrl.includes('www.instagram.com'), 'URL should be normalized to include www');
    assert.ok(normalizedUrl.includes('/reel/'), 'URL should maintain the reel path');
    assert.ok(normalizedUrl.endsWith('/'), 'URL should end with a trailing slash');
    assert.ok(!normalizedUrl.includes('?'), 'Tracking parameters should be removed');
    
    // Step 2: Determine the content type
    const contentType = getContentType(normalizedUrl);
    assert.strictEqual(contentType, 'reel', 'Content type should be identified as reel');
    
    // Step 3: Extract the reel ID
    const reelId = extractReelId(normalizedUrl);
    assert.strictEqual(reelId, 'CodExampleID', 'Reel ID should be extracted correctly');
    
    // This demonstrates the basic flow of how a URL would be processed
    // In a real-world scenario, we would then pass this data to the downloader
  });
});
