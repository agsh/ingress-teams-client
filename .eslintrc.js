module.exports = {
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'no-undef': 0,
    'no-unused-vars': 0,
    'no-empty': 0,
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'object-curly-spacing': [2, 'always'],
    'comma-dangle': ['error', {
      arrays: 'never',
      objects: 'always-multiline',
      imports: 'never',
      exports: 'never',
      functions: 'never',
    }],
    'eol-last': ['error', 'always'],
  },
};
