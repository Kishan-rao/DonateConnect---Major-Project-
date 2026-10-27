import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { getPhotoUrl } from '../utils/photoHelper';
import { pushModalDismiss } from '../utils/useAndroidBackButton';

export interface PhotoViewerModalProps {
  isOpen: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  photos,
  initialIndex = 0,
  onClose,
  title,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  // Drag & Touch tracking refs
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPinchingRef = useRef<boolean>(false);
  const initialPinchDistRef = useRef<number>(0);
  const initialPinchZoomRef = useRef<number>(1);
  const hasDraggedRef = useRef<boolean>(false);

  // Sync initial index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen && photos && photos.length > 0) {
      const validIndex = Math.max(0, Math.min(initialIndex, photos.length - 1));
      setCurrentIndex(validIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImageLoading(true);
      setImageError(false);
      setRetryNonce(0);
    }
  }, [isOpen, initialIndex, photos]);

  // Reset zoom and pan when changing current index
  const handleIndexChange = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageLoading(true);
    setImageError(false);
    setRetryNonce(0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      handleIndexChange(currentIndex + 1);
    }
  }, [currentIndex, photos.length, handleIndexChange]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      handleIndexChange(currentIndex - 1);
    }
  }, [currentIndex, handleIndexChange]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleTapOrClick = useCallback(() => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(2.5);
    }
  }, [zoom, handleResetZoom]);

  // Android hardware back button integration
  useEffect(() => {
    if (!isOpen) return;
    const cleanup = pushModalDismiss(() => {
      onClose();
    });
    return cleanup;
  }, [isOpen, onClose]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    hasDraggedRef.current = true;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Touch handlers for mobile (swipe & pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      hasDraggedRef.current = false;
      if (zoom > 1) {
        setIsDragging(true);
      }
    } else if (e.touches.length === 2) {
      isPinchingRef.current = true;
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (initialPinchDistRef.current > 0) {
        const factor = dist / initialPinchDistRef.current;
        const newZoom = Math.min(4, Math.max(1, initialPinchZoomRef.current * factor));
        setZoom(Math.round(newZoom * 10) / 10);
      }
    } else if (isDragging && e.touches.length === 1 && zoom > 1) {
      const touch = e.touches[0];
      hasDraggedRef.current = true;
      setPan({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      if (zoom < 1.05) {
        handleResetZoom();
      }
      return;
    }

    if (isDragging) {
      setIsDragging(false);
    }

    // Swipe gesture when not zoomed
    if (zoom === 1 && e.changedTouches.length === 1 && !hasDraggedRef.current) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 80) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  const currentRawUrl = photos && photos.length > 0 ? photos[currentIndex] : '';
  const basePhotoUrl = getPhotoUrl(currentRawUrl);
  const currentPhotoUrl = retryNonce > 0 && basePhotoUrl && !basePhotoUrl.startsWith('data:')
    ? `${basePhotoUrl}${basePhotoUrl.includes('?') ? '&' : '?'}retry=${retryNonce}`
    : basePhotoUrl;

  // Preload and timeout safety effect: guarantees the viewer never spins indefinitely
  useEffect(() => {
    if (!isOpen) return;

    if (!basePhotoUrl) {
      setImageLoading(false);
      setImageError(true);
      return;
    }

    setImageLoading(true);
    setImageError(false);

    let isMounted = true;
    const img = new Image();

    // 8-second safety timeout so viewer never stays stuck on loading
    const timer = setTimeout(() => {
      if (isMounted) {
        setImageLoading(false);
        setImageError(true);
      }
    }, 8000);

    img.onload = () => {
      if (isMounted) {
        clearTimeout(timer);
        setImageLoading(false);
        setImageError(false);
      }
    };

    img.onerror = () => {
      if (isMounted) {
        clearTimeout(timer);
        setImageLoading(false);
        setImageError(true);
      }
    };

    img.src = currentPhotoUrl;

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, basePhotoUrl, currentPhotoUrl]);

  if (!isOpen || !photos || photos.length === 0) {
    return null;
  }

  const handleRetry = () => {
    setImageError(false);
    setImageLoading(true);
    setRetryNonce((prev) => prev + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Full-size donation photo viewer'}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0B0F17]/95 backdrop-blur-md select-none touch-none animate-fadeIn"
      onClick={() => {
        // Close on clicking backdrop when not zoomed and didn't drag
        if (zoom === 1 && !hasDraggedRef.current) {
          onClose();
        }
      }}
    >
      {/* Top Header / Action Bar */}
      <div
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] z-20 bg-gradient-to-b from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side: Photo counter & info */}
        <div className="flex items-center gap-3 text-white">
          {photos.length > 1 && (
            <span
              data-testid="photo-viewer-counter"
              className="text-xs sm:text-sm font-semibold tracking-wider px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              {currentIndex + 1} / {photos.length}
            </span>
          )}
          {title && (
            <span className="text-xs sm:text-sm font-medium text-gray-300 truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
          )}
        </div>

        {/* Center / Right controls: Zoom controls & Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out Button */}
          <button
            type="button"
            data-testid="photo-viewer-zoom-out"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="p-2.5 rounded-full text-white bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/10"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          {/* Zoom indicator & Reset button */}
          <button
            type="button"
            data-testid="photo-viewer-reset-zoom"
            onClick={handleResetZoom}
            aria-label={`Reset zoom (currently ${Math.round(zoom * 100)}%)`}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors min-h-[44px] flex items-center gap-1 border border-white/10"
            title="Reset Zoom (0)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{Math.round(zoom * 100)}%</span>
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            data-testid="photo-viewer-zoom-in"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            aria-label="Zoom in"
            className="p-2.5 rounded-full text-white bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/10"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/20 mx-1" />

          {/* Close Button */}
          <button
            type="button"
            data-testid="photo-viewer-close"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="p-2.5 rounded-full text-white bg-white/20 hover:bg-rose-600/80 active:bg-rose-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shadow-lg border border-white/20"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full p-2 sm:p-6"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading Spinner */}
        {imageLoading && !imageError && (
          <div
            data-testid="photo-viewer-loading"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white pointer-events-none z-10"
          >
            <Loader2 className="w-8 h-8 animate-spin text-[#7567E8]" />
            <span className="text-xs font-medium text-gray-300">Loading high-resolution photo...</span>
          </div>
        )}

        {/* Error Fallback */}
        {imageError ? (
          <div
            data-testid="photo-viewer-error"
            className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-center max-w-sm mx-auto space-y-3 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="font-bold text-base">Unable to load photo</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              The image could not be loaded or is temporarily unavailable.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 rounded-xl bg-[#7567E8] hover:bg-[#6355d8] text-white text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <img
            key={currentPhotoUrl}
            data-testid="photo-viewer-image"
            src={currentPhotoUrl}
            alt={title || `Donation photo ${currentIndex + 1}`}
            draggable={false}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            onDoubleClick={handleDoubleTapOrClick}
            onClick={(e) => {
              // Stop propagation so clicking the image doesn't trigger backdrop close
              e.stopPropagation();
            }}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
              opacity: imageLoading ? 0 : 1,
            }}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-opacity duration-200"
          />
        )}

        {/* Previous Photo Chevron Button */}
        {photos.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            data-testid="photo-viewer-prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full text-white bg-black/40 hover:bg-black/70 border border-white/20 backdrop-blur-sm transition-all min-w-[48px] min-h-[48px] flex items-center justify-center shadow-lg active:scale-95 z-20"
            title="Previous Photo (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Photo Chevron Button */}
        {photos.length > 1 && currentIndex < photos.length - 1 && (
          <button
            type="button"
            data-testid="photo-viewer-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next photo"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full text-white bg-black/40 hover:bg-black/70 border border-white/20 backdrop-blur-sm transition-all min-w-[48px] min-h-[48px] flex items-center justify-center shadow-lg active:scale-95 z-20"
            title="Next Photo (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Hint Bar */}
      <div
        className="w-full text-center py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] text-gray-400 z-20 pointer-events-none"
      >
        <span className="hidden sm:inline">
          {zoom > 1
            ? 'Drag to pan • Double-click or press 0 to reset zoom'
            : 'Double-click to zoom in • Arrow keys to switch photos'}
        </span>
        <span className="sm:hidden">
          {zoom > 1
            ? 'Drag to pan • Double-tap to reset'
            : 'Pinch or double-tap to zoom • Swipe to switch photos'}
        </span>
      </div>
    </div>
  );
};
