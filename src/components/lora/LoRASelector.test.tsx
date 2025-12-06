// src/components/lora/LoRASelector.test.tsx

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { LoRASelector, LoRAFile } from './LoRASelector';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Helper to create a mock LoRA file
function createMockLoRA(overrides?: Partial<LoRAFile>): LoRAFile {
  return {
    id: overrides?.id || `lora-${Math.random()}`,
    name: overrides?.name || 'test-lora',
    fileName: overrides?.fileName || 'test-lora.safetensors',
    s3Path: overrides?.s3Path || `s3://bucket/test-lora-${Math.random()}.safetensors`,
    s3Url: overrides?.s3Url || 'https://s3.amazonaws.com/bucket/test-lora.safetensors',
    fileSize: overrides?.fileSize || '1073741824', // 1GB
    extension: overrides?.extension || '.safetensors',
    uploadedAt: overrides?.uploadedAt || new Date().toISOString(),
    workspaceId: overrides?.workspaceId || 'workspace-1',
    lastUsed: overrides?.lastUsed,
  };
}

// Arbitrary for generating LoRA files
const loraArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  s3Path: fc.string({ minLength: 10, maxLength: 100 }).map(s => `s3://bucket/${s}.safetensors`),
  s3Url: fc.webUrl(),
  fileSize: fc.integer({ min: 1024, max: 5 * 1024 * 1024 * 1024 }).map(n => n.toString()),
  extension: fc.constantFrom('.safetensors', '.ckpt'),
  uploadedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() }).map(ts => new Date(ts).toISOString()),
  workspaceId: fc.option(fc.uuid(), { nil: undefined }),
  lastUsed: fc.option(
    fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() }),
    { nil: undefined }
  ).map(ts => ts !== undefined ? new Date(ts).toISOString() : undefined),
}).map(lora => ({
  ...lora,
  // Make fileName unique by using the id
  fileName: `${lora.name.trim().replace(/[^a-zA-Z0-9]/g, '_')}_${lora.id.substring(0, 8)}${lora.extension}`,
}));

