import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { PhotoViewerModal } from './PhotoViewerModal';
import * as useAndroidBackButtonModule from '../utils/useAndroidBackButton';

describe('PhotoViewerModal', () => {
  const mockOnClose = vi.fn();
  const samplePhotos = [
    'https://example.com/photo1.jpg',
    '/api/donations/photo/photo2.jpg',
    'https://example.com/photo3.jpg',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PhotoViewerModal
        isOpen={false}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when photos array is empty', () => {
    const { container } = render(
      <PhotoViewerModal
        isOpen={true}
        photos={[]}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with single photo and no counter', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={['https://example.com/single.jpg']}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer-counter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer-next')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-viewer-image')).toHaveAttribute('src', 'https://example.com/single.jpg');
  });

  it('renders multiple photos with counter and navigation controls', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        initialIndex={0}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 3');
    // At index 0, prev is not visible, next is visible
    expect(screen.queryByTestId('photo-viewer-prev')).not.toBeInTheDocument();
    const nextBtn = screen.getByTestId('photo-viewer-next');
    expect(nextBtn).toBeInTheDocument();

    // Click next
    fireEvent.click(nextBtn);
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 3');
    expect(screen.getByTestId('photo-viewer-prev')).toBeInTheDocument();

    // Click next again to last photo
    fireEvent.click(screen.getByTestId('photo-viewer-next'));
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('3 / 3');
    expect(screen.queryByTestId('photo-viewer-next')).not.toBeInTheDocument();

    // Click prev back to photo 2
    fireEvent.click(screen.getByTestId('photo-viewer-prev'));
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 3');
  });

  it('handles zoom in, zoom out, and reset zoom', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    const zoomInBtn = screen.getByTestId('photo-viewer-zoom-in');
    const zoomOutBtn = screen.getByTestId('photo-viewer-zoom-out');
    const resetZoomBtn = screen.getByTestId('photo-viewer-reset-zoom');
    const image = screen.getByTestId('photo-viewer-image');

    expect(resetZoomBtn).toHaveTextContent('100%');
    expect(zoomOutBtn).toBeDisabled();

    // Zoom in once: 1.0 -> 1.5
    fireEvent.click(zoomInBtn);
    expect(resetZoomBtn).toHaveTextContent('150%');
    expect(zoomOutBtn).not.toBeDisabled();
    expect(image.style.transform).toContain('scale(1.5)');

    // Zoom in again: 1.5 -> 2.0
    fireEvent.click(zoomInBtn);
    expect(resetZoomBtn).toHaveTextContent('200%');
    expect(image.style.transform).toContain('scale(2)');

    // Zoom out: 2.0 -> 1.5
    fireEvent.click(zoomOutBtn);
    expect(resetZoomBtn).toHaveTextContent('150%');

    // Reset zoom
    fireEvent.click(resetZoomBtn);
    expect(resetZoomBtn).toHaveTextContent('100%');
    expect(image.style.transform).toContain('scale(1)');
  });

  it('toggles zoom on double-click', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    const image = screen.getByTestId('photo-viewer-image');
    const resetZoomBtn = screen.getByTestId('photo-viewer-reset-zoom');

    // Double click to zoom to 2.5x
    fireEvent.doubleClick(image);
    expect(resetZoomBtn).toHaveTextContent('250%');

    // Double click again to reset to 1x
    fireEvent.doubleClick(image);
    expect(resetZoomBtn).toHaveTextContent('100%');
  });

  it('closes on close button click', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('photo-viewer-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click when not zoomed', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on backdrop click when clicking on the image', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByTestId('photo-viewer-image'));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation (Escape, ArrowRight, ArrowLeft, +, -, 0)', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        initialIndex={0}
        onClose={mockOnClose}
      />
    );

    // ArrowRight switches to photo 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('2 / 3');

    // ArrowLeft switches back to photo 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('photo-viewer-counter')).toHaveTextContent('1 / 3');

    // Zoom in with '+'
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByTestId('photo-viewer-reset-zoom')).toHaveTextContent('150%');

    // Reset with '0'
    fireEvent.keyDown(window, { key: '0' });
    expect(screen.getByTestId('photo-viewer-reset-zoom')).toHaveTextContent('100%');

    // Escape closes viewer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('registers with pushModalDismiss for Android hardware back button and dismisses on back', () => {
    let capturedHandler: (() => void) | null = null;
    const pushSpy = vi.spyOn(useAndroidBackButtonModule, 'pushModalDismiss').mockImplementation((handler) => {
      capturedHandler = handler;
      return () => {
        capturedHandler = null;
      };
    });

    const { unmount } = render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    expect(pushSpy).toHaveBeenCalled();
    expect(capturedHandler).toBeTruthy();

    // Trigger back button dismiss
    capturedHandler!();
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Unmount cleans up
    unmount();
    expect(capturedHandler).toBeNull();
  });

  it('shows error state when image fails to load and allows retry', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={samplePhotos}
        onClose={mockOnClose}
      />
    );

    const image = screen.getByTestId('photo-viewer-image');
    fireEvent.error(image);

    expect(screen.getByTestId('photo-viewer-error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load photo')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText('Retry'));
    expect(screen.getByTestId('photo-viewer-image')).toBeInTheDocument();
  });

  it('handles empty or invalid photo URLs without infinite loading spinner', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={['', '   ']}
        onClose={mockOnClose}
      />
    );

    // Empty URL immediately triggers error fallback and no infinite spinner
    expect(screen.getByTestId('photo-viewer-error')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer-loading')).not.toBeInTheDocument();
  });

  it('triggers safety timeout when image loading hangs without infinite spinner', () => {
    vi.useFakeTimers();

    render(
      <PhotoViewerModal
        isOpen={true}
        photos={['https://example.com/hanging-image.jpg']}
        onClose={mockOnClose}
      />
    );

    // Initially loading
    expect(screen.getByTestId('photo-viewer-loading')).toBeInTheDocument();

    // Fast-forward past the 8-second safety timeout
    act(() => {
      vi.advanceTimersByTime(8500);
    });

    // Error state appears and loading spinner is dismissed
    expect(screen.getByTestId('photo-viewer-error')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-viewer-loading')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('retry button appends cache-buster to force fresh network request', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photos={['https://example.com/photo-to-retry.jpg']}
        onClose={mockOnClose}
      />
    );

    // Simulate error
    const image = screen.getByTestId('photo-viewer-image');
    fireEvent.error(image);

    // Click retry
    fireEvent.click(screen.getByText('Retry'));

    // Image reloads with retry parameter
    const retriedImage = screen.getByTestId('photo-viewer-image');
    expect(retriedImage.getAttribute('src')).toContain('retry=1');
  });
});

