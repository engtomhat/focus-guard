import { describe, expect, it } from 'vitest';
import { addedGrants } from '../../scripts/check-permissions';

const RELEASED = { permissions: ['storage', 'webNavigation'] };

describe('addedGrants', () => {
  it('passes when nothing is added, or something is removed', () => {
    expect(addedGrants(RELEASED, { permissions: ['webNavigation', 'storage'] })).toEqual([]);
    expect(addedGrants({ ...RELEASED, host_permissions: ['<all_urls>'] }, RELEASED)).toEqual([]);
  });

  it('flags new permissions, host access, content scripts and exposed resources', () => {
    expect(addedGrants(RELEASED, {
      permissions: ['storage', 'webNavigation', 'tabs'],
      host_permissions: ['<all_urls>'],
      content_scripts: [{ matches: ['https://*/*'] }],
      web_accessible_resources: [{ matches: ['<all_urls>'] }],
    })).toEqual([
      'content script on: https://*/*',
      'host permission: <all_urls>',
      'permission: tabs',
      'web accessible to: <all_urls>',
    ]);
  });

  it('flags optional permissions too', () => {
    expect(addedGrants(RELEASED, { ...RELEASED, optional_permissions: ['downloads'] })).toEqual(['optional permission: downloads']);
  });
});
