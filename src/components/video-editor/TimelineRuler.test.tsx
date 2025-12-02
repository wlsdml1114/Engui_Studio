import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import {
  TimelineRuler,
  formatTickLabel,
  chooseMajorInterval,
  chooseMinorInterval,
  MAJOR_INTERVALS,
  MIN_MAJOR_SPACING_PX,
  RULER_HEIGHT,
  EPSILON,
} from './TimelineRuler';

describe('TimelineRuler Property Tests', () => {
  // Feature: video-editor-center-panel, Property 5: Timeline renders ruler component
  test('timeline renders ruler component for any valid configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.float({ min: Math.fround(1), max: Math.fround(3600), noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          timelineWidth: fc.float({ min: Math.fround(100), max: Math.fround(5000), noNaN: true }),
        }),
        (config) => {
          const { container } = render(
            <TimelineRuler
              duration={config.duration}
              zoom={config.zoom}
              timelineWidth={config.timelineWidth}
            />
          );

          // Should render a div container
          const rulerDiv = container.querySelector('div[aria-hidden="true"]');
          expect(rulerDiv).toBeTruthy();

          // Should render an SVG element
          const svg = container.querySelector('svg');
          expect(svg).toBeTruthy();
          expect(svg?.getAttribute('height')).toBe(String(RULER_HEIGHT));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 6: Ruler tick spacing adapts to duration
  test('ruler tick spacing maintains minimum spacing for any duration', () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.float({ min: Math.fround(1), max: Math.fround(86400), noNaN: true }), // 1 second to 24 hours
          timelineWidth: fc.float({ min: Math.fround(500), max: Math.fround(5000), noNaN: true }),
        }),
        (config) => {
          const pixelsPerSecond = config.timelineWidth / config.duration;
          const majorInterval = chooseMajorInterval(pixelsPerSecond);
          const spacing = majorInterval * pixelsPerSecond;

          // Major tick spacing should be at least MIN_MAJOR_SPACING_PX
          expect(spacing).toBeGreaterThanOrEqual(MIN_MAJOR_SPACING_PX - EPSILON);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 7: Zoom adjusts tick intervals
  test('zoom changes result in different tick intervals', () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.constant(30), // Fixed duration
          baseWidth: fc.constant(1000), // Fixed base width
          zoom1: fc.float({ min: Math.fround(0.5), max: Math.fround(2), noNaN: true }),
          zoom2: fc.float({ min: Math.fround(3), max: Math.fround(10), noNaN: true }),
        }),
        (config) => {
          // Calculate intervals at different zoom levels
          const pixelsPerSecond1 = (config.baseWidth * config.zoom1) / config.duration;
          const pixelsPerSecond2 = (config.baseWidth * config.zoom2) / config.duration;

          const interval1 = chooseMajorInterval(pixelsPerSecond1);
          const interval2 = chooseMajorInterval(pixelsPerSecond2);

          // Different zoom levels should produce different intervals
          // (unless both happen to fall in the same interval bucket)
          // At minimum, the spacing in pixels should be different
          const spacing1 = interval1 * pixelsPerSecond1;
          const spacing2 = interval2 * pixelsPerSecond2;

          // Either intervals differ or spacings differ significantly
          const intervalsDiffer = Math.abs(interval1 - interval2) > EPSILON;
          const spacingsDiffer = Math.abs(spacing1 - spacing2) > 1;

          expect(intervalsDiffer || spacingsDiffer).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 8: Major ticks have labels
  test('all major ticks have associated labels', () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.float({ min: Math.fround(5), max: Math.fround(300), noNaN: true }),
          timelineWidth: fc.float({ min: Math.fround(500), max: Math.fround(2000), noNaN: true }),
        }),
        (config) => {
          const { container } = render(
            <TimelineRuler
              duration={config.duration}
              timelineWidth={config.timelineWidth}
            />
          );

          const svg = container.querySelector('svg');
          if (!svg) {
            throw new Error('SVG not found');
          }

          // Count major tick lines (thicker lines with strokeWidth 1.5)
          const majorTickLines = svg.querySelectorAll('line[stroke-width="1.5"]');
          
          // Count text labels
          const textLabels = svg.querySelectorAll('text');

          // Each major tick should have a label
          expect(textLabels.length).toBe(majorTickLines.length);
          expect(textLabels.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 9: Time formatting adapts to scale
  test('time formatting uses correct units for any time value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(86400), noNaN: true }), // 0 to 24 hours
        (seconds) => {
          // Use a reasonable major interval for the test
          const majorInterval = seconds < 1 ? 0.1 : seconds < 60 ? 1 : seconds < 3600 ? 60 : 3600;
          const formatted = formatTickLabel(seconds, majorInterval);

          if (seconds < EPSILON) {
            // Zero should be formatted as "0s"
            expect(formatted).toBe('0s');
          } else if (seconds < 1) {
            // Less than 1 second should use milliseconds
            expect(formatted).toMatch(/^\d+ms$/);
          } else if (seconds < 60) {
            // 1-59 seconds should use seconds
            expect(formatted).toMatch(/^\d+(\.\d+)?s$/);
          } else if (seconds < 3600) {
            // 1-59 minutes should use minutes
            expect(formatted).toMatch(/^\d+(\.\d+)?m$/);
          } else {
            // 1+ hours should use hours
            expect(formatted).toMatch(/^\d+(\.\d+)?h$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('TimelineRuler Helper Functions', () => {
  test('chooseMajorInterval returns valid interval from MAJOR_INTERVALS', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
        (pixelsPerSecond) => {
          const interval = chooseMajorInterval(pixelsPerSecond);
          expect(MAJOR_INTERVALS).toContain(interval);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('chooseMinorInterval returns smaller interval than major', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MAJOR_INTERVALS.filter(i => i > 0.1)),
        (majorInterval) => {
          const minorInterval = chooseMinorInterval(majorInterval);
          expect(minorInterval).toBeLessThanOrEqual(majorInterval);
          expect(minorInterval).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('formatTickLabel produces non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(86400), noNaN: true }),
        fc.constantFrom(...MAJOR_INTERVALS),
        (seconds, majorInterval) => {
          const formatted = formatTickLabel(seconds, majorInterval);
          expect(formatted).toBeTruthy();
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
