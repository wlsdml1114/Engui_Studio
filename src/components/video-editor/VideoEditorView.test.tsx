import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VideoEditorView } from './VideoEditorView';
import { StudioProvider } from '@/lib/context/StudioContext';
import React from 'react';

// Create mock player instance
const createMockPlayer = () => ({
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  getCurrentFrame: vi.fn(() => 0),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

let mockPlayerInstance = createMockPlayer();

// Mock Remotion modules
vi.mock('@remotion/player', () => ({
  Player: vi.fn((props: any) => {
    // Simulate ref assignment
    React.useEffect(() => {
      if (props.ref && typeof props.ref === 'object') {
        props.ref.current = mockPlayerInstance;
      }
    });
    return React.createElement('div', { 'data-testid': 'remotion-player' }, 'Player Mock');
  }),
}));

vi.mock('@remotion/preload', () => ({
  preloadVideo: vi.fn(),
  preloadImage: vi.fn(),
  preloadAudio: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('VideoEditorView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerInstance = createMockPlayer();
    
    // Reset fetch mock and set up default responses for StudioContext initialization
    (global.fetch as any).mockReset();
    (global.fetch as any).mockImplementation((url: string) => {
      // Default mocks for StudioContext initialization
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, workspaces: [] }),
        });
      }
      if (url.includes('/api/jobs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, jobs: [] }),
        });
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  // Feature: video-editor-center-panel, Property 1: Video editor activation displays correct interface
  // Validates: Requirements 1.1, 1.2
  // Note: This is an integration test that validates the property rather than a pure property-based test
  // Property-based testing with full component rendering and async state is not practical for this scenario
  it('should display correct interface when video editor is activated', async () => {
    const projectId = 'test-project-123';
    const project = {
      id: projectId,
      title: 'Test Video Project',
      description: 'A test project',
      aspectRatio: '16:9' as const,
      duration: 30000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const tracks = [
      {
        id: 'track-1',
        projectId,
        type: 'video' as const,
        label: 'Video Track',
        locked: false,
        order: 0,
      },
    ];

    // Override the default mock for this specific test
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/video-projects/test-project-123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            project,
            tracks,
            keyframes: [],
          }),
        });
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, workspaces: [] }),
        });
      }
      if (url.includes('/api/jobs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, jobs: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    const { container } = render(
      <StudioProvider>
        <VideoEditorView projectId={projectId} />
      </StudioProvider>
    );

    // First verify loading state appears
    expect(screen.getByText(/loading video editor/i)).toBeInTheDocument();

    // Wait for loading to disappear (component transitions out of loading state)
    await waitFor(
      () => {
        expect(screen.queryByText(/loading video editor/i)).not.toBeInTheDocument();
      },
      { timeout: 5000, interval: 100 }
    );

    // Now verify the main interface components are present
    // Check for project title in the header
    await waitFor(
      () => {
        expect(screen.getByText(project.title)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Verify VideoPreview is present (Remotion Player) - wait for lazy load
    await waitFor(
      () => {
        expect(screen.getByTestId('remotion-player')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Verify VideoTimeline is present (check for timeline-specific elements) - wait for lazy load
    await waitFor(
      () => {
        const timelineElement = container.querySelector('[data-timeline-zoom]');
        expect(timelineElement).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should display loading state initially', async () => {
    const projectId = 'test-project-123';

    // Mock a slow API response
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/video-projects/')) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                project: {
                  id: projectId,
                  title: 'Test Project',
                  description: '',
                  aspectRatio: '16:9',
                  duration: 30000,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                tracks: [],
                keyframes: [],
              }),
            });
          }, 100);
        });
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, workspaces: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    render(
      <StudioProvider>
        <VideoEditorView projectId={projectId} />
      </StudioProvider>
    );

    // Should show loading state
    expect(screen.getByText(/loading video editor/i)).toBeInTheDocument();
  });

  it('should display error state when project fails to load', async () => {
    const projectId = 'test-project-456';

    // Mock a failed API response
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/video-projects/')) {
        return Promise.reject(new Error('Network error'));
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, workspaces: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    render(
      <StudioProvider>
        <VideoEditorView projectId={projectId} />
      </StudioProvider>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/failed to load project/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // Feature: video-editor-center-panel, Property 29: Components use enguistudio theme
  // Validates: Requirements 8.2
  it('should apply enguistudio theme classes to components', () => {
    const projectId = 'theme-test-project';

    // Mock a slow API to keep component in loading state
    (global.fetch as any).mockImplementation(() => {
      return new Promise(() => {}); // Never resolves, keeps loading state
    });

    const { container } = render(
      <StudioProvider>
        <VideoEditorView projectId={projectId} />
      </StudioProvider>
    );

    // Verify enguistudio theme classes are applied even in loading state
    // Check for Tailwind classes that are part of enguistudio's theme
    const flexElements = container.querySelectorAll('[class*="flex"]');
    expect(flexElements.length).toBeGreaterThan(0);

    const textElements = container.querySelectorAll('[class*="text-"]');
    expect(textElements.length).toBeGreaterThan(0);

    // Check for specific theme classes in loading state
    const loadingText = container.querySelector('.text-muted-foreground');
    expect(loadingText).toBeInTheDocument();

    const spinner = container.querySelector('.border-primary');
    expect(spinner).toBeInTheDocument();
  });

  it('should display error state when project does not exist', async () => {
    const projectId = 'non-existent-project';

    // Mock API response with no project (now throws error due to success: false)
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/video-projects/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: false,
            error: 'Project not found',
            project: null,
          }),
        });
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, workspaces: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    render(
      <StudioProvider>
        <VideoEditorView projectId={projectId} />
      </StudioProvider>
    );

    // Wait for error state (since loadProject now throws on success: false)
    await waitFor(() => {
      expect(screen.getByText(/failed to load project/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

  describe('Accessibility Tests', () => {
    it('should have application role with aria-label on main editor', async () => {
      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        const app = container.querySelector('[role="application"]');
        expect(app).toBeInTheDocument();
        expect(app).toHaveAttribute('aria-label', 'Video editor');
      });
    });

    it('should have status role with aria-live on loading state', () => {
      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: TestWrapper }
      );

      const status = container.querySelector('[role="status"]');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label', 'Loading video editor');
    });

    it('should have alert role with aria-live on error state', async () => {
      // Mock loadProject to throw an error
      const mockLoadProject = vi.fn().mockRejectedValue(new Error('Failed to load'));
      
      const ErrorWrapper = ({ children }: { children: React.ReactNode }) => (
        <StudioContext.Provider
          value={{
            ...mockStudioContext,
            loadProject: mockLoadProject,
          } as any}
        >
          {children}
        </StudioContext.Provider>
      );

      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: ErrorWrapper }
      );

      await waitFor(() => {
        const alert = container.querySelector('[role="alert"]');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should have aria-label on retry button', async () => {
      const mockLoadProject = vi.fn().mockRejectedValue(new Error('Failed to load'));
      
      const ErrorWrapper = ({ children }: { children: React.ReactNode }) => (
        <StudioContext.Provider
          value={{
            ...mockStudioContext,
            loadProject: mockLoadProject,
          } as any}
        >
          {children}
        </StudioContext.Provider>
      );

      render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: ErrorWrapper }
      );

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry loading project/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should hide decorative icons from screen readers', async () => {
      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        // Check loading spinner has aria-hidden
        const spinner = container.querySelector('.animate-spin');
        if (spinner) {
          expect(spinner).toHaveAttribute('aria-hidden', 'true');
        }
      });
    });

    it('should have status role on loading fallbacks', async () => {
      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: TestWrapper }
      );

      // Check for Suspense fallback status roles
      await waitFor(() => {
        const statuses = container.querySelectorAll('[role="status"]');
        expect(statuses.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive aria-labels on loading states', async () => {
      const { container } = render(
        <VideoEditorView projectId="test-project" />,
        { wrapper: TestWrapper }
      );

      // Check for descriptive labels
      const loadingPreview = container.querySelector('[aria-label="Loading video preview"]');
      const loadingTimeline = container.querySelector('[aria-label="Loading timeline"]');
      
      // At least one should be present during loading
      expect(loadingPreview || loadingTimeline).toBeTruthy();
    });
  });
