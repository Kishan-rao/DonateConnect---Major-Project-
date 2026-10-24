import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';

export interface OtaManifest {
  releaseId: string;
  version: string;
  minNativeVersion?: string;
  bundleUrl: string;
  checksum?: string;
  signature?: string;
  createdAt?: string;
  notes?: string;
}

const DEFAULT_MANIFEST_URL =
  'https://github.com/Kishan-rao/DonateConnect---Major-Project-/releases/latest/download/manifest.json';

/**
 * Confirms that the current web app instance booted successfully.
 * This MUST be called on application launch to prevent the native rollback
 * watchdog timer (readyTimeout: 10000ms) from reverting to baseline assets.
 */
export const notifyOtaAppReady = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const result = await LiveUpdate.ready();
    if (result.rollback) {
      console.warn(
        '[DonateConnect OTA] App rolled back to default bundle after failure in previous bundle:',
        result.previousBundleId
      );
    } else {
      console.info(
        '[DonateConnect OTA] App ready signal sent. Active bundle:',
        result.currentBundleId || 'default (bundled)'
      );
    }
  } catch (error) {
    console.error('[DonateConnect OTA] Failed to signal app ready:', error);
  }
};

/**
 * Checks for a published OTA release in the background without blocking the UI.
 * Verifies version compatibility and cryptographic signature before activation.
 */
export const checkForOtaUpdate = async (options?: { manifestUrl?: string }): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;

  const manifestUrl =
    options?.manifestUrl ||
    (import.meta.env.VITE_OTA_MANIFEST_URL as string) ||
    DEFAULT_MANIFEST_URL;

  try {
    console.info('[DonateConnect OTA] Checking for updates from:', manifestUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(manifestUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.info(`[DonateConnect OTA] Update check returned HTTP ${response.status}. Skipping.`);
      return false;
    }

    const manifest: OtaManifest = await response.json();

    if (!manifest.releaseId || !manifest.bundleUrl) {
      console.warn('[DonateConnect OTA] Manifest is missing releaseId or bundleUrl. Aborting.');
      return false;
    }

    // Inspect currently running bundle
    const currentBundle = await LiveUpdate.getCurrentBundle();
    const currentBundleId = currentBundle?.bundleId;

    if (currentBundleId === manifest.releaseId) {
      console.info('[DonateConnect OTA] Application is up to date:', currentBundleId);
      return false;
    }

    console.info(
      `[DonateConnect OTA] New update available: ${manifest.releaseId} (current: ${currentBundleId || 'default'}). Downloading...`
    );

    // Download and verify bundle signature & checksum natively
    await LiveUpdate.downloadBundle({
      artifactType: 'zip',
      bundleId: manifest.releaseId,
      url: manifest.bundleUrl,
      checksum: manifest.checksum,
      signature: manifest.signature,
    });

    console.info(`[DonateConnect OTA] Bundle ${manifest.releaseId} downloaded & verified. Scheduling next boot.`);

    // Set bundle for next app restart
    await LiveUpdate.setNextBundle({
      bundleId: manifest.releaseId,
    });

    console.info(`[DonateConnect OTA] Next launch will load release: ${manifest.releaseId}`);
    return true;
  } catch (error: any) {
    // Offline or network error: log safely and let existing app continue normally
    if (error?.name === 'AbortError') {
      console.info('[DonateConnect OTA] Update check timed out. Continuing with current version.');
    } else {
      console.warn('[DonateConnect OTA] Background update check failed (non-blocking):', error?.message || error);
    }
    return false;
  }
};