describe('LoRASelector', () => {
  describe('Unit Tests', () => {
    it('should render empty state when no LoRA is selected', () => {
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[]}
          onManageClick={onManageClick}
        />
      );

      expect(screen.getByText('No LoRA selected')).toBeInTheDocument();
      expect(screen.getByText('Select LoRA')).toBeInTheDocument();
    });

    it('should render selected LoRA card when value is provided', () => {
      const lora = createMockLoRA({ fileName: 'my-model.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      expect(screen.getByText('my-model.safetensors')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    it('should call onChange with empty string when Clear is clicked', () => {
      const lora = createMockLoRA();
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should open dropdown when Select LoRA is clicked', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      const selectButton = screen.getByText('Select LoRA');
      fireEvent.click(selectButton);

      expect(screen.getByPlaceholderText('Search LoRAs...')).toBeInTheDocument();
      expect(screen.getByText('test.safetensors')).toBeInTheDocument();
    });

    it('should filter LoRAs based on search query', () => {
      const lora1 = createMockLoRA({ fileName: 'anime-style.safetensors' });
      const lora2 = createMockLoRA({ fileName: 'realistic-faces.ckpt' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora1, lora2]}
          onManageClick={onManageClick}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select LoRA'));

      // Search for "anime"
      const searchInput = screen.getByPlaceholderText('Search LoRAs...');
      fireEvent.change(searchInput, { target: { value: 'anime' } });

      // Should show anime-style but not realistic-faces
      expect(screen.getByText('anime-style.safetensors')).toBeInTheDocument();
      expect(screen.queryByText('realistic-faces.ckpt')).not.toBeInTheDocument();
    });

    it('should call onChange with selected LoRA s3Path when LoRA is clicked', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select LoRA'));

      // Click on LoRA
      fireEvent.click(screen.getByText('test.safetensors'));

      expect(onChange).toHaveBeenCalledWith(lora.s3Path);
    });

    it('should show recent LoRAs section when LoRAs have lastUsed', () => {
      const recentLora = createMockLoRA({
        fileName: 'recent.safetensors',
        lastUsed: new Date().toISOString(),
      });
      const oldLora = createMockLoRA({ fileName: 'old.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[recentLora, oldLora]}
          onManageClick={onManageClick}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select LoRA'));

      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('All LoRAs')).toBeInTheDocument();
    });

    it('should call onManageClick when Manage button is clicked', () => {
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[]}
          onManageClick={onManageClick}
        />
      );

      const manageButton = screen.getByText('Manage');
      fireEvent.click(manageButton);

      expect(onManageClick).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: lora-management, Property 7: LoRA selection populates all available LoRAs
     * Validates: Requirements 4.2
     * 
     * For any workspace with uploaded LoRAs, models with a lora parameter should have
     * their dropdown options populated with all LoRAs belonging to that workspace
     */
    it('Property 7: LoRA selection populates all available LoRAs', () => {
      fc.assert(
        fc.property(
          fc.array(loraArbitrary, { minLength: 1, maxLength: 20 }),
          (loras) => {
            const onChange = vi.fn();
            const onManageClick = vi.fn();

            render(
              <LoRASelector
                value=""
                onChange={onChange}
                label="Test LoRA"
                availableLoras={loras}
                onManageClick={onManageClick}
              />
            );

            // Open dropdown - use getAllByText since there might be multiple buttons
            const selectButtons = screen.getAllByText('Select LoRA');
            fireEvent.click(selectButtons[0]);

            // Verify all LoRAs are displayed in the dropdown
            for (const lora of loras) {
              const loraElement = screen.getByText(lora.fileName);
              expect(loraElement).toBeInTheDocument();
            }

            // Cleanup for next iteration
            cleanup();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: lora-management, Property 8: Form state updates with LoRA selection
     * Validates: Requirements 4.3
     * 
     * For any LoRA selected from the dropdown, the form state should update to include
     * the selected LoRA's identifier (s3Path)
     */
    it('Property 8: Form state updates with LoRA selection', () => {
      fc.assert(
        fc.property(
          fc.array(loraArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (loras, selectedIndex) => {
            // Ensure we have a valid index
            const index = selectedIndex % loras.length;
            const selectedLora = loras[index];

            const onChange = vi.fn();
            const onManageClick = vi.fn();

            render(
              <LoRASelector
                value=""
                onChange={onChange}
                label="Test LoRA"
                availableLoras={loras}
                onManageClick={onManageClick}
              />
            );

            // Open dropdown - use getAllByText since there might be multiple buttons
            const selectButtons = screen.getAllByText('Select LoRA');
            fireEvent.click(selectButtons[0]);

            // Click on the selected LoRA
            const loraElement = screen.getByText(selectedLora.fileName);
            fireEvent.click(loraElement);

            // Verify onChange was called with the correct s3Path
            expect(onChange).toHaveBeenCalledWith(selectedLora.s3Path);

            // Cleanup for next iteration
            cleanup();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Additional property: Search filtering preserves all matching LoRAs
     * 
     * For any search query, all LoRAs whose name or fileName contains the query
     * should be displayed in the filtered results
     */
    it('Property: Search filtering preserves all matching LoRAs', () => {
      fc.assert(
        fc.property(
          fc.array(loraArbitrary, { minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (loras, searchQuery) => {
            const onChange = vi.fn();
            const onManageClick = vi.fn();

            render(
              <LoRASelector
                value=""
                onChange={onChange}
                label="Test LoRA"
                availableLoras={loras}
                onManageClick={onManageClick}
              />
            );

            // Open dropdown - use getAllByText since there might be multiple buttons
            const selectButtons = screen.getAllByText('Select LoRA');
            fireEvent.click(selectButtons[0]);

            // Enter search query
            const searchInput = screen.getByPlaceholderText('Search LoRAs...');
            fireEvent.change(searchInput, { target: { value: searchQuery } });

            // Calculate expected matches
            const query = searchQuery.toLowerCase();
            const expectedMatches = loras.filter(
              (lora) =>
                lora.name.toLowerCase().includes(query) ||
                lora.fileName.toLowerCase().includes(query)
            );

            // Verify all expected matches are displayed
            for (const lora of expectedMatches) {
              const elements = screen.queryAllByText(lora.fileName);
              expect(elements.length).toBeGreaterThan(0);
            }

            // Verify non-matches are not displayed
            const nonMatches = loras.filter(
              (lora) =>
                !lora.name.toLowerCase().includes(query) &&
                !lora.fileName.toLowerCase().includes(query)
            );
            for (const lora of nonMatches) {
              expect(screen.queryByText(lora.fileName)).not.toBeInTheDocument();
            }

            // Cleanup for next iteration
            cleanup();
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Responsive Behavior Tests

  describe('Responsive Layout', () => {
    it('should apply responsive button layout in selected state', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      // Find the button container
      const buttonContainer = screen.getByText('Change').closest('.flex');
      expect(buttonContainer).toBeInTheDocument();
      
      // Check for responsive flex classes
      expect(buttonContainer?.className).toContain('flex-col');
      expect(buttonContainer?.className).toContain('sm:flex-row');
    });

    it('should apply responsive padding to selected card', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      // Find the card
      const card = screen.getByText('test.safetensors').closest('.group');
      expect(card).toBeInTheDocument();
      
      // Check for responsive padding
      expect(card?.className).toContain('p-3');
      expect(card?.className).toContain('sm:p-4');
    });

    it('should apply responsive layout to empty state', () => {
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[]}
          onManageClick={onManageClick}
        />
      );

      // Find the empty state container - it's the parent div with flex-col
      const emptyStateCard = screen.getByText('No LoRA selected').closest('.rounded-lg');
      expect(emptyStateCard).toBeInTheDocument();
      
      // Find the inner flex container
      const innerFlex = emptyStateCard?.querySelector('.flex');
      expect(innerFlex).toBeInTheDocument();
      
      // Check for responsive flex classes
      expect(innerFlex?.className).toContain('flex-col');
      expect(innerFlex?.className).toContain('sm:flex-row');
      expect(innerFlex?.className).toContain('sm:items-center');
    });

    it('should apply responsive padding to empty state', () => {
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[]}
          onManageClick={onManageClick}
        />
      );

      const emptyStateCard = screen.getByText('No LoRA selected').closest('.rounded-lg');
      expect(emptyStateCard).toBeInTheDocument();
      
      // Check for responsive padding
      expect(emptyStateCard?.className).toContain('p-3');
      expect(emptyStateCard?.className).toContain('sm:p-4');
    });
  });

  describe('Touch Interactions and Hover Effects', () => {
    it('should have hover effects on selected card', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      const card = screen.getByText('test.safetensors').closest('.group');
      expect(card).toBeInTheDocument();
      
      // Check for hover classes
      expect(card?.className).toContain('hover:border-primary/50');
      expect(card?.className).toContain('hover:shadow-sm');
      expect(card?.className).toContain('transition-all');
    });

    it('should have hover effects on buttons', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value={lora.s3Path}
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      const changeButton = screen.getByText('Change');
      expect(changeButton.className).toContain('hover:bg-primary/10');
      expect(changeButton.className).toContain('transition-colors');

      const clearButton = screen.getByText('Clear');
      expect(clearButton.className).toContain('hover:bg-destructive/10');
      expect(clearButton.className).toContain('hover:text-destructive');
    });

    it('should have hover effects on dropdown items', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select LoRA'));

      // Find dropdown item
      const dropdownItem = screen.getByText('test.safetensors').closest('button');
      expect(dropdownItem).toBeInTheDocument();
      
      // Check for hover classes
      expect(dropdownItem?.className).toContain('hover:bg-accent');
      expect(dropdownItem?.className).toContain('transition-colors');
    });

    it('should have animation on dropdown open', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select LoRA'));

      // Find dropdown container
      const dropdown = screen.getByPlaceholderText('Search LoRAs...').closest('.absolute');
      expect(dropdown).toBeInTheDocument();
      
      // Check for animation classes
      expect(dropdown?.className).toContain('animate-in');
      expect(dropdown?.className).toContain('fade-in-0');
      expect(dropdown?.className).toContain('zoom-in-95');
    });

    it('should have full width buttons on mobile in empty state', () => {
      const lora = createMockLoRA({ fileName: 'test.safetensors' });
      const onChange = vi.fn();
      const onManageClick = vi.fn();

      render(
        <LoRASelector
          value=""
          onChange={onChange}
          label="Test LoRA"
          availableLoras={[lora]}
          onManageClick={onManageClick}
        />
      );

      const buttonContainer = screen.getByText('Select LoRA').closest('.flex');
      expect(buttonContainer).toBeInTheDocument();
      
      // Check for responsive width classes
      expect(buttonContainer?.className).toContain('w-full');
      expect(buttonContainer?.className).toContain('sm:w-auto');
    });
  });
});
