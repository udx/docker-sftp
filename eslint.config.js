const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/',
            'coverage/',
            'dist/',
            'static/',
            'tmp/',
            '.github/',
            'docs/'
        ]
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-var': 'off',
            'prefer-const': 'off',
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'indent': ['error', 4],
            'no-unused-vars': ['warn', { 'args': 'none' }],
            'no-console': 'off',
            'comma-dangle': ['error', 'never'],
            'space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always'
            }]
        }
    }
];
