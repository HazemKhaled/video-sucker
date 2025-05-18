import assert from 'node:assert';
import { describe, it } from 'node:test';
import * as InstagramDownloader from '../index.js';

// Test the main module exports
describe('Instagram Downloader Main Module', () => {
  it('should export all necessary functions', () => {
    // Check that the main exports exist
    assert.ok(typeof InstagramDownloader.downloadInstagramMedia === 'function', 
      'downloadInstagramMedia should be exported');
    
    assert.ok(typeof InstagramDownloader.parseInstagramUrl === 'function',
      'parseInstagramUrl should be exported');
      
    assert.ok(typeof InstagramDownloader.getContentType === 'function',
      'getContentType should be exported');
  });
});
