import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CenterPanel from './CenterPanel';
import { StudioProvider, useStudio } from '@/lib/context/StudioContext';
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

describe('CenterPanel Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerInstance = createMockPlayer();
    
    // Reset fetch mock and set up default responses
    (global.fetch as any).mockReset();
    (global.fetch as any).mockImplementation((url: string) => {
      // Default mocks for StudioContext initialization
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces/initialize')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            workspace: { id: 'default', name: 'Default', isDefault: true, createdAt: new Date().toISOString() } 
          }),
        });
      }
      if (url.includes('/api/video-projects/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            project: {
              id: 'test-project-123',
              title: 'Test Project',
              description: 'Test Description',
              aspectRatio: '16:9',
              duration: 30000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            tracks: [],
            keyframes: {},
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it('should render default view when no activeArtifactId is set', () => {
    render(
      <StudioProvider>
        <CenterPanel />
      </StudioProvider>
    );

    // Should show the default "Ready to Create" message
    expect(screen.getByText('Ready to Create')).toBeInTheDocument();
    expect(screen.getByText(/Select a tool from the left panel/)).toBeInTheDocument();
  });

  it('should render default view when activeTool is not speech-sequencer', async () => {
    const TestWrapper = () => {
      const { setActiveArtifactId, setActiveTool } = useStudio();
      
      React.useEffect(() => {
        setActiveArtifactId('some-artifact-id');
        setActiveTool('video-generation');
      }, [setActiveArtifactId, setActiveTool]);

      return <CenterPanel />;
    };

    render(
      <StudioProvider>
        <TestWrapper />
      </StudioProvider>
    );

    // Should show the default workspace view, not video editor
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('remotion-player')).not.toBeInTheDocument();
  });

  it('should render VideoEditorView when in video editor mode', async () => {
    const TestWrapper = () => {
      const { setActiveArtifactId, setActiveTool } = useStudio();
      
      React.useEffect(() => {
        setActiveArtifactId('test-project-123');
        setActiveTool('speech-sequencer');
      }, [setActiveArtifactId, setActiveTool]);

      return <CenterPanel />;
    };

    render(
      <StudioProvider>
        <TestWrapper />
      </StudioProvider>
    );

    // Should show loading state initially
    expect(screen.getByText('Loading video editor...')).toBeInTheDocument();
  });

  it('should pass activeArtifactId as projectId to VideoEditorView', async () => {
    const projectId = 'test-project-456';
    
    const TestWrapper = () => {
      const { setActiveArtifactId, setActiveTool } = useStudio();
      
      React.useEffect(() => {
        setActiveArtifactId(projectId);
        setActiveTool('speech-sequencer');
      }, [setActiveArtifactId, setActiveTool]);

      return <CenterPanel />;
    };

    // Mock the API to return a project with the specific ID
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, settings: {} }),
        });
      }
      if (url.includes('/api/workspaces/initialize')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            workspace: { id: 'default', name: 'Default', isDefault: true, createdAt: new Date().toISOString() } 
          }),
        });
      }
      if (url.includes(`/api/video-projects/${projectId}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            project: {
              id: projectId,
              title: 'Test Project 456',
              description: 'Test Description',
              aspectRatio: '16:9',
              duration: 30000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            tracks: [],
            keyframes: {},
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    render(
      <StudioProvider>
        <TestWrapper />
      </StudioProvider>
    );

    // Verify the correct API endpoint was called with the projectId
    await vi.waitFor(() => {
      const fetchCalls = (global.fetch as any).mock.calls;
      const projectFetchCall = fetchCalls.find((call: any) => 
        call[0].includes(`/api/video-projects/${projectId}`)
      );
      expect(projectFetchCall).toBeDefined();
    });
  });

  it('should switch between default view and video editor', async () => {
    const TestWrapper = () => {
      const { setActiveArtifactId, setActiveTool } = useStudio();
      const [mode, setMode] = React.useState<'default' | 'editor'>('default');

      React.useEffect(() => {
        if (mode === 'editor') {
          setActiveArtifactId('test-project-123');
          setActiveTool('speech-sequencer');
        } else {
          setActiveArtifactId(null);
          setActiveTool('video-generation');
        }
      }, [mode, setActiveArtifactId, setActiveTool]);

      return (
        <div>
          <button onClick={() => setMode('editor')}>Switch to Editor</button>
          <button onClick={() => setMode('default')}>Switch to Default</button>
          <CenterPanel />
        </div>
      );
    };

    const { rerender } = render(
      <StudioProvider>
        <TestWrapper />
      </StudioProvider>
    );

    // Initially should show default view
    expect(screen.getByText('Ready to Create')).toBeInTheDocument();

    // Click to switch to editor mode
    const editorButton = screen.getByText('Switch to Editor');
    editorButton.click();

    // Force a rerender to apply state changes
    rerender(
      <StudioProvider>
        <TestWrapper />
      </StudioProvider>
    );

    // Should show loading state for video editor
    await vi.waitFor(() => {
      expect(screen.queryByText('Loading video editor...')).toBeInTheDocument();
    });
  });
});
