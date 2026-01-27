import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Use jsdom for DOM-related tests
        environment: 'jsdom',

        // Setup files run before each test file
        setupFiles: ['./tests/setup.js'],

        // Include test files
        include: ['src/**/*.test.js', 'tests/**/*.test.js'],

        // Inline three.js to enable mocking
        deps: {
            inline: ['three']
        },

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.js'],
            exclude: [
                'src/main.js',  // Entry point with side effects
                'src/**/*.test.js'
            ]
        },

        // Global setup
        globals: true,

        // Timeout for async tests
        testTimeout: 10000
    }
});
