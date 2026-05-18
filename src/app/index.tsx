import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAreasTrabajo, getNovedades, getRegistrosAutorizados } from '../services/dbService';

type RootStackParamList = {
  'index': undefined;
  'crear-registro': undefined;
  'autorizador': undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Area = { id: string; Area: string; Ubicacion: string };
type Novedad = { id?: string; area: string; ubicacion: string; texto: string; fecha: Date };
type IngresoArea = { empresa: string; cantidadPersonas: number; supervisor: string };
type MonitoreoArea = { area: string; ubicacion: string; ingresos: IngresoArea[] };

// ORDEN EXACTO
const ordenDeseado = ["Chancador", "Aprom Secundario", "Sacrificio", "Intermedia"];
const ordenLineas = ["Linea 1", "Linea 2", "Linea 3"];

const ordenarAreas = (areas: Area[]) => {
  return [...areas].sort((a, b) => {
    const indiceAreaA = ordenDeseado.indexOf(a.Area);
    const indiceAreaB = ordenDeseado.indexOf(b.Area);
    if (indiceAreaA !== indiceAreaB) return indiceAreaA - indiceAreaB;
    const indiceLineaA = ordenLineas.indexOf(a.Ubicacion);
    const indiceLineaB = ordenLineas.indexOf(b.Ubicacion);
    return indiceLineaA - indiceLineaB;
  });
};

export default function Index() {
  const navigation = useNavigation<NavigationProp>();
  const [monitoreo, setMonitoreo] = useState<MonitoreoArea[]>([]);
  const [novedadesGuardadas, setNovedadesGuardadas] = useState<Novedad[]>([]);

  const cargarDatos = async () => {
    // Monitoreo: areas + registros autorizados (bloques independientes)
    try {
      const resAreas = await getAreasTrabajo() as Area[];
      const areasOrdenadas = ordenarAreas(resAreas);

      type RegistroCompleto = { id: string; area_nombre?: string; ubicacion_area?: string; empresa_nombre?: string; trabajadores?: any[]; supervisor?: { nombre?: string } };
      const registros = await getRegistrosAutorizados() as RegistroCompleto[];
      const datosMonitoreo: { [clave: string]: MonitoreoArea } = {};

      areasOrdenadas.forEach(ar => {
        datosMonitoreo[`${ar.Area} - ${ar.Ubicacion}`] = {
          area: ar.Area, ubicacion: ar.Ubicacion, ingresos: []
        };
      });
      registros.forEach(reg => {
        if (!reg.area_nombre || !reg.ubicacion_area) return;
        const clave = `${reg.area_nombre} - ${reg.ubicacion_area}`;
        if (datosMonitoreo[clave]) {
          datosMonitoreo[clave].ingresos.push({
            empresa: reg.empresa_nombre || 'Sin asignar',
            cantidadPersonas: Array.isArray(reg.trabajadores) ? reg.trabajadores.length + 1 : 1,
            supervisor: reg.supervisor?.nombre || '-'
          });
        }
      });
      setMonitoreo(Object.values(datosMonitoreo));
    } catch {
      // sin conexion o fallo de indice: monitoreo queda como estaba
    }

    // Novedades: bloque independiente para que un fallo en monitoreo no lo bloquee
    try {
      const novedadesBD = await getNovedades() as Novedad[];
      novedadesBD.sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));
      setNovedadesGuardadas(novedadesBD);
    } catch {
      // sin conexion o sin datos: lista vacia
    }
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* MENU DE NAVEGACION */}
      <View style={styles.menuNav}>
        <Text style={styles.menuItemActivoText}>Inicio</Text>
        <Text style={styles.menuItemSeparador}>|</Text>
        <Text style={styles.menuItem} onPress={() => navigation.navigate('crear-registro')}>Ingreso permiso</Text>
        <Text style={styles.menuItemSeparador}>|</Text>
        <Text style={styles.menuItem} onPress={() => navigation.navigate('autorizador')}>Autorizador</Text>
      </View>

      {/* NOVEDADES DE SEGURIDAD */}
      <Text style={styles.tituloSeccion}>NOVEDADES DE SEGURIDAD</Text>

      {novedadesGuardadas.length === 0 ? (
        <Text style={styles.textoVacio}>Sin novedades registradas</Text>
      ) : (
        novedadesGuardadas.map((nov, idx) => (
          <View key={idx} style={styles.bloqueNovedad}>
            <View style={styles.fila2}>
              <Text style={styles.areaTexto}>Área: {nov.area}</Text>
              <Text style={styles.ubicacionTexto}>Ubicación: {nov.ubicacion}</Text>
            </View>
            <Text style={styles.textoNovedad}>{nov.texto}</Text>
          </View>
        ))
      )}

      {/* MONITOREO DE AREA EN TIEMPO REAL */}
      <Text style={styles.tituloSeccion}>MONITOREO DE ÁREA (TIEMPO REAL)</Text>

      <View style={styles.filaMonitoreo}>
        {monitoreo.map((item, idx) => (
          <View key={idx} style={styles.tarjetaMonitoreo}>
            <Text style={styles.tituloTarjeta}>{item.area} - {item.ubicacion}</Text>
            {item.ingresos.length === 0 ? (
              <View style={styles.filaDatos}>
                <Text style={styles.etiqueta}>Sin ingresos</Text>
              </View>
            ) : (
              item.ingresos.map((ing, i) => (
                <View key={i} style={i > 0 ? { marginTop: 6, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 6 } : {}}>
                  <View style={styles.filaDatos}>
                    <Text style={styles.etiqueta}>Empresa:</Text>
                    <Text style={styles.valor}>{ing.empresa}</Text>
                  </View>
                  <View style={styles.filaDatos}>
                    <Text style={styles.etiqueta}>N° Personas:</Text>
                    <Text style={styles.valor}>{ing.cantidadPersonas}</Text>
                  </View>
                  <View style={styles.filaDatos}>
                    <Text style={styles.etiqueta}>Supervisor:</Text>
                    <Text style={styles.valor}>{ing.supervisor}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: '#fff' },

  menuNav: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10, alignItems: 'center', gap: 15, paddingTop: Platform.OS === 'web' ? 10 : 35 },
  menuItem: { fontSize: 16, color: '#666' },
  menuItemActivoText: { fontSize: 16, fontWeight: 'bold', color: '#0066b3', borderBottomWidth: 2, borderBottomColor: '#0066b3', paddingBottom: 5 },
  menuItemSeparador: { color: '#ccc' },

  tituloSeccion: { fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginVertical: 25, textTransform: 'uppercase' },

  bloqueNovedad: { marginBottom: 15, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, backgroundColor: '#f8f8f8' },
  fila2: { flexDirection: 'row', gap: 20, marginBottom: 5, alignItems: 'center' },
  areaTexto: { fontWeight: 'bold', fontSize: 14 },
  ubicacionTexto: { fontWeight: 'bold', fontSize: 14 },
  textoNovedad: { fontSize: 14, color: '#333', marginTop: 4 },
  textoVacio: { textAlign: 'center', color: '#888', fontStyle: 'italic' },

  filaMonitoreo: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  tarjetaMonitoreo: { width: 220, borderWidth: 1, borderColor: '#222', borderRadius: 4, padding: 12, backgroundColor: '#fff' },
  tituloTarjeta: { fontWeight: 'bold', textAlign: 'center', marginBottom: 8, fontSize: 14, textTransform: 'uppercase' },
  filaDatos: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  etiqueta: { fontSize: 13, color: '#444' },
  valor: { fontSize: 13, fontWeight: '500' }
});