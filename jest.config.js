/**
 * Le préréglage jest-expo sait transformer les modules React Native et
 * ceux d'Expo, publiés en ESM non transpilé : sans lui, le moindre import
 * d'expo-image-picker fait échouer la suite au chargement.
 */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["lib/**/*.ts", "!lib/supabase.ts"],
};
