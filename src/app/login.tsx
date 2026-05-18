// src/app/login.tsx
import { useNavigation } from '@react-navigation/native';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const iniciarSesion = async () => {
    if (!usuario || !password) {
      Alert.alert("Error", "Por favor ingrese usuario y contraseña");
      return;
    }

    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, usuario, password);
      const user = userCredential.user;

      Alert.alert("✅ Bienvenido", "Sesión iniciada correctamente");
      navigation.navigate('autorizador' as never);

    } catch (error: any) {
      let mensaje = "Usuario o contraseña incorrectos";
      if (error.code === 'auth/user-not-found') mensaje = "Usuario no encontrado";
      if (error.code === 'auth/wrong-password') mensaje = "Contraseña incorrecta";
      
      Alert.alert("❌ Error", mensaje);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
      
      {/* Logo o Título */}
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 40, color: '#2E86C1' }}>SIGNALACCES</Text>

      <Text style={{ fontSize: 18, marginBottom: 30 }}>Bienvenido</Text>

      {/* Input Usuario */}
      <TextInput
        style={{ width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15, color: '#000' }}
        placeholder="Usuario"
        placeholderTextColor="#888"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />

      {/* Input Contraseña */}
      <TextInput
        style={{ width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 25, color: '#000' }}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Botón Ingresar */}
      <TouchableOpacity
        style={{ backgroundColor: '#E67E22', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' }}
        onPress={iniciarSesion}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>INGRESAR</Text>
      </TouchableOpacity>

    </View>
  );
}