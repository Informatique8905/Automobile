export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
  },
  {
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
