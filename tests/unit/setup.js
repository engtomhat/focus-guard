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
      update: vi.fn().mockResolvedValue({})
    }
  },
  runtime: {
    getURL: vi.fn()
  }
};
vi.mock('../../src/lib/browser/adapter.js', () => mockAdapter);

// Configurable profiles mock
const mockProfiles = {
  getProfiles: vi.fn().mockResolvedValue({}),
  getActiveProfileId: vi.fn().mockResolvedValue('default'),
  getAll: vi.fn().mockResolvedValue({ profiles: {}, activeProfile: 'default' }),
  migrateLegacyIfPresent: vi.fn().mockResolvedValue()
};
vi.mock('../../src/lib/core/profiles.js', () => ({
  profiles: mockProfiles
}));

export { mockAdapter, mockProfiles };
