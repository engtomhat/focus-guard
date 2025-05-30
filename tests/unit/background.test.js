import { describe, it, expect } from 'vitest';
import { storage } from '../../src/lib/browser/adapter.js';

describe('background.js', () => {
  it('sets up storage listeners', async () => {
    await import('../../src/background.js');
    expect(storage.onChanged.addListener).toHaveBeenCalled();
  });

  it('loads profiles on initialization', async () => {
    const { profiles } = await import('../../src/lib/core/profiles.js');
    await import('../../src/background.js');
    expect(profiles.getAll).toHaveBeenCalled();
  });

  it('checks domains with active profile', async () => {
    // Set up mock profile
    mockProfiles.getAll.mockResolvedValueOnce({
      profiles: { premium: { domains: ['blocked.com'] } },
      activeProfile: 'premium'
    });
  
    // Import background.js and wait for initialization
    await import('../../src/background.js');
    await new Promise(resolve => setTimeout(resolve, 0)); // Let promises resolve
  
    // Trigger navigation
    const details = { url: 'https://example.com', tabId: 1 };
    webNavigation.onBeforeNavigate.addListener.mock.calls[0][0](details);
  
    // Verify
    const { domains } = await import('../../src/lib/core/domains.js');
    expect(domains.isBlocked).toHaveBeenCalledWith('premium', 'example.com');
  });
});
