module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/test/**/*.test.ts'], // Adjust the path based on your test file location
    setupFiles: ['dotenv/config'], // Optional: Load environment variables
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/script/$1', // Optional: Alias for your `script/` directory
      '^~types/(.*)$': '<rootDir>/script/types/$1',
      '^~models/(.*)$': '<rootDir>/script/models/$1',
      '^~services/(.*)$': '<rootDir>/script/services/$1',
      '^~controllers/(.*)$': '<rootDir>/script/controllers/$1',
      '^~routes/(.*)$': '<rootDir>/script/routes/$1',
      '^~utils/(.*)$': '<rootDir>/script/utils/$1',
      '^~constants/(.*)$': '<rootDir>/script/constants/$1',
      '^~middleware/(.*)$': '<rootDir>/script/middleware/$1',
      '^~storage/(.*)$': '<rootDir>/script/storage/$1',
    },
    transformIgnorePatterns: [
      'node_modules/(?!(octokit|@octokit)/)',
    ],
  };
  