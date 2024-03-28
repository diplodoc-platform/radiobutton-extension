module.exports = {
  env: {
    node: true,
  },
  extends: ['@diplodoc/eslint-config', '@diplodoc/eslint-config/prettier'],
  root: true,
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: __dirname,
      },
    },
  ],
};
