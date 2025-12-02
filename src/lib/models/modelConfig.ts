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
    // Conditional visibility - parameter shown only when dependent parameter has specified value
    dependsOn?: {
        parameter: string;
        value: any;
    };
    // Validation rules
    validation?: {
        multipleOf?: number;  // e.g., 64 for dimensions
        required?: boolean;
    };
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
    
    // Input field names for API payload
    imageInputKey?: string; // Key name for image input in API payload (default: 'image')
    videoInputKey?: string; // Key name for video input in API payload (default: 'video')
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
            { name: 'mode', label: 'Mode', type: 'select', options: ['replace', 'animate'], default: 'replace', group: 'hidden' },
            { name: 'width', label: 'Width', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic', validation: { multipleOf: 64 } },
            { name: 'height', label: 'Height', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic', validation: { multipleOf: 64 } },
            { name: 'steps', label: 'Steps', type: 'number', default: 4, min: 1, max: 50, group: 'advanced' },
            { name: 'cfg', label: 'CFG Scale', type: 'number', default: 1.0, min: 0.1, max: 20, step: 0.1, group: 'advanced' },
            { name: 'seed', label: 'Seed', type: 'number', default: 42, group: 'advanced' },
            { name: 'fps', label: 'FPS', type: 'number', default: 30, min: 1, max: 60, group: 'advanced' },
            { name: 'points_store', label: 'Points Store', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } },
            { name: 'coordinates', label: 'Coordinates', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } },
            { name: 'neg_coordinates', label: 'Negative Coordinates', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } }
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
            { name: 'input_type', label: 'Input Type', type: 'select', options: ['image', 'video'], default: 'image', group: 'basic' },
            { name: 'person_count', label: 'Person Count', type: 'select', options: ['single', 'multi'], default: 'single', group: 'basic' },
            { name: 'width', label: 'Width', type: 'number', default: 640, min: 64, max: 2048, step: 64, group: 'basic' },
            { name: 'height', label: 'Height', type: 'number', default: 640, min: 64, max: 2048, step: 64, group: 'basic' },
            { name: 'audio_start', label: 'Audio Start (s)', type: 'string', default: '', group: 'advanced' },
            { name: 'audio_end', label: 'Audio End (s)', type: 'string', default: '', group: 'advanced' },
            { name: 'audio2_start', label: 'Audio 2 Start (s)', type: 'string', default: '', group: 'advanced', dependsOn: { parameter: 'person_count', value: 'multi' } },
            { name: 'audio2_end', label: 'Audio 2 End (s)', type: 'string', default: '', group: 'advanced', dependsOn: { parameter: 'person_count', value: 'multi' } }
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
        provider: 'Flux',
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
    {
        id: 'qwen-image-edit',
        name: 'Qwen Image Edit',
        provider: 'Qwen',
        type: 'image',
        inputs: ['text', 'image'],
        api: {
            type: 'runpod',
            endpoint: 'qwen-image-edit'
        },
        capabilities: {},
        imageInputKey: 'image_base64', // Qwen expects base64 image with this key name
        parameters: [
            { name: 'width', label: 'Width', type: 'number', default: 512, min: 256, max: 1920, step: 64, group: 'basic', validation: { multipleOf: 64 } },
            { name: 'height', label: 'Height', type: 'number', default: 512, min: 256, max: 1920, step: 64, group: 'basic', validation: { multipleOf: 64 } },
            { name: 'seed', label: 'Seed', type: 'number', default: 42, group: 'advanced', description: '-1 for random' },
            { name: 'steps', label: 'Steps', type: 'number', default: 4, min: 1, max: 50, group: 'advanced' },
            { name: 'guidance', label: 'Guidance Scale', type: 'number', default: 1, min: 1, max: 20, step: 0.5, group: 'advanced' }
        ]
    },

    // --- Audio Models ---
];

export const getModelsByType = (type: ModelType) => MODELS.filter(m => m.type === type);
export const getModelById = (id: string) => MODELS.find(m => m.id === id);

// Validation types and functions
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a parameter value against its constraints.
 * Handles range validation (min/max), select validation (options), and multipleOf validation.
 */
export function validateParameter(param: ModelParameter, value: any): ValidationResult {
    // Handle null/undefined values
    if (value === null || value === undefined) {
        if (param.validation?.required) {
            return { valid: false, error: `Required parameter '${param.name}' is missing` };
        }
        return { valid: true };
    }

    // Range validation for number types
    if (param.type === 'number') {
        if (typeof value !== 'number' || isNaN(value)) {
            return { valid: false, error: `Value for '${param.name}' must be a number` };
        }

        // Min/max validation
        if (param.min !== undefined && value < param.min) {
            return { 
                valid: false, 
                error: `Value ${value} is outside the allowed range [${param.min}, ${param.max ?? '∞'}]` 
            };
        }
        if (param.max !== undefined && value > param.max) {
            return { 
                valid: false, 
                error: `Value ${value} is outside the allowed range [${param.min ?? '-∞'}, ${param.max}]` 
            };
        }

        // MultipleOf validation
        if (param.validation?.multipleOf !== undefined) {
            if (value % param.validation.multipleOf !== 0) {
                return { 
                    valid: false, 
                    error: `Value ${value} must be a multiple of ${param.validation.multipleOf}` 
                };
            }
        }
    }

    // Select validation
    if (param.type === 'select' && param.options) {
        if (!param.options.includes(value)) {
            return { 
                valid: false, 
                error: `Value '${value}' is not a valid option. Valid options: ${param.options.join(', ')}` 
            };
        }
    }

    return { valid: true };
}

/**
 * Validates all inputs for a model.
 * Returns an array of ValidationResult for all parameters.
 */
export function validateModelInputs(
    modelId: string, 
    inputs: Record<string, any>
): ValidationResult[] {
    const model = getModelById(modelId);
    if (!model) {
        return [{ valid: false, error: `Model '${modelId}' not found in configuration` }];
    }

    return model.parameters.map(param => {
        const value = inputs[param.name];
        const result = validateParameter(param, value);
        return result;
    });
}

/**
 * Returns visible parameters based on current values and dependsOn conditions.
 */
export function getVisibleParameters(
    modelId: string,
    currentValues: Record<string, any>
): ModelParameter[] {
    const model = getModelById(modelId);
    if (!model) {
        return [];
    }

    return model.parameters.filter(param => {
        // If no dependsOn, always visible
        if (!param.dependsOn) {
            return true;
        }

        // Check if dependent parameter's value matches
        const dependentValue = currentValues[param.dependsOn.parameter];
        return dependentValue === param.dependsOn.value;
    });
}
