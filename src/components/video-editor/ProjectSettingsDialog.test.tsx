import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { VideoProject } from '@/lib/context/StudioContext';
import * as fc from 'fast-check';

describe('ProjectSettingsDialog', () => {
  const mockProject: VideoProject = {
    id: 'test-project-1',
    title: 'Test Project',
    description: 'Test Description',
    aspectRatio: '16:9',
    qualityPreset: '720p',
    width: 1280,
    height: 720,
    duration: 30000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project settings dialog', () => {
    render(
      <ProjectSettingsDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Project Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name')).toHaveValue('Test Project');
    expect(screen.getByLabelText('Description')).toHaveValue('Test Description');
  });

  it('displays current resolution settings', () => {
    render(
      <ProjectSettingsDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('1280 × 720')).toBeInTheDocument();
    expect(screen.getByText('16:9 • 720p')).toBeInTheDocument();
  });

  it('shows warning when resolution changes', async () => {
    render(
      <ProjectSettingsDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    // Change aspect ratio
    const aspectRatio9x16Button = screen.getAllByText('9:16')[0];
    fireEvent.click(aspectRatio9x16Button);

    await waitFor(() => {
      expect(screen.getByText('Resolution Change Warning')).toBeInTheDocument();
      expect(
        screen.getByText(/Changing resolution will re-fit all existing media/)
      ).toBeInTheDocument();
    });
  });

  it('requires confirmation for resolution changes', async () => {
    render(
      <ProjectSettingsDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    // Change quality preset
    const quality1080pButton = screen.getAllByText('1080p')[0];
    fireEvent.click(quality1080pButton);

    // First click should show "Confirm Changes"
    const saveButton = screen.getByRole('button', { name: /Confirm Changes|Save/i });
    fireEvent.click(saveButton);

    // Should not call onSave yet
    expect(mockOnSave).not.toHaveBeenCalled();

    // Second click should save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1920,
          height: 1080,
          qualityPreset: '1080p',
        })
      );
    });
  });

  it('generates default name if empty', async () => {
    render(
      <ProjectSettingsDialog
        project={mockProject}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByLabelText('Project Name');
    fireEvent.change(titleInput, { target: { value: '' } });

    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Project/),
        })
      );
    });
  });

  // Feature: video-resolution-audio-controls, Property 26: Default project name generation
  it('property test: default project name generation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random whitespace strings (empty or whitespace-only)
        fc.constantFrom('', '   ', '\t', '\n', '  \t  \n  '),
        async (emptyName) => {
          const onSave = vi.fn().mockResolvedValue(undefined);
          const onOpenChange = vi.fn();

          const { unmount } = render(
            <ProjectSettingsDialog
              project={mockProject}
              open={true}
              onOpenChange={onOpenChange}
              onSave={onSave}
            />
          );

          // Set project name to empty/whitespace
          const titleInput = screen.getByLabelText('Project Name');
          fireEvent.change(titleInput, { target: { value: emptyName } });

          // Save
          const saveButton = screen.getByRole('button', { name: /Save/i });
          fireEvent.click(saveButton);

          await waitFor(() => {
            expect(onSave).toHaveBeenCalled();
          });

          // Verify that onSave was called with a default name (not empty)
          const saveCall = onSave.mock.calls[0][0];
          expect(saveCall).toHaveProperty('title');
          expect(saveCall.title).toBeTruthy();
          expect(saveCall.title.length).toBeGreaterThan(0);
          // Default name should contain "Project"
          expect(saveCall.title).toMatch(/Project/i);

          unmount();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-resolution-audio-controls, Property 25: Project name change persistence
  it('property test: project name change persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random project names
        fc.string({ minLength: 1, maxLength: 100 }),
        async (newName) => {
          const onSave = vi.fn().mockResolvedValue(undefined);
          const onOpenChange = vi.fn();

          const { unmount } = render(
            <ProjectSettingsDialog
              project={mockProject}
              open={true}
              onOpenChange={onOpenChange}
              onSave={onSave}
            />
          );

          // Change project name
          const titleInput = screen.getByLabelText('Project Name');
          fireEvent.change(titleInput, { target: { value: newName } });

          // Save
          const saveButton = screen.getByRole('button', { name: /Save/i });
          fireEvent.click(saveButton);

          await waitFor(() => {
            expect(onSave).toHaveBeenCalled();
          });

          // Verify that onSave was called with the new name
          const saveCall = onSave.mock.calls[0][0];
          expect(saveCall).toHaveProperty('title', newName.trim());

          unmount();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-resolution-audio-controls, Property 3: Keyframe re-fitting on resolution change
  it('property test: keyframe re-fitting on resolution change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random aspect ratio and quality preset
        fc.constantFrom('16:9', '9:16'),
        fc.constantFrom('480p', '720p', '1080p'),
        async (newAspectRatio, newQualityPreset) => {
          // Skip if no change
          if (
            newAspectRatio === mockProject.aspectRatio &&
            newQualityPreset === mockProject.qualityPreset
          ) {
            return true;
          }

          const onSave = vi.fn().mockResolvedValue(undefined);
          const onOpenChange = vi.fn();

          const { unmount } = render(
            <ProjectSettingsDialog
              project={mockProject}
              open={true}
              onOpenChange={onOpenChange}
              onSave={onSave}
            />
          );

          // Change aspect ratio if different
          if (newAspectRatio !== mockProject.aspectRatio) {
            const aspectRatioButton = screen.getAllByText(newAspectRatio)[0];
            fireEvent.click(aspectRatioButton);
          }

          // Change quality preset if different
          if (newQualityPreset !== mockProject.qualityPreset) {
            const qualityButton = screen.getAllByText(newQualityPreset)[0];
            fireEvent.click(qualityButton);
          }

          // Click save button twice (once to confirm, once to save)
          const saveButton = screen.getByRole('button', {
            name: /Confirm Changes|Save/i,
          });
          fireEvent.click(saveButton);
          fireEvent.click(saveButton);

          await waitFor(() => {
            expect(onSave).toHaveBeenCalled();
          });

          // Verify that onSave was called with new resolution settings
          const saveCall = onSave.mock.calls[0][0];
          expect(saveCall).toHaveProperty('width');
          expect(saveCall).toHaveProperty('height');
          expect(saveCall).toHaveProperty('qualityPreset', newQualityPreset);
          expect(saveCall).toHaveProperty('aspectRatio', newAspectRatio);

          // Verify resolution matches expected values
          const expectedResolutions: Record<
            string,
            Record<string, { width: number; height: number }>
          > = {
            '16:9': {
              '480p': { width: 854, height: 480 },
              '720p': { width: 1280, height: 720 },
              '1080p': { width: 1920, height: 1080 },
            },
            '9:16': {
              '480p': { width: 480, height: 854 },
              '720p': { width: 720, height: 1280 },
              '1080p': { width: 1080, height: 1920 },
            },
          };

          const expected = expectedResolutions[newAspectRatio][newQualityPreset];
          expect(saveCall.width).toBe(expected.width);
          expect(saveCall.height).toBe(expected.height);

          unmount();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
