/**
 * AsyncStorage est un module natif : sous Jest, il n'y a pas d'application
 * pour le fournir, et le seul fait de l'importer fait échouer la suite. Le
 * paquet livre un substitut en mémoire prévu pour ça.
 *
 * La chaîne concernée est indirecte : lib/photos → lib/stockagePhotos →
 * lib/supabase → AsyncStorage. Tester une fonction pure de photos.ts suffit
 * donc à la déclencher.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
