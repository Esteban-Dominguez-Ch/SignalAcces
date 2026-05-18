// Cola de operaciones pendientes para soporte offline.
// Cada operacion se guarda en AsyncStorage y se ejecuta cuando hay conexion.
// El ID local (local_XXXX) se mapea al ID real de Firestore tras sincronizar.
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@offline_ops_queue';
const ID_MAP_KEY = '@offline_id_map';

export type OfflineOpType = 'crearRegistro' | 'guardarVehiculo' | 'guardarChecklist' | 'registrarSalida' | 'finalizarRegistro';

export interface OfflineOp {
  id: string;
  type: OfflineOpType;
  localId: string;
  payload: any;
  timestamp: number;
}

// --- COLA ---

export const enqueueOp = async (op: Omit<OfflineOp, 'id' | 'timestamp'>): Promise<void> => {
  const queue = await getQueue();
  const newOp: OfflineOp = {
    ...op,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, newOp]));
};

export const getQueue = async (): Promise<OfflineOp[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const removeFromQueue = async (id: string): Promise<void> => {
  const queue = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(op => op.id !== id)));
};

export const getPendingCount = async (): Promise<number> => {
  const queue = await getQueue();
  return queue.length;
};

// --- MAPA DE IDs: localId -> realId de Firestore ---

export const getIdMapping = async (): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(ID_MAP_KEY);
  return raw ? JSON.parse(raw) : {};
};

export const addIdMapping = async (localId: string, realId: string): Promise<void> => {
  const map = await getIdMapping();
  await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify({ ...map, [localId]: realId }));
};

export const resolveId = async (id: string): Promise<string> => {
  if (!id.startsWith('local_')) return id;
  const map = await getIdMapping();
  return map[id] || id;
};
