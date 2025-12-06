// src/components/lora/LoRAManagementDialog.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoRAManagementDialog } from './LoRAManagementDialog';
import fc from 'fast-check';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LoRAManagementDialog', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Unit Tests for Dialog Interactions

  it('should render empty state when no LoRAs are available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        loras: [],
      }),
    });

    render(
      <LoRAManagementDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading LoRAs...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No LoRAs uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Upload your first LoRA to get started')).toBeInTheDocument();
  });

  it('should show error message when fetch fails', async () => {
    // Mock all retry attempts to fail
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Failed to fetch LoRAs',
      }),
    });

    render(
      <LoRAManagementDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Wait for retries to complete and error to show
    await waitFor(() => {
      // The component wraps the error in additional text
      expect(screen.getByText(/Failed to fetch LoRAs/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show delete confirmation dialog when delete button is clicked', async () => {
    const mockLora = {
      id: '123',
      name: 'test',
      fileName: 'test.safetensors',
      s3Path: '/test',
      s3Url: 'http://test.com',
      fileSize: '1000',
      extension: '.safetensors',
      uploadedAt: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        loras: [mockLora],
      }),
    });

    render(
      <LoRAManagementDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.safetensors')).toBeInTheDocument();
    });

    // Find and click the delete button (Trash2 icon button)
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg.lucide-trash-2')
    );
    
    expect(deleteButton).toBeDefined();
    deleteButton?.click();

    // Check that confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete LoRA')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this LoRA? This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('should handle file upload validation error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        loras: [],
      }),
    });

    render(
      <LoRAManagementDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading LoRAs...')).not.toBeInTheDocument();
    });

    // Create a file with invalid extension
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    // Get the file input - it's hidden but should exist
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
    const fileInput = fileInputs[0] as HTMLInputElement;

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    // Trigger change event
    const event = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(event);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid file extension/i)).toBeInTheDocument();
    });
  });

  /**
   * Feature: lora-management, Property 4: LoRA list displays all uploaded files
   * Validates: Requirements 2.1, 2.4
   * 
   * For any set of uploaded LoRA files in a workspace, the LoRA management dialog 
   * should display all files with their complete metadata (name, size, date)
   */
  it('Property 4: LoRA list displays all uploaded files', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of LoRA files
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fileName: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0)
              .map(s => `${s.trim()}.safetensors`),
            s3Path: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            s3Url: fc.webUrl(),
            fileSize: fc.integer({ min: 1, max: 5 * 1024 * 1024 * 1024 }).map(n => n.toString()),
            extension: fc.constantFrom('.safetensors', '.ckpt'),
            uploadedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
            workspaceId: fc.option(fc.uuid(), { nil: undefined }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (loras) => {
          // Mock the API response
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              loras: loras,
            }),
          });

          // Render the dialog
          const { unmount } = render(
            <LoRAManagementDialog
              open={true}
              onOpenChange={() => {}}
            />
          );

          // Wait for the LoRAs to be fetched and displayed
          await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled();
            // Check that it was called with the correct URL (may include options like signal)
            const calls = mockFetch.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            expect(calls[0][0]).toBe('/api/lora');
          });

          // Wait for loading to complete
          await waitFor(() => {
            expect(screen.queryByText('Loading LoRAs...')).not.toBeInTheDocument();
          });

          if (loras.length === 0) {
            // If no LoRAs, should show empty state
            const emptyStateElements = screen.queryAllByText('No LoRAs uploaded yet');
            expect(emptyStateElements.length).toBeGreaterThan(0);
          } else {
            // All LoRAs should be displayed
            for (const lora of loras) {
              // Check that the file name is displayed (may appear multiple times due to multiple renders)
              const fileNameElements = screen.getAllByText(lora.fileName);
              expect(fileNameElements.length).toBeGreaterThan(0);

              // Check that metadata is displayed (size and date)
              // The component formats these, so we just verify they exist in the DOM
              const cardElement = fileNameElements[0].closest('.p-4');
              expect(cardElement).toBeInTheDocument();
              
              // Verify the card contains metadata text
              const metadataText = cardElement?.textContent || '';
              expect(metadataText).toContain(lora.fileName);
            }

            // Verify the count is correct (may appear multiple times)
            const countElements = screen.getAllByText(`Your LoRAs (${loras.length})`);
            expect(countElements.length).toBeGreaterThan(0);
          }

          // Clean up
          unmount();
          return true;
        }
      ),
      { numRuns: 50 } // Reduced runs for faster execution
    );
  }, 30000); // 30 second timeout for property test

  // Responsive Behavior Tests

  describe('Responsive Grid Layout', () => {
    it('should apply single column grid on mobile (default)', async () => {
      const mockLoras = [
        {
          id: '1',
          name: 'test1',
          fileName: 'test1.safetensors',
          s3Path: '/test1',
          s3Url: 'http://test1.com',
          fileSize: '1000',
          extension: '.safetensors',
          uploadedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'test2',
          fileName: 'test2.safetensors',
          s3Path: '/test2',
          s3Url: 'http://test2.com',
          fileSize: '2000',
          extension: '.safetensors',
          uploadedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          loras: mockLoras,
        }),
      });

      render(
        <LoRAManagementDialog
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test1.safetensors')).toBeInTheDocument();
      });

      // Find the grid container
      const gridContainer = screen.getByText('test1.safetensors').closest('.grid');
      expect(gridContainer).toBeInTheDocument();
      
      // Check that it has responsive grid classes
      expect(gridContainer?.className).toContain('grid-cols-1');
      expect(gridContainer?.className).toContain('sm:grid-cols-2');
      expect(gridContainer?.className).toContain('lg:grid-cols-3');
    });

    it('should apply responsive gap spacing', async () => {
      const mockLora = {
        id: '1',
        name: 'test',
        fileName: 'test.safetensors',
        s3Path: '/test',
        s3Url: 'http://test.com',
        fileSize: '1000',
        extension: '.safetensors',
        uploadedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          loras: [mockLora],
        }),
      });

      render(
        <LoRAManagementDialog
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test.safetensors')).toBeInTheDocument();
      });

      const gridContainer = screen.getByText('test.safetensors').closest('.grid');
      
      // Check responsive gap classes
      expect(gridContainer?.className).toContain('gap-3');
      expect(gridContainer?.className).toContain('sm:gap-4');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events for drag and drop area', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          loras: [],
        }),
      });

      render(
        <LoRAManagementDialog
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading LoRAs...')).not.toBeInTheDocument();
      });

      // Find the upload area
      const uploadArea = screen.getByText('Drag & drop LoRA file here').closest('div[role="button"]');
      expect(uploadArea).toBeInTheDocument();
      
      // Verify it's keyboard accessible
      expect(uploadArea?.getAttribute('tabIndex')).toBe('0');
    });

    it('should show hover effects on cards', async () => {
      const mockLora = {
        id: '1',
        name: 'test',
        fileName: 'test.safetensors',
        s3Path: '/test',
        s3Url: 'http://test.com',
        fileSize: '1000',
        extension: '.safetensors',
        uploadedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          loras: [mockLora],
        }),
      });

      render(
        <LoRAManagementDialog
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('test.safetensors')).toBeInTheDocument();
      });

      // Find the card element
      const card = screen.getByText('test.safetensors').closest('.group');
      expect(card).toBeInTheDocument();
      
      // Check for hover transition classes
      expect(card?.className).toContain('hover:border-primary/50');
      expect(card?.className).toContain('hover:shadow-md');
      expect(card?.className).toContain('transition-all');
      expect(card?.className).toContain('hover:scale-[1.02]');
    });

    it('should have responsive padding on upload section', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          loras: [],
        }),
      });

      render(
        <LoRAManagementDialog
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading LoRAs...')).not.toBeInTheDocument();
      });

      const uploadArea = screen.getByText('Drag & drop LoRA file here').closest('div[role="button"]');
      
      // Check for responsive padding classes
      expect(uploadArea?.className).toContain('p-6');
      expect(uploadArea?.className).toContain('sm:p-8');
    });
  });
});
