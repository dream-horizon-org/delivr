module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/jest-custom-transform.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@d11|@tanstack)/)',
    '<rootDir>/__tests__/automate\\.mjs$', // Don't transform automate.mjs - it's an ES module
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  testTimeout: 600000, // 10 minutes timeout for integration tests
};
