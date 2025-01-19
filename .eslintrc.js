module.exports = {
    env: {
        node: true,
        es6: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended'
    ],
    parserOptions: {
        ecmaVersion: 2018
    },
    rules: {
        // Match existing code style
        'no-var': 'off', // Code uses var declarations
        'prefer-const': 'off', // Allow var/let
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'indent': ['error', 4],
        'no-unused-vars': ['warn', { 'args': 'none' }],
        'node/no-unpublished-require': 'off',
        'node/no-missing-require': 'off',
        'no-console': 'off', // Project uses console.log extensively
        'comma-dangle': ['error', 'never'],
        'space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always'
        }]
    },
    overrides: [
        {
            files: ['tests/**/*.js'],
            env: {
                jest: true
            }
        }
    ]
};
