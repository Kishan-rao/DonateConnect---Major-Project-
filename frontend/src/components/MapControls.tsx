import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { pushModalDismiss } from '../utils/useAndroidBackButton';

export interface MapControlsProps {
  /**
   * Optional ref to the outer container element that expands to full screen.
   * If omitted, falls back to map.getContainer() or its parent.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Placement on the map canvas. Default: 'top-right'.
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showZoom?: boolean;
  showFullscreen?: boolean;
  /**
   * Controlled fullscreen state. If provided, onFullscreenChange will be invoked.
   */
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  containerRef,
  position = 'top-right',
  showZoom = true,
  showFullscreen = true,
  isFullscreen: controlledFullscreen,
  onFullscreenChange,
  className = '',
}) => {
  const map = useMap();
  const controlsRef = useRef<HTMLDivElement>(null);
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  const isFullscreen = controlledFullscreen !== undefined ? controlledFullscreen : internalFullscreen;

  const setFullscreenState = useCallback(
    (nextState: boolean) => {
      if (controlledFullscreen === undefined) {
        setInternalFullscreen(nextState);
      }
      onFullscreenChange?.(nextState);
    },
    [controlledFullscreen, onFullscreenChange]
  );

  // Prevent click and touch events on controls from bubbling to Leaflet map (e.g. pin drops)
  const stopMapPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Trigger Leaflet map size invalidation when container resizes or fullscreen toggles
  const invalidateMapSize = useCallback(() => {
    if (!map || typeof map.invalidateSize !== 'function') return;
    try {
      const center = typeof map.getCenter === 'function' ? map.getCenter() : null;
      const zoom = typeof map.getZoom === 'function' ? map.getZoom() : null;
      map.invalidateSize({ pan: false });
      if (center && zoom !== null && typeof map.setView === 'function') {
        map.setView(center, zoom);
      }
    } catch {
      // Ignore if map unmounted
    }
  }, [map]);

  useEffect(() => {
    invalidateMapSize();
    const t1 = setTimeout(invalidateMapSize, 100);
    const t2 = setTimeout(invalidateMapSize, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, invalidateMapSize]);

  // Monitor DOM container resize with ResizeObserver
  useEffect(() => {
    if (!map || typeof map.getContainer !== 'function' || typeof ResizeObserver === 'undefined') return;
    const target = containerRef?.current || map.getContainer();
    if (!target) return;

    const ro = new ResizeObserver(() => {
      invalidateMapSize();
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, [map, containerRef, invalidateMapSize]);

  // Listen to browser native fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const docFs = Boolean(document.fullscreenElement);
      if (!docFs && isFullscreen) {
        setFullscreenState(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, setFullscreenState]);

  // Handle Android hardware back button when in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const cleanup = pushModalDismiss(() => {
      handleExitFullscreen();
    });
    return cleanup;
  }, [isFullscreen]);

  const handleEnterFullscreen = async () => {
    setFullscreenState(true);
    const target = containerRef?.current || (typeof map.getContainer === 'function' ? map.getContainer() : null);
    if (target && typeof target.requestFullscreen === 'function') {
      try {
        await target.requestFullscreen();
      } catch {
        // Fallback to CSS-based full screen already activated by state
      }
    }
  };

  const handleExitFullscreen = async () => {
    setFullscreenState(false);
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore exit rejection
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      handleExitFullscreen();
    } else {
      handleEnterFullscreen();
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (map && typeof map.zoomIn === 'function') {
      map.zoomIn();
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (map && typeof map.zoomOut === 'function') {
      map.zoomOut();
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-3 left-3 sm:top-4 sm:left-4';
      case 'bottom-right':
        return 'bottom-3 right-3 sm:bottom-4 sm:right-4';
      case 'bottom-left':
        return 'bottom-3 left-3 sm:bottom-4 sm:left-4';
      case 'top-right':
      default:
        return 'top-3 right-3 sm:top-4 sm:right-4';
    }
  };

  return (
    <div
      ref={controlsRef}
      data-testid="map-controls"
      className={`absolute ${getPositionClasses()} z-[1000] flex flex-col gap-1.5 pointer-events-auto select-none ${className}`}
      onClick={stopMapPropagation}
      onMouseDown={stopMapPropagation}
      onTouchStart={stopMapPropagation}
      onDoubleClick={stopMapPropagation}
    >
      {showZoom && (
        <div className="flex flex-col bg-white/95 backdrop-blur-sm border border-[#E5E7EB] rounded-xl shadow-md overflow-hidden">
          <button
            type="button"
            data-testid="map-zoom-in"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={handleZoomIn}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#111827] hover:bg-[#F4F2FA] hover:text-[#7567E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7567E8]/40 border-b border-[#E5E7EB] active:scale-95"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="map-zoom-out"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={handleZoomOut}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#111827] hover:bg-[#F4F2FA] hover:text-[#7567E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7567E8]/40 active:scale-95"
          >
            <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>
      )}

      {showFullscreen && (
        <button
          type="button"
          data-testid="map-fullscreen-toggle"
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleToggleFullscreen();
          }}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#7567E8] ${
            isFullscreen
              ? 'bg-[#7567E8] text-white border-[#7567E8] hover:bg-[#6050e0]'
              : 'bg-white/95 backdrop-blur-sm hover:bg-[#F4F2FA] text-[#111827] hover:text-[#7567E8] border-[#E5E7EB]'
          }`}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          ) : (
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
};
