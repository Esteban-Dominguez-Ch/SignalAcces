package com.examen.integration;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import org.junit.Test;

import com.examen.UsuarioRepository;
import com.examen.UsuarioService;

public class UsuarioServiceIT {
    @Test
    public void testRegistrarYObtenerUsuario() {
        UsuarioService service = new UsuarioService(new UsuarioRepository());
        assertTrue(service.registrar("edominguez", "edominguez@iplacex.cl"));
        assertEquals("edominguez@iplacex.cl", service.obtenerEmail("edominguez"));
    }

    @Test
    public void testNoRegistrarUsuarioDuplicado() {
        UsuarioService service = new UsuarioService(new UsuarioRepository());
        service.registrar("edominguez", "edominguez@iplacex.cl");
        assertFalse(service.registrar("edominguez", "otro@iplacex.cl"));
    }
}