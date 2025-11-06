/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/core/src/__tests__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/packages/core/src/__tests__/test/setup.ts'],
  collectCoverageFrom: [
    'packages/core/src/**/*.ts',
    '!packages/core/src/__tests__/**',
    '!packages/core/src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000,
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/packages/core/src/$1',
  },
};
