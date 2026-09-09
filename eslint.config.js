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
]);
