// Règles ESLint partagées. Points de sécurité : pas d'eval, pas de dangerouslySetInnerHTML sans assainissement.
export default [
  {
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'react/no-danger': 'error',
    },
  },
];
