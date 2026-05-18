// src/app/checklist-supervisor.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { guardarChecklist } from '../services/dbService';
import { actualizarCampoFormulario, cargarEstadoFormulario } from '../services/formStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { clearDraft, loadDraft, saveDraft } from '../services/draftService';
import { enqueueOp } from '../services/offlineQueue';

export default function ChecklistSupervisor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { idRegistro } = route.params as { idRegistro: string };

  const [fecha] = useState(new Date().toLocaleDateString());
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');


  const [form, setForm] = useState({
    condiciones_fisicas_psicologicas: false,
    epp_adecuado: false,
    tiene_personal_bel: false,
    conoce_procedimientos_emergencia: false,
    ha_realizado_actividad_antes: false,
    herramientas_y_equipos: false,
    personal_certificado: false,
    cuenta_con_permisos_especificos: false,
    conoce_ruta_evacuacion: false,
    conoce_riesgos_asociados: false,
    observaciones: ''
  });

  const toggleCheck = (campo: keyof typeof form) => {
    setForm(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const [mostrarMensaje, setMostrarMensaje] = useState(false);
  const [textoMensaje, setTextoMensaje] = useState('');

  const mostrarExito = (mensaje: string) => {
    setTextoMensaje(mensaje); setMostrarMensaje(true);
    setTimeout(() => setMostrarMensaje(false), 5000);
  };

  useEffect(() => {
    const cargarDatos = async () => {
      const draft = await loadDraft(`checklist_${idRegistro}`);
      if (draft?.form) setForm(draft.form);

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

      if (hayInternet) {
        try {
          const docRef = doc(db, 'RegistrosIngreso', idRegistro);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEmpresa(data.empresa_nombre || '');
            setNombre(data.supervisor?.nombre || '');
            setRut(data.supervisor?.rut || '');
          }
        } catch { }
      } else {
        const estado = await cargarEstadoFormulario();
        if (estado) {
          setEmpresa(estado.empresaNombre || '');
          setNombre(estado.supervisorNombre || '');
          setRut(estado.supervisorRut || '');
        }
      }
    };
    cargarDatos();
  }, [idRegistro]);

  // Guardar borrador cuando cambia el formulario
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(`checklist_${idRegistro}`, { form });
    }, 500);
    return () => clearTimeout(timer);
  }, [form]);

  const guardarDatos = async () => {
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
        type: 'guardarChecklist',
        localId: idRegistro,
        payload: { idRegistro, datos: form },
      });
      await actualizarCampoFormulario('checklistSupervisorGuardado', true);
      await clearDraft(`checklist_${idRegistro}`);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
      setTimeout(() => navigation.goBack(), 1500);
      return;
    }

    try {
      await guardarChecklist(idRegistro, form);
      await actualizarCampoFormulario('checklistSupervisorGuardado', true);
      await clearDraft(`checklist_${idRegistro}`);
      mostrarExito('Checklist Supervisor guardado correctamente.');
      setTimeout(() => navigation.goBack(), 1500);
    } catch {
      await enqueueOp({
        type: 'guardarChecklist',
        localId: idRegistro,
        payload: { idRegistro, datos: form },
      });
      await actualizarCampoFormulario('checklistSupervisorGuardado', true);
      await clearDraft(`checklist_${idRegistro}`);
      mostrarExito('Datos guardados en dispositivo. Se sincronizarán al reconectar.');
      setTimeout(() => navigation.goBack(), 1500);
    }
  };
  

  const volverAPermiso = () => {
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 15 }}>
      {mostrarMensaje && (
        <View style={{ position: 'absolute', bottom: 20, left: 15, right: 15, backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#66bb6a', borderRadius: 8, padding: 15, zIndex: 9999, elevation: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
          <View style={{ width: 35, height: 35, borderRadius: 20, backgroundColor: '#66bb6a', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>!</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>{textoMensaje}</Text>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity 
          style={{ backgroundColor: '#666', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 20, width: '30%' }}
          onPress={volverAPermiso}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>⬅️ VOLVER</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>CHECK LIST SUPERVISOR</Text>

        <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <Text>Fecha: {fecha}</Text>
          <Text>Empresa: {empresa}</Text>
          <Text>Nombre: {nombre}</Text>
          <Text>RUT: {rut}</Text>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Se encuentra en condiciones físicas y psicológicas para realizar la tarea:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.condiciones_fisicas_psicologicas ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('condiciones_fisicas_psicologicas')}>
              <Text style={{color: form.condiciones_fisicas_psicologicas ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.condiciones_fisicas_psicologicas ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('condiciones_fisicas_psicologicas')}>
              <Text style={{color: !form.condiciones_fisicas_psicologicas ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>El personal cuenta con EPP adecuado para la tarea:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.epp_adecuado ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('epp_adecuado')}>
              <Text style={{color: form.epp_adecuado ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.epp_adecuado ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('epp_adecuado')}>
              <Text style={{color: !form.epp_adecuado ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Tiene personal BEL a cargo:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.tiene_personal_bel ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('tiene_personal_bel')}>
              <Text style={{color: form.tiene_personal_bel ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.tiene_personal_bel ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('tiene_personal_bel')}>
              <Text style={{color: !form.tiene_personal_bel ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Conoce procedimientos de emergencia:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.conoce_procedimientos_emergencia ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_procedimientos_emergencia')}>
              <Text style={{color: form.conoce_procedimientos_emergencia ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.conoce_procedimientos_emergencia ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_procedimientos_emergencia')}>
              <Text style={{color: !form.conoce_procedimientos_emergencia ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Ha realizado antes la actividad a realizar:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.ha_realizado_actividad_antes ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('ha_realizado_actividad_antes')}>
              <Text style={{color: form.ha_realizado_actividad_antes ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.ha_realizado_actividad_antes ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('ha_realizado_actividad_antes')}>
              <Text style={{color: !form.ha_realizado_actividad_antes ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Se han verificado todas las herramientas y equipos necesarios y están en buen estado:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.herramientas_y_equipos ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('herramientas_y_equipos')}>
              <Text style={{color: form.herramientas_y_equipos ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.herramientas_y_equipos ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('herramientas_y_equipos')}>
              <Text style={{color: !form.herramientas_y_equipos ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>El personal tiene las certificaciones o capacitaciones necesarias para la tarea específica:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.personal_certificado ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('personal_certificado')}>
              <Text style={{color: form.personal_certificado ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.personal_certificado ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('personal_certificado')}>
              <Text style={{color: !form.personal_certificado ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>Cuenta con los permisos de trabajo específicos requeridos, si aplica a esta actividad:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.cuenta_con_permisos_especificos ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('cuenta_con_permisos_especificos')}>
              <Text style={{color: form.cuenta_con_permisos_especificos ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.cuenta_con_permisos_especificos ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('cuenta_con_permisos_especificos')}>
              <Text style={{color: !form.cuenta_con_permisos_especificos ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>El personal conoce la ruta de evacuación y evaluación del área:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.conoce_ruta_evacuacion ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_ruta_evacuacion')}>
              <Text style={{color: form.conoce_ruta_evacuacion ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.conoce_ruta_evacuacion ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_ruta_evacuacion')}>
              <Text style={{color: !form.conoce_ruta_evacuacion ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text>El personal conoce los riesgos asociados a la tarea y área:</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
            <TouchableOpacity 
              style={{ backgroundColor: form.conoce_riesgos_asociados ? 'green' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_riesgos_asociados')}>
              <Text style={{color: form.conoce_riesgos_asociados ? 'white' : '#333'}}>SI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: !form.conoce_riesgos_asociados ? 'red' : '#ddd', padding:8, borderRadius:5, width:50, alignItems:'center' }}
              onPress={() => toggleCheck('conoce_riesgos_asociados')}>
              <Text style={{color: !form.conoce_riesgos_asociados ? 'white' : '#333'}}>NO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Observaciones:</Text>
        <TextInput
          style={{ borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:5, height:80, textAlignVertical:'top', marginBottom:20, color:'#000' }}
          multiline
          numberOfLines={4}
          value={form.observaciones}
          onChangeText={(text) => setForm({...form, observaciones: text})}
          placeholder="Escriba aquí cualquier observación adicional..."
          placeholderTextColor="#888"
        />

        <TouchableOpacity
          style={{ backgroundColor: '#2E86C1', padding: 15, borderRadius:8, alignItems:'center', marginBottom:20 }}
          onPress={guardarDatos}
        >
          <Text style={{ color:'white', fontSize:16, fontWeight:'bold' }}>GUARDAR CHECKLIST</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}