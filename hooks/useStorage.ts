import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  get: async (key: string, defaultValue: any) => {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};