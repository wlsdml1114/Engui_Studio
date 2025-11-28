export type ModelInputType = 'text' | 'image' | 'video' | 'audio';
export type ApiType = 'runpod' | 'external';
export type ModelType = 'image' | 'video' | 'audio';

export interface ModelParameter {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    options?: string[];
    default?: any;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
    group?: 'basic' | 'advanced' | 'hidden'; // Default is 'advanced' if not specified
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    type: ModelType;
    inputs: ModelInputType[]; // e.g., ['text', 'image'] means it accepts text AND/OR image

    api: {
        type: ApiType;
        endpoint: string; // Full URL for external, or Endpoint ID for RunPod
        headers?: Record<string, string>;
    };

    // UI Configuration
    capabilities: {
        dimensions?: string[]; // e.g. ['1024x1024', '16:9']
        durations?: number[]; // e.g. [5, 10] (seconds)
    };

    parameters: ModelParameter[];
}

export const MODELS: ModelConfig[] = [
    // --- Video Models ---
    {
        id: 'wan22',
        name: 'Wan 2.2',
        provider: 'Wan',
        type: 'video',
        inputs: ['text', 'image'],
        api: {
            type: 'runpod',
            endpoint: 'wan22'
        },
        capabilities: {},
        parameters: [
            { name: 'width', label: 'Width', type: 'number', default: 768, min: 256, max: 2048, step: 64, group: 'basic' },
            { name: 'height', label: 'Height', type: 'number', default: 512, min: 256, max: 2048, step: 64, group: 'basic' },
            { name: 'negativePrompt', label: 'Negative Prompt', type: 'string', default: '', group: 'advanced' },
            { name: 'seed', label: 'Seed', type: 'number', default: 42, group: 'advanced' },
            { name: 'cfg', label: 'CFG Scale', type: 'number', default: 1.0, min: 1, max: 20, step: 0.1, group: 'hidden' },
            { name: 'steps', label: 'Steps', type: 'number', default: 6, min: 4, max: 50, group: 'hidden' },
        ]
    },
    {
        id: 'wan-animate',
        name: 'Wan Animate',
        provider: 'Wan',
        type: 'video',
        inputs: ['image', 'video', 'text'],
        api: {
            type: 'runpod',
            endpoint: 'wan-animate'
        },
        capabilities: {
            // dimensions removed to allow manual width/height control
        },
        parameters: [
            { name: 'mode', label: 'Mode', type: 'select', options: ['replace', 'animate'], default: 'replace', group: 'basic' },
            { name: 'width', label: 'Width', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic' },
            { name: 'height', label: 'Height', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic' },
            { name: 'steps', label: 'Steps', type: 'number', default: 4, min: 1, max: 50, group: 'advanced' },
            { name: 'cfg', label: 'CFG Scale', type: 'number', default: 1.0, min: 0.1, max: 20, step: 0.1, group: 'advanced' },
            { name: 'seed', label: 'Seed', type: 'number', default: -1, group: 'advanced' },
            { name: 'fps', label: 'FPS', type: 'number', default: 30, group: 'advanced' }
        ]
    },
    {
        id: 'infinite-talk',
        name: 'Infinite Talk',
        provider: 'Infinite Talk',
        type: 'video',
        inputs: ['image', 'video', 'audio'],
        api: {
            type: 'runpod',
            endpoint: 'infinite-talk'
        },
        capabilities: {
            // dimensions removed to allow manual width/height control
        },
        parameters: [
            { name: 'person_count', label: 'Person Count', type: 'select', options: ['single', 'multi'], default: 'single', group: 'basic' },
            { name: 'width', label: 'Width', type: 'number', default: 640, group: 'basic' },
            { name: 'height', label: 'Height', type: 'number', default: 640, group: 'basic' },
            { name: 'audio_start', label: 'Audio Start (s)', type: 'string', default: '', group: 'advanced' },
            { name: 'audio_end', label: 'Audio End (s)', type: 'string', default: '', group: 'advanced' }
        ]
    },
    {
        id: 'google-veo',
        name: 'Veo',
        provider: 'Google',
        type: 'video',
        inputs: ['text'],
        api: {
            type: 'external',
            endpoint: 'https://api.google.com/veo/generate'
        },
        capabilities: {
            dimensions: ['1920x1080', '1080x1920'],
            durations: [6, 24]
        },
        parameters: []
    },
    {
        id: 'kling',
        name: 'Kling',
        provider: 'Kling AI',
        type: 'video',
        inputs: ['text', 'image'],
        api: {
            type: 'external',
            endpoint: 'https://api.kling.ai/v1/videos'
        },
        capabilities: {
            dimensions: ['16:9', '9:16', '1:1'],
            durations: [5, 10]
        },
        parameters: [
            { name: 'mode', label: 'Mode', type: 'select', options: ['Standard', 'Pro'], default: 'Standard', group: 'basic' }
        ]
    },

    // --- Image Models ---
    {
        id: 'flux-krea',
        name: 'Flux Krea',
        provider: 'Krea',
        type: 'image',
        inputs: ['text'],
        api: {
            type: 'runpod',
            endpoint: 'flux-krea'
        },
        capabilities: {
            // dimensions removed to allow manual width/height control
        },
        parameters: [
            { name: 'width', label: 'Width', type: 'number', default: 1024, min: 512, max: 2048, step: 64, group: 'basic' },
            { name: 'height', label: 'Height', type: 'number', default: 1024, min: 512, max: 2048, step: 64, group: 'basic' },
            { name: 'guidance', label: 'Guidance Scale', type: 'number', default: 1.0, min: 1, max: 20, step: 0.1, group: 'hidden' },
            { name: 'seed', label: 'Seed', type: 'number', default: 1234, description: '-1 for random', group: 'advanced' },
            { name: 'lora', label: 'LoRA', type: 'string', default: '', group: 'advanced' },
            { name: 'loraWeight', label: 'LoRA Weight', type: 'number', default: 1.0, min: 0.1, max: 2.0, step: 0.1, group: 'advanced' }
        ]
    },

    // --- Audio Models ---
];

export const getModelsByType = (type: ModelType) => MODELS.filter(m => m.type === type);
export const getModelById = (id: string) => MODELS.find(m => m.id === id);
