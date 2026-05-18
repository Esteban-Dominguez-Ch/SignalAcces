// Almacena borradores de formularios en AsyncStorage.
// Cada borrador usa una clave con prefijo para evitar colisiones.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@draft_';

export const saveDraft = async (key: string, data: any): Promise<void> => {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(data));
};

export const loadDraft = async (key: string): Promise<any | null> => {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw ? JSON.parse(raw) : null;
};

export const clearDraft = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(PREFIX + key);
};
