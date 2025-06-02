import { describe, it, expect } from 'vitest';
import { mockAdapter, mockProfiles, mockDomains, mockRequests } from './setup.js';

describe('background.js', () => {
  it('sets up storage listeners', async () => {
    await import('../../src/background.js');
    expect(mockAdapter.storage.onChanged.addListener).toHaveBeenCalled();
    expect(mockAdapter.webNavigation.onBeforeNavigate.addListener).toHaveBeenCalled();
  });

  it('loads profiles on initialization', async () => {
    await import('../../src/background.js');
    expect(mockProfiles.getAll).toHaveBeenCalled();
  });

  it('checks domains with active profile', async () => {
    // Import background.js and wait for initialization
    await import('../../src/background.js');
    
    // Trigger navigation
    const details = { url: 'https://example.com', tabId: 1 };
    mockAdapter.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0](details);
  
    // Verify
    expect(mockRequests.requests.isTrackingRequest).toHaveBeenCalledWith('https://example.com');
    expect(mockDomains.domains.isBlocked).toHaveBeenCalledWith('example.com', 'default');
  });

  it('redirects to blocked page', async () => {

    // Mock isBlocked to return true
    mockDomains.domains.isBlocked.mockResolvedValue(true);

    // Mock runtime.getURL to return a URL
    mockAdapter.runtime.getURL.mockReturnValue('test-url');
    
    // Import background.js and wait for initialization
    await import('../../src/background.js');
    
    // Trigger navigation
    const testURL = 'https://example.com'
    const testUriEncoded = encodeURIComponent(testURL)
    const testTabId = 1
    const details = { url: testURL, tabId: testTabId };
    const handler = mockAdapter.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
    await handler(details);
  
    // Verify
    expect(mockRequests.requests.isTrackingRequest).toHaveBeenCalledWith('https://example.com');
    expect(mockDomains.domains.isBlocked).toHaveBeenCalledWith('example.com', 'default');
    // Verify runtime.getURL was called with the correct URL (encoded)
    expect(mockAdapter.runtime.getURL).toHaveBeenCalledWith(`blocked.html?url=${testUriEncoded}&profile=Default`);
    expect(mockAdapter.webNavigation.tabs.update).toHaveBeenCalledWith(testTabId, {
      url: 'test-url'
    });
  });
});
