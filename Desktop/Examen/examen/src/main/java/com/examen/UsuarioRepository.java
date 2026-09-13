package com.examen;

import java.util.HashMap;
import java.util.Map;

public class UsuarioRepository {
    private final Map<String, String> usuarios = new HashMap<>();

    public void guardar(String usuario, String email) {
        usuarios.put(usuario, email);
    }

    public String buscarEmail(String usuario) {
        return usuarios.get(usuario);
    }

    public boolean existe(String usuario) {
        return usuarios.containsKey(usuario);
    }
}