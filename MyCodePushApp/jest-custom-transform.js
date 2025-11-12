/**
 * Custom Jest transform that skips automate.js
 */
const babelJest = require('babel-jest');

const defaultTransformer = babelJest.createTransformer({
  presets: ['@react-native/babel-preset'],
});

module.exports = {
  process(src, filename, config, transformOptions) {
    // Skip transformation for automate.js - it's an ES module
    // Return the source as-is, but mark it properly
    if (filename.includes('automate.js')) {
      // Return source code without transformation
      // Jest should not process this file at all
      return {
        code: src,
        map: null,
      };
    }
    
    // Use default babel-jest transformer for all other files
    return defaultTransformer.process(src, filename, config, transformOptions);
  },
  getCacheKey(src, filename, config, transformOptions) {
    // Skip cache key generation for automate.js
    if (filename.includes('automate.js')) {
      return 'automate-js-no-transform';
    }
    return defaultTransformer.getCacheKey(src, filename, config, transformOptions);
  },
  canInstrument: false, // Don't instrument automate.js
};

