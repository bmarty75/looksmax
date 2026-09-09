// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // .expo est régénéré par Expo à chaque démarrage : le linter n'a rien à
    // y redire, et ses avertissements masquaient les vrais.
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Les fichiers de test tournent sous Jest, qui expose ses globales sans
    // qu'on les importe.
    files: ['__tests__/**/*.ts', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
  },
]);
