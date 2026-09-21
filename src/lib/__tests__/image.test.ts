import { describe, it, expect } from 'vitest';
import { detectMimeFromBytes } from '../image';

describe('magic byte detection', () => {
  it('detects JPEG', () => {
    expect(detectMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    expect(detectMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
  });

  it('rejects unknown', () => {
    expect(detectMimeFromBytes(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull();
  });
});
