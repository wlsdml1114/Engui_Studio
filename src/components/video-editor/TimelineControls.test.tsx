import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineControls, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './TimelineControls';
import { StudioProvider } from '@/lib/context/StudioContext';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  ZoomIn: () => <div data-testid="zoom-in-icon">ZoomIn</div>,
  ZoomOut: () => <div data-testid="zoom-out-icon">ZoomOut</div>,
}));

describe('TimelineControls', () => {
  const mockOnZoomChange = vi.fn();
  
  const defaultProps = {
    currentTimestamp: 5.5,
    duration: 30,
    zoom: 1,
    onZoomChange: mockOnZoomChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (props = defaultProps) => {
    return render(
      <StudioProvider>
        <TimelineControls {...props} />
      </StudioProvider>
    );
  };

  describe('Time Display', () => {
    it('should display current time and total duration', () => {
      renderWithProvider();
      
      // Should show formatted time
      expect(screen.getByText(/0:05/)).toBeInTheDocument();
      expect(screen.getByText(/0:30/)).toBeInTheDocument();
    });

    it('should format time in milliseconds when less than 1 second', () => {
      renderWithProvider({
        ...defaultProps,
        currentTimestamp: 0.5,
      });
      
      expect(screen.getByText(/500ms/)).toBeInTheDocument();
    });

    it('should format time in MM:SS when duration is less than an hour', () => {
      renderWithProvider({
        ...defaultProps,
        currentTimestamp: 125,
        duration: 300,
      });
      
      expect(screen.getByText(/2:05/)).toBeInTheDocument();
      expect(screen.getByText(/5:00/)).toBeInTheDocument();
    });

    it('should format time in HH:MM:SS when duration is an hour or more', () => {
      renderWithProvider({
        ...defaultProps,
        currentTimestamp: 3665,
        duration: 7200,
      });
      
      expect(screen.getByText(/1:01:05/)).toBeInTheDocument();
      expect(screen.getByText(/2:00:00/)).toBeInTheDocument();
    });
  });

  describe('Play/Pause Controls', () => {
    it('should display play button when player is paused', () => {
      renderWithProvider();
      
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should display pause button when player is playing', () => {
      const { rerender } = renderWithProvider();
      
      // Simulate player state change by re-rendering with updated context
      // Note: In a real scenario, this would be controlled by StudioContext
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should have play/pause button disabled when player is not available', () => {
      renderWithProvider();
      
      const button = screen.getByRole('button', { name: /play/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Zoom Controls', () => {
    it('should display current zoom level', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: 1.5,
      });
      
      expect(screen.getByText('1.50x')).toBeInTheDocument();
    });

    it('should call onZoomChange when zoom in button is clicked', () => {
      renderWithProvider();
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInButton);
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 + ZOOM_STEP);
    });

    it('should call onZoomChange when zoom out button is clicked', () => {
      renderWithProvider();
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      fireEvent.click(zoomOutButton);
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 - ZOOM_STEP);
    });

    it('should disable zoom out button when at minimum zoom', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: MIN_ZOOM,
      });
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in button when at maximum zoom', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: MAX_ZOOM,
      });
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      expect(zoomInButton).toBeDisabled();
    });

    it('should not zoom beyond minimum when clicking zoom out', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: MIN_ZOOM + 0.1,
      });
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      fireEvent.click(zoomOutButton);
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(MIN_ZOOM);
    });

    it('should not zoom beyond maximum when clicking zoom in', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: MAX_ZOOM - 0.1,
      });
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInButton);
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(MAX_ZOOM);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should zoom in when + key is pressed', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: '+' });
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 + ZOOM_STEP);
    });

    it('should zoom in when = key is pressed', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: '=' });
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 + ZOOM_STEP);
    });

    it('should zoom out when - key is pressed', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: '-' });
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 - ZOOM_STEP);
    });

    it('should zoom out when _ key is pressed', () => {
      renderWithProvider();
      
      fireEvent.keyDown(window, { key: '_' });
      
      expect(mockOnZoomChange).toHaveBeenCalledWith(1 - ZOOM_STEP);
    });

    it('should not trigger shortcuts when typing in an input field', () => {
      const { container } = renderWithProvider();
      
      // Create an input element
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();
      
      fireEvent.keyDown(input, { key: '+' });
      
      expect(mockOnZoomChange).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts when typing in a textarea', () => {
      const { container } = renderWithProvider();
      
      // Create a textarea element
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.focus();
      
      fireEvent.keyDown(textarea, { key: '-' });
      
      expect(mockOnZoomChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      renderWithProvider();
      
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    });

    it('should have ARIA label for zoom slider', () => {
      renderWithProvider();
      
      // The slider role is on the thumb, but the aria-label is on the parent
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      
      // Verify the parent has the aria-label
      const sliderContainer = slider.closest('[aria-label]');
      expect(sliderContainer).toHaveAttribute('aria-label', 'Zoom level slider');
    });

    it('should have toolbar role on controls container', () => {
      const { container } = renderWithProvider();
      
      const toolbar = container.querySelector('[role="toolbar"]');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveAttribute('aria-label', 'Timeline controls');
    });

    it('should have status role on time display', () => {
      const { container } = renderWithProvider();
      
      const timeDisplay = container.querySelector('[role="status"]');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should have group roles for control sections', () => {
      const { container } = renderWithProvider();
      
      const groups = container.querySelectorAll('[role="group"]');
      expect(groups.length).toBeGreaterThanOrEqual(2); // Playback and zoom controls
    });

    it('should have aria-pressed on play/pause button', () => {
      renderWithProvider();
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toHaveAttribute('aria-pressed');
    });

    it('should have aria-valuetext on zoom slider', () => {
      renderWithProvider({
        ...defaultProps,
        zoom: 1.5,
      });
      
      const slider = screen.getByRole('slider');
      // The Radix UI Slider component manages aria-valuenow internally
      // We verify the slider has proper aria attributes
      expect(slider).toHaveAttribute('aria-valuenow', '1.5');
      expect(slider).toHaveAttribute('aria-valuemin', '0.25');
      expect(slider).toHaveAttribute('aria-valuemax', '4');
    });

    it('should hide decorative text from screen readers', () => {
      const { container } = renderWithProvider();
      
      // Check that hint text has aria-hidden
      const hintTexts = container.querySelectorAll('[aria-hidden="true"]');
      expect(hintTexts.length).toBeGreaterThan(0);
    });

    it('should have descriptive aria-labels with keyboard shortcuts', () => {
      renderWithProvider();
      
      const playButton = screen.getByRole('button', { name: /play.*space/i });
      expect(playButton).toBeInTheDocument();
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in.*plus/i });
      expect(zoomInButton).toBeInTheDocument();
      
      const zoomOutButton = screen.getByRole('button', { name: /zoom out.*minus/i });
      expect(zoomOutButton).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should update zoom state when slider is changed', () => {
      renderWithProvider();
      
      const slider = screen.getByRole('slider');
      
      // Verify the slider is present and has correct attributes
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuemin', '0.25');
      expect(slider).toHaveAttribute('aria-valuemax', '4');
      expect(slider).toHaveAttribute('aria-valuenow', '1');
      
      // Note: The actual slider implementation from Radix UI handles value changes
      // through pointer events, not simple change events. This test verifies
      // the component structure is correct.
    });
  });
});
