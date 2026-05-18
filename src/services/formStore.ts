// Persiste el estado completo del formulario principal entre sesiones.
// Permite recuperar datos si la app se cierra antes de guardar.
import AsyncStorage from '@react-native-async-storage/async-storage';

const FORM_KEY = '@form_estado_principal';

export const guardarEstadoFormulario = async (estado: Record<string, any>): Promise<void> => {
  await AsyncStorage.setItem(FORM_KEY, JSON.stringify(estado));
};

export const cargarEstadoFormulario = async (): Promise<Record<string, any> | null> => {
  const raw = await AsyncStorage.getItem(FORM_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const actualizarCampoFormulario = async (campo: string, valor: any): Promise<void> => {
  const raw = await AsyncStorage.getItem(FORM_KEY);
  const estado = raw ? JSON.parse(raw) : {};
  await AsyncStorage.setItem(FORM_KEY, JSON.stringify({ ...estado, [campo]: valor }));
};

export const limpiarEstadoFormulario = async (): Promise<void> => {
  await AsyncStorage.removeItem(FORM_KEY);
};
