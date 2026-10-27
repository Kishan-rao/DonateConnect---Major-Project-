import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface CapturedPhoto {
  file: File;
  previewUrl: string;
}

/**
 * Capture a new photograph directly using device camera.
 * Strictly uses CameraSource.Camera (no gallery, no file picker).
 * Returns null if the user cancelled the capture.
 */
export const capturePhotoWithCamera = async (
  fileNamePrefix = 'photo'
): Promise<CapturedPhoto | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera, // STRICTLY CAMERA ONLY
    });

    if (!image.webPath && !image.dataUrl && !image.base64String) {
      throw new Error('No image data received from camera.');
    }

    const format = image.format || 'jpg';
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
    const fileName = `${fileNamePrefix}-${Date.now()}.${format}`;

    let blob: Blob;

    if (image.webPath) {
      const res = await fetch(image.webPath);
      blob = await res.blob();
    } else if (image.dataUrl) {
      const res = await fetch(image.dataUrl);
      blob = await res.blob();
    } else {
      const byteCharacters = atob(image.base64String!);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    }

    const file = new File([blob], fileName, { type: blob.type || mimeType });
    const previewUrl = image.webPath || (image.dataUrl ?? URL.createObjectURL(file));

    return { file, previewUrl };
  } catch (error: any) {
    const msg = error?.message || String(error);

    // User cancellation check (Capacitor Camera message conventions)
    if (
      msg.toLowerCase().includes('cancelled') ||
      msg.toLowerCase().includes('canceled') ||
      msg.toLowerCase().includes('user cancelled') ||
      msg.toLowerCase().includes('no image picked')
    ) {
      return null;
    }

    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
      throw new Error('Camera permission was denied. Please allow camera access in your device settings.');
    }

    if (msg.toLowerCase().includes('no camera') || msg.toLowerCase().includes('unavailable')) {
      throw new Error('Camera hardware is not available on this device.');
    }

    throw new Error(msg || 'Failed to capture photo from camera.');
  }
};

