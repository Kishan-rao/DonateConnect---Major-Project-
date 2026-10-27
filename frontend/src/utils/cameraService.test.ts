import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { capturePhotoWithCamera } from './cameraService';

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Uri: 'uri',
  },
  CameraSource: {
    Camera: 'CAMERA',
    Photos: 'PHOTOS',
    Prompt: 'PROMPT',
  },
}));

describe('cameraService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Camera.getPhoto strictly with CameraSource.Camera', async () => {
    // Mock global fetch to return a blob
    const mockBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(mockBlob),
    }));

    vi.mocked(Camera.getPhoto).mockResolvedValueOnce({
      webPath: 'blob:http://localhost/test-image-uuid',
      format: 'jpeg',
    } as any);

    const result = await capturePhotoWithCamera('donation');

    expect(Camera.getPhoto).toHaveBeenCalledWith({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    expect(result).not.toBeNull();
    expect(result?.previewUrl).toBe('blob:http://localhost/test-image-uuid');
    expect(result?.file).toBeInstanceOf(File);
    expect(result?.file.name).toMatch(/^donation-\d+\.jpeg$/);
  });

  it('returns null when user cancels camera capture', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValueOnce(new Error('User cancelled photos app'));

    const result = await capturePhotoWithCamera();
    expect(result).toBeNull();
  });

  it('throws friendly error when camera permission is denied', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValueOnce(new Error('Permission denied'));

    await expect(capturePhotoWithCamera()).rejects.toThrow(
      'Camera permission was denied. Please allow camera access in your device settings.'
    );
  });

  it('throws friendly error when camera hardware is unavailable', async () => {
    vi.mocked(Camera.getPhoto).mockRejectedValueOnce(new Error('Camera unavailable'));

    await expect(capturePhotoWithCamera()).rejects.toThrow(
      'Camera hardware is not available on this device.'
    );
  });
});

