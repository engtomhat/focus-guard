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

// Mock adapter module only
export const mockAdapter = vi.mock('../../src/lib/browser/adapter.js', () => ({
  storage: {
    onChanged: { addListener: vi.fn() }
  },
  webNavigation: {
    onBeforeNavigate: { addListener: vi.fn() }
  }
}));

// Configurable profiles mock
export const mockProfiles = {
  get: vi.fn(),
  getAll: vi.fn().mockResolvedValue({ profiles: {}, activeProfile: 'default' })
};
vi.mock('../../src/lib/core/profiles.js', () => ({
  profiles: mockProfiles
}));

// Mock domains module
export const mockDomains = vi.mock('../../src/lib/core/domains.js', () => ({
  domains: {
    isBlocked: vi.fn().mockResolvedValue(false)
  }
}));
