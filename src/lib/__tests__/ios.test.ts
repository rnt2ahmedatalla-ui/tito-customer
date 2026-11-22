import { describe, expect, it } from 'vitest';
import { iosVersion } from '@/components/layout/IosInstallGuide';

describe('iosVersion', () => {
  it('reads iPhone versions', () => {
    expect(iosVersion('Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X)')).toBeCloseTo(16.03);
    expect(iosVersion('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X)')).toBeCloseTo(17.04);
  });
  it('returns null on Android', () => {
    expect(iosVersion('Mozilla/5.0 (Linux; Android 14)')).toBeNull();
  });
});
