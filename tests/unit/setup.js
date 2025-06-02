// Global test setup
import { vi } from 'vitest';

vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: vi.fn((keys, callback) => callback({ mocked: 'chrome' })),
      set: vi.fn((items, callback) => callback()),
      remove: vi.fn((keys, callback) => callback())
    },
    onChanged: {}
  },
  runtime: {},
  webNavigation: {}
})

vi.stubGlobal('browser', {
  storage: {
    sync: {
      get: vi.fn((keys, callback) => callback({ mocked: 'browser' })),
      set: vi.fn((items, callback) => callback()),
      remove: vi.fn((keys, callback) => callback())
    },
    onChanged: {}
  },
  runtime: {},
  webNavigation: {}
})

// Mock adapter module
const mockAdapter = {
  storage: {
    onChanged: { addListener: vi.fn() }
  },
  webNavigation: {
    onBeforeNavigate: { addListener: vi.fn() },
    tabs: {
      update: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn()
  }
};
vi.mock('../../src/lib/browser/adapter.js', () => mockAdapter);

// Configurable profiles mock
const mockProfiles = {
  get: vi.fn(),
  getAll: vi.fn().mockResolvedValue({ profiles: {}, activeProfile: 'default' })
};
vi.mock('../../src/lib/core/profiles.js', () => ({
  profiles: mockProfiles
}));

// Mock domains module
const mockDomains = {
  domains: {
    isBlocked: vi.fn().mockResolvedValue(false)
  }
};
vi.mock('../../src/lib/core/domains.js', () => mockDomains);

// Mock requests module
const mockRequests = {
  requests: {
    isTrackingRequest: vi.fn().mockReturnValue(false)
  }
};
vi.mock('../../src/lib/core/requests.js', () => mockRequests);

export { mockAdapter, mockProfiles, mockDomains, mockRequests };
