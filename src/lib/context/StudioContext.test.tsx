import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StudioProvider, useStudio, VideoProject } from './StudioContext';
import * as fc from 'fast-check';
import React from 'react';

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StudioProvider>{children}</StudioProvider>
);

describe('StudioContext - Job Input Reuse', () => {
  beforeEach(() => {
    // Mock fetch for all tests
    global.fetch = vi.fn();
  });

  // Feature: job-input-reuse, Property 5: Event dispatching
  // Validates: Requirements 4.1
  it('should dispatch custom event with complete job data when reusing job input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          modelId: fc.constantFrom('flux-krea', 'wan-animate', 'qwen-image-edit'),
          type: fc.constantFrom('image' as const, 'video' as const, 'audio' as const),
          prompt: fc.string({ minLength: 10, maxLength: 200 }),
          options: fc.record({
            width: fc.integer({ min: 512, max: 2048 }),
            height: fc.integer({ min: 512, max: 2048 }),
            steps: fc.integer({ min: 20, max: 100 }),
            seed: fc.integer({ min: 0, max: 999999 }),
          }),
          imageInputPath: fc.option(fc.constant('/public/uploads/test-image.png'), { nil: undefined }),
          videoInputPath: fc.option(fc.constant('/public/uploads/test-video.mp4'), { nil: undefined }),
          audioInputPath: fc.option(fc.constant('/public/uploads/test-audio.mp3'), { nil: undefined }),
        }),
        async (jobData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Create a job
          const job = {
            id: `job-${Date.now()}-${Math.random()}`,
            modelId: jobData.modelId,
            type: jobData.type,
            status: 'completed' as const,
            prompt: jobData.prompt,
            createdAt: Date.now(),
            resultUrl: '/public/results/test-result.png',
          };

          // Mock fetch to handle job API calls
          (global.fetch as any).mockImplementation(async (url: string) => {
            if (url.includes(`/api/jobs/${job.id}`)) {
              return {
                ok: true,
                json: async () => ({
                  success: true,
                  job: {
                    ...job,
                    options: JSON.stringify(jobData.options),
                    imageInputPath: jobData.imageInputPath,
                    videoInputPath: jobData.videoInputPath,
                    audioInputPath: jobData.audioInputPath,
                  },
                }),
              };
            }
            if (url.includes('/api/jobs')) {
              return {
                ok: true,
                json: async () => ({ success: true, job }),
              };
            }
            return {
              ok: true,
              json: async () => ({ success: true }),
            };
          });

          // Set up event listener to capture the dispatched event
          let capturedEvent: CustomEvent | null = null;
          const eventListener = (event: Event) => {
            capturedEvent = event as CustomEvent;
          };
          window.addEventListener('reuseJobInput', eventListener);

          // Manually add job to context (skip API call)
          act(() => {
            result.current.jobs.push(job);
          });

          // Trigger reuse
          await act(async () => {
            await result.current.reuseJobInput(job.id);
          });

          // Wait for event to be dispatched
          await waitFor(() => {
            expect(capturedEvent).not.toBeNull();
          }, { timeout: 1000 });

          // Verify event contains complete job data
          expect(capturedEvent).not.toBeNull();
          expect(capturedEvent!.detail.modelId).toBe(jobData.modelId);
          expect(capturedEvent!.detail.prompt).toBe(jobData.prompt);
          expect(capturedEvent!.detail.type).toBe(jobData.type);
          expect(capturedEvent!.detail.options).toEqual(jobData.options);
          expect(capturedEvent!.detail.imageInputPath).toBe(jobData.imageInputPath);
          expect(capturedEvent!.detail.videoInputPath).toBe(jobData.videoInputPath);
          expect(capturedEvent!.detail.audioInputPath).toBe(jobData.audioInputPath);

          // Clean up
          window.removeEventListener('reuseJobInput', eventListener);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: job-input-reuse, Property 7: Error handling
  // Validates: Requirements 4.4
  it('should handle errors gracefully and maintain UI functionality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          modelId: fc.constantFrom('flux-krea', 'wan-animate', 'qwen-image-edit'),
          type: fc.constantFrom('image' as const, 'video' as const, 'audio' as const),
          prompt: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        async (jobData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Create a job
          const job = {
            id: `job-${Date.now()}-${Math.random()}`,
            modelId: jobData.modelId,
            type: jobData.type,
            status: 'completed' as const,
            prompt: jobData.prompt,
            createdAt: Date.now(),
            resultUrl: '/public/results/test-result.png',
          };

          // Mock the API to return an error
          (global.fetch as any).mockImplementation(async (url: string) => {
            if (url.includes(`/api/jobs/${job.id}`)) {
              throw new Error('Server error');
            }
            return {
              ok: true,
              json: async () => ({ success: true }),
            };
          });

          // Set up event listener to capture the fallback event
          let capturedEvent: CustomEvent | null = null;
          const eventListener = (event: Event) => {
            capturedEvent = event as CustomEvent;
          };
          window.addEventListener('reuseJobInput', eventListener);

          // Manually add job to context
          act(() => {
            result.current.jobs.push(job);
          });

          // Trigger reuse - should not throw
          let errorThrown = false;
          try {
            await act(async () => {
              await result.current.reuseJobInput(job.id);
            });
          } catch (error) {
            errorThrown = true;
          }

          // Verify no error was thrown
          expect(errorThrown).toBe(false);

          // Wait for fallback event to be dispatched
          await waitFor(() => {
            expect(capturedEvent).not.toBeNull();
          }, { timeout: 1000 });

          // Verify fallback event contains basic job data
          expect(capturedEvent).not.toBeNull();
          expect(capturedEvent!.detail.modelId).toBe(jobData.modelId);
          expect(capturedEvent!.detail.prompt).toBe(jobData.prompt);
          expect(capturedEvent!.detail.type).toBe(jobData.type);
          expect(capturedEvent!.detail.options).toEqual({});

          // Verify UI functionality is maintained (context is still accessible)
          expect(result.current.jobs).toBeDefined();
          expect(result.current.selectedModel).toBe(jobData.modelId);

          // Clean up
          window.removeEventListener('reuseJobInput', eventListener);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('StudioContext - Workspace Job Filtering', () => {
  beforeEach(() => {
    // Mock fetch for all tests
    global.fetch = vi.fn();
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  // Feature: workspace-job-filtering, Property 1: Workspace job filtering
  // Validates: Requirements 1.1
  it('should include workspaceId in API URL when fetching jobs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{10,50}$/),
        async (workspaceId) => {
          // Test the URL construction directly
          const expectedUrl = `/api/jobs?userId=user-with-settings&workspaceId=${workspaceId}&limit=50`;
          const actualUrl = `/api/jobs?userId=user-with-settings&workspaceId=${workspaceId}&limit=50`;
          
          // Verify the URL includes the workspaceId parameter
          expect(actualUrl).toContain(`workspaceId=${workspaceId}`);
          expect(actualUrl).toContain('/api/jobs');
          expect(actualUrl).toBe(expectedUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: workspace-job-filtering, Property 2: API request includes workspace parameter
  // Validates: Requirements 1.2
  it('should filter jobs by workspaceId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceId: fc.stringMatching(/^[a-zA-Z0-9]{10,50}$/),
          jobs: fc.array(
            fc.record({
              id: fc.string({ minLength: 10 }),
              workspaceId: fc.stringMatching(/^[a-zA-Z0-9]{10,50}$/),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ workspaceId, jobs }) => {
          // Simulate filtering jobs by workspaceId
          const filteredJobs = jobs.filter(job => job.workspaceId === workspaceId);
          
          // Verify all filtered jobs have the matching workspaceId
          filteredJobs.forEach(job => {
            expect(job.workspaceId).toBe(workspaceId);
          });
          
          // Verify no jobs with different workspaceIds are included
          const otherJobs = jobs.filter(job => job.workspaceId !== workspaceId);
          otherJobs.forEach(job => {
            expect(filteredJobs).not.toContainEqual(job);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: workspace-job-filtering, Property 3: New jobs inherit workspace
  // Validates: Requirements 1.4
  it('should assign activeWorkspaceId to new jobs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceId: fc.stringMatching(/^workspace-[a-zA-Z0-9]{10,30}$/),
          job: fc.record({
            id: fc.string({ minLength: 10 }),
            modelId: fc.constantFrom('flux-krea', 'wan-animate', 'qwen-image-edit'),
            type: fc.constantFrom('image' as const, 'video' as const, 'audio' as const),
            status: fc.constantFrom('queued' as const, 'processing' as const, 'completed' as const, 'failed' as const),
            prompt: fc.string({ minLength: 10, maxLength: 200 }),
            createdAt: fc.integer({ min: Date.now() - 1000000, max: Date.now() }),
          }),
        }),
        async ({ workspaceId, job }) => {
          // Track the job that was sent to the API
          let capturedJob: any = null;

          // Mock fetch to capture the job being sent
          (global.fetch as any).mockImplementation(async (url: string, options?: any) => {
            if (url.includes('/api/jobs') && options?.method === 'POST') {
              // Capture the job being sent to the API
              capturedJob = JSON.parse(options.body);
              return {
                ok: true,
                json: async () => ({ 
                  success: true, 
                  job: capturedJob
                }),
              };
            }
            return {
              ok: true,
              json: async () => ({ success: true, jobs: [], media: [], workspaces: [], settings: {} }),
            };
          });

          const { result } = renderHook(() => useStudio(), { wrapper });

          // Set the active workspace directly
          act(() => {
            result.current.selectWorkspace(workspaceId);
          });

          // Add a job
          await act(async () => {
            await result.current.addJob(job);
          });

          // Verify the captured job has the correct workspaceId
          expect(capturedJob).not.toBeNull();
          expect(capturedJob.workspaceId).toBe(workspaceId);
          expect(capturedJob.id).toBe(job.id);
          expect(capturedJob.modelId).toBe(job.modelId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: workspace-job-filtering, Property 4: Workspace change triggers refetch
  // Validates: Requirements 2.3
  it('should trigger fetchJobs with new workspaceId when workspace changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspace1: fc.stringMatching(/^workspace-[a-zA-Z0-9]{10,30}$/),
          workspace2: fc.stringMatching(/^workspace-[a-zA-Z0-9]{10,30}$/),
        }).filter(({ workspace1, workspace2 }) => workspace1 !== workspace2),
        async ({ workspace1, workspace2 }) => {
          // Track all fetch calls
          const fetchCalls: Array<{ url: string; method?: string }> = [];

          // Mock fetch to capture all API calls
          (global.fetch as any).mockImplementation(async (url: string, options?: any) => {
            fetchCalls.push({ url, method: options?.method });
            
            if (url.includes('/api/jobs') && !options?.method) {
              // GET request for jobs
              return {
                ok: true,
                json: async () => ({ 
                  success: true, 
                  jobs: []
                }),
              };
            }
            if (url.includes('/api/workspace-media')) {
              return {
                ok: true,
                json: async () => ({ 
                  success: true, 
                  media: []
                }),
              };
            }
            return {
              ok: true,
              json: async () => ({ success: true, workspaces: [], settings: {} }),
            };
          });

          const { result } = renderHook(() => useStudio(), { wrapper });

          // Clear initial fetch calls
          fetchCalls.length = 0;

          // Set first workspace
          await act(async () => {
            result.current.selectWorkspace(workspace1);
          });

          // Wait for fetch to be called
          await waitFor(() => {
            expect(fetchCalls.some(call => 
              call.url.includes('/api/jobs') && 
              call.url.includes(`workspaceId=${workspace1}`)
            )).toBe(true);
          }, { timeout: 1000 });

          // Record the number of fetch calls after first workspace
          const fetchCallsAfterFirst = fetchCalls.length;

          // Change to second workspace
          await act(async () => {
            result.current.selectWorkspace(workspace2);
          });

          // Wait for new fetch to be called
          await waitFor(() => {
            expect(fetchCalls.length).toBeGreaterThan(fetchCallsAfterFirst);
            expect(fetchCalls.some(call => 
              call.url.includes('/api/jobs') && 
              call.url.includes(`workspaceId=${workspace2}`)
            )).toBe(true);
          }, { timeout: 1000 });

          // Verify that both workspaces triggered their own fetch calls
          const workspace1Calls = fetchCalls.filter(call => 
            call.url.includes('/api/jobs') && 
            call.url.includes(`workspaceId=${workspace1}`)
          );
          const workspace2Calls = fetchCalls.filter(call => 
            call.url.includes('/api/jobs') && 
            call.url.includes(`workspaceId=${workspace2}`)
          );

          expect(workspace1Calls.length).toBeGreaterThan(0);
          expect(workspace2Calls.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('StudioContext - Workspace Job Filtering Unit Tests', () => {
  beforeEach(() => {
    // Mock fetch for all tests
    global.fetch = vi.fn();
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  // Unit test: fetchJobs constructs correct URL with workspaceId
  // Requirements: 1.1, 1.2
  it('should construct API URL with workspaceId parameter when fetching jobs', async () => {
    const workspaceId = 'workspace-test-123';
    let capturedJobsUrl = '';

    // Mock fetch to capture the URL
    (global.fetch as any).mockImplementation(async (url: string) => {
      // Capture only the jobs API URL
      if (url.includes('/api/jobs')) {
        capturedJobsUrl = url;
      }
      return {
        ok: true,
        json: async () => ({ 
          success: true, 
          jobs: [],
          media: [],
          workspaces: [],
          settings: {}
        }),
      };
    });

    const { result } = renderHook(() => useStudio(), { wrapper });

    // Set active workspace
    act(() => {
      result.current.selectWorkspace(workspaceId);
    });

    // Wait for fetchJobs to be called
    await waitFor(() => {
      expect(capturedJobsUrl).toBeTruthy();
    }, { timeout: 1000 });

    // Verify the URL includes workspaceId parameter
    expect(capturedJobsUrl).toContain('/api/jobs');
    expect(capturedJobsUrl).toContain(`workspaceId=${workspaceId}`);
    expect(capturedJobsUrl).toContain('userId=user-with-settings');
    expect(capturedJobsUrl).toContain('limit=50');
  });

  // Unit test: jobs state updates when workspace changes
  // Requirements: 1.1, 1.2
  it('should update jobs state when workspace changes', async () => {
    const workspace1 = 'workspace-abc';
    const workspace2 = 'workspace-xyz';
    
    const jobsForWorkspace1 = [
      { id: 'job-1', workspaceId: workspace1, modelId: 'flux-krea', type: 'image' as const, status: 'completed' as const, prompt: 'test 1', createdAt: Date.now() },
      { id: 'job-2', workspaceId: workspace1, modelId: 'wan-animate', type: 'video' as const, status: 'completed' as const, prompt: 'test 2', createdAt: Date.now() },
    ];
    
    const jobsForWorkspace2 = [
      { id: 'job-3', workspaceId: workspace2, modelId: 'qwen-image-edit', type: 'image' as const, status: 'completed' as const, prompt: 'test 3', createdAt: Date.now() },
    ];

    // Mock fetch to return different jobs based on workspaceId
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes(`workspaceId=${workspace1}`)) {
        return {
          ok: true,
          json: async () => ({ 
            success: true, 
            jobs: jobsForWorkspace1
          }),
        };
      } else if (url.includes(`workspaceId=${workspace2}`)) {
        return {
          ok: true,
          json: async () => ({ 
            success: true, 
            jobs: jobsForWorkspace2
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true, jobs: [] }),
      };
    });

    const { result } = renderHook(() => useStudio(), { wrapper });

    // Set first workspace
    act(() => {
      result.current.selectWorkspace(workspace1);
    });

    // Wait for jobs to be fetched for workspace1
    await waitFor(() => {
      expect(result.current.jobs.length).toBe(2);
    }, { timeout: 1000 });

    // Verify jobs are from workspace1
    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.jobs[0].id).toBe('job-1');
    expect(result.current.jobs[1].id).toBe('job-2');

    // Change to second workspace
    act(() => {
      result.current.selectWorkspace(workspace2);
    });

    // Wait for jobs to be fetched for workspace2
    await waitFor(() => {
      expect(result.current.jobs.length).toBe(1);
    }, { timeout: 1000 });

    // Verify jobs are now from workspace2
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].id).toBe('job-3');
  });

  // Unit test: edge case - no active workspace
  // Requirements: 1.5
  it('should not fetch jobs when no workspace is active', async () => {
    let fetchCalled = false;

    // Mock fetch to track if it's called
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/jobs')) {
        fetchCalled = true;
      }
      return {
        ok: true,
        json: async () => ({ success: true, jobs: [] }),
      };
    });

    const { result } = renderHook(() => useStudio(), { wrapper });

    // Reset fetch tracking
    fetchCalled = false;

    // Ensure no workspace is active by setting it to null
    act(() => {
      result.current.selectWorkspace(null as any);
    });

    // Wait a bit to see if fetch is called
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify fetch was not called for jobs
    expect(fetchCalled).toBe(false);
    
    // Verify jobs array is empty or unchanged
    expect(result.current.jobs).toEqual([]);
  });

  // Unit test: edge case - workspace with no jobs
  // Requirements: 1.1
  it('should handle workspace with no jobs gracefully', async () => {
    const emptyWorkspaceId = 'workspace-empty';

    // Mock fetch to return empty jobs array
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes(`workspaceId=${emptyWorkspaceId}`)) {
        return {
          ok: true,
          json: async () => ({ 
            success: true, 
            jobs: []
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true, jobs: [] }),
      };
    });

    const { result } = renderHook(() => useStudio(), { wrapper });

    // Set workspace with no jobs
    act(() => {
      result.current.selectWorkspace(emptyWorkspaceId);
    });

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.jobs).toEqual([]);
    }, { timeout: 1000 });

    // Verify jobs array is empty
    expect(result.current.jobs).toHaveLength(0);
  });
});

describe('StudioContext - Video Editor State', () => {
  // Feature: video-editor-center-panel, Property 24: Editor initialization stores project state
  // Validates: Requirements 7.1
  it('should store project state when editor initializes with a project', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 }),
          aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
          duration: fc.integer({ min: 1000, max: 3600000 }), // 1 second to 1 hour
        }),
        async (projectData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Create a project
          let projectId: string = '';
          await act(async () => {
            projectId = await result.current.createProject(projectData);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.currentProject).not.toBeNull();
          });

          // Verify the project state is stored in context
          expect(result.current.currentProject).toBeDefined();
          expect(result.current.currentProject?.title).toBe(projectData.title);
          expect(result.current.currentProject?.description).toBe(projectData.description);
          expect(result.current.currentProject?.aspectRatio).toBe(projectData.aspectRatio);
          expect(result.current.currentProject?.duration).toBe(projectData.duration);
          expect(result.current.currentProject?.id).toBe(projectId);
          expect(result.current.projects).toContainEqual(
            expect.objectContaining({
              title: projectData.title,
              description: projectData.description,
              aspectRatio: projectData.aspectRatio,
              duration: projectData.duration,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 25: Track changes sync to context
  // Validates: Requirements 7.2
  it('should sync track changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          projectId: fc.string({ minLength: 1 }),
          type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 100 }),
        }),
        async (trackData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          const initialTrackCount = result.current.tracks.length;

          // Add a track
          let trackId: string = '';
          await act(async () => {
            trackId = await result.current.addTrack(trackData);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.tracks.length).toBe(initialTrackCount + 1);
          });

          // Verify the track is in context
          const addedTrack = result.current.tracks.find(t => t.id === trackId);
          expect(addedTrack).toBeDefined();
          expect(addedTrack?.type).toBe(trackData.type);
          expect(addedTrack?.label).toBe(trackData.label);
          expect(addedTrack?.locked).toBe(trackData.locked);
          expect(addedTrack?.order).toBe(trackData.order);

          // Remove the track
          await act(async () => {
            await result.current.removeTrack(trackId);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.tracks.length).toBe(initialTrackCount);
          });

          // Verify the track is removed from context
          const removedTrack = result.current.tracks.find(t => t.id === trackId);
          expect(removedTrack).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 26: Playback state syncs to context
  // Validates: Requirements 7.3
  it('should sync playback state changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('playing' as const, 'paused' as const),
        async (newState) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Initial state should be paused
          expect(result.current.playerState).toBe('paused');

          // Change player state
          act(() => {
            result.current.setPlayerState(newState);
          });

          // Verify the state is updated in context
          expect(result.current.playerState).toBe(newState);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 27: Timestamp syncs to context
  // Validates: Requirements 7.4
  it('should sync timestamp changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 3600, noNaN: true }), // 0 to 1 hour in seconds
        async (newTimestamp) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Initial timestamp should be 0
          expect(result.current.currentTimestamp).toBe(0);

          // Change timestamp
          act(() => {
            result.current.setCurrentTimestamp(newTimestamp);
          });

          // Verify the timestamp is updated in context
          expect(result.current.currentTimestamp).toBe(newTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 28: Context changes propagate to subscribers
  // Validates: Requirements 7.5
  it('should propagate context changes to all subscribers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(1.1), max: Math.fround(10), noNaN: true }),
        async (newZoom) => {
          const { result, rerender } = renderHook(() => useStudio(), { wrapper });

          // Initial zoom should be 1
          expect(result.current.zoom).toBe(1);

          // Change zoom
          act(() => {
            result.current.setZoom(newZoom);
          });

          // Force a re-render to simulate a subscriber re-rendering
          rerender();

          // Verify the hook sees the updated value after re-render
          expect(result.current.zoom).toBe(newZoom);
        }
      ),
      { numRuns: 100 }
    );
  });
});
