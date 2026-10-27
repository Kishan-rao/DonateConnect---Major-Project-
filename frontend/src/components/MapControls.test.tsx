import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapControls } from './MapControls';
import * as useAndroidBackButtonModule from '../utils/useAndroidBackButton';

const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockInvalidateSize = vi.fn();
const mockGetCenter = vi.fn(() => ({ lat: 12.9716, lng: 77.5946 }));
const mockGetZoom = vi.fn(() => 13);
const mockSetView = vi.fn();
const mockGetContainer = vi.fn(() => document.createElement('div'));

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    invalidateSize: mockInvalidateSize,
    getCenter: mockGetCenter,
    getZoom: mockGetZoom,
    setView: mockSetView,
    getContainer: mockGetContainer,
  }),
}));

describe('MapControls Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders zoom in, zoom out, and full-screen buttons with accessible labels', () => {
    render(<MapControls />);

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeInTheDocument();
  });

  it('invokes Leaflet zoomIn and zoomOut on button clicks', async () => {
    const user = userEvent.setup();
    render(<MapControls />);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(mockZoomIn).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(mockZoomOut).toHaveBeenCalledTimes(1);
  });

  it('toggles full-screen mode and updates accessible label', async () => {
    const user = userEvent.setup();
    const onFullscreenChange = vi.fn();

    const { rerender } = render(
      <MapControls isFullscreen={false} onFullscreenChange={onFullscreenChange} />
    );

    const toggleBtn = screen.getByRole('button', { name: 'Enter full screen' });
    await user.click(toggleBtn);

    expect(onFullscreenChange).toHaveBeenCalledWith(true);

    // Simulate parent updating isFullscreen prop to true
    rerender(<MapControls isFullscreen={true} onFullscreenChange={onFullscreenChange} />);
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(onFullscreenChange).toHaveBeenCalledWith(false);
  });

  it('falls back gracefully to CSS full screen when requestFullscreen rejects or is unsupported', async () => {
    const user = userEvent.setup();
    const container = document.createElement('div');
    container.requestFullscreen = vi.fn().mockRejectedValue(new Error('Fullscreen denied in WebView'));

    const containerRef = { current: container };
    const onFullscreenChange = vi.fn();

    render(
      <MapControls
        containerRef={containerRef}
        isFullscreen={false}
        onFullscreenChange={onFullscreenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Enter full screen' }));
    expect(container.requestFullscreen).toHaveBeenCalled();
    // Fallback state is still communicated to parent
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
  });

  it('triggers Leaflet invalidateSize when entering or exiting full screen', async () => {
    const { rerender } = render(<MapControls isFullscreen={false} />);
    expect(mockInvalidateSize).toHaveBeenCalled();

    mockInvalidateSize.mockClear();
    rerender(<MapControls isFullscreen={true} />);

    await waitFor(() => {
      expect(mockInvalidateSize).toHaveBeenCalled();
    });
  });

  it('registers an Android hardware back button dismiss handler when full-screen is active', () => {
    const pushSpy = vi.spyOn(useAndroidBackButtonModule, 'pushModalDismiss');

    const { rerender, unmount } = render(<MapControls isFullscreen={false} />);
    expect(pushSpy).not.toHaveBeenCalled();

    rerender(<MapControls isFullscreen={true} />);
    expect(pushSpy).toHaveBeenCalled();

    unmount();
  });

  it('prevents click and touch events from bubbling to map', () => {
    const mapClickMock = vi.fn();

    render(
      <div onClick={mapClickMock}>
        <MapControls />
      </div>
    );

    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    fireEvent.click(zoomInBtn);

    expect(mapClickMock).not.toHaveBeenCalled();
  });
});

