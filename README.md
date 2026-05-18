# SignalAcces

Sistema de control de accesos y permisos para entornos industriales y mineros.

## Descripcion General

SignalAcces es una aplicacion movil disenada para gestionar permisos de acceso, controlar el ingreso de personal y vehiculos, y registrar novedades de seguridad en entornos industriales y mineros. Funciona sin conexion a internet y sincroniza los datos automaticamente al recuperar conectividad, garantizando operatividad continua en zonas de dificil acceso.

## Tecnologias Utilizadas

| Tecnologia | Version | Uso |
|---|---|---|
| React Native | 0.83.6 | Framework principal |
| Expo | ~55.0.24 | Plataforma y tooling |
| Expo Router | ~55.0.14 | Navegacion basada en archivos |
| Firebase Firestore | ^12.13.0 | Base de datos NoSQL en la nube |
| AsyncStorage | ^2.2.0 | Almacenamiento local / offline |
| React Navigation | ^7.x | Navegacion (stack + bottom tabs) |
| TypeScript | ~5.9.2 | Tipado estatico |
| EAS Build | - | Compilacion APK / IPA en la nube |

### Paquetes Expo utilizados

- `expo-image-picker` - Seleccion de imagenes (ART, R006)
- `expo-print` + `expo-sharing` - Generacion y compartir PDF
- `expo-constants` - Variables de entorno en runtime
- `expo-splash-screen` - Pantalla de carga
- `expo-web-browser` - Apertura de enlaces externos

## Instalacion y Comandos

### Requisitos previos

