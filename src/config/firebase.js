// src/config/firebase.js
import Constants from 'expo-constants';
import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

// Lee credenciales desde .env via app.config.js
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.apikey,
  authDomain: Constants.expoConfig.extra.authDomain,
  projectId: Constants.expoConfig.extra.projectID,
  storageBucket: Constants.expoConfig.extra.storageBucket,
  messagingSenderId: Constants.expoConfig.extra.messagingSenderId,
  appId: Constants.expoConfig.extra.appID
};

const app = initializeApp(firebaseConfig);

// Web: cache persistente en IndexedDB (sobrevive entre sesiones)
// Native: cache en memoria (solo dentro de la misma sesion)
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage)
});

export const storage = getStorage(app);