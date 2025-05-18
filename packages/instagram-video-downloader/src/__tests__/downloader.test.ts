// Mock tests for the Instagram downloader functions
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { downloadInstagramMedia } from '../downloader.js';
import { parseInstagramUrl } from '../parser.js';

// Mock dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('../parser.js');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedParser = parseInstagramUrl as jest.MockedFunction<typeof parseInstagramUrl>;

describe('Instagram Downloader functions', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful response from axios
    mockedAxios.get.mockResolvedValue({ status: 200, data: 'mock response' });
    mockedAxios.mockResolvedValue({ status: 200, data: Buffer.from('mock data') });
    
    // Mock file system functions
    mockedFs.ensureDir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.writeJson.mockResolvedValue(undefined);
    
    // Mock parser response
    mockedParser.mockResolvedValue({
      contentType: 'post',
      postInfo: {
        postId: 'mockPostId',
        username: 'mockUser',
        isCarousel: false,
        mediaItems: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            thumbnailUrl: 'https://example.com/thumbnail.jpg'
          }
        ]
      }
    });
  });

  test('downloadInstagramMedia should process and save a post with a single image', async () => {
    // Call the function
    const result = await downloadInstagramMedia('https://www.instagram.com/p/mockPostId/', {
      outputDir: '/mock/path'
    });
    
    // Verify parser was called
    expect(parseInstagramUrl).toHaveBeenCalledWith('https://www.instagram.com/p/mockPostId/');
    
    // Verify directory was created
    expect(mockedFs.ensureDir).toHaveBeenCalled();
    
    // Verify metadata was saved
    expect(mockedFs.writeJson).toHaveBeenCalled();
    
    // Verify file downloads were attempted
    expect(mockedAxios).toHaveBeenCalled();
    
    // Verify expected result
    expect(result).toHaveProperty('postId', 'mockPostId');
    expect(result).toHaveProperty('username', 'mockUser');
    expect(result).toHaveProperty('mediaItems');
    expect(result.mediaItems).toHaveLength(1);
    expect(result).toHaveProperty('savedFiles');
  });

  test('downloadInstagramMedia should handle errors by trying alternative methods', async () => {
    // Make first method fail
    mockedParser.mockRejectedValueOnce(new Error('Mock error'));
    
    // But second method succeeds
    mockedParser.mockResolvedValueOnce({
      contentType: 'reel',
      postInfo: {
        postId: 'mockReelId',
        username: 'mockUser',
        isCarousel: false,
        mediaItems: [
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
            thumbnailUrl: 'https://example.com/thumbnail.jpg'
          }
        ]
      }
    });
    
    // Call the function
    const result = await downloadInstagramMedia('https://www.instagram.com/reel/mockReelId/');
    
    // Verify parser was called twice (first failed, second succeeded)
    expect(parseInstagramUrl).toHaveBeenCalledTimes(2);
    
    // Verify expected result from second method
    expect(result).toHaveProperty('postId', 'mockReelId');
    expect(result.mediaItems[0].type).toBe('video');
  });
});