- Node.js 18+
- npm
- EAS CLI (`npm install -g eas-cli`)
- Cuenta en [expo.dev](https://expo.dev)

### Configuracion

```bash
# Clonar repositorio
git clone https://github.com/Esteban-Dominguez-Ch/SignalAcces.git
cd SignalAcces

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env con las credenciales de Firebase
```

### Variables de entorno (.env)

```env
API_KEY=tu_api_key
AUTH_DOMAIN=tu_proyecto.firebaseapp.com
PROJECT_ID=tu_proyecto_id
STORAGE_BUCKET=tu_proyecto.appspot.com
MESSAGING_SENDER_ID=tu_sender_id
APP_ID=tu_app_id
```

### Comandos de desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# Abrir en Android (emulador o dispositivo)
npm run android

# Abrir en iOS (solo macOS)
npm run ios

# Abrir en navegador web
npm run web

# Verificar errores de linting
npm run lint
```

### Compilar APK (EAS Build)

```bash
# Login en Expo
eas login

# Build APK de prueba (perfil preview)
eas build --profile preview --platform android

# Build de produccion (AAB para Play Store)
eas build --profile production --platform android
```

El APK generado se descarga desde [expo.dev/accounts/estebandominguezch/projects/SignalAcces](https://expo.dev/accounts/estebandominguezch/projects/SignalAcces).

## Estructura del Proyecto

```
SignalAcces/
├── src/
│   ├── app/                       # Pantallas (Expo Router)
│   │   ├── index.tsx              # Pantalla principal / home
│   │   ├── login.tsx              # Autenticacion
│   │   ├── crear-registro.tsx     # Crear permiso de ingreso
│   │   ├── autorizador.tsx        # Panel autorizador (aprobar/rechazar)
│   │   ├── registro-vehiculo.tsx  # Registro y revision de vehiculos
│   │   └── checklist-supervisor.tsx  # Checklist de seguridad
│   ├── services/
│   │   ├── dbService.ts           # Operaciones Firestore
│   │   ├── syncService.ts         # Sincronizacion offline a online
│   │   ├── offlineQueue.ts        # Cola de operaciones pendientes
│   │   ├── draftService.ts        # Borradores locales
│   │   └── formStore.ts           # Estado compartido de formularios
│   └── config/
│       └── firebase.js            # Configuracion Firebase
├── assets/                        # Iconos, splash, imagenes
├── app.config.js                  # Configuracion Expo
├── eas.json                       # Perfiles de build EAS
└── package.json
```

## Arquitectura Offline-First

La aplicacion implementa un patron de cola offline:

1. **Sin conexion:** las operaciones se guardan en AsyncStorage via `offlineQueue.ts`
2. **Con conexion:** `syncService.ts` procesa la cola en orden, sube imagenes locales a Firebase Storage y crea los documentos en Firestore
3. **Mapeo de IDs:** los IDs locales temporales (`local_xxx`) se reemplazan por los IDs reales de Firestore una vez sincronizados

## Roles del Sistema

| Rol | Permisos |
|---|---|
| **Solicitante** | Crear permisos de ingreso, registrar vehiculos, completar checklist |
| **Supervisor** | Completar checklist de seguridad de su area |
| **Autorizador** | Aprobar o rechazar permisos, ver historial |
| **Trabajador** | Consultar sus permisos asignados |

---

## Base de Datos - Firestore

```json
{
  "proyecto": "SignalAcces",
  "descripcion": "Base de datos Firestore - Sistema de control de accesos y permisos",
  "version": "1.0",
  "colecciones": {
    "areasTrabajo": {
      "descripcion": "Ubicaciones fisicas: Lineas + Equipos / Sectores",
      "campos": {
        "Area": {
          "tipo": "string",
          "descripcion": "Nombre del equipo o sector"
        },
        "Ubicacion": {
          "tipo": "string",
          "descripcion": "Linea a la que pertenece (Linea 1, 2, 3)"
        }
      },
      "documentos": [
        { "id": "4nUUs7joRo3XvzwEcP0", "Area": "Chancador", "Ubicacion": "Linea 1" },
        { "id": "9Rhfm7YP9GYqnUHUz3SV", "Area": "Aprom Secundario", "Ubicacion": "Linea 1" },
        { "id": "Bs9rR03GpTu8Y6JGrXXE", "Area": "Sacrificio", "Ubicacion": "Linea 1" },
        { "id": "TrC44uIPsIQpFJTPNUYo", "Area": "Intermedia", "Ubicacion": "Linea 1" },
        { "id": "ddVWQvJLFMzIb8HEAXFg", "Area": "Chancador", "Ubicacion": "Linea 2" },
        { "id": "h1oNcVdvzFokmbxixtEt", "Area": "Aprom Secundario", "Ubicacion": "Linea 2" },
        { "id": "oOLUmqr68QX7gqVPXkKG", "Area": "Sacrificio", "Ubicacion": "Linea 2" },
        { "id": "uJr1JvnNkIM8tkLBg1Ad", "Area": "Intermedia", "Ubicacion": "Linea 2" },
        { "id": "uzs5oVT5Blf6RyJr3YcF", "Area": "Chancador", "Ubicacion": "Linea 3" },
        { "id": "w1CPNogv3EEXfil7djm7", "Area": "Aprom Secundario", "Ubicacion": "Linea 3" },
        { "id": "yxdsm45Z2CULZ1UGPpEm", "Area": "Sacrificio", "Ubicacion": "Linea 3" },
        { "id": "intermedia3", "Area": "Intermedia", "Ubicacion": "Linea 3" }
      ]
    },

    "usuarios": {
      "descripcion": "Registro de todos los usuarios del sistema",
      "campos": {
        "nombre": { "tipo": "string", "descripcion": "Nombre completo" },
        "rut": { "tipo": "string", "descripcion": "Rol / Identificacion" },
        "rol": {
          "tipo": "string",
          "valores_permitidos": ["Solicitante", "Supervisor", "Autorizador", "Trabajador"],
          "descripcion": "Rol y permisos en el sistema"
        },
        "area_a_cargo": { "tipo": "string", "descripcion": "Solo para Solicitantes: Area que administra" },
        "cargo": { "tipo": "string", "descripcion": "Solo para Trabajadores: Cargo o funcion" },
        "sap_code": { "tipo": "string", "descripcion": "Solo para Autorizadores: Codigo SAP" },
        "id_empresa": { "tipo": "reference", "ruta": "empresaContratista", "descripcion": "Solo para Trabajadores: Referencia a empresa" },
        "id_supervisor": { "tipo": "reference", "ruta": "usuarios", "descripcion": "Solo para Trabajadores: Referencia a su jefe directo" },
        "id_login": { "tipo": "reference", "ruta": "login", "descripcion": "Solo para Autorizadores: Referencia acceso" }
      }
    },

    "login": {
      "descripcion": "Credenciales de acceso",
      "campos": {
        "usuario": { "tipo": "string" },
        "contrasena": { "tipo": "string" }
      }
    },

    "empresaContratista": {
      "descripcion": "Empresas externas que trabajan en la instalacion",
      "campos": {
        "nombre": { "tipo": "string" },
        "rut": { "tipo": "string" }
      }
    },

    "novedadesSeguridad": {
      "descripcion": "Registro de incidentes o novedades de seguridad",
      "campos": {
        "fecha": { "tipo": "timestamp", "descripcion": "Fecha y hora del suceso" },
        "descripcion": { "tipo": "string" },
        "responsable": { "tipo": "string" },
        "id_area": { "tipo": "reference", "ruta": "areasTrabajo" }
      }
    },

    "RegistrosIngreso": {
      "descripcion": "Permisos de ingreso y trabajo (Coleccion principal)",
      "campos": {
        "fecha": { "tipo": "timestamp", "descripcion": "Fecha del permiso" },
        "hora_ingreso": { "tipo": "string", "ejemplo": "08:30" },
        "hora_salida": { "tipo": "string", "ejemplo": "17:00" },
        "actividad": { "tipo": "string", "descripcion": "Trabajo a realizar" },
        "observaciones": { "tipo": "string" },
        "estado": {
          "tipo": "string",
          "valores_permitidos": ["Pendiente", "Aprobado", "Finalizado", "Rechazado"]
        },
        "id_solicitante": { "tipo": "reference", "ruta": "usuarios" },
        "id_supervisor": { "tipo": "reference", "ruta": "usuarios" },
        "id_autorizador": { "tipo": "reference", "ruta": "usuarios" },
        "id_area": { "tipo": "reference", "ruta": "areasTrabajo", "descripcion": "Area / Linea donde se trabaja" }
      },
      "subcolecciones": {
        "registroVehiculo": {
          "descripcion": "Datos y revision de vehiculos asociados al permiso",
          "campos": [
            { "nombre": "patente", "tipo": "string" },
            { "nombre": "nombre_conductor", "tipo": "string" },
            { "nombre": "rut_conductor", "tipo": "string" },
            { "nombre": "tiene_cunas", "tipo": "boolean" },
            { "nombre": "tiene_extintor", "tipo": "boolean" },
            { "nombre": "checklist_fatiga", "tipo": "boolean" },
            { "nombre": "documentacion_al_dia", "tipo": "boolean" },
            { "nombre": "luces_funcionales", "tipo": "boolean" },
            { "nombre": "baliza_funcional", "tipo": "boolean" },
            { "nombre": "traccion_4x4", "tipo": "boolean" },
            { "nombre": "neumaticos", "tipo": "boolean" },
            { "nombre": "aire_acondicionado", "tipo": "boolean" },
            { "nombre": "cinturones_seguridad", "tipo": "boolean" },
            { "nombre": "alarma_retroceso", "tipo": "boolean" },
            { "nombre": "detalles_carroceria", "tipo": "string" },
            { "nombre": "observaciones", "tipo": "string" }
          ]
        },
        "checklistSupervisor": {
          "descripcion": "Verificacion de seguridad previa al inicio de trabajo",
          "campos": [
            { "nombre": "fecha", "tipo": "timestamp" },
            { "nombre": "condiciones_fisicas_psicologicas", "tipo": "boolean" },
            { "nombre": "epp_adecuado", "tipo": "boolean" },
            { "nombre": "tiene_personal_bel", "tipo": "boolean" },
            { "nombre": "conoce_procedimientos_emergencia", "tipo": "boolean" },
            { "nombre": "ha_realizado_actividad_antes", "tipo": "boolean" },
            { "nombre": "herramientas_y_equipos", "tipo": "boolean" },
            { "nombre": "personal_certificado", "tipo": "boolean" },
            { "nombre": "cuenta_con_permisos_especificos", "tipo": "boolean" },
            { "nombre": "conoce_ruta_evacuacion", "tipo": "boolean" },
            { "nombre": "conoce_riesgos_asociados", "tipo": "boolean" },
            { "nombre": "observaciones", "tipo": "string" }
          ]
        }
      }
    }
  }
}
```
