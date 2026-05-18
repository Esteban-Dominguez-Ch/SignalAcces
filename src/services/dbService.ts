// Capa de acceso a datos de Firestore.
// Todas las colecciones principales y subcolecciones del registro de ingreso estan aqui.
// src/services/dbService.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../config/firebase";

// --- COLECCIONES PRINCIPALES ---
const colAreas = collection(db, "areasTrabajo");
const colUsuarios = collection(db, "usuarios");
const colRegistros = collection(db, "RegistrosIngreso");
const colNovedades = collection(db, "novedadesSeguridad");
const colEmpresas = collection(db, "empresaContratista");
const colLogin = collection(db, "login");


// --- 1. CREAR REGISTRO PRINCIPAL (SOLO AL GUARDAR EN INGRESO PERMISO) ---
export const crearRegistroIngreso = async (datos: any) => {
  const docRef = await addDoc(colRegistros, {
    ...datos,
    fecha: Timestamp.fromDate(new Date()),
    estado: datos.estado || "Pendiente",
    registro_vehiculo: datos.registro_vehiculo || "Pendiente",
    checklist_supervisor: datos.checklist_supervisor || "Pendiente"
  });
  return docRef.id; // Devuelve el ID único
};


// --- 2. GUARDAR FORMULARIOS SECUNDARIOS ---
// Registro de vehiculo
export const guardarRegistroVehiculo = async (idRegistro: string, datos: any) => {
  const coleccionRef = collection(db, 'RegistrosIngreso', idRegistro, 'registroVehiculo');
  const docRef = await addDoc(coleccionRef, datos);

  // Actualizar estado en el registro principal
  await updateDoc(doc(db, "RegistrosIngreso", idRegistro), {
    registro_vehiculo: "OK",
    patente_vehiculo: datos.patente
  });

  return docRef.id;
};

// Checklist del supervisor
export const guardarChecklist = async (idRegistro: string, datosChecklist: any) => {
  const coleccionRef = collection(db, `RegistrosIngreso/${idRegistro}/checklistSupervisor`);
  const docRef = await addDoc(coleccionRef, {
    ...datosChecklist,
    fecha: Timestamp.fromDate(new Date())
  });

  // Actualizar estado en el registro principal
  await updateDoc(doc(db, "RegistrosIngreso", idRegistro), {
    checklist_supervisor: "OK"
  });

  return docRef.id;
};


// --- 3. VALIDAR Y FINALIZAR TODO ---
export const validarYFinalizar = async (id: string) => {
  try {
    // 1. Obtener el registro principal
    const refRegistro = doc(db, "RegistrosIngreso", id);
    const snapRegistro = await getDoc(refRegistro);
    
    if (!snapRegistro.exists()) {
      return { exito: false, mensaje: "Registro no encontrado" };
    }

    const datos = snapRegistro.data();

    // 2. Verificar que ambos formularios estén completos
    if (datos.registro_vehiculo !== "OK") {
      return { exito: false, mensaje: "Falta completar el Registro de Vehículo" };
    }

    if (datos.checklist_supervisor !== "OK") {
      return { exito: false, mensaje: "Falta completar el Checklist Supervisor" };
    }

    // 3. Si todo está listo, actualizar estado final
    await updateDoc(refRegistro, {
      estado: "Finalizado",
      fecha_finalizacion: Timestamp.fromDate(new Date())
    });

    return { exito: true, mensaje: "Todos los datos han sido validados y guardados correctamente" };

  } catch (error: any) {
    return { exito: false, mensaje: error.message };
  }
};


// --- 4. FUNCIONES ADICIONALES ---
export const actualizarEstadoRegistro = async (id: string, estado: string, idAutorizador?: string) => {
  const ref = doc(db, "RegistrosIngreso", id);
  await updateDoc(ref, { 
    estado, 
    id_autorizador: idAutorizador ? doc(db, "usuarios", idAutorizador) : null,
    fecha_autorizacion: Timestamp.fromDate(new Date())
  });
};

export const registrarSalida = async (id: string, horaSalida: string, observaciones: string) => {
  const ref = doc(db, "RegistrosIngreso", id);
  await updateDoc(ref, { 
    hora_salida: horaSalida,
    observaciones_salida: observaciones,
    estado: "Finalizado"
  });
};

export const getAreasTrabajo = async () => {
  const snapshot = await getDocs(colAreas);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmpresas = async () => {
  const snapshot = await getDocs(colEmpresas);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getRegistrosPendientes = async () => {
  const q = query(colRegistros, where("estado", "==", "Pendiente"));
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    let patente = '-';
    try {
      const vehiculosSnap = await getDocs(collection(db, "RegistrosIngreso", doc.id, "registroVehiculo"));
      if (!vehiculosSnap.empty) {
        patente = vehiculosSnap.docs[0].data().patente || '-';
      }
    } catch (error) {
      console.log('Error al obtener patente:', error);
    }
    return { id: doc.id, ...data, patente_vehiculo: patente };
  }));
};

export const getRegistrosAutorizados = async () => {
  const q = query(colRegistros, where("estado", "==", "Autorizado"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getHistorialRegistros = async () => {
  const q = query(colRegistros, orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    let patente = '-';
    try {
      const vehiculosSnap = await getDocs(collection(db, "RegistrosIngreso", doc.id, "registroVehiculo"));
      if (!vehiculosSnap.empty) {
        patente = vehiculosSnap.docs[0].data().patente || '-';
      }
    } catch (error) {
      console.log('Error al obtener patente:', error);
    }
    return { id: doc.id, ...data, patente_vehiculo: patente };
  }));
};

export const guardarNovedad = async (datos: any) => {
  await addDoc(colNovedades, {
    ...datos,
    fecha: Timestamp.fromDate(new Date())
  });
};

export const getNovedadesPorArea = async (idArea: string) => {
  const q = query(colNovedades, where("id_area", "==", doc(db, "areasTrabajo", idArea)));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getNovedades = async () => {
  const q = query(colNovedades, orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      area: data.area,
      ubicacion: data.ubicacion,
      texto: data.texto,
      fecha: data.fecha?.toDate()
    };
  });
};

import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
const storage = getStorage();

export const subirImagen = async (uri: string, nombreArchivo: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `documentos/${nombreArchivo}`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
};

export const verificarDocumento = async (idRegistro: string, tipo: 'registroVehiculo' | 'checklistSupervisor') => {
  try {
    const ref = doc(db, 'RegistrosIngreso', idRegistro, tipo, `data_${idRegistro}`);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    console.error('Error al verificar documento:', error);
    return false;
  }
};

export const validarUsuarioAutorizador = async (usuario: string, contraseña: string) => {
  const q = query(
    colLogin,
    where("usuario", "==", usuario),
    where("contraseña", "==", contraseña)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};