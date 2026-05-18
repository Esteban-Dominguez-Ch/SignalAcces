// Procesa la cola offline y ejecuta cada operacion pendiente en orden.
// Si hay un error en cualquier operacion, se detiene (break) para no perder datos.
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { crearRegistroIngreso, guardarChecklist, guardarRegistroVehiculo, registrarSalida, subirImagen } from './dbService';
import { addIdMapping, getQueue, removeFromQueue, resolveId } from './offlineQueue';

// URIs locales del dispositivo (file://, content://, rutas absolutas)
const isLocalUri = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');

// En web el fetch HEAD a firestore.googleapis.com falla por CORS.
// El SDK web gestiona conectividad solo, asi que en web se asume online.
const checkConnectivity = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    await fetch('https://firestore.googleapis.com/', { method: 'HEAD', signal: controller.signal });
    clearTimeout(tid);
    return true;
  } catch {
    return false;
  }
};

export const processPendingOps = async (): Promise<number> => {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  if (!(await checkConnectivity())) return 0;

  let processed = 0;

  for (const op of queue) {
    try {
      if (op.type === 'crearRegistro') {
        const { datos, imagenR006LocalUri } = op.payload;
        let url_r006 = datos.url_r006 || '';

        if (imagenR006LocalUri && isLocalUri(imagenR006LocalUri)) {
          url_r006 = await subirImagen(imagenR006LocalUri, `R006_${Date.now()}.jpg`);
        }

        const realId = await crearRegistroIngreso({ ...datos, url_r006 });
        await addIdMapping(op.localId, realId);
        await removeFromQueue(op.id);
        processed++;

      } else if (op.type === 'guardarVehiculo') {
        const { idRegistro, datos, imagenARTLocalUri } = op.payload;
        const realId = await resolveId(idRegistro);

        if (realId.startsWith('local_')) continue;

        let imagen_art = datos.imagen_art || '';
        if (imagenARTLocalUri && isLocalUri(imagenARTLocalUri)) {
          imagen_art = await subirImagen(imagenARTLocalUri, `ART_${realId}.jpg`);
        }

        await guardarRegistroVehiculo(realId, { ...datos, imagen_art });
        await removeFromQueue(op.id);
        processed++;

      } else if (op.type === 'guardarChecklist') {
        const { idRegistro, datos } = op.payload;
        const realId = await resolveId(idRegistro);

        if (realId.startsWith('local_')) continue;

        await guardarChecklist(realId, datos);
        await removeFromQueue(op.id);
        processed++;

      } else if (op.type === 'registrarSalida') {
        const { idRegistro, horaSalida, observacionSalida } = op.payload;
        const realId = await resolveId(idRegistro);

        if (realId.startsWith('local_')) continue;

        await registrarSalida(realId, horaSalida, observacionSalida);
        await removeFromQueue(op.id);
        processed++;

      } else if (op.type === 'finalizarRegistro') {
        const { idRegistro } = op.payload;
        const realId = await resolveId(idRegistro);

        if (realId.startsWith('local_')) continue;

        await setDoc(doc(db, 'RegistrosIngreso', realId), { estado: 'Pendiente' }, { merge: true });
        await removeFromQueue(op.id);
        processed++;
      }
    } catch {
      break;
    }
  }

  return processed;
};
