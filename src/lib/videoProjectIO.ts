/**
 * Video Project Import/Export utilities
 * Handles saving and loading video projects as JSON files
 */

import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';

export interface VideoProjectData {
  version: string;
  exportedAt: string;
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
}

/**
 * Export project data to JSON format
 */
export function exportProjectToJSON(
  project: VideoProject,
  tracks: VideoTrack[],
  keyframes: Record<string, VideoKeyFrame[]>
): VideoProjectData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project,
    tracks,
    keyframes,
  };
}

/**
 * Download project as JSON file
 */
export function downloadProjectAsJSON(
  project: VideoProject,
  tracks: VideoTrack[],
  keyframes: Record<string, VideoKeyFrame[]>
): void {
  const data = exportProjectToJSON(project, tracks, keyframes);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported project data
 */
export function validateProjectData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const projectData = data as Record<string, unknown>;
  
  if (!projectData.version || typeof projectData.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version' };
  }
  
  if (!projectData.project || typeof projectData.project !== 'object') {
    return { valid: false, error: 'Missing or invalid project data' };
  }
  
  const project = projectData.project as Record<string, unknown>;
  if (!project.title || !project.aspectRatio || !project.duration) {
    return { valid: false, error: 'Project missing required fields (title, aspectRatio, duration)' };
  }
  
  if (!Array.isArray(projectData.tracks)) {
    return { valid: false, error: 'Missing or invalid tracks data' };
  }
  
  if (!projectData.keyframes || typeof projectData.keyframes !== 'object') {
    return { valid: false, error: 'Missing or invalid keyframes data' };
  }
  
  return { valid: true };
}

/**
 * Parse imported JSON file
 */
export async function parseProjectFile(file: File): Promise<VideoProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const validation = validateProjectData(data);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }
        
        resolve(data as VideoProjectData);
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Create a new empty project
 */
export function createEmptyProject(title?: string): {
  project: Omit<VideoProject, 'id' | 'createdAt' | 'updatedAt'>;
  tracks: Omit<VideoTrack, 'id'>[];
} {
  const projectTitle = title || `Project ${new Date().toLocaleDateString()}`;
  
  return {
    project: {
      title: projectTitle,
      description: '',
      aspectRatio: '16:9',
      qualityPreset: '1080p',
      width: 1920,
      height: 1080,
      duration: 30000, // 30 seconds default
    },
    tracks: [
      { projectId: '', type: 'video', label: 'Video Track', locked: false, order: 0, volume: 100, muted: false },
      { projectId: '', type: 'music', label: 'Music Track', locked: false, order: 1, volume: 100, muted: false },
      { projectId: '', type: 'voiceover', label: 'Voiceover Track', locked: false, order: 2, volume: 100, muted: false },
    ],
  };
}
