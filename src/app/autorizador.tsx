import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Timestamp, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebase';
import {
  getHistorialRegistros,
  getNovedades,
  getRegistrosPendientes,
  guardarNovedad,
  validarUsuarioAutorizador
} from '../services/dbService';

type RootStackParamList = {
  'index': undefined;
  'crear-registro': undefined;
  'autorizador': undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ÁREAS Y UBICACIONES
const ordenDeseado = ["Chancador", "Aprom Secundario", "Sacrificio", "Intermedia"];
const ordenLineas = ["Linea 1", "Linea 2", "Linea 3"];

//TIPOS
type Usuario = { id: string; usuario: string; contraseña: string };
type RegistroPendiente = {
  id: string;
  empresa_nombre?: string;
  fecha?: Timestamp;
  actividad?: string;
  patente_vehiculo?: string;
  area_nombre?: string;
  ubicacion_area?: string;
  trabajadores?: Array<{nombre:string; rut:string; cargo:string}>;
  estado?: 'Pendiente' | 'Autorizado' | 'Rechazado' | 'Eliminado' | 'Finalizado';
  nombre_autorizador?: string;
  sap_autorizador?: string;
  fecha_autorizacion?: Timestamp;
  hora_salida?: string;
  observaciones_salida?: string;
  imagen_art?: string;
  imagen_r006?: string;
  [key: string]: any;
};
type Novedad = {
  id?: string;
  area?: string;
  ubicacion?: string;
  texto?: string;
  fecha?: Date;
  [key: string]: any;
};

export default function Autorizador() {
  const navigation = useNavigation<NavigationProp>();

  const [estaLogeado, setEstaLogeado] = useState(false);
  const [login, setLogin] = useState({ usuario: '', contraseña: '' });

  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [nombreAutorizador, setNombreAutorizador] = useState('');
  const [sapAutorizador, setSapAutorizador] = useState('');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');

  const [registrosPendientes, setRegistrosPendientes] = useState<RegistroPendiente[]>([]);
  const [registrosHistorial, setRegistrosHistorial] = useState<RegistroPendiente[]>([]);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroPendiente|null>(null);
  const [docVehiculo, setDocVehiculo] = useState<any>(null);
  const [docChecklist, setDocChecklist] = useState<any>(null);

  const [areaNovedad, setAreaNovedad] = useState('');
  const [novedadTexto, setNovedadTexto] = useState('');
  const [listaNovedades, setListaNovedades] = useState<Novedad[]>([]);
  const [novedadEditarId, setNovedadEditarId] = useState<string|null>(null);

  const [mostrarMensaje, setMostrarMensaje] = useState(false);
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | 'advertencia'>('exito');
  const [textoMensaje, setTextoMensaje] = useState('');

  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [dpDia, setDpDia] = useState(new Date().getDate());
  const [dpMes, setDpMes] = useState(new Date().getMonth());
  const [dpAno, setDpAno] = useState(new Date().getFullYear());

  const mostrarAdvertencia = (mensaje: string) => {
    setTipoMensaje('advertencia');
    setTextoMensaje(mensaje);
    setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  const exportarDetallePDF = async (reg: RegistroPendiente) => {
    let docVeh: any = null;
    let docCheck: any = null;
    try {
      const vehiculosSnap = await getDocs(collection(db, 'RegistrosIngreso', reg.id, 'registroVehiculo'));
      if (!vehiculosSnap.empty) docVeh = vehiculosSnap.docs[0].data() || {};
    } catch (e) {}
    try {
      const checklistSnap = await getDocs(collection(db, 'RegistrosIngreso', reg.id, 'checklistSupervisor'));
      if (!checklistSnap.empty) docCheck = checklistSnap.docs[0].data() || {};
    } catch (e) {}

    const estadoColor = reg?.estado === 'Autorizado' ? '#2e7d32' : reg?.estado === 'Rechazado' ? '#d32f2f' : '#333';
    const html = `
      <h2>DETALLE COMPLETO DEL PERMISO</h2>
      <hr>

      <h3>📋 Datos Generales</h3>
      <p><strong>Empresa:</strong> ${reg?.empresa_nombre || '-'}</p>
      <p><strong>Área:</strong> ${reg?.area_nombre || '-'}</p>
      <p><strong>Ubicación:</strong> ${reg?.ubicacion_area || '-'}</p>
      <p><strong>Fecha / Hora Ingreso:</strong> ${reg?.fecha?.toDate?.()?.toLocaleString() || '-'}</p>
      <p><strong>Actividad:</strong> ${reg?.actividad || '-'}</p>
      <p><strong>Patente Vehículo:</strong> ${reg?.patente_vehiculo || '-'}</p>
      ${reg?.hora_salida ? `<p><strong>Hora Salida:</strong> ${reg.hora_salida}</p>` : ''}
      ${reg?.observaciones_salida ? `<p><strong>Obs. Salida:</strong> ${reg.observaciones_salida}</p>` : ''}

      <h3>👤 Solicitante</h3>
      <p><strong>Nombre:</strong> ${reg?.solicitante?.nombre || '-'}</p>
      <p><strong>RUT:</strong> ${reg?.solicitante?.rut || '-'}</p>

      <h3>🦺 Supervisor</h3>
      <p><strong>Nombre:</strong> ${reg?.supervisor?.nombre || '-'}</p>
      <p><strong>RUT:</strong> ${reg?.supervisor?.rut || '-'}</p>

      <h3>👷 Personas que Ingresan</h3>
      ${reg?.trabajadores?.length ? reg.trabajadores.map(t => `<p>- ${t?.nombre || '-'} | RUT: ${t?.rut || '-'} | Cargo: ${t?.cargo || '-'}</p>`).join('') : '<p>Sin registro de personas</p>'}

      <h3>🚗 Registro Vehículo</h3>
      ${docVeh && Object.keys(docVeh).length > 0 ? `
        <p><strong>Patente:</strong> ${docVeh?.patente || '-'}</p>
        <p><strong>Conductor:</strong> ${docVeh?.nombre_conductor || '-'}</p>
        <p><strong>RUT Conductor:</strong> ${docVeh?.rut_conductor || '-'}</p>
        <p><strong>2 Cuñas:</strong> ${docVeh?.tiene_cuñas ? 'Sí' : 'No'}</p>
        <p><strong>Extintor:</strong> ${docVeh?.tiene_extintor ? 'Sí' : 'No'}</p>
        <p><strong>Síntomas de fatiga:</strong> ${docVeh?.checklist_fatiga ? 'Sí' : 'No'}</p>
        <p><strong>Documentación al día:</strong> ${docVeh?.documentacion_al_dia ? 'Sí' : 'No'}</p>
        <p><strong>Luces funcionales:</strong> ${docVeh?.luces_funcionales ? 'Sí' : 'No'}</p>
        <p><strong>Baliza funcional:</strong> ${docVeh?.baliza_funcional ? 'Sí' : 'No'}</p>
        <p><strong>Tracción 4x4:</strong> ${docVeh?.traccion_4x4 ? 'Sí' : 'No'}</p>
        <p><strong>Neumáticos OK:</strong> ${docVeh?.neumaticos ? 'Sí' : 'No'}</p>
        <p><strong>Aire acondicionado:</strong> ${docVeh?.aire_acondicionado ? 'Sí' : 'No'}</p>
        <p><strong>Cinturones:</strong> ${docVeh?.cinturones_seguridad ? 'Sí' : 'No'}</p>
        <p><strong>Alarma retroceso:</strong> ${docVeh?.alarma_retroceso ? 'Sí' : 'No'}</p>
        <p><strong>Detalles carrocería:</strong> ${docVeh?.detalles_carroceria || 'Ninguno'}</p>
        ${docVeh?.observaciones ? `<p><strong>Observaciones:</strong> ${docVeh.observaciones}</p>` : ''}
      ` : '<p>Sin registro de vehículo</p>'}

      <h3>✅ Checklist Supervisor</h3>
      ${docCheck && Object.keys(docCheck).length > 0 ? `
        <p><strong>Condiciones físicas/psicológicas:</strong> ${docCheck?.condiciones_fisicas_psicologicas ? 'Sí' : 'No'}</p>
        <p><strong>EPP adecuado:</strong> ${docCheck?.epp_adecuado ? 'Sí' : 'No'}</p>
        <p><strong>Personal BEL a cargo:</strong> ${docCheck?.tiene_personal_bel ? 'Sí' : 'No'}</p>
        <p><strong>Conoce procedimientos de emergencia:</strong> ${docCheck?.conoce_procedimientos_emergencia ? 'Sí' : 'No'}</p>
        <p><strong>Ha realizado la actividad antes:</strong> ${docCheck?.ha_realizado_actividad_antes ? 'Sí' : 'No'}</p>
        <p><strong>Herramientas y equipos OK:</strong> ${docCheck?.herramientas_y_equipos ? 'Sí' : 'No'}</p>
        <p><strong>Personal certificado:</strong> ${docCheck?.personal_certificado ? 'Sí' : 'No'}</p>
        <p><strong>Permisos específicos:</strong> ${docCheck?.cuenta_con_permisos_especificos ? 'Sí' : 'No'}</p>
        <p><strong>Conoce ruta de evacuación:</strong> ${docCheck?.conoce_ruta_evacuacion ? 'Sí' : 'No'}</p>
        <p><strong>Conoce riesgos asociados:</strong> ${docCheck?.conoce_riesgos_asociados ? 'Sí' : 'No'}</p>
        ${docCheck?.observaciones ? `<p><strong>Observaciones:</strong> ${docCheck.observaciones}</p>` : ''}
      ` : '<p>Sin checklist registrado</p>'}

      <h3>📎 Documentos / Fotos</h3>
      ${docVeh?.imagen_art ? `<p><strong>ART Conducción:</strong></p><img src="${docVeh.imagen_art}" style="max-width:320px;max-height:240px;width:auto;height:auto;margin:8px 0;border:1px solid #ccc;border-radius:4px;display:block"/>` : ''}
      ${reg?.url_r006 ? `<p><strong>R006:</strong></p><img src="${reg.url_r006}" style="max-width:320px;max-height:240px;width:auto;height:auto;margin:8px 0;border:1px solid #ccc;border-radius:4px;display:block"/>` : ''}
      ${!docVeh?.imagen_art && !reg?.url_r006 ? '<p>Sin documentos adjuntos</p>' : ''}

      <h3>📌 Estado Actual</h3>
      <p><strong>Estado:</strong> <span style="color:${estadoColor};font-weight:bold">${reg?.estado || '-'}</span></p>
      ${reg?.nombre_autorizador ? `
        <p><strong>Autorizador:</strong> ${reg.nombre_autorizador}</p>
        <p><strong>SAP:</strong> ${reg.sap_autorizador}</p>
        <p><strong>Fecha Autorización:</strong> ${reg?.fecha_autorizacion?.toDate?.()?.toLocaleString() || '-'}</p>
      ` : ''}
    `;
    try {
      if (Platform.OS === 'web') {
        const win = (window as any).open('', '_blank');
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Detalle Permiso</title>
            <style>
              body{font-family:Arial,sans-serif;padding:30px;max-width:800px;margin:0 auto;color:#333}
              h2{color:#0066b3;text-align:center;margin-bottom:5px}
              h3{color:#0066b3;margin-top:20px;border-bottom:2px solid #0066b3;padding-bottom:4px}
              p{margin:3px 0;font-size:14px}
              hr{border:none;border-top:1px solid #ccc;margin:10px 0}
              .estado-autorizado{color:#2e7d32;font-weight:bold}
              .estado-rechazado{color:#d32f2f;font-weight:bold}
              @media print{.no-print{display:none}}
            </style>
          </head><body>${html}
          <br><button class="no-print" onclick="window.print()" style="background:#0066b3;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-size:14px">Imprimir / Guardar PDF</button>
          </body></html>`);
          win.document.close();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) { Alert.alert('❌', 'Error al generar PDF'); }
  };

  // Recarga cuando cambia la ubicacion o fecha seleccionada
  React.useEffect(() => {
    if (estaLogeado) {
      cargarDatos();
    }
  }, [ubicacionSeleccionada, fechaSeleccionada]);

  // Valida credenciales contra la coleccion "login" en Firestore
  const iniciarSesion = async () => {
    if (!login.usuario || !login.contraseña) return Alert.alert('⚠️', 'Ingrese usuario y contraseña');
    try {
      const usuarioValido = await validarUsuarioAutorizador(login.usuario, login.contraseña);
      if (usuarioValido) {
        setEstaLogeado(true);
        cargarDatos();
      } else Alert.alert('❌', 'Usuario o contraseña incorrectos');
    } catch (e) { Alert.alert('❌', 'Error de conexión') }
  };

  // Carga pendientes, historial y novedades con filtros de fecha y ubicacion
  const cargarDatos = async () => {
    const toFechaLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    };
    const fechaStr = toFechaLocal(fechaSeleccionada);

    try {
      const resPendientes = await getRegistrosPendientes();
      const todosPendientes: RegistroPendiente[] = Array.isArray(resPendientes) ? resPendientes : [];
      const filtradosPendientes = todosPendientes
        .filter(reg => {
          const regDate = reg?.fecha?.toDate?.();
          const regFechaStr = regDate ? toFechaLocal(regDate) : '';
          const okFecha = regFechaStr === fechaStr;
          const okUbicacion = ubicacionSeleccionada ? reg?.ubicacion_area === ubicacionSeleccionada : true;
          return okFecha && okUbicacion;
        })
        .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0));
      setRegistrosPendientes(filtradosPendientes);
    } catch (e) {
      console.error('Error cargando pendientes:', e);
      setRegistrosPendientes([]);
    }

    try {
      const resHistorial = await getHistorialRegistros();
      const todosHistorial: RegistroPendiente[] = Array.isArray(resHistorial) ? resHistorial : [];
      const filtradosHistorial = todosHistorial
        .filter(reg => {
          if (!ubicacionSeleccionada) return false;
          const regDate = reg?.fecha?.toDate?.();
          const regFechaStr = regDate ? toFechaLocal(regDate) : '';
          const okFecha = regFechaStr === fechaStr;
          const okUbicacion = reg?.ubicacion_area === ubicacionSeleccionada;
          const okEstado = reg?.estado === 'Autorizado' || reg?.estado === 'Rechazado' || reg?.estado === 'Finalizado';
          return okFecha && okUbicacion && okEstado;
        })
        .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0));
      setRegistrosHistorial(filtradosHistorial);
    } catch (e) {
      console.error('Error cargando historial:', e);
      setRegistrosHistorial([]);
    }

    try {
      const resNovedades = await getNovedades();
      const todasNovedades: Novedad[] = Array.isArray(resNovedades) ? resNovedades : [];
      setListaNovedades(todasNovedades);
    } catch (e) {
      console.error('Error cargando novedades:', e);
      setListaNovedades([]);
    }
  };

  // Carga subcolecciones del registro antes de abrir el modal de detalle
  const verDetalle = async (reg: RegistroPendiente) => {
    setRegistroSeleccionado(reg);
    setDocVehiculo(null);
    setDocChecklist(null);

    try {
      const vehiculosSnap = await getDocs(collection(db, 'RegistrosIngreso', reg.id, 'registroVehiculo'));
      if (!vehiculosSnap.empty) setDocVehiculo(vehiculosSnap.docs[0].data() || {});
    } catch (e) { console.log(e); }

    try {
      const checklistSnap = await getDocs(collection(db, 'RegistrosIngreso', reg.id, 'checklistSupervisor'));
      if (!checklistSnap.empty) setDocChecklist(checklistSnap.docs[0].data() || {});
    } catch (e) { console.log(e); }

    setModalDetalle(true);
  };

  // Cambia el estado del registro: Autorizado, Rechazado, o lo elimina permanentemente
  const cambiarEstado = async (id: string, nuevoEstado: 'Autorizado' | 'Rechazado' | 'Eliminado') => {
    if (!nombreAutorizador.trim() || !sapAutorizador.trim()) {
      mostrarAdvertencia('Falta ingresar nombre y SAP de autorizador');
      return;
    }

    try {
      if (nuevoEstado === 'Eliminado') {
        await deleteDoc(doc(db, 'RegistrosIngreso', id));
        Alert.alert('✅', 'Registro eliminado');
      } else {
        const ref = doc(db, 'RegistrosIngreso', id);
        await updateDoc(ref, {
          estado: nuevoEstado,
          nombre_autorizador: nombreAutorizador,
          sap_autorizador: sapAutorizador,
          fecha_autorizacion: Timestamp.fromDate(new Date())
        });
        Alert.alert('✅', `Registro ${nuevoEstado}`);
      }
      setModalDetalle(false);
      cargarDatos();
    } catch (e) { Alert.alert('❌', 'Error al actualizar') }
  };


  // Crea o modifica una novedad de seguridad segun si novedadEditarId esta activo
  const guardarOModificarNovedad = async () => {
    if (!ubicacionSeleccionada) {
      mostrarAdvertencia('Favor escoger ubicación y/o área');
      return;
    }
    if (!areaNovedad || !novedadTexto.trim()) {
      mostrarAdvertencia('Debe seleccionar el area ');
      return;
    }
    try {
      if (novedadEditarId) {
        const ref = doc(db, 'novedadesSeguridad', novedadEditarId);
        await updateDoc(ref, {
          area: areaNovedad,
          ubicacion: ubicacionSeleccionada,
          texto: novedadTexto,
          fecha: Timestamp.fromDate(new Date())
        });
      } else {
        await guardarNovedad({
          area: areaNovedad,
          ubicacion: ubicacionSeleccionada,
          texto: novedadTexto
        });
      }
      setAreaNovedad(''); setNovedadTexto(''); setNovedadEditarId(null);
      cargarDatos();
      Alert.alert('✅', 'Novedad guardada');
    } catch (e) { Alert.alert('❌', 'Error') }
  };

  const eliminarNovedad = async (id:string) => {
    await deleteDoc(doc(db, 'novedadesSeguridad', id));
    cargarDatos();
  };

  const editarNovedad = (nov:Novedad) => {
    setAreaNovedad(nov?.area || '');
    setNovedadTexto(nov?.texto || '');
    setNovedadEditarId(nov.id!);
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

      {/* MENU DE NAVEGACION */}
      <View style={styles.menuNav}>
        <TouchableOpacity onPress={() => navigation.navigate('index')}>
          <Text style={styles.menuItem}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('crear-registro')}>
          <Text style={styles.menuItem}>Ingreso permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItemActivo}>
          <Text style={styles.menuItemActivoText}>Autorizador</Text>
        </TouchableOpacity>
      </View>

      {/* LOGIN DEL AUTORIZADOR */}
      {!estaLogeado ? (
        <View style={styles.cajaLogin}>
          <Text style={styles.tituloLogin}>INGRESO AUTORIZADOR</Text>
          <Text style={styles.label}>Usuario</Text>
          <TextInput style={styles.input} value={login.usuario} onChangeText={v=>setLogin({...login,usuario:v})} />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput style={styles.input} secureTextEntry value={login.contraseña} onChangeText={v=>setLogin({...login,contraseña:v})} />
          <TouchableOpacity style={styles.btnAzul} onPress={iniciarSesion}><Text style={styles.txtBlanco}>INGRESAR</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          {/* FILTROS DE FECHA, UBICACION Y DATOS DEL AUTORIZADOR */}
          <View style={styles.filaFiltros}>
            <View style={styles.colFiltro}>
              <Text style={styles.label}>Fecha</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={`${fechaSeleccionada.getFullYear()}-${String(fechaSeleccionada.getMonth()+1).padStart(2,'0')}-${String(fechaSeleccionada.getDate()).padStart(2,'0')}`}
                  onChange={(e: any) => {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setFechaSeleccionada(new Date(y, m - 1, d));
                  }}
                  style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px', backgroundColor: '#fff', fontSize: '14px' }}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.inputChico, { justifyContent: 'center', minHeight: 38 }]}
                  onPress={() => {
                    setDpDia(fechaSeleccionada.getDate());
                    setDpMes(fechaSeleccionada.getMonth());
                    setDpAno(fechaSeleccionada.getFullYear());
                    setMostrarDatePicker(true);
                  }}
                >
                  <Text>{fechaSeleccionada.toLocaleDateString()}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.colFiltroGrande}>
              <Text style={styles.label}>Autorizador (Obligatorio)</Text>
              <TextInput
                style={styles.inputChico}
                placeholder="Nombre completo"
                placeholderTextColor="#888"
                value={nombreAutorizador}
                onChangeText={setNombreAutorizador}
              />
            </View>
            <View style={styles.colFiltro}>
              <Text style={styles.label}>SAP</Text>
              <TextInput
                style={styles.inputChico}
                placeholder="Código SAP"
                placeholderTextColor="#888"
                value={sapAutorizador}
                onChangeText={setSapAutorizador}
              />
            </View>

            <View style={styles.colFiltro}>
              <Text style={styles.label}>Ubicación</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={ubicacionSeleccionada} onValueChange={setUbicacionSeleccionada} style={{ color: '#000' }}>
                  <Picker.Item label="Seleccione una ubicación" value="" />
                  {ordenLineas.map(l => <Picker.Item key={l} label={l} value={l} />)}
                </Picker>
              </View>
            </View>

          </View>

          {/* SOLICITUDES PENDIENTES DE AUTORIZACION */}
          <Text style={styles.tituloSeccion}>Solicitudes de autorización</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.tabla}>
              <View style={styles.filaCabecera}>
                <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Empresa</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Hora Ingreso</Text>
                <Text style={{ flex: 1.2, fontWeight: 'bold', fontSize: 11 }}>Actividad</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Área</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Patente</Text>
                <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Supervisor</Text>
                <Text style={{ flex: 1.8, fontWeight: 'bold', fontSize: 11 }}>Acciones</Text>
              </View>
              {!ubicacionSeleccionada ? (
                <Text style={{ padding: 10, textAlign: 'center', color: '#888' }}>Seleccione una ubicación para ver las solicitudes</Text>
              ) : registrosPendientes.length === 0 ? (
                <Text style={{ padding: 10, textAlign: 'center' }}>Sin solicitudes</Text>
              ) : (
                registrosPendientes.map(r=>(
                  <View key={r.id} style={styles.filaFila}>
                    <Text style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>{r?.empresa_nombre || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.fecha?.toDate?.()?.toLocaleTimeString() || '-'}</Text>
                    <Text style={{ flex: 1.2, fontSize: 10 }} numberOfLines={1}>{r?.actividad || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.area_nombre || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.patente_vehiculo || '-'}</Text>
                    <Text style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>{r?.supervisor?.nombre || '-'}</Text>
                    <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <TouchableOpacity style={styles.btnDetalle} onPress={()=>verDetalle(r)}>
                        <Text style={{fontSize:10}}>Detalle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnVerde} onPress={()=> cambiarEstado(r.id,'Autorizado')}>
                        <Text style={{color:'white',fontSize:10}}>Autorizar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnRojo} onPress={()=> cambiarEstado(r.id,'Rechazado')}>
                        <Text style={{color:'white',fontSize:10}}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnGris} onPress={()=> cambiarEstado(r.id,'Eliminado')}>
                        <Text style={{color:'white',fontSize:10}}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            !ubicacionSeleccionada ? (
              <Text style={{ padding: 10, textAlign: 'center', color: '#888' }}>Seleccione una ubicación para ver las solicitudes</Text>
            ) : registrosPendientes.length === 0 ? (
              <Text style={{ padding: 10, textAlign: 'center' }}>Sin solicitudes</Text>
            ) : (
              registrosPendientes.map(r => (
                <View key={r.id} style={styles.cardMobile}>
                  <Text style={styles.cardTitle}>{r?.empresa_nombre || '-'}</Text>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Hora:</Text><Text style={styles.cardValue}>{r?.fecha?.toDate?.()?.toLocaleTimeString() || '-'}</Text></View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Actividad:</Text><Text style={styles.cardValue}>{r?.actividad || '-'}</Text></View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Área:</Text><Text style={styles.cardValue}>{r?.area_nombre || '-'}</Text></View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Patente:</Text><Text style={styles.cardValue}>{r?.patente_vehiculo || '-'}</Text></View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Supervisor:</Text><Text style={styles.cardValue}>{r?.supervisor?.nombre || '-'}</Text></View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity style={styles.btnDetalle} onPress={() => verDetalle(r)}>
                      <Text style={{ fontSize: 12 }}>Detalle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnVerde} onPress={() => cambiarEstado(r.id, 'Autorizado')}>
                      <Text style={{ color: 'white', fontSize: 12 }}>Autorizar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnRojo} onPress={() => cambiarEstado(r.id, 'Rechazado')}>
                      <Text style={{ color: 'white', fontSize: 12 }}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnGris} onPress={() => cambiarEstado(r.id, 'Eliminado')}>
                      <Text style={{ color: 'white', fontSize: 12 }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}

          {/* HISTORIAL DE INGRESOS AUTORIZADOS Y RECHAZADOS */}
          <Text style={styles.tituloSeccion}>Historial de ingresos</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.tabla}>
              <View style={styles.filaCabecera}>
                <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Empresa</Text>
                <Text style={{ flex: 1.2, fontWeight: 'bold', fontSize: 11 }}>Fecha / Hora</Text>
                <Text style={{ flex: 1.2, fontWeight: 'bold', fontSize: 11 }}>Actividad</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Área</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Patente</Text>
                <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Supervisor</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>H. Salida</Text>
                <Text style={{ flex: 0.8, fontWeight: 'bold', fontSize: 11 }}>Estado</Text>
                <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 11 }}>Autorizador</Text>
                <Text style={{ flex: 0.7, fontWeight: 'bold', fontSize: 11 }}>SAP</Text>
                <Text style={{ width: 115, fontWeight: 'bold', fontSize: 11 }}>Detalle / PDF</Text>
              </View>
              {registrosHistorial.length === 0 ? (
                <Text style={{ padding: 10, textAlign: 'center' }}>Sin registros</Text>
              ) : (
                registrosHistorial.map(r=>(
                  <View key={r.id} style={styles.filaFila}>
                    <Text style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>{r?.empresa_nombre || '-'}</Text>
                    <Text style={{ flex: 1.2, fontSize: 10 }} numberOfLines={1}>{r?.fecha?.toDate?.()?.toLocaleString() || '-'}</Text>
                    <Text style={{ flex: 1.2, fontSize: 10 }} numberOfLines={1}>{r?.actividad || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.area_nombre || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.patente_vehiculo || '-'}</Text>
                    <Text style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>{r?.supervisor?.nombre || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10 }} numberOfLines={1}>{r?.hora_salida || '-'}</Text>
                    <Text style={{ flex: 0.8, fontSize: 10, color: r?.estado === 'Autorizado' ? '#2e7d32' : r?.estado === 'Rechazado' ? '#d32f2f' : r?.estado === 'Finalizado' ? '#6a1b9a' : '#333', fontWeight: 'bold' }} numberOfLines={1}>{r?.estado || '-'}</Text>
                    <Text style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>{r?.nombre_autorizador || '-'}</Text>
                    <Text style={{ flex: 0.7, fontSize: 10 }} numberOfLines={1}>{r?.sap_autorizador || '-'}</Text>
                    <View style={{ width: 115, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      <TouchableOpacity style={[styles.btnDetalle, { flex: 1, justifyContent: 'center' }]} onPress={()=>verDetalle(r)}>
                        <Text style={{fontSize:10, textAlign: 'center'}}>Detalle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#f57c00', padding: 4, borderRadius: 4, flex: 1, alignItems: 'center' }} onPress={()=>exportarDetallePDF(r)}>
                        <Text style={{color: 'white', fontSize: 10}}>PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            registrosHistorial.length === 0 ? (
              <Text style={{ padding: 10, textAlign: 'center' }}>Sin registros</Text>
            ) : (
              registrosHistorial.map(r => {
                const estadoColor = r?.estado === 'Autorizado' ? '#2e7d32' : r?.estado === 'Rechazado' ? '#d32f2f' : r?.estado === 'Finalizado' ? '#6a1b9a' : '#333';
                return (
                  <View key={r.id} style={styles.cardMobile}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.cardTitle}>{r?.empresa_nombre || '-'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: estadoColor }}>{r?.estado || '-'}</Text>
                    </View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Fecha:</Text><Text style={styles.cardValue}>{r?.fecha?.toDate?.()?.toLocaleString() || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Actividad:</Text><Text style={styles.cardValue}>{r?.actividad || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Área:</Text><Text style={styles.cardValue}>{r?.area_nombre || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Patente:</Text><Text style={styles.cardValue}>{r?.patente_vehiculo || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Supervisor:</Text><Text style={styles.cardValue}>{r?.supervisor?.nombre || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>H. Salida:</Text><Text style={styles.cardValue}>{r?.hora_salida || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>Autorizador:</Text><Text style={styles.cardValue}>{r?.nombre_autorizador || '-'}</Text></View>
                    <View style={styles.cardRow}><Text style={styles.cardLabel}>SAP:</Text><Text style={styles.cardValue}>{r?.sap_autorizador || '-'}</Text></View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity style={[styles.btnDetalle, { flex: 1, alignItems: 'center' }]} onPress={() => verDetalle(r)}>
                        <Text style={{ fontSize: 12 }}>Detalle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#f57c00', padding: 6, borderRadius: 4, flex: 1, alignItems: 'center' }} onPress={() => exportarDetallePDF(r)}>
                        <Text style={{ color: 'white', fontSize: 12 }}>PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          )}

          {/* NOVEDADES DE SEGURIDAD Y OPERACIONALES */}
          <Text style={styles.tituloSeccion}>Novedades de seguridad y/o operacionales</Text>

          <View style={styles.fila2}>
            <View style={styles.col}>
              <Text style={styles.label}>Área</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={areaNovedad} onValueChange={setAreaNovedad} style={{ color: '#000' }}>
                  <Picker.Item label="Seleccione área..." value="" />
                  {ordenDeseado.map(nombre => <Picker.Item key={nombre} label={nombre} value={nombre} />)}
                </Picker>
              </View>
            </View>
          </View>

          <TextInput
            style={styles.inputGrande}
            placeholder="Novedades de seguridad y/o operacionales"
            placeholderTextColor="#888"
            value={novedadTexto}
            onChangeText={setNovedadTexto}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.filaBotones}>
            <TouchableOpacity style={styles.btnVerde} onPress={guardarOModificarNovedad}>
              <Text style={styles.txtBlanco}>{novedadEditarId ? 'MODIFICAR' : 'GUARDAR'}</Text>
            </TouchableOpacity>
            {novedadEditarId && (
              <TouchableOpacity style={styles.btnGris} onPress={() => {
                setNovedadEditarId(null); setAreaNovedad(''); setNovedadTexto('');
              }}>
                <Text style={styles.txtBlanco}>CANCELAR</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LISTA DE NOVEDADES FILTRADAS POR UBICACION */}
          {listaNovedades
            .filter(n => {
              if (!ubicacionSeleccionada || n?.ubicacion !== ubicacionSeleccionada) return false;
              return true;
            })
            .map(nov => (
              <View key={nov.id} style={styles.bloqueNovedad}>
                <View style={styles.fila2}>
                  <Text style={styles.areaTexto}><Text style={{fontWeight:'bold'}}>Área:</Text> {nov?.area || '-'}</Text>
                  <Text style={styles.fechaTexto}>{nov?.fecha?.toLocaleString() || '-'}</Text>
                </View>
                <Text style={styles.textoNovedad}>{nov?.texto || '-'}</Text>
                <View style={styles.filaBotones}>
                  <TouchableOpacity style={styles.btnEditar} onPress={() => editarNovedad(nov)}>
                    <Text>Modificar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnEliminar} onPress={() => eliminarNovedad(nov.id!)}>
                    <Text style={{color:'white'}}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

          {/* CERRAR SESION */}
          <TouchableOpacity style={styles.btnSalir} onPress={() => setEstaLogeado(false)}>
            <Text style={styles.txtSalir}>CERRAR SESIÓN</Text>
          </TouchableOpacity>

          {/* MODAL CON DETALLE COMPLETO DEL PERMISO */}
          <Modal visible={modalDetalle} animationType="slide" onRequestClose={()=>setModalDetalle(false)}>
            <ScrollView style={{padding:20}} contentContainerStyle={{paddingBottom:60}}>
              <Text style={styles.tituloModal}>DETALLE COMPLETO DEL PERMISO</Text>

              {registroSeleccionado && (
                <>
                  <Text style={styles.subtitulo}>📋 Datos Generales</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Empresa:</Text> {registroSeleccionado?.empresa_nombre || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Área:</Text> {registroSeleccionado?.area_nombre || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Ubicación:</Text> {registroSeleccionado?.ubicacion_area || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Fecha / Hora Ingreso:</Text> {registroSeleccionado?.fecha?.toDate?.()?.toLocaleString() || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Actividad:</Text> {registroSeleccionado?.actividad || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Patente Vehículo:</Text> {registroSeleccionado?.patente_vehiculo || '-'}</Text>
                  {registroSeleccionado?.hora_salida && <Text><Text style={{fontWeight:'bold'}}>Hora Salida:</Text> {registroSeleccionado.hora_salida}</Text>}
                  {registroSeleccionado?.observaciones_salida ? <Text><Text style={{fontWeight:'bold'}}>Obs. Salida:</Text> {registroSeleccionado.observaciones_salida}</Text> : null}

                  <Text style={styles.subtitulo}>👤 Solicitante</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Nombre:</Text> {registroSeleccionado?.solicitante?.nombre || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>RUT:</Text> {registroSeleccionado?.solicitante?.rut || '-'}</Text>

                  <Text style={styles.subtitulo}>🦺 Supervisor</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Nombre:</Text> {registroSeleccionado?.supervisor?.nombre || '-'}</Text>
                  <Text><Text style={{fontWeight:'bold'}}>RUT:</Text> {registroSeleccionado?.supervisor?.rut || '-'}</Text>

                  <Text style={styles.subtitulo}>👷 Personas que ingresan</Text>
                  {registroSeleccionado?.trabajadores?.length ? (
                    registroSeleccionado.trabajadores.map((t,i)=>(
                      <Text key={i}>- {t?.nombre || '-'} | RUT: {t?.rut || '-'} | Cargo: {t?.cargo || '-'}</Text>
                    ))
                  ) : (
                    <Text>Sin registro de personas</Text>
                  )}

                  <Text style={styles.subtitulo}>🚗 Registro Vehículo</Text>
                  {docVehiculo && Object.keys(docVehiculo).length > 0 ? (
                    <>
                      <Text><Text style={{fontWeight:'bold'}}>Patente:</Text> {docVehiculo?.patente || '-'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Conductor:</Text> {docVehiculo?.nombre_conductor || '-'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>RUT Conductor:</Text> {docVehiculo?.rut_conductor || '-'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>2 Cuñas:</Text> {docVehiculo?.tiene_cuñas ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Extintor:</Text> {docVehiculo?.tiene_extintor ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Síntomas de fatiga:</Text> {docVehiculo?.checklist_fatiga ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Documentación al día:</Text> {docVehiculo?.documentacion_al_dia ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Luces funcionales:</Text> {docVehiculo?.luces_funcionales ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Baliza funcional:</Text> {docVehiculo?.baliza_funcional ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Tracción 4x4:</Text> {docVehiculo?.traccion_4x4 ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Neumáticos OK:</Text> {docVehiculo?.neumaticos ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Aire acondicionado:</Text> {docVehiculo?.aire_acondicionado ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Cinturones:</Text> {docVehiculo?.cinturones_seguridad ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Alarma retroceso:</Text> {docVehiculo?.alarma_retroceso ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Detalles carrocería:</Text> {docVehiculo?.detalles_carroceria || '-'}</Text>
                      {docVehiculo?.observaciones ? <Text><Text style={{fontWeight:'bold'}}>Observaciones:</Text> {docVehiculo.observaciones}</Text> : null}
                    </>
                  ) : <Text>Sin registro de vehículo</Text>}

                  <Text style={styles.subtitulo}>✅ Checklist Supervisor</Text>
                  {docChecklist && Object.keys(docChecklist).length > 0 ? (
                    <>
                      <Text><Text style={{fontWeight:'bold'}}>Condiciones físicas/psicológicas:</Text> {docChecklist?.condiciones_fisicas_psicologicas ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>EPP adecuado:</Text> {docChecklist?.epp_adecuado ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Personal BEL a cargo:</Text> {docChecklist?.tiene_personal_bel ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Conoce procedimientos de emergencia:</Text> {docChecklist?.conoce_procedimientos_emergencia ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Ha realizado la actividad antes:</Text> {docChecklist?.ha_realizado_actividad_antes ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Herramientas y equipos OK:</Text> {docChecklist?.herramientas_y_equipos ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Personal certificado:</Text> {docChecklist?.personal_certificado ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Permisos específicos:</Text> {docChecklist?.cuenta_con_permisos_especificos ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Conoce ruta de evacuación:</Text> {docChecklist?.conoce_ruta_evacuacion ? 'Sí' : 'No'}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Conoce riesgos asociados:</Text> {docChecklist?.conoce_riesgos_asociados ? 'Sí' : 'No'}</Text>
                      {docChecklist?.observaciones ? <Text><Text style={{fontWeight:'bold'}}>Observaciones:</Text> {docChecklist.observaciones}</Text> : null}
                    </>
                  ) : <Text>Sin checklist registrado</Text>}

                  <Text style={styles.subtitulo}>📎 Documentos / Fotos</Text>
                  {docVehiculo?.imagen_art ? (
                    <>
                      <Text>ART Conducción:</Text>
                      <Image source={{uri: docVehiculo.imagen_art}} style={{width:'100%',height:200,marginVertical:5}} resizeMode="contain"/>
                    </>
                  ) : null}
                  {registroSeleccionado?.url_r006 ? (
                    <>
                      <Text>R006:</Text>
                      <Image source={{uri: registroSeleccionado.url_r006}} style={{width:'100%',height:200,marginVertical:5}} resizeMode="contain"/>
                    </>
                  ) : null}
                  {!docVehiculo?.imagen_art && !registroSeleccionado?.url_r006 && <Text>Sin documentos adjuntos</Text>}

                  <Text style={styles.subtitulo}>📌 Estado actual</Text>
                  <Text><Text style={{fontWeight:'bold'}}>Estado:</Text> {registroSeleccionado?.estado || '-'}</Text>
                  {registroSeleccionado?.nombre_autorizador && (
                    <>
                      <Text><Text style={{fontWeight:'bold'}}>Autorizador:</Text> {registroSeleccionado.nombre_autorizador}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>SAP:</Text> {registroSeleccionado.sap_autorizador}</Text>
                      <Text><Text style={{fontWeight:'bold'}}>Fecha Autorización:</Text> {registroSeleccionado?.fecha_autorizacion?.toDate?.()?.toLocaleString() || '-'}</Text>
                    </>
                  )}

                  <TouchableOpacity style={styles.btnCerrarModal} onPress={()=>setModalDetalle(false)}>
                    <Text>CERRAR</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Modal>
        </>
      )}
      </ScrollView>

      {/* DATE PICKER MODAL (solo movil, web usa input type=date nativo) */}
      <Modal visible={mostrarDatePicker} transparent animationType="slide" onRequestClose={() => setMostrarDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingBottom: 40 }}>
            <Text style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 16, marginBottom: 16 }}>Seleccionar fecha</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Día</Text>
                <Picker selectedValue={dpDia} onValueChange={setDpDia} style={{ width: '100%' }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <Picker.Item key={d} label={String(d)} value={d} />
                  ))}
                </Picker>
              </View>
              <View style={{ flex: 2, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Mes</Text>
                <Picker selectedValue={dpMes} onValueChange={setDpMes} style={{ width: '100%' }}>
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                    <Picker.Item key={i} label={m} value={i} />
                  ))}
                </Picker>
              </View>
              <View style={{ flex: 1.2, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Año</Text>
                <Picker selectedValue={dpAno} onValueChange={setDpAno} style={{ width: '100%' }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#0066b3', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 12, marginBottom: 8 }}
              onPress={() => {
                setFechaSeleccionada(new Date(dpAno, dpMes, dpDia));
                setMostrarDatePicker(false);
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Confirmar fecha</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 10, alignItems: 'center' }} onPress={() => setMostrarDatePicker(false)}>
              <Text style={{ color: '#666', fontSize: 13 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ESTILOS FINALES
const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: '#fff' },

  menuNav: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10, paddingTop: Platform.OS === 'web' ? 10 : 35 },
  menuItem: { paddingHorizontal: 20, fontSize: 16, color: '#666' },
  menuItemActivo: { paddingHorizontal: 20, fontSize: 16, fontWeight: 'bold', color: '#0066b3', borderBottomWidth: 2, borderBottomColor: '#0066b3', paddingBottom: 5 },
  menuItemActivoText: { fontWeight: 'bold', color: '#0066b3' },

  cajaLogin: { marginTop: 50, padding: 20, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9' },
  tituloLogin: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 25, color: '#0066b3' },
  label: { fontWeight: 'bold', marginTop: 8, marginBottom: 4, fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 4, backgroundColor: '#fff', marginBottom: 15, color: '#000' },
  inputChico: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, backgroundColor: '#fff', width: '100%', color: '#000' },
  btnAzul: { backgroundColor: '#0066b3', padding: 14, borderRadius: 4, alignItems: 'center', marginTop: 10 },
  btnNaranja: { backgroundColor: '#f57c00', padding: 10, borderRadius: 4, alignItems: 'center', marginVertical: 10 },
  btnVerde: { backgroundColor: '#2e7d32', padding: 6, borderRadius: 4, alignItems: 'center', marginHorizontal:2, paddingHorizontal:6 },
  btnRojo: { backgroundColor: '#d32f2f', padding: 6, borderRadius: 4, alignItems: 'center', marginHorizontal:2, paddingHorizontal:6 },
  btnGris: { backgroundColor: '#757575', padding: 6, borderRadius: 4, alignItems: 'center', marginHorizontal:2, paddingHorizontal:6 },
  txtBlanco: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  filaFiltros: { flexDirection:'row', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' },
  colFiltro: { minWidth: 100, flex: 1 },
  colFiltroGrande: { minWidth: 180, flex: 2 },
  pickerContainer: { borderWidth:1, borderColor:'#ccc', borderRadius:4, backgroundColor:'#fff' },

  tituloSeccion: { fontSize:17, fontWeight:'bold', marginVertical:15, backgroundColor:'#0066b3', color:'white', padding:8, borderRadius:4 },
  tabla: { borderWidth:1, borderColor:'#ccc', borderRadius:4, marginBottom:15 },
  filaCabecera: { flexDirection:'row', backgroundColor:'#e0e0e0', padding: 6, borderBottomWidth: 1, borderColor: '#ccc' },
  filaFila: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#eee', padding: 6, alignItems:'center' },

  btnDetalle: { backgroundColor:'#bbdefb', padding:4, borderRadius:4, marginHorizontal:1 },
  btnNaranjaChico: { backgroundColor:'#f57c00', padding:6, borderRadius:4, alignItems:'center', paddingHorizontal:8 },
  btnGrisChico: { backgroundColor:'#757575', padding:6, borderRadius:4, alignItems:'center', paddingHorizontal:8 },

  fila2: { flexDirection:'row', gap:10 },
  col: { flex:1 },inputGrande: { borderWidth:1, borderColor:'#ccc', padding:12, borderRadius:4, backgroundColor:'#fff', minHeight:80, textAlignVertical:'top', marginVertical:10, color:'#000' },
filaBotones: { flexDirection:'row', gap:10, marginBottom:15 },
bloqueNovedad: { borderWidth:1, borderColor:'#ddd', borderRadius:4, padding:10, marginBottom:8, backgroundColor:'#f9f9f9' },
areaTexto: { fontWeight:'bold', flex:1 },
fechaTexto: { color:'#666', fontSize:12 },
textoNovedad: { marginVertical:5 },
btnEditar: { backgroundColor:'#fff3e0', padding:6, borderRadius:4, paddingHorizontal:10 },
btnEliminar: { backgroundColor:'#d32f2f', padding:6, borderRadius:4, paddingHorizontal:10 },

btnSalir: { marginTop:20, padding:10, borderWidth:1, borderColor:'#d32f2f', borderRadius:4, alignItems:'center' },
txtSalir: { color:'#d32f2f', fontWeight:'bold' },

tituloModal: { fontSize:18, fontWeight:'bold', textAlign:'center', marginBottom:20 },
subtitulo: { fontSize:15, fontWeight:'bold', marginTop:15, marginBottom:5, color:'#0066b3' },
filaBotonesModal: { flexDirection:'row', gap:8, marginVertical:20 },
btnVerdeGrande: { backgroundColor:'#2e7d32', flex:1, padding:12, borderRadius:4, alignItems:'center' },
btnRojoGrande: { backgroundColor:'#d32f2f', flex:1, padding:12, borderRadius:4, alignItems:'center' },
btnGrisGrande: { backgroundColor:'#757575', flex:1, padding:12, borderRadius:4, alignItems:'center' },
btnCerrarModal: { borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:4, alignItems:'center', marginTop:10 },

cardMobile: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:10, backgroundColor:'#fafafa' },
cardTitle: { fontWeight:'bold', fontSize:14, marginBottom:6, color:'#0066b3' },
cardRow: { flexDirection:'row', marginBottom:4, alignItems:'flex-start' },
cardLabel: { fontWeight:'bold', fontSize:12, color:'#555', width:90 },
cardValue: { fontSize:12, flex:1, color:'#333' }
});