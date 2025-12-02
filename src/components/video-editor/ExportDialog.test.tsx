import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from './ExportDialog';
import { VideoProject } from '@/lib/context/StudioContext';
import * as fc from 'fast-check';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: () => React.createElement('svg', { 'data-testid': 'download-icon' }),
  Loader2: () => React.createElement('svg', { 'data-testid': 'loader-icon' }),
  AlertCircle: () => React.createElement('svg', { 'data-testid': 'alert-icon' }),
  CheckCircle2: () => React.createElement('svg', { 'data-testid': 'check-icon' }),
  X: () => React.createElement('svg', { 'data-testid': 'x-icon' }),
}));

// Mock the Dialog component to render without portal
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: any) => React.createElement('div', { role: 'dialog' }, children),
  DialogHeader: ({ children }: any) => React.createElement('div', null, children),
  DialogTitle: ({ children }: any) => React.createElement('h2', null, children),
  DialogDescription: ({ children }: any) => React.createElement('p', null, children),
  DialogFooter: ({ children }: any) => React.createElement('div', null, children),
}));

// Mock the StudioContext
const mockSetExportDialogOpen = vi.fn();

vi.mock('@/lib/context/StudioContext', async () => {
  const actual = await vi.importActual('@/lib/context/StudioContext');
  return {
    ...actual,
    useStudio: () => ({
      exportDialogOpen: true, // Always open for testing
      setExportDialogOpen: mockSetExportDialogOpen,
    }),
  };
});

// Mock fetch globally
const originalFetch = global.fetch;

describe('ExportDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Helper function to find button
  const findButton = (container: HTMLElement, buttonText: string) => {
    const buttons = container.querySelectorAll('button');
    const button = Array.from(buttons).find((btn) => 
      btn.textContent?.includes(buttonText)
    );

    if (!button) {
      throw new Error(`${buttonText} button not found. Available buttons: ${Array.from(buttons).map(b => b.textContent).join(', ')}`);
    }

    return button;
  };

  // Feature: video-editor-center-panel, Property 21: Export shows progress
  // Validates: Requirements 6.3
  it('should show progress indicator during export rendering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
        }),
        async ({ project }) => {
          const user = userEvent.setup();

          // Mock fetch to simulate a slow export
          let resolveFetch: (value: any) => void;
          const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
          });

          global.fetch = vi.fn().mockImplementation(() => fetchPromise);

          const { unmount, container } = render(<ExportDialog project={project} />);

          try {
            // Find the "Start Export" button
            const startButton = findButton(container, 'Start Export');
            await user.click(startButton);

            // Wait for rendering state to appear
            await waitFor(
              () => {
                // Check for progress indicator elements
                const renderingTexts = screen.queryAllByText(/Rendering/i);
                const progressPercentages = screen.queryAllByText(/%/);

                // At least one progress indicator should be visible
                expect(renderingTexts.length > 0 || progressPercentages.length > 0).toBeTruthy();
              },
              { timeout: 1000 }
            );

            // Verify progress bar exists
            const progressBars = document.querySelectorAll('[class*="bg-primary"]');
            const hasProgressBar = Array.from(progressBars).some((el) => {
              const parent = el.parentElement;
              return parent?.className.includes('bg-secondary');
            });

            expect(hasProgressBar).toBe(true);

            // Clean up: resolve the fetch
            resolveFetch!({
              ok: true,
              json: async () => ({ success: true, downloadUrl: '/test.mp4' }),
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);

  // Feature: video-editor-center-panel, Property 22: Export completion shows download option
  // Validates: Requirements 6.4
  it('should show download option when export completes successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
          downloadUrl: fc.webUrl(),
        }),
        async ({ project, downloadUrl }) => {
          const user = userEvent.setup();

          // Mock successful export
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, downloadUrl }),
          });

          const { unmount, container } = render(<ExportDialog project={project} />);

          try {
            // Find the "Start Export" button
            const startButton = findButton(container, 'Start Export');
            await user.click(startButton);

            // Wait for export to complete and download button to appear
            await waitFor(
              () => {
                const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
                  (btn) => btn.textContent?.includes('Download')
                );
                expect(downloadButtons.length).toBeGreaterThan(0);
              },
              { timeout: 3000 }
            );

            // Verify success message is shown
            const successMessages = screen.queryAllByText(/completed successfully/i);
            expect(successMessages.length).toBeGreaterThan(0);

            // Verify download button is clickable
            const downloadButtons = Array.from(container.querySelectorAll('button')).filter(
              (btn) => btn.textContent?.includes('Download')
            );
            expect(downloadButtons[0]).not.toBeDisabled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);

  // Feature: video-editor-center-panel, Property 23: Export errors display messages
  // Validates: Requirements 6.5
  it('should display error message when export fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        async ({ project, errorMessage }) => {
          const user = userEvent.setup();

          // Mock failed export
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ success: false, error: errorMessage }),
          });

          const { unmount, container } = render(<ExportDialog project={project} />);

          try {
            // Find the "Start Export" button
            const startButton = findButton(container, 'Start Export');
            await user.click(startButton);

            // Wait for error message to appear
            await waitFor(
              () => {
                const errorTexts = screen.queryAllByText(/Export Failed/i);
                expect(errorTexts.length).toBeGreaterThan(0);
              },
              { timeout: 3000 }
            );

            // The property is validated by the presence of "Export Failed" message
            // and "Try Again" button, which we already checked above
            
            // Verify "Try Again" button is available
            const tryAgainButtons = Array.from(container.querySelectorAll('button')).filter(
              (btn) => btn.textContent?.includes('Try Again')
            );
            expect(tryAgainButtons.length).toBeGreaterThan(0);
            expect(tryAgainButtons[0]).not.toBeDisabled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);
});
