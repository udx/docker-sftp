module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,  // 30 seconds for SSH operations
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    verbose: true
};
