import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ModelParameter,
  ModelConfig,
  validateParameter,
  validateModelInputs,
  getVisibleParameters,
  MODELS,
  getModelById,
} from './modelConfig';

/**
 * **Feature: model-config-completion, Property 1: Model Configuration Completeness**
 * *For any* model ID in the MODELS array, the configuration SHALL contain all required
 * fields (id, name, provider, type, inputs, api, parameters) and each parameter SHALL
 * have at minimum (name, label, type, default).
 * **Validates: Requirements 1.1, 2.1, 3.1**
 */
describe('Property 1: Model Configuration Completeness', () => {
  // Required fields for ModelConfig
  const requiredModelFields = ['id', 'name', 'provider', 'type', 'inputs', 'api', 'parameters'] as const;
  // Required fields for each parameter (default is optional for some types)
  const requiredParamFields = ['name', 'label', 'type'] as const;

  it('all models have required configuration fields', () => {
    fc.assert(
      fc.property(
        // Generate an index to select a model from MODELS array
        fc.integer({ min: 0, max: MODELS.length - 1 }),
        (modelIndex) => {
          const model = MODELS[modelIndex];
          
          // Check all required model fields exist
          for (const field of requiredModelFields) {
            if (model[field] === undefined || model[field] === null) {
              return false;
            }
          }
          
          // Check api has required subfields
          if (!model.api.type || !model.api.endpoint) {
            return false;
          }
          
          // Check inputs is a non-empty array
          if (!Array.isArray(model.inputs) || model.inputs.length === 0) {
            return false;
          }
          
          // Check parameters is an array
          if (!Array.isArray(model.parameters)) {
            return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all parameters have required fields (name, label, type)', () => {
    fc.assert(
      fc.property(
        // Generate an index to select a model from MODELS array
        fc.integer({ min: 0, max: MODELS.length - 1 }),
        (modelIndex) => {
          const model = MODELS[modelIndex];
          
          // Check each parameter has required fields
          for (const param of model.parameters) {
            for (const field of requiredParamFields) {
              if (param[field] === undefined || param[field] === null || param[field] === '') {
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all parameters have a default value defined', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MODELS.length - 1 }),
        (modelIndex) => {
          const model = MODELS[modelIndex];
          
          for (const param of model.parameters) {
            // Default should be defined (can be empty string, 0, false, etc.)
            if (param.default === undefined) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Specific tests for the three models mentioned in requirements
  it('Qwen Image Edit model has complete configuration (Requirement 1.1)', () => {
    const model = getModelById('qwen-image-edit');
    expect(model).toBeDefined();
    
    // Check required fields
    expect(model!.id).toBe('qwen-image-edit');
    expect(model!.name).toBe('Qwen Image Edit');
    expect(model!.provider).toBe('Qwen');
    expect(model!.type).toBe('image');
    expect(model!.inputs).toContain('text');
    expect(model!.inputs).toContain('image');
    expect(model!.api.type).toBe('runpod');
    expect(model!.api.endpoint).toBe('qwen-image-edit');
    
    // Check parameters exist
    const paramNames = model!.parameters.map(p => p.name);
    expect(paramNames).toContain('width');
    expect(paramNames).toContain('height');
    expect(paramNames).toContain('seed');
    expect(paramNames).toContain('steps');
    expect(paramNames).toContain('guidance');
  });

  it('Infinite Talk model has complete configuration (Requirement 2.1)', () => {
    const model = getModelById('infinite-talk');
    expect(model).toBeDefined();
    
    // Check required fields
    expect(model!.id).toBe('infinite-talk');
    expect(model!.name).toBe('Infinite Talk');
    expect(model!.provider).toBe('MeiGen');
    expect(model!.type).toBe('video');
    expect(model!.inputs).toContain('image');
    expect(model!.inputs).toContain('video');
    expect(model!.inputs).toContain('audio');
    expect(model!.api.type).toBe('runpod');
    expect(model!.api.endpoint).toBe('infinite-talk');
    
    // Check parameters exist
    const paramNames = model!.parameters.map(p => p.name);
    expect(paramNames).toContain('input_type');
    expect(paramNames).toContain('person_count');
    expect(paramNames).toContain('width');
    expect(paramNames).toContain('height');
    expect(paramNames).toContain('audio_start');
    expect(paramNames).toContain('audio_end');
    expect(paramNames).toContain('audio2_start');
    expect(paramNames).toContain('audio2_end');
  });

  it('WAN Animate model has complete configuration (Requirement 3.1)', () => {
    const model = getModelById('wan-animate');
    expect(model).toBeDefined();
    
    // Check required fields
    expect(model!.id).toBe('wan-animate');
    expect(model!.name).toBe('Wan Animate');
    expect(model!.provider).toBe('Wan');
    expect(model!.type).toBe('video');
    expect(model!.inputs).toContain('image');
    expect(model!.inputs).toContain('video');
    expect(model!.inputs).toContain('text');
    expect(model!.api.type).toBe('runpod');
    expect(model!.api.endpoint).toBe('wan-animate');
    
    // Check parameters exist
    const paramNames = model!.parameters.map(p => p.name);
    expect(paramNames).toContain('mode');
    expect(paramNames).toContain('width');
    expect(paramNames).toContain('height');
    expect(paramNames).toContain('steps');
    expect(paramNames).toContain('cfg');
    expect(paramNames).toContain('seed');
    expect(paramNames).toContain('fps');
    expect(paramNames).toContain('points_store');
    expect(paramNames).toContain('coordinates');
    expect(paramNames).toContain('neg_coordinates');
  });
});

/**
 * **Feature: model-config-completion, Property 2: Parameter Group Assignment Validity**
 * *For any* parameter in any model configuration, the group field SHALL be one of
 * 'basic', 'advanced', or 'hidden', and if not specified, SHALL default to 'advanced'.
 * **Validates: Requirements 1.3, 2.3, 3.3**
 */
describe('Property 2: Parameter Group Assignment Validity', () => {
  const validGroups = ['basic', 'advanced', 'hidden'] as const;

  it('all parameters have valid group values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MODELS.length - 1 }),
        (modelIndex) => {
          const model = MODELS[modelIndex];
          
          for (const param of model.parameters) {
            // If group is specified, it must be one of the valid values
            if (param.group !== undefined) {
              if (!validGroups.includes(param.group)) {
                return false;
              }
            }
            // If group is not specified, it defaults to 'advanced' (this is handled by consumers)
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all parameters across all models have explicit group assignments', () => {
    // This test verifies that all parameters have explicit group assignments
    // as per the design document requirements
    for (const model of MODELS) {
      for (const param of model.parameters) {
        expect(param.group).toBeDefined();
        expect(validGroups).toContain(param.group);
      }
    }
  });

  // Specific tests for parameter grouping in the three models
  it('Qwen Image Edit parameters are grouped correctly (Requirement 1.3)', () => {
    const model = getModelById('qwen-image-edit');
    expect(model).toBeDefined();
    
    const basicParams = model!.parameters.filter(p => p.group === 'basic').map(p => p.name);
    const advancedParams = model!.parameters.filter(p => p.group === 'advanced').map(p => p.name);
    
    // Basic: width, height
    expect(basicParams).toContain('width');
    expect(basicParams).toContain('height');
    
    // Advanced: seed, steps, guidance
    expect(advancedParams).toContain('seed');
    expect(advancedParams).toContain('steps');
    expect(advancedParams).toContain('guidance');
  });

  it('Infinite Talk parameters are grouped correctly (Requirement 2.3)', () => {
    const model = getModelById('infinite-talk');
    expect(model).toBeDefined();
    
    const basicParams = model!.parameters.filter(p => p.group === 'basic').map(p => p.name);
    const advancedParams = model!.parameters.filter(p => p.group === 'advanced').map(p => p.name);
    
    // Basic: input_type, person_count, width, height
    expect(basicParams).toContain('input_type');
    expect(basicParams).toContain('person_count');
    expect(basicParams).toContain('width');
    expect(basicParams).toContain('height');
    
    // Advanced: audio_start, audio_end, audio2_start, audio2_end
    expect(advancedParams).toContain('audio_start');
    expect(advancedParams).toContain('audio_end');
    expect(advancedParams).toContain('audio2_start');
    expect(advancedParams).toContain('audio2_end');
  });

  it('WAN Animate parameters are grouped correctly (Requirement 3.3)', () => {
    const model = getModelById('wan-animate');
    expect(model).toBeDefined();
    
    const basicParams = model!.parameters.filter(p => p.group === 'basic').map(p => p.name);
    const advancedParams = model!.parameters.filter(p => p.group === 'advanced').map(p => p.name);
    const hiddenParams = model!.parameters.filter(p => p.group === 'hidden').map(p => p.name);
    
    // Basic: width, height (mode is hidden)
    expect(basicParams).toContain('width');
    expect(basicParams).toContain('height');
    
    // Advanced: steps, cfg, seed, fps
    expect(advancedParams).toContain('steps');
    expect(advancedParams).toContain('cfg');
    expect(advancedParams).toContain('seed');
    expect(advancedParams).toContain('fps');
    
    // Hidden: mode, points_store, coordinates, neg_coordinates
    expect(hiddenParams).toContain('mode');
    expect(hiddenParams).toContain('points_store');
    expect(hiddenParams).toContain('coordinates');
    expect(hiddenParams).toContain('neg_coordinates');
  });
});

describe('modelConfig validation', () => {
  /**
   * **Feature: model-config-completion, Property 3: Range Validation Correctness**
   * *For any* parameter with min/max constraints, the validateParameter function
   * SHALL return valid=true for values within [min, max] and valid=false with
   * an error message for values outside the range.
   * **Validates: Requirements 4.1, 4.4**
   */
  describe('Property 3: Range Validation Correctness', () => {
    it('returns valid=true for values within [min, max] range', () => {
      fc.assert(
        fc.property(
          // Generate min and max where min <= max
          fc.integer({ min: -1000, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (min, range) => {
            const max = min + range;
            // Generate a value within the range
            const value = fc.sample(fc.integer({ min, max }), 1)[0];
            
            const param: ModelParameter = {
              name: 'testParam',
              label: 'Test Parameter',
              type: 'number',
              min,
              max,
            };

            const result = validateParameter(param, value);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid=false for values below min', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -500, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          (min, range, belowAmount) => {
            const max = min + range;
            const value = min - belowAmount; // Value below min
            
            const param: ModelParameter = {
              name: 'testParam',
              label: 'Test Parameter',
              type: 'number',
              min,
              max,
            };

            const result = validateParameter(param, value);
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid=false for values above max', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -500, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          (min, range, aboveAmount) => {
            const max = min + range;
            const value = max + aboveAmount; // Value above max
            
            const param: ModelParameter = {
              name: 'testParam',
              label: 'Test Parameter',
              type: 'number',
              min,
              max,
            };

            const result = validateParameter(param, value);
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: model-config-completion, Property 4: Select Validation Correctness**
   * *For any* parameter with type='select' and defined options, the validateParameter
   * function SHALL return valid=true for values in the options array and valid=false
   * for values not in the options array.
   * **Validates: Requirements 4.2, 4.4**
   */
  describe('Property 4: Select Validation Correctness', () => {
    it('returns valid=true for values in the options array', () => {
      fc.assert(
        fc.property(
          // Generate a non-empty array of unique strings for options
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          (options) => {
            // Pick a random option from the array
            const selectedIndex = Math.floor(Math.random() * options.length);
            const value = options[selectedIndex];
            
            const param: ModelParameter = {
              name: 'testParam',
              label: 'Test Parameter',
              type: 'select',
              options,
            };

            const result = validateParameter(param, value);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid=false for values not in the options array', () => {
      fc.assert(
        fc.property(
          // Generate a non-empty array of unique strings for options
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          // Generate a value that is guaranteed to not be in options
          fc.string({ minLength: 1, maxLength: 20 }),
          (options, potentialValue) => {
            // Ensure the value is not in options by appending a unique suffix
            const value = options.includes(potentialValue) 
              ? potentialValue + '_NOT_IN_OPTIONS_' + Date.now()
              : potentialValue;
            
            // Skip if value somehow ended up in options
            if (options.includes(value)) return true;
            
            const param: ModelParameter = {
              name: 'testParam',
              label: 'Test Parameter',
              type: 'select',
              options,
            };

            const result = validateParameter(param, value);
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: model-config-completion, Property 5: Dimension Multiple Validation**
   * *For any* parameter with validation.multipleOf defined, the validateParameter
   * function SHALL return valid=true only when the value is a multiple of the
   * specified number.
   * **Validates: Requirements 4.3, 4.4**
   */
  describe('Property 5: Dimension Multiple Validation', () => {
    it('returns valid=true for values that are multiples of the specified number', () => {
      fc.assert(
        fc.property(
          // Generate a multipleOf value (e.g., 64 for dimensions)
          fc.integer({ min: 1, max: 128 }),
          // Generate a multiplier
          fc.integer({ min: 1, max: 100 }),
          (multipleOf, multiplier) => {
            const value = multipleOf * multiplier; // Guaranteed to be a multiple
            
            const param: ModelParameter = {
              name: 'width',
              label: 'Width',
              type: 'number',
              validation: { multipleOf },
            };

            const result = validateParameter(param, value);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid=false for values that are not multiples of the specified number', () => {
      fc.assert(
        fc.property(
          // Generate a multipleOf value greater than 1
          fc.integer({ min: 2, max: 128 }),
          // Generate a base multiplier
          fc.integer({ min: 1, max: 100 }),
          // Generate an offset that is not 0 and less than multipleOf
          fc.integer({ min: 1, max: 127 }),
          (multipleOf, multiplier, offset) => {
            // Ensure offset is less than multipleOf and not 0
            const actualOffset = (offset % (multipleOf - 1)) + 1;
            const value = multipleOf * multiplier + actualOffset; // Not a multiple
            
            const param: ModelParameter = {
              name: 'width',
              label: 'Width',
              type: 'number',
              validation: { multipleOf },
            };

            const result = validateParameter(param, value);
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates dimension values with multipleOf 64 (common use case)', () => {
      // Test specific dimension values commonly used in AI models
      const validDimensions = [512, 640, 768, 1024, 2048];
      const invalidDimensions = [500, 650, 770, 1000, 2000];
      
      const param: ModelParameter = {
        name: 'width',
        label: 'Width',
        type: 'number',
        validation: { multipleOf: 64 },
      };

      validDimensions.forEach(value => {
        const result = validateParameter(param, value);
        expect(result.valid).toBe(true);
      });

      invalidDimensions.forEach(value => {
        const result = validateParameter(param, value);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('multiple of 64');
      });
    });
  });
});


describe('getVisibleParameters', () => {
  /**
   * **Feature: model-config-completion, Property 6: Conditional Parameter Visibility**
   * *For any* parameter with dependsOn defined, the getVisibleParameters function
   * SHALL include the parameter only when the dependent parameter's current value
   * matches the specified value.
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  describe('Property 6: Conditional Parameter Visibility', () => {
    // Get all models that have parameters with dependsOn conditions
    const modelsWithDependsOn = MODELS.filter(model =>
      model.parameters.some(p => p.dependsOn !== undefined)
    );

    it('includes parameters without dependsOn regardless of current values', () => {
      fc.assert(
        fc.property(
          // Generate random current values
          fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          (currentValues) => {
            // Test with each model
            for (const model of MODELS) {
              const visibleParams = getVisibleParameters(model.id, currentValues);
              const paramsWithoutDependsOn = model.parameters.filter(p => !p.dependsOn);
              
              // All parameters without dependsOn should be visible
              for (const param of paramsWithoutDependsOn) {
                const isVisible = visibleParams.some(vp => vp.name === param.name);
                if (!isVisible) return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('includes parameters with dependsOn only when condition is met', () => {
      fc.assert(
        fc.property(
          // Use a constant to ensure deterministic behavior
          fc.constant(null),
          () => {
            for (const model of modelsWithDependsOn) {
              const paramsWithDependsOn = model.parameters.filter(p => p.dependsOn !== undefined);
              
              for (const param of paramsWithDependsOn) {
                const dependsOn = param.dependsOn!;
                
                // Test with matching value - parameter should be visible
                const matchingValues = { [dependsOn.parameter]: dependsOn.value };
                const visibleWithMatch = getVisibleParameters(model.id, matchingValues);
                const isVisibleWhenMatching = visibleWithMatch.some(vp => vp.name === param.name);
                
                if (!isVisibleWhenMatching) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('excludes parameters with dependsOn when condition is not met', () => {
      fc.assert(
        fc.property(
          // Generate a non-matching value
          fc.string({ minLength: 1, maxLength: 10 }),
          (randomValue) => {
            for (const model of modelsWithDependsOn) {
              const paramsWithDependsOn = model.parameters.filter(p => p.dependsOn !== undefined);
              
              for (const param of paramsWithDependsOn) {
                const dependsOn = param.dependsOn!;
                
                // Create a value that doesn't match the dependsOn condition
                const nonMatchingValue = randomValue === dependsOn.value 
                  ? randomValue + '_DIFFERENT' 
                  : randomValue;
                
                const nonMatchingValues = { [dependsOn.parameter]: nonMatchingValue };
                const visibleWithoutMatch = getVisibleParameters(model.id, nonMatchingValues);
                const isVisibleWhenNotMatching = visibleWithoutMatch.some(vp => vp.name === param.name);
                
                if (isVisibleWhenNotMatching) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Specific tests for Infinite Talk model (Requirements 5.1, 5.2)
    it('shows audio2_start and audio2_end when person_count is multi in Infinite Talk', () => {
      const visibleParams = getVisibleParameters('infinite-talk', { person_count: 'multi' });
      const paramNames = visibleParams.map(p => p.name);
      
      expect(paramNames).toContain('audio2_start');
      expect(paramNames).toContain('audio2_end');
    });

    it('hides audio2_start and audio2_end when person_count is single in Infinite Talk', () => {
      const visibleParams = getVisibleParameters('infinite-talk', { person_count: 'single' });
      const paramNames = visibleParams.map(p => p.name);
      
      expect(paramNames).not.toContain('audio2_start');
      expect(paramNames).not.toContain('audio2_end');
    });

    // Specific tests for WAN Animate model (Requirement 5.4)
    it('shows motion control parameters when mode is animate in WAN Animate', () => {
      const visibleParams = getVisibleParameters('wan-animate', { mode: 'animate' });
      const paramNames = visibleParams.map(p => p.name);
      
      expect(paramNames).toContain('points_store');
      expect(paramNames).toContain('coordinates');
      expect(paramNames).toContain('neg_coordinates');
    });

    it('hides motion control parameters when mode is replace in WAN Animate', () => {
      const visibleParams = getVisibleParameters('wan-animate', { mode: 'replace' });
      const paramNames = visibleParams.map(p => p.name);
      
      expect(paramNames).not.toContain('points_store');
      expect(paramNames).not.toContain('coordinates');
      expect(paramNames).not.toContain('neg_coordinates');
    });

    it('returns empty array for non-existent model', () => {
      const visibleParams = getVisibleParameters('non-existent-model', {});
      expect(visibleParams).toEqual([]);
    });
  });
});


describe('LoRA Model Configuration', () => {
  /**
   * Tests for LoRA parameter type and model configuration
   */
  
  it('ModelParameterType includes lora-selector', () => {
    // This test verifies that the type system includes 'lora-selector'
    const loraParam: ModelParameter = {
      name: 'lora',
      label: 'LoRA Model',
      type: 'lora-selector',
      default: '',
      group: 'advanced'
    };
    
    expect(loraParam.type).toBe('lora-selector');
  });

  it('wan22 model has lora_high and lora_low parameters', () => {
    const model = getModelById('wan22');
    expect(model).toBeDefined();
    
    const paramNames = model!.parameters.map(p => p.name);
    expect(paramNames).toContain('lora_high');
    expect(paramNames).toContain('lora_low');
    
    const loraHigh = model!.parameters.find(p => p.name === 'lora_high');
    const loraLow = model!.parameters.find(p => p.name === 'lora_low');
    
    expect(loraHigh).toBeDefined();
    expect(loraHigh!.type).toBe('lora-selector');
    expect(loraHigh!.label).toBe('High LoRA');
    expect(loraHigh!.default).toBe('');
    expect(loraHigh!.group).toBe('advanced');
    expect(loraHigh!.description).toContain('high-level features');
    
    expect(loraLow).toBeDefined();
    expect(loraLow!.type).toBe('lora-selector');
    expect(loraLow!.label).toBe('Low LoRA');
    expect(loraLow!.default).toBe('');
    expect(loraLow!.group).toBe('advanced');
    expect(loraLow!.description).toContain('low-level features');
  });

  it('flux-krea model has lora parameter with lora-selector type', () => {
    const model = getModelById('flux-krea');
    expect(model).toBeDefined();
    
    const loraParam = model!.parameters.find(p => p.name === 'lora');
    expect(loraParam).toBeDefined();
    expect(loraParam!.type).toBe('lora-selector');
    expect(loraParam!.label).toBe('LoRA Model');
    expect(loraParam!.default).toBe('');
    expect(loraParam!.group).toBe('advanced');
    expect(loraParam!.description).toContain('custom styling');
  });

  it('all lora-selector parameters have empty string as default', () => {
    for (const model of MODELS) {
      const loraParams = model.parameters.filter(p => p.type === 'lora-selector');
      for (const param of loraParams) {
        expect(param.default).toBe('');
      }
    }
  });

  it('all lora-selector parameters are in advanced group', () => {
    for (const model of MODELS) {
      const loraParams = model.parameters.filter(p => p.type === 'lora-selector');
      for (const param of loraParams) {
        expect(param.group).toBe('advanced');
      }
    }
  });

  it('retrieves models with lora-selector parameters correctly', () => {
    const wan22 = getModelById('wan22');
    const fluxKrea = getModelById('flux-krea');
    
    expect(wan22).toBeDefined();
    expect(fluxKrea).toBeDefined();
    
    const wan22LoraParams = wan22!.parameters.filter(p => p.type === 'lora-selector');
    const fluxKreaLoraParams = fluxKrea!.parameters.filter(p => p.type === 'lora-selector');
    
    expect(wan22LoraParams).toHaveLength(2); // lora_high and lora_low
    expect(fluxKreaLoraParams).toHaveLength(1); // lora
  });
});

describe('validateModelInputs', () => {
  /**
   * Tests for validateModelInputs function
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   */
  
  it('returns error for non-existent model', () => {
    const results = validateModelInputs('non-existent-model', {});
    expect(results).toHaveLength(1);
    expect(results[0].valid).toBe(false);
    expect(results[0].error).toContain('not found');
  });

  it('validates all parameters for a model', () => {
    const model = getModelById('qwen-image-edit');
    expect(model).toBeDefined();
    
    const validInputs = {
      width: 512,
      height: 512,
      seed: -1,
      steps: 4,
      guidance: 1
    };
    
    const results = validateModelInputs('qwen-image-edit', validInputs);
    expect(results).toHaveLength(model!.parameters.length);
    expect(results.every(r => r.valid)).toBe(true);
  });

  it('returns validation errors for invalid range values (Requirement 4.1)', () => {
    const invalidInputs = {
      width: 100,  // Below min of 256
      height: 512,
      seed: -1,
      steps: 4,
      guidance: 1
    };
    
    const results = validateModelInputs('qwen-image-edit', invalidInputs);
    const widthResult = results[0]; // width is first parameter
    expect(widthResult.valid).toBe(false);
    expect(widthResult.error).toContain('outside the allowed range');
  });

  it('returns validation errors for invalid select values (Requirement 4.2)', () => {
    const invalidInputs = {
      input_type: 'invalid_type',  // Not in ['image', 'video']
      person_count: 'single',
      width: 640,
      height: 640
    };
    
    const results = validateModelInputs('infinite-talk', invalidInputs);
    const inputTypeResult = results[0]; // input_type is first parameter
    expect(inputTypeResult.valid).toBe(false);
    expect(inputTypeResult.error).toContain('not a valid option');
  });

  it('returns validation errors for non-multiple dimension values (Requirement 4.3)', () => {
    const invalidInputs = {
      width: 500,  // Not a multiple of 64
      height: 512,
      seed: -1,
      steps: 4,
      guidance: 1
    };
    
    const results = validateModelInputs('qwen-image-edit', invalidInputs);
    const widthResult = results[0]; // width is first parameter
    expect(widthResult.valid).toBe(false);
    expect(widthResult.error).toContain('multiple of');
  });

  it('provides clear error messages for constraint violations (Requirement 4.4)', () => {
    // Test range violation error message
    const rangeResults = validateModelInputs('qwen-image-edit', { width: 100 });
    expect(rangeResults[0].error).toMatch(/Value \d+ is outside the allowed range/);
    
    // Test select violation error message
    const selectResults = validateModelInputs('infinite-talk', { input_type: 'invalid' });
    expect(selectResults[0].error).toMatch(/not a valid option.*Valid options:/);
    
    // Test multipleOf violation error message
    const multipleResults = validateModelInputs('qwen-image-edit', { width: 500 });
    expect(multipleResults[0].error).toMatch(/must be a multiple of/);
  });

  it('validates WAN Animate model parameters correctly', () => {
    const validInputs = {
      mode: 'replace',
      width: 512,
      height: 512,
      steps: 4,
      cfg: 1.0,
      seed: -1,
      fps: 30
    };
    
    const results = validateModelInputs('wan-animate', validInputs);
    const validResults = results.filter(r => r.valid);
    expect(validResults.length).toBeGreaterThan(0);
  });

  it('handles missing optional parameters gracefully', () => {
    // Only provide some parameters
    const partialInputs = {
      width: 512,
      height: 512
    };
    
    const results = validateModelInputs('qwen-image-edit', partialInputs);
    // Should not fail for missing non-required parameters
    expect(results).toHaveLength(5); // qwen-image-edit has 5 parameters
  });
});
