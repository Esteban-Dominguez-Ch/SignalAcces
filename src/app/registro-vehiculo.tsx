// src/app/registro-vehiculo.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { guardarRegistroVehiculo, subirImagen } from '../services/dbService';
import { actualizarCampoFormulario } from '../services/formStore';
import { clearDraft, loadDraft, saveDraft } from '../services/draftService';
import { enqueueOp } from '../services/offlineQueue';

export default function RegistroVehiculo() {
  const navigation = useNavigation();
  const route = useRoute();
  const { idRegistro } = route.params as { idRegistro: string };


  const [patente, setPatente] = useState('');
  const [nombreConductor, setNombreConductor] = useState('');
  const [rutConductor, setRutConductor] = useState('');
  const [imagenART, setImagenART] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    tiene_cuñas: false,
    tiene_extintor: false,
    checklist_fatiga: false,
    documentacion_al_dia: false,
    luces_funcionales: false,
    baliza_funcional: false,
    traccion_4x4: false,
    neumaticos: false,
    aire_acondicionado: false,
    cinturones_seguridad: false,
    alarma_retroceso: false,
    detalles_carroceria: '',
    observaciones: ''
  });

  const toggleCheck = (campo: keyof typeof form) => {
    setForm(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const [mostrarMensaje, setMostrarMensaje] = useState(false);
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | 'advertencia'>('exito');
  const [textoMensaje, setTextoMensaje] = useState('');

  const mostrarExito = (mensaje: string) => {
    setTipoMensaje('exito'); setTextoMensaje(mensaje); setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };
  const mostrarAdvertencia = (mensaje: string) => {
    setTipoMensaje('advertencia'); setTextoMensaje(mensaje); setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  // Cargar borrador al abrir la pantalla
  useEffect(() => {
    (async () => {
      const draft = await loadDraft(`vehiculo_${idRegistro}`);
      if (draft) {
        setPatente(draft.patente || '');
        setNombreConductor(draft.nombreConductor || '');
        setRutConductor(draft.rutConductor || '');
        setImagenART(draft.imagenART || null);
        if (draft.form) setForm(draft.form);
      }
    })();
  }, [idRegistro]);

  // Guardar borrador cuando cambia algún campo
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(`vehiculo_${idRegistro}`, { patente, nombreConductor, rutConductor, imagenART, form });
    }, 500);
    return () => clearTimeout(timer);
  }, [patente, nombreConductor, rutConductor, imagenART, form]);

  const seleccionarART = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
    if (!result.canceled) setImagenART(result.assets[0].uri);
  };

  const guardarDatos = async () => {
    if (!patente.trim() || !nombreConductor.trim() || !rutConductor.trim() || !form.detalles_carroceria.trim() || !imagenART) {
      mostrarAdvertencia('Debes completar: Patente, Conductor, RUT, Detalles de carrocería e imagen ART');
      return;
    }

    const datosVehiculo = {
      patente: patente.trim(),
      nombre_conductor: nombreConductor.trim(),
      rut_conductor: rutConductor.trim(),
      imagen_art: '',
      ...form
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

    if (!hayInternet) {
      await enqueueOp({
        type: 'guardarVehiculo',
        localId: idRegistro,
        payload: { idRegistro, datos: datosVehiculo, imagenARTLocalUri: imagenART },
      });
      await actualizarCampoFormulario('registroVehiculoGuardado', true);
      await clearDraft(`vehiculo_${idRegistro}`);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
      setTimeout(() => navigation.goBack(), 1500);
      return;
    }

    try {
      let urlART = '';
      if (imagenART) {
        urlART = await subirImagen(imagenART, `ART_${idRegistro}.jpg`);
      }
      await guardarRegistroVehiculo(idRegistro, { ...datosVehiculo, imagen_art: urlART });
      await actualizarCampoFormulario('registroVehiculoGuardado', true);
      await clearDraft(`vehiculo_${idRegistro}`);
      mostrarExito('Registro de vehículo guardado correctamente.');
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      await enqueueOp({
        type: 'guardarVehiculo',
        localId: idRegistro,
        payload: { idRegistro, datos: datosVehiculo, imagenARTLocalUri: imagenART },
      });
      await actualizarCampoFormulario('registroVehiculoGuardado', true);
      await clearDraft(`vehiculo_${idRegistro}`);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
      setTimeout(() => navigation.goBack(), 1500);
    }
  };

  const volverAPermiso = () => {
    navigation.goBack();
  }

return (
  <View style={{ flex: 1, backgroundColor: '#fff', padding: 15 }}>
    {mostrarMensaje && (
      <View style={{ position: 'absolute', bottom: 20, left: 15, right: 15, backgroundColor: tipoMensaje === 'advertencia' ? '#fff8e1' : '#e8f5e9', borderWidth: 1, borderColor: tipoMensaje === 'advertencia' ? '#ffb300' : '#66bb6a', borderRadius: 8, padding: 15, zIndex: 9999, elevation: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
        <View style={{ width: 35, height: 35, borderRadius: 20, backgroundColor: tipoMensaje === 'advertencia' ? '#ffb300' : '#66bb6a', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>!</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>{textoMensaje}</Text>
      </View>
    )}
    <ScrollView showsVerticalScrollIndicator={false}>
      
      {/* Botón Volver */}
      <TouchableOpacity
        style={{
          backgroundColor: '#666',
          padding: 10,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 20,
          width: '30%'
        }}
        onPress={volverAPermiso}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>⬅️ VOLVER</Text>
      </TouchableOpacity>

      {/* Título */}
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
        REGISTRO DE VEHÍCULO
      </Text>

      {/* Campos obligatorios */}
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Patente: <Text style={{ color: 'red' }}>*</Text></Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          marginBottom: 15,
          color: '#000'
        }}
        value={patente}
        onChangeText={setPatente}
        placeholder="Ej: ABC-123"
        placeholderTextColor="#888"
        autoCapitalize="characters"
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Nombre Conductor: <Text style={{ color: 'red' }}>*</Text></Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          marginBottom: 15,
          color: '#000'
        }}
        value={nombreConductor}
        onChangeText={setNombreConductor}
        placeholder="Ej: Juan Pérez"
        placeholderTextColor="#888"
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>RUT Conductor: <Text style={{ color: 'red' }}>*</Text></Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          marginBottom: 15,
          color: '#000'
        }}
        value={rutConductor}
        onChangeText={setRutConductor}
        placeholder="Ej: 12.345.678-9"
        placeholderTextColor="#888"
      />

      {/* Preguntas SI / NO */}
      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Cuenta con 2 cuñas?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.tiene_cuñas ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('tiene_cuñas')}
        >
          <Text style={{ color: form.tiene_cuñas ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.tiene_cuñas ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('tiene_cuñas')}
        >
          <Text style={{ color: !form.tiene_cuñas ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Cuenta con extintor?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.tiene_extintor ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('tiene_extintor')}
        >
          <Text style={{ color: form.tiene_extintor ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.tiene_extintor ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('tiene_extintor')}
        >
          <Text style={{ color: !form.tiene_extintor ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Presenta síntomas de fatiga?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.checklist_fatiga ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('checklist_fatiga')}
        >
          <Text style={{ color: form.checklist_fatiga ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.checklist_fatiga ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('checklist_fatiga')}
        >
          <Text style={{ color: !form.checklist_fatiga ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Documentación al día?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.documentacion_al_dia ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('documentacion_al_dia')}
        >
          <Text style={{ color: form.documentacion_al_dia ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.documentacion_al_dia ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('documentacion_al_dia')}
        >
          <Text style={{ color: !form.documentacion_al_dia ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Luces funcionales?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.luces_funcionales ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('luces_funcionales')}
        >
          <Text style={{ color: form.luces_funcionales ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.luces_funcionales ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('luces_funcionales')}
        >
          <Text style={{ color: !form.luces_funcionales ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Baliza funcional?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.baliza_funcional ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('baliza_funcional')}
        >
          <Text style={{ color: form.baliza_funcional ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.baliza_funcional ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('baliza_funcional')}
        >
          <Text style={{ color: !form.baliza_funcional ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Tracción 4x4 operativa?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.traccion_4x4 ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('traccion_4x4')}        >
          <Text style={{ color: form.traccion_4x4 ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.traccion_4x4 ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('traccion_4x4')}
        >
          <Text style={{ color: !form.traccion_4x4 ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Neumáticos en buen estado?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.neumaticos ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('neumaticos')}
        >
          <Text style={{ color: form.neumaticos ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.neumaticos ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('neumaticos')}
        >
          <Text style={{ color: !form.neumaticos ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Aire acondicionado funcional?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.aire_acondicionado ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('aire_acondicionado')}
        >
          <Text style={{ color: form.aire_acondicionado ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.aire_acondicionado ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('aire_acondicionado')}
        >
          <Text style={{ color: !form.aire_acondicionado ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Cinturones de seguridad operativos?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.cinturones_seguridad ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('cinturones_seguridad')}
        >
          <Text style={{ color: form.cinturones_seguridad ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.cinturones_seguridad ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('cinturones_seguridad')}
        >
          <Text style={{ color: !form.cinturones_seguridad ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>¿Alarma de retroceso funcional?</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: form.alarma_retroceso ? 'green' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('alarma_retroceso')}
        >
          <Text style={{ color: form.alarma_retroceso ? 'white' : '#333' }}>SI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: !form.alarma_retroceso ? 'red' : '#ddd',
            padding: 8,
            borderRadius: 5,
            width: 60,
            alignItems: 'center'
          }}
          onPress={() => toggleCheck('alarma_retroceso')}
        >
          <Text style={{ color: !form.alarma_retroceso ? 'white' : '#333' }}>NO</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Detalles de carrocería: <Text style={{ color: 'red' }}>*</Text></Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          marginBottom: 15,
          minHeight: 80,
          textAlignVertical: 'top',
          color: '#000'
        }}
        multiline
        numberOfLines={4}
        value={form.detalles_carroceria}
        onChangeText={(text) => setForm({...form, detalles_carroceria: text})}
        placeholder="Describe daños, rayones o detalles del vehículo..."
        placeholderTextColor="#888"
      />

      <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Observaciones:</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 5,
          height: 80,
          textAlignVertical: 'top',
          marginBottom: 20,
          color: '#000'
        }}
        multiline
        numberOfLines={4}
        value={form.observaciones}
        onChangeText={(text) => setForm({...form, observaciones: text})}
        placeholder="Escriba aquí cualquier observación adicional..."
        placeholderTextColor="#888"
      />

      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>ART Conducción: <Text style={{ color: 'red' }}>*</Text></Text>
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#666',
          padding: 10,
          borderRadius: 4,
          marginBottom: 10
        }}
        onPress={seleccionarART}
      >
        <Text style={{ textAlign: 'center' }}>{imagenART ? '✅ ART cargado' : '📎 Subir ART conducción'}</Text>
      </TouchableOpacity>
      {imagenART && <Image source={{ uri: imagenART }} style={{ width: 120, height: 120, marginVertical: 5, alignSelf: 'center', marginBottom: 15 }} />}

      <TouchableOpacity
        style={{
          backgroundColor: '#2E86C1',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 30
        }}
        onPress={guardarDatos}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>GUARDAR REGISTRO</Text>
      </TouchableOpacity>

    </ScrollView>
  </View>
);
}