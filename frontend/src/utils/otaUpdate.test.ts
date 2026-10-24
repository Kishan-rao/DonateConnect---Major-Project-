import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyOtaAppReady, checkForOtaUpdate } from './otaUpdate';
import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock('@capawesome/capacitor-live-update', () => ({
  LiveUpdate: {
    ready: vi.fn(),
    getCurrentBundle: vi.fn(),
    downloadBundle: vi.fn(),
    setNextBundle: vi.fn(),
  },
}));

describe('OTA Update Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('does nothing in browser/web environment', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await notifyOtaAppReady();
    expect(LiveUpdate.ready).not.toHaveBeenCalled();

    const result = await checkForOtaUpdate();
    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('notifies native runtime on native platform launch', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LiveUpdate.ready).mockResolvedValue({
      previousBundleId: null,
      currentBundleId: 'bundle-1',
      rollback: false,
    });

    await notifyOtaAppReady();
    expect(LiveUpdate.ready).toHaveBeenCalledTimes(1);
  });

  it('skips download if current bundle matches manifest releaseId', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LiveUpdate.getCurrentBundle).mockResolvedValue({
      bundleId: 'release-2026-v1',
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        releaseId: 'release-2026-v1',
        version: '0.1.0',
        bundleUrl: 'https://example.com/bundle.zip',
      }),
    });

    const updated = await checkForOtaUpdate();
    expect(updated).toBe(false);
    expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled();
  });

  it('downloads, verifies, and schedules next bundle when a new release is available', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(LiveUpdate.getCurrentBundle).mockResolvedValue({
      bundleId: 'release-2026-v1',
    });
    vi.mocked(LiveUpdate.downloadBundle).mockResolvedValue();
    vi.mocked(LiveUpdate.setNextBundle).mockResolvedValue();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        releaseId: 'release-2026-v2',
        version: '0.2.0',
        bundleUrl: 'https://example.com/bundle-v2.zip',
        checksum: 'abc123sha256',
        signature: 'rsaSignedSigBase64',
      }),
    });

    const updated = await checkForOtaUpdate();
    expect(updated).toBe(true);

    expect(LiveUpdate.downloadBundle).toHaveBeenCalledWith({
      artifactType: 'zip',
      bundleId: 'release-2026-v2',
      url: 'https://example.com/bundle-v2.zip',
      checksum: 'abc123sha256',
      signature: 'rsaSignedSigBase64',
    });

    expect(LiveUpdate.setNextBundle).toHaveBeenCalledWith({
      bundleId: 'release-2026-v2',
    });
  });

  it('handles network failure gracefully without throwing errors', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    (global.fetch as any).mockRejectedValue(new Error('Network offline'));

    const updated = await checkForOtaUpdate();
    expect(updated).toBe(false);
  });
});
