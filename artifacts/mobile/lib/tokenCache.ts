import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const inMemoryCache: Record<string, string> = {};

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    if (Platform.OS === "web") return inMemoryCache[key] ?? null;
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      inMemoryCache[key] = value;
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string): Promise<void> {
    if (Platform.OS === "web") {
      delete inMemoryCache[key];
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};
