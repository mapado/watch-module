module.exports = {
  root: true,
  env: { node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'unicorn', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    'unicorn/prefer-node-protocol': 'error',

    // Sort imports
    'sort-imports': 'off',
    'import/order': ['error', { alphabetize: { order: 'asc' } }],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    },
  ],
};
