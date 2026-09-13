package com.examen.unit;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

import com.examen.Calculadora;

public class CalculadoraTest {
    @Test
    public void testSumar() {
        assertEquals(5, new Calculadora().sumar(2, 3));
    }

    @Test
    public void testRestar() {
        assertEquals(1, new Calculadora().restar(3, 2));
    }
}