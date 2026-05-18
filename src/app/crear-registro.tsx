import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { crearRegistroIngreso, getAreasTrabajo, registrarSalida, subirImagen } from '../services/dbService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cargarEstadoFormulario, guardarEstadoFormulario, limpiarEstadoFormulario } from '../services/formStore';
import { enqueueOp, resolveId } from '../services/offlineQueue';
import { processPendingOps } from '../services/syncService';

type RootStackParamList = {
  'index': undefined;
  'crear-registro': undefined;
  'autorizador': undefined;
  'registro-vehiculo': { idRegistro: string };
  'checklist-supervisor': { idRegistro: string };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Area = { id: string; Area: string; Ubicacion: string };
type Trabajador = { id?: string; nombre: string; rut: string; cargo: string };
type RegistroHistorial = {
  id: string;
  fecha?: any;
  area_nombre: string;
  ubicacion_area: string;
  hora_ingreso: string;
  actividad: string;
  empresa_nombre: string;
  solicitante: { nombre: string };
  supervisor: { nombre: string };
  patente_vehiculo?: string;
  hora_salida?: string;
  observaciones_salida?: string;
  estado: string;
};

const ordenDeseado = ["Chancador", "Aprom Secundario", "Sacrificio", "Intermedia"];
const ordenLineas = ["Linea 1", "Linea 2", "Linea 3"];

const ordenarAreas = (areas: Area[]) => {
  return [...areas].sort((a, b) => {
    const idxA = ordenDeseado.indexOf(a.Area);
    const idxB = ordenDeseado.indexOf(b.Area);
    if (idxA !== idxB) return idxA - idxB;
    const linA = ordenLineas.indexOf(a.Ubicacion);
    const linB = ordenLineas.indexOf(b.Ubicacion);
    return linA - linB;
  });
};

export default function CrearRegistro() {
  const navigation = useNavigation<NavigationProp>();
  const hasLoaded = useRef(false);

  const fechaHoy = new Date().toLocaleDateString('es-CL');
  const [fecha] = useState(fechaHoy);
  const [horaIngreso, setHoraIngreso] = useState('');

  const [areas, setAreas] = useState<Area[]>([]);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [areaSeleccionada, setAreaSeleccionada] = useState('');

  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  const [solicitanteRut, setSolicitanteRut] = useState('');
  const [supervisorNombre, setSupervisorNombre] = useState('');
  const [supervisorRut, setSupervisorRut] = useState('');
  const [actividad, setActividad] = useState('');

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [nuevoTrabajador, setNuevoTrabajador] = useState<Trabajador>({ nombre: '', rut: '', cargo: '' });

  const [imagenR006, setImagenR006] = useState<string | null>(null);
  
  const [registroGuardado, setRegistroGuardado] = useState(false);
  const [idRegistroGuardado, setIdRegistroGuardado] = useState<string | null>(null);
  const [registroVehiculoGuardado, setRegistroVehiculoGuardado] = useState(false);
  const [checklistSupervisorGuardado, setChecklistSupervisorGuardado] = useState(false);

  
  const [puedeFinalizar, setPuedeFinalizar] = useState(false);

  const [historialCompleto, setHistorialCompleto] = useState<RegistroHistorial[]>([]);
  const [historialFiltrado, setHistorialFiltrado] = useState<RegistroHistorial[]>([]);
  const [mostrarFormSalida, setMostrarFormSalida] = useState(false);
  const [idRegistroSalida, setIdRegistroSalida] = useState<string | null>(null);
  const [horaSalida, setHoraSalida] = useState('');
  const [observacionSalida, setObservacionSalida] = useState('');

  const [mostrarMensaje, setMostrarMensaje] = useState(false);
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | 'advertencia'>('exito');
  const [textoMensaje, setTextoMensaje] = useState('');

  //Actualizar el valor automáticamente cuando cambien las banderas
  useEffect(() => {
    setPuedeFinalizar(registroVehiculoGuardado && checklistSupervisorGuardado);
  }, [registroVehiculoGuardado, checklistSupervisorGuardado]);

  const guardarEstadoLocal = async () => {
    await guardarEstadoFormulario({
      horaIngreso,
      empresaNombre,
      areaSeleccionada,
      solicitanteNombre,
      solicitanteRut,
      supervisorNombre,
      supervisorRut,
      actividad,
      trabajadores,
      imagenR006,
      registroGuardado,
      idRegistroGuardado,
      registroVehiculoGuardado,
      checklistSupervisorGuardado
    });
  };

  const cargarEstadoLocal = async () => {
    let estado = await cargarEstadoFormulario();
    if (estado) {
      // Si el ID era local y ya fue sincronizado, actualiza al ID real
      if (estado.idRegistroGuardado?.startsWith('local_')) {
        const realId = await resolveId(estado.idRegistroGuardado);
        if (realId !== estado.idRegistroGuardado) {
          estado = { ...estado, idRegistroGuardado: realId };
          await guardarEstadoFormulario(estado);
        }
      }
      setHoraIngreso(estado.horaIngreso || '');
      setEmpresaNombre(estado.empresaNombre || '');
      setAreaSeleccionada(estado.areaSeleccionada || '');
      setSolicitanteNombre(estado.solicitanteNombre || '');
      setSolicitanteRut(estado.solicitanteRut || '');
      setSupervisorNombre(estado.supervisorNombre || '');
      setSupervisorRut(estado.supervisorRut || '');
      setActividad(estado.actividad || '');
      setTrabajadores(estado.trabajadores || []);
      setImagenR006(estado.imagenR006 || null);
      setRegistroGuardado(estado.registroGuardado || false);
      setIdRegistroGuardado(estado.idRegistroGuardado || null);
      setRegistroVehiculoGuardado(estado.registroVehiculoGuardado || false);
      setChecklistSupervisorGuardado(estado.checklistSupervisorGuardado || false);
    }
    hasLoaded.current = true;
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await cargarEstadoLocal();
        await processPendingOps();
      })();
    }, [])
  );

  useEffect(() => {
    if (!hasLoaded.current) return;
    guardarEstadoLocal();
  }, [
    horaIngreso, empresaNombre, areaSeleccionada, solicitanteNombre, solicitanteRut,
    supervisorNombre, supervisorRut, actividad, trabajadores, imagenR006,
    registroGuardado, idRegistroGuardado, registroVehiculoGuardado, checklistSupervisorGuardado
  ]);

  const mostrarExito = (mensaje: string) => {
    setTipoMensaje('exito');
    setTextoMensaje(mensaje);
    setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  const mostrarError = (mensaje: string) => {
    setTipoMensaje('error');
    setTextoMensaje(mensaje);
    setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  const mostrarAdvertencia = (mensaje: string) => {
    setTipoMensaje('advertencia');
    setTextoMensaje(mensaje);
    setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  const guardarSalida = async () => {
    if (!horaSalida) {
      mostrarAdvertencia('Ingrese la hora de salida');
      return;
    }
    if (!idRegistroSalida) return;

    let hayInternet = Platform.OS === 'web';
    if (!hayInternet) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        await fetch('https://firestore.googleapis.com/', { method: 'HEAD', signal: controller.signal });
        clearTimeout(tid);
        hayInternet = true;
      } catch { }
    }

    if (!hayInternet) {
      await enqueueOp({
        type: 'registrarSalida',
        localId: idRegistroSalida,
        payload: { idRegistro: idRegistroSalida, horaSalida, observacionSalida },
      });
      setMostrarFormSalida(false);
      setHoraSalida('');
      setObservacionSalida('');
      setIdRegistroSalida(null);
      mostrarExito('Hora de salida guardada en dispositivo. Se sincronizará al reconectar.');
      return;
    }

    try {
      await registrarSalida(idRegistroSalida, horaSalida, observacionSalida);
      mostrarExito('Salida registrada correctamente');
      setMostrarFormSalida(false);
      setHoraSalida('');
      setObservacionSalida('');
      setIdRegistroSalida(null);
    } catch {
      await enqueueOp({
        type: 'registrarSalida',
        localId: idRegistroSalida,
        payload: { idRegistro: idRegistroSalida, horaSalida, observacionSalida },
      });
      setMostrarFormSalida(false);
      setHoraSalida('');
      setObservacionSalida('');
      setIdRegistroSalida(null);
      mostrarExito('Hora de salida guardada en dispositivo. Se sincronizará al reconectar.');
    }
  };

  const cargarHistorial = useCallback(() => {
    const unsubscribe = onSnapshot(
      collection(db, "RegistrosIngreso"),
      async (snapshot) => {
        const lista = await Promise.all(snapshot.docs.map(async (doc) => {
          const data = doc.data();

          let patente = '-';
          try {
            const vehiculosSnap = await getDocs(collection(db, "RegistrosIngreso", doc.id, "registroVehiculo"));
            if (!vehiculosSnap.empty) {
              const primerVehiculo = vehiculosSnap.docs[0].data();
              patente = primerVehiculo.patente || '-';
            }
          } catch {
            // sin conexión, patente queda '-'
          }

          return {
            id: doc.id,
            fecha: data.fecha,
            area_nombre: data.area_nombre || '',
            ubicacion_area: data.ubicacion_area || '',
            hora_ingreso: data.hora_ingreso || '',
            actividad: data.actividad || '',
            empresa_nombre: data.empresa_nombre || '',
            solicitante: { nombre: data.solicitante?.nombre || 'Sin nombre' },
            supervisor: { nombre: data.supervisor?.nombre || 'Sin supervisor' },
            patente_vehiculo: patente,
            hora_salida: data.hora_salida || '-',
            observaciones_salida: data.observaciones_salida || '',
            estado: data.estado || 'Pendiente'
          };
        }));
        setHistorialCompleto(lista);
      },
      () => { /* sin conexión: historial no disponible */ }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!areaSeleccionada) {
      setHistorialFiltrado([]);
      return;
    }
    const [nombreArea, ubicacion] = areaSeleccionada.split(' - ');
    const filtrado = historialCompleto
      .filter(
        reg => reg.area_nombre === nombreArea &&
               reg.ubicacion_area === ubicacion &&
               reg.estado !== 'Borrador'
      )
      .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0));
    setHistorialFiltrado(filtrado);
  }, [areaSeleccionada, historialCompleto]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const resAreas = await getAreasTrabajo() as Area[];
        await AsyncStorage.setItem('@cache_areas', JSON.stringify(resAreas));
        setAreas(ordenarAreas(resAreas));
      } catch {
        const cachedAreas = await AsyncStorage.getItem('@cache_areas');
        if (cachedAreas) setAreas(ordenarAreas(JSON.parse(cachedAreas)));
      }
    };
    cargar();
    const unsubscribe = cargarHistorial();
    return () => unsubscribe();
  }, [cargarHistorial]);

  const agregarTrabajador = () => {
    if (!nuevoTrabajador.nombre || !nuevoTrabajador.rut || !nuevoTrabajador.cargo) {
      mostrarAdvertencia('Completa todos los datos del trabajador');
      return;
    }
    setTrabajadores([...trabajadores, { ...nuevoTrabajador, id: Date.now().toString() }]);
    setNuevoTrabajador({ nombre: '', rut: '', cargo: '' });
  };

  const eliminarTrabajador = (id: string | undefined) => {
    setTrabajadores(trabajadores.filter(t => t.id !== id));
  };

  const seleccionarR006 = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
    if (!result.canceled) {
      setImagenR006(result.assets[0].uri);
    }
  };

  const guardarSolicitud = async () => {
    const faltantes: string[] = [];
    if (!horaIngreso.trim()) faltantes.push('• Hora Ingreso');
    if (!empresaNombre.trim()) faltantes.push('• Empresa');
    if (!areaSeleccionada.trim()) faltantes.push('• Área / Ubicación');
    if (!solicitanteNombre.trim()) faltantes.push('• Nombre Solicitante');
    if (!solicitanteRut.trim()) faltantes.push('• RUT Solicitante');
    if (!supervisorNombre.trim()) faltantes.push('• Nombre Supervisor');
    if (!supervisorRut.trim()) faltantes.push('• RUT Supervisor');
    if (!actividad.trim()) faltantes.push('• Actividad');
    if (trabajadores.length === 0) faltantes.push('• Al menos 1 trabajador');

    if (faltantes.length > 0) {
      mostrarAdvertencia('Faltan campos:\n' + faltantes.join('\n'));
      return;
    }

    const areaEncontrada = areas.find(a => `${a.Area} - ${a.Ubicacion}` === areaSeleccionada);
    const datosRegistro = {
      fecha: new Date(),
      hora_ingreso: horaIngreso,
      actividad,
      estado: 'Borrador',
      empresa_nombre: empresaNombre,
      id_area: areaEncontrada?.id || '',
      area_nombre: areaEncontrada?.Area || '',
      ubicacion_area: areaEncontrada?.Ubicacion || '',
      solicitante: { nombre: solicitanteNombre, rut: solicitanteRut },
      supervisor: { nombre: supervisorNombre, rut: supervisorRut },
      trabajadores: trabajadores,
      url_r006: '',
      registro_vehiculo: {},
      checklist_supervisor: {},
      hora_salida: '',
      observaciones: ''
    };

    // En web el SDK de Firebase gestiona conectividad solo; el fetch HEAD falla por CORS.
    // Solo se usa el check manual en native, donde addDoc se cuelga sin rechazar si no hay red.
    let hayInternet = Platform.OS === 'web';
    if (!hayInternet) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        await fetch('https://firestore.googleapis.com/', { method: 'HEAD', signal: controller.signal });
        clearTimeout(tid);
        hayInternet = true;
      } catch { }
    }

    if (!hayInternet) {
      const localId = `local_${Date.now()}`;
      await enqueueOp({
        type: 'crearRegistro',
        localId,
        payload: { datos: datosRegistro, imagenR006LocalUri: imagenR006 },
      });
      setIdRegistroGuardado(localId);
      setRegistroGuardado(true);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
      return;
    }

    try {
      const idRegistro = await crearRegistroIngreso(datosRegistro);
      setIdRegistroGuardado(idRegistro);

      if (imagenR006) {
        try {
          const url = await subirImagen(imagenR006, `R006_${idRegistro}.jpg`);
          await setDoc(doc(db, 'RegistrosIngreso', idRegistro), { url_r006: url }, { merge: true });
        } catch {
          // Imagen se subirá al sincronizar
        }
      }

      setRegistroGuardado(true);
      mostrarExito('Solicitud guardada. Complete Registro de Vehículo y Checklist.');

    } catch {
      const localId = `local_${Date.now()}`;
      await enqueueOp({
        type: 'crearRegistro',
        localId,
        payload: { datos: datosRegistro, imagenR006LocalUri: imagenR006 },
      });
      setIdRegistroGuardado(localId);
      setRegistroGuardado(true);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
    }
  };



  const finalizarYValidarTodo = async () => {
    if (!idRegistroGuardado) {
      mostrarError('No hay registro activo para finalizar');
      return;
    }

    if (!puedeFinalizar) {
      mostrarAdvertencia('Debe completar el Registro de Vehículo y el Checklist del Supervisor');
      return;
    }

    const limpiarTodo = async () => {
      setHoraIngreso('');
      setAreaSeleccionada('');
      setEmpresaNombre('');
      setSolicitanteNombre('');
      setSolicitanteRut('');
      setSupervisorNombre('');
      setSupervisorRut('');
      setActividad('');
      setImagenR006(null);
      setTrabajadores([]);
      setNuevoTrabajador({ nombre: '', rut: '', cargo: '' });
      setIdRegistroGuardado('');
      setRegistroGuardado(false);
      setRegistroVehiculoGuardado(false);
      setChecklistSupervisorGuardado(false);
      setPuedeFinalizar(false);
      await limpiarEstadoFormulario();
    };

    let hayInternet = Platform.OS === 'web';
    if (!hayInternet) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        await fetch('https://firestore.googleapis.com/', { method: 'HEAD', signal: controller.signal });
        clearTimeout(tid);
        hayInternet = true;
      } catch { }
    }

    if (!hayInternet || idRegistroGuardado.startsWith('local_')) {
      await enqueueOp({
        type: 'finalizarRegistro' as any,
        localId: idRegistroGuardado,
        payload: { idRegistro: idRegistroGuardado },
      });
      await limpiarTodo();
      mostrarExito('Solicitud enviada localmente. Se procesará al reconectar.');
      return;
    }

    try {
      await setDoc(doc(db, 'RegistrosIngreso', idRegistroGuardado), {
        estado: 'Pendiente'
      }, { merge: true });

      mostrarExito('Solicitud enviada a autorización\nAguarde respuesta del autorizador');
      await limpiarTodo();
    } catch (e: any) {
      mostrarError('No se pudo finalizar el registro: ' + e.message);
    }
  };

  return (
    <View style={{flex:1}}>
      {mostrarMensaje && (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 15,
            right: 15,
            backgroundColor: tipoMensaje === 'error' ? '#ffebee' : tipoMensaje === 'advertencia' ? '#fff8e1' : '#e8f5e9',
            borderWidth: 1,
            borderColor: tipoMensaje === 'error' ? '#ef5350' : tipoMensaje === 'advertencia' ? '#ffb300' : '#66bb6a',
            borderRadius: 8,
            padding: 15,
            zIndex: 9999,
            elevation: 10,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <View
            style={{
              width: 35,
              height: 35,
              borderRadius: 20,
              backgroundColor: tipoMensaje === 'error' ? '#ef5350' : tipoMensaje === 'advertencia' ? '#ffb300' : '#66bb6a',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12
            }}
          >
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>!</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>
            {textoMensaje}
          </Text>
        </View>
      )}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      <View style={styles.menuNav}>
        <TouchableOpacity onPress={() => navigation.navigate('index')}>
          <Text style={styles.menuItem}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItemActivo}>
          <Text style={styles.menuItemActivoText}>Ingreso permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('autorizador')}>
          <Text style={styles.menuItem}>Autorizador</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>INGRESO AL ÁREA</Text>

      <View style={styles.fila2}>
        <View style={styles.col}>
          <Text style={styles.label}>Fecha:</Text>
          <TextInput style={styles.inputAzul} value={fecha} editable={false} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Hora Ingreso:</Text>
          <TextInput
            style={styles.inputAzul}
            placeholder="Ej: 08:30"
            placeholderTextColor="#888"
            value={horaIngreso}
            onChangeText={(texto) => setHoraIngreso(texto)}
          />
        </View>
      </View>

      <Text style={styles.label}>Área / Ubicación:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={areaSeleccionada}
          onValueChange={(itemValue: string) => setAreaSeleccionada(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Seleccione un área..." value="" color="#888" />
          {areas.map(ar => (
            <Picker.Item
              key={ar.id}
              label={`${ar.Area} - ${ar.Ubicacion}`}
              value={`${ar.Area} - ${ar.Ubicacion}`}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Empresa / Razón Social:</Text>
      <TextInput
        style={styles.inputAzul}
        placeholder="Ingrese nombre de la empresa"
        placeholderTextColor="#888"
        value={empresaNombre}
        onChangeText={(texto) => setEmpresaNombre(texto)}
      />

      <View style={styles.fila2}>
        <View style={styles.col}>
          <Text style={styles.label}>Solicitante - Nombre:</Text>
          <TextInput
            style={styles.inputAzul}
            value={solicitanteNombre}
            onChangeText={(texto) => setSolicitanteNombre(texto)}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>RUT:</Text>
          <TextInput
            style={styles.inputAzul}
            value={solicitanteRut}
            onChangeText={(texto) => setSolicitanteRut(texto)}
          />
        </View>
      </View>

      <View style={styles.fila2}>
        <View style={styles.col}>
          <Text style={styles.label}>Supervisor - Nombre:</Text>
          <TextInput
            style={styles.inputAzul}
            value={supervisorNombre}
            onChangeText={(texto) => setSupervisorNombre(texto)}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>RUT:</Text>
          <TextInput
            style={styles.inputAzul}
            value={supervisorRut}
            onChangeText={(texto) => setSupervisorRut(texto)}
          />
        </View>
      </View>

      <Text style={styles.label}>Actividad a Realizar:</Text>
      <TextInput
        style={styles.inputGrande}
        value={actividad}
        onChangeText={(texto) => setActividad(texto)}
        multiline
        placeholder="Describe la actividad"
        placeholderTextColor="#888"
      />

      <Text style={styles.separador}>TRABAJADORES</Text>

      {Platform.OS === 'web' ? (
        <View style={styles.fila3}>
          <TextInput
            placeholder="Nombre completo"
            placeholderTextColor="#888"
            style={[styles.inputAzul, { flex: 2 }]}
            value={nuevoTrabajador.nombre}
            onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, nombre: v })}
          />
          <TextInput
            placeholder="RUT"
            placeholderTextColor="#888"
            style={[styles.inputAzul, { flex: 1, marginHorizontal: 5 }]}
            value={nuevoTrabajador.rut}
            onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, rut: v })}
          />
          <TextInput
            placeholder="Cargo / Función"
            placeholderTextColor="#888"
            style={[styles.inputAzul, { flex: 1 }]}
            value={nuevoTrabajador.cargo}
            onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, cargo: v })}
          />
          <TouchableOpacity style={styles.btnNaranja} onPress={agregarTrabajador}>
            <Text style={{ color: 'white', textAlign: 'center' }}>Agregar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TextInput
            placeholder="Nombre completo"
            placeholderTextColor="#888"
            style={[styles.inputAzul, { marginBottom: 6 }]}
            value={nuevoTrabajador.nombre}
            onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, nombre: v })}
          />
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
            <TextInput
              placeholder="RUT"
              placeholderTextColor="#888"
              style={[styles.inputAzul, { flex: 1 }]}
              value={nuevoTrabajador.rut}
              onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, rut: v })}
            />
            <TextInput
              placeholder="Cargo"
              placeholderTextColor="#888"
              style={[styles.inputAzul, { flex: 1 }]}
              value={nuevoTrabajador.cargo}
              onChangeText={(v) => setNuevoTrabajador({ ...nuevoTrabajador, cargo: v })}
            />
          </View>
          <TouchableOpacity style={[styles.btnNaranja, { alignItems: 'center', padding: 10 }]} onPress={agregarTrabajador}>
            <Text style={{ color: 'white' }}>Agregar</Text>
          </TouchableOpacity>
        </View>
      )}

      {trabajadores.length > 0 && (
        <View style={styles.tabla}>
          <Text style={styles.txtTabla}>Datos de los trabajadores:</Text>
          {trabajadores.map((tra, i) => Platform.OS === 'web' ? (
            <View key={i} style={styles.filaTabla}>
              <Text style={{ flex: 2 }}>{tra.nombre}</Text>
              <Text style={{ flex: 1 }}>{tra.rut}</Text>
              <Text style={{ flex: 1 }}>{tra.cargo}</Text>
              <TouchableOpacity style={styles.btnRojo} onPress={() => eliminarTrabajador(tra.id)}>
                <Text style={{ color: 'white', textAlign: 'center' }}>Borrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View key={i} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 8, backgroundColor: '#f9f9f9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 14, flex: 1 }}>{tra.nombre}</Text>
                <TouchableOpacity style={styles.btnRojo} onPress={() => eliminarTrabajador(tra.id)}>
                  <Text style={{ color: 'white', paddingHorizontal: 8, fontSize: 12 }}>Borrar</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 12, color: '#555' }}>RUT: <Text style={{ color: '#333', fontWeight: '500' }}>{tra.rut}</Text></Text>
                <Text style={{ fontSize: 12, color: '#555' }}>Cargo: <Text style={{ color: '#333', fontWeight: '500' }}>{tra.cargo}</Text></Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.separador}>REGISTRO R006</Text>
      <TouchableOpacity style={styles.btnArchivo} onPress={seleccionarR006}>
        <Text style={{ textAlign: 'center' }}>{imagenR006 ? 'Archivo cargado' : 'Subir archivo / imagen'}</Text>
      </TouchableOpacity>
      {imagenR006 && <Image source={{ uri: imagenR006 }} style={{ width: 120, height: 120, marginVertical: 5, alignSelf: 'center' }} />}

      <TouchableOpacity
        style={styles.btnVerde}
        onPress={guardarSolicitud}
      >
        <Text style={styles.txtBlanco}>GUARDAR SOLICITUD</Text>
      </TouchableOpacity>

      <View style={[styles.filaEstado, Platform.OS !== 'web' ? { flexDirection: 'column', alignItems: 'flex-start' } : {}]}>
        <Text>Registro de Vehículo: <Text style={{ color: 'red', fontWeight: 'bold' }}>(OBLIGATORIO)</Text></Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: Platform.OS !== 'web' ? 6 : 0 }}>
          <Text style={registroVehiculoGuardado ? { color: 'green', fontWeight: 'bold' } : { color: 'red' }}>
            {registroVehiculoGuardado ? '☑ REALIZADO' : '☐ Pendiente'}
          </Text>
          <TouchableOpacity
            style={[styles.btnIngresar, { opacity: registroGuardado ? 1 : 0.5, minWidth: 75 }]}
            onPress={() => {
              if (idRegistroGuardado) {
                navigation.navigate('registro-vehiculo', { idRegistro: idRegistroGuardado });
              }
            }}
            disabled={!registroGuardado}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              {registroVehiculoGuardado ? 'Modificar' : 'Ingresar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.filaEstado, Platform.OS !== 'web' ? { flexDirection: 'column', alignItems: 'flex-start' } : {}]}>
        <Text>Check List Supervisor: <Text style={{ color: 'red', fontWeight: 'bold' }}>(OBLIGATORIO)</Text></Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: Platform.OS !== 'web' ? 6 : 0 }}>
          <Text style={checklistSupervisorGuardado ? { color: 'green', fontWeight: 'bold' } : { color: 'red' }}>
            {checklistSupervisorGuardado ? '☑ REALIZADO' : '☐ Pendiente'}
          </Text>
          <TouchableOpacity
            style={[styles.btnIngresar, { opacity: registroGuardado ? 1 : 0.5, minWidth: 75 }]}
            onPress={() => {
              if (idRegistroGuardado) {
                navigation.navigate('checklist-supervisor', { idRegistro: idRegistroGuardado });
              }
            }}
            disabled={!registroGuardado}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              {checklistSupervisorGuardado ? 'Modificar' : 'Ingresar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.btnVerde,
          {
            backgroundColor: puedeFinalizar ? '#2e7d32' : '#90a4ae',
            opacity: puedeFinalizar ? 1 : 0.6
          }
        ]}
        onPress={finalizarYValidarTodo}
        disabled={!puedeFinalizar}
      >
        <Text style={[
          styles.txtBlanco,
          { color: puedeFinalizar ? '#ffffff' : '#e0e0e0' }
        ]}>
          ENVIAR SOLICITUD
        </Text>
      </TouchableOpacity>

      <View style={{ marginTop: 30, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
        <View style={{ backgroundColor: '#2e7d32', padding: 8, borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
            Historial de ingresos {areaSeleccionada ? `| ${areaSeleccionada}` : ''}
          </Text>
        </View>

        {historialFiltrado.length === 0 ? (
          <Text style={{ padding: 10, textAlign: 'center', color: '#666' }}>
            {areaSeleccionada ? 'Sin registros para esta área' : 'Seleccione un área para ver historial'}
          </Text>
        ) : Platform.OS === 'web' ? (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', padding: 6, borderBottomWidth: 1, borderColor: '#ccc' }}>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Empresa</Text>
              <Text style={{ flex: 2, fontWeight: 'bold', fontSize: 11 }}>Actividad</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Hora ingreso</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Solicitante</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Supervisor</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Patente</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Hora salida</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Estado</Text>
              <Text style={{ width: 90, fontWeight: 'bold', fontSize: 11 }}>Acciones</Text>
            </View>
            {historialFiltrado.map((reg) => (
              <View key={reg.id} style={{ flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.empresa_nombre || '-'}</Text>
                <Text style={{ flex: 2, fontSize: 10 }} numberOfLines={1}>{reg.actividad || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.hora_ingreso || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.solicitante?.nombre || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.supervisor?.nombre || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.patente_vehiculo || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10 }}>{reg.hora_salida || '-'}</Text>
                <Text style={{ flex: 1, fontSize: 10, fontWeight: 'bold', color: reg.estado === 'Autorizado' && reg.hora_salida && reg.hora_salida !== '-' ? 'purple' : reg.estado === 'Autorizado' ? 'green' : reg.estado === 'Rechazado' ? 'red' : 'orange' }}>
                  {reg.estado === 'Autorizado' && reg.hora_salida && reg.hora_salida !== '-' ? 'Finalizado' : reg.estado || 'Pendiente'}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: reg.estado === 'Pendiente' ? '#ccc' : '#f77c00', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, width: 90 }}
                  onPress={() => { if (reg.estado !== 'Pendiente') { setIdRegistroSalida(reg.id); setMostrarFormSalida(true); } }}
                  disabled={reg.estado === 'Pendiente'}
                >
                  <Text style={{ color: reg.estado === 'Pendiente' ? '#666' : 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
                    {reg.estado === 'Pendiente' ? 'Pendiente' : (reg.hora_salida && reg.hora_salida !== '-' ? 'Modificar salida' : 'Ingresar salida')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <View style={{ padding: 8 }}>
            {historialFiltrado.map((reg) => {
              const estadoLabel = reg.estado === 'Autorizado' && reg.hora_salida && reg.hora_salida !== '-' ? 'Finalizado' : reg.estado || 'Pendiente';
              const estadoColor = estadoLabel === 'Finalizado' ? 'purple' : reg.estado === 'Autorizado' ? 'green' : reg.estado === 'Rechazado' ? 'red' : 'orange';
              return (
                <View key={reg.id} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#2e7d32', flex: 1 }}>{reg.empresa_nombre || '-'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: estadoColor }}>{estadoLabel}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>Actividad:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.actividad || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>H. Ingreso:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.hora_ingreso || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>Solicitante:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.solicitante?.nombre || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>Supervisor:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.supervisor?.nombre || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>Patente:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.patente_vehiculo || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}><Text style={{ fontWeight: 'bold', fontSize: 12, color: '#555', width: 90 }}>H. Salida:</Text><Text style={{ fontSize: 12, flex: 1 }}>{reg.hora_salida || '-'}</Text></View>
                  <TouchableOpacity
                    style={{ backgroundColor: reg.estado === 'Pendiente' ? '#ccc' : '#f77c00', padding: 8, borderRadius: 4, alignItems: 'center' }}
                    onPress={() => { if (reg.estado !== 'Pendiente') { setIdRegistroSalida(reg.id); setMostrarFormSalida(true); } }}
                    disabled={reg.estado === 'Pendiente'}
                  >
                    <Text style={{ color: reg.estado === 'Pendiente' ? '#666' : 'white', fontSize: 13, fontWeight: 'bold' }}>
                      {reg.estado === 'Pendiente' ? 'Pendiente' : (reg.hora_salida && reg.hora_salida !== '-' ? 'Modificar salida' : 'Ingresar salida')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      </ScrollView>

      <Modal
        visible={mostrarFormSalida}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarFormSalida(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingBottom: 40 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 12, textAlign: 'center', fontSize: 16 }}>Registrar Hora de Salida</Text>

            <Text style={{ fontSize: 13, marginBottom: 4 }}>Hora:</Text>
            <TextInput
              style={[styles.inputAzul, { marginBottom: 12 }]}
              placeholder="Ej: 17:30"
              placeholderTextColor="#888"
              value={horaSalida}
              onChangeText={setHoraSalida}
            />

            <Text style={{ fontSize: 13, marginBottom: 4 }}>Observación:</Text>
            <TextInput
              style={[styles.inputAzul, { minHeight: 60, textAlignVertical: 'top', marginBottom: 12 }]}
              placeholder="Observaciones adicionales"
              placeholderTextColor="#888"
              value={observacionSalida}
              onChangeText={setObservacionSalida}
              multiline
            />

            <TouchableOpacity
              style={{ backgroundColor: '#0066b3', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 10 }}
              onPress={guardarSalida}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Guardar salida</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 10, alignItems: 'center' }}
              onPress={() => setMostrarFormSalida(false)}
            >
              <Text style={{ color: '#666', fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding:15,
    backgroundColor:'#fff'
  },
  menuNav: {
    flexDirection:'row',
    justifyContent:'center',
    marginBottom:20,
    borderBottomWidth:1,
    borderBottomColor:'#ccc',
    paddingTop: Platform.OS === 'web' ? 10 : 35
  },
  menuItem: {
    paddingHorizontal:20,
    fontSize:16,
    color:'#666'
  },
  menuItemActivo: {
    paddingHorizontal:20,
    fontSize:16,
    fontWeight:'bold',
    color:'#0066b3',
    borderBottomWidth:2,
    borderBottomColor:'#0066b3',
    paddingBottom:5
  },
  menuItemActivoText: {
    fontWeight:'bold',
    color:'#0066b3'
  },
  titulo: {
    fontSize:18,
    fontWeight:'bold',
    textAlign:'center',
    marginBottom:20
  },
  label: {
    fontWeight:'bold',
    marginTop:12,
    marginBottom:4
  },
  inputAzul: {
    borderWidth:1,
    borderColor:'#ccc',
    padding:8,
    borderRadius:4,
    backgroundColor:'#e0f0fa',
    color:'#000'
  },
  inputGrande: {
    borderWidth:1,
    borderColor:'#ccc',
    padding:8,
    borderRadius:4,
    backgroundColor:'#e0f0fa',
    minHeight:60,
    textAlignVertical:'top',
    color:'#000'
  },
  fila2: {
    flexDirection:'row',
    gap:10
  },
  fila3: {
    flexDirection:'row',
    alignItems:'center'
  },
  col: {
    flex:1
  },
  pickerContainer: {
    borderWidth:1,
    borderColor:'#ccc',
    borderRadius:4,
    backgroundColor:'#e0f0fa',
    marginVertical:5
  },
  picker: {
    height: Platform.OS === 'android' ? 56 : 45,
    color: '#000'
  },
  separador: {
    fontWeight:'bold',
    color:'#0066b3',
    marginVertical:15,
    textAlign:'center'
  },
  btnNaranja: {
    backgroundColor:'#f7941e',
    padding:8,
    borderRadius:4
  },
  btnRojo: {
    backgroundColor:'#d32f2f',
    padding:6,
    borderRadius:4
  },
  tabla: {
    borderWidth:1,
    borderColor:'#ccc',
    padding:8,
    borderRadius:4,
    marginVertical:10
  },
  txtTabla: {
    fontWeight:'bold',
    marginBottom:5
  },
  filaTabla: {
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    paddingVertical:3,
    borderBottomWidth:1,
    borderBottomColor:'#eee'
  },
  btnArchivo: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#666',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5
  },
  filaEstado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  btnIngresar: {
    backgroundColor: '#0066b3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3
  },
  btnVerde: {
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 20
  },
  txtBlanco: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16
  }
});