import '@testing-library/jest-dom';

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock HTMLMediaElement for tests
// This provides a working implementation of load() and duration detection
Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: function() {
    // Simulate async metadata loading
    setTimeout(() => {
      // Set a default duration (5 seconds)
      Object.defineProperty(this, 'duration', {
        configurable: true,
        value: 5,
      });
      // Dispatch loadedmetadata event
      this.dispatchEvent(new Event('loadedmetadata'));
    }, 0);
  },
});

// Ensure duration property exists with a default value
Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
  configurable: true,
  writable: true,
  value: 5,
});
