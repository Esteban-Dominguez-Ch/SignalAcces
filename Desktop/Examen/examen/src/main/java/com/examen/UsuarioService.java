package com.examen;

public class UsuarioService {
    private final UsuarioRepository repository;

    public UsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    public boolean registrar(String usuario, String email) {
        if (repository.existe(usuario)) {
            return false;
        }
        repository.guardar(usuario, email);
        return true;
    }

    public String obtenerEmail(String usuario) {
        return repository.buscarEmail(usuario);
    }
}