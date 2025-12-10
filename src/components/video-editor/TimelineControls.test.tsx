import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineControls, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from './TimelineControls';
import { StudioProvider } from '@/lib/context/StudioContext';
import { I18nProvider } from '@/lib/i18n/context';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  SkipBack: () => <div data-testid="skip-back-icon">SkipBack</div>,
  SkipForward: () => <div data-testid="skip-forward-icon">SkipForward</div>,
  ChevronsLeft: () => <div data-testid="chevrons-left-icon">ChevronsLeft</div>,
  ChevronsRight: () => <div data-testid="chevrons-right-icon">ChevronsRight</div>,
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
      <I18nProvider defaultLanguage="en">
        <StudioProvider>
          <TimelineControls {...props} />
        </StudioProvider>
      </I18nProvider>
    );
  };

  describe('Time Display', () => {
    it('should display current time and total duration', () => {
      renderWithProvider();
      
      // Should show formatted time in MM:SS.ms format
      expect(screen.getByText('00:05.50')).toBeInTheDocument();
      expect(screen.getByText('00:30.00')).toBeInTheDocument();
    });

    it('should format time correctly for different timestamps', () => {
      renderWithProvider({
        ...defaultProps,
        currentTimestamp: 125.75,
        duration: 300,
      });
      
      expect(screen.getByText('02:05.75')).toBeInTheDocument();
      expect(screen.getByText('05:00.00')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Controls', () => {
    it('should display play button when player is paused', () => {
      renderWithProvider();
      
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should have play/pause button disabled when player is not available', () => {
      renderWithProvider();
      
      const button = screen.getByRole('button', { name: /play/i });
      expect(button).toBeDisabled();
    });

    it('should have navigation buttons', () => {
      renderWithProvider();
      
      expect(screen.getByRole('button', { name: /go to start/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step backward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step forward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to end/i })).toBeInTheDocument();
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
    it('should have proper ARIA labels for playback buttons', () => {
      renderWithProvider();
      
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to start/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step backward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /step forward/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to end/i })).toBeInTheDocument();
    });

    it('should have toolbar role on controls container', () => {
      const { container } = renderWithProvider();
      
      const toolbar = container.querySelector('[role="toolbar"]');
      expect(toolbar).toBeInTheDocument();
      // The aria-label is translated via i18n
      expect(toolbar).toHaveAttribute('aria-label', 'Timeline controls');
    });

    it('should have status role on time display', () => {
      const { container } = renderWithProvider();
      
      const timeDisplay = container.querySelector('[role="status"]');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should have group role for playback controls', () => {
      const { container } = renderWithProvider();
      
      const groups = container.querySelectorAll('[role="group"]');
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    it('should have aria-pressed on play/pause button', () => {
      renderWithProvider();
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toHaveAttribute('aria-pressed');
    });

    it('should have descriptive aria-labels with keyboard shortcuts', () => {
      renderWithProvider();
      
      const playButton = screen.getByRole('button', { name: /play.*space/i });
      expect(playButton).toBeInTheDocument();
      
      const goToStartButton = screen.getByRole('button', { name: /go to start.*home/i });
      expect(goToStartButton).toBeInTheDocument();
      
      const goToEndButton = screen.getByRole('button', { name: /go to end.*end/i });
      expect(goToEndButton).toBeInTheDocument();
    });
  });

  describe('i18n Integration', () => {
    it('should render with English translations', () => {
      renderWithProvider();
      
      // Check that translated aria-labels are present
      expect(screen.getByRole('button', { name: 'Play (Space)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to start (Home)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to end (End)' })).toBeInTheDocument();
    });

    it('should use t() function for all button labels', () => {
      renderWithProvider();
      
      // Verify all buttons have translated labels (not hardcoded)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(5); // go to start, step back, play, step forward, go to end
      
      // Each button should have an aria-label attribute
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});
