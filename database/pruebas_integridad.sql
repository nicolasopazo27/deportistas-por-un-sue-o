-- Pruebas de integridad del modelo físico (PostgreSQL 16). Datos FICTICIOS.
-- Ejecutar después del DDL:  psql -d <base> -v ON_ERROR_STOP=0 -f pruebas_integridad.sql
-- Cada bloque debe ser RECHAZADO por la restricción indicada.
INSERT INTO comuna (nombre, region) VALUES ('Santiago','RM');
INSERT INTO apoderado (nombre_completo, telefono) VALUES ('Apoderado Demo','+56911112222');
INSERT INTO usuario (id_rol, nombre_completo, email, password_hash) VALUES (2,'Usuario Demo','demo@demo.cl','$2b$hash-ficticio');
INSERT INTO profesional (nombre_completo, especialidad) VALUES ('Profesional Demo','DENTAL');
INSERT INTO beneficiario (rut, nombres, apellidos, id_comuna, id_apoderado) VALUES ('12345678-5','Camila','Rojas Soto',1,1);
INSERT INTO caso_atencion (id_beneficiario) VALUES (1);
INSERT INTO atencion (id_caso,id_profesional,id_tipo_prestacion,fecha_atencion,numero_sesion,asistencia,resultado,id_usuario_registra) VALUES (1,1,1,CURRENT_DATE,1,'ASISTIO','REALIZADA',1);
INSERT INTO alerta (id_caso, dias_sin_actualizacion, umbral_dias) VALUES (1, 20, 14);
INSERT INTO baja (id_beneficiario,id_causal,fecha_baja,id_usuario_registra) VALUES (1,2,CURRENT_DATE,1);
\echo '--- T01 RUT inválido (esperado: ck_beneficiario_rut)'
INSERT INTO beneficiario (rut, nombres, apellidos, id_comuna, id_apoderado) VALUES ('12.345.678-5','X','Y',1,1);
\echo '--- T06 NO_REALIZADA sin motivo (esperado: ck_atencion_motivo)'
INSERT INTO atencion (id_caso,id_profesional,id_tipo_prestacion,fecha_atencion,asistencia,resultado,id_usuario_registra) VALUES (1,1,1,CURRENT_DATE,'NO_ASISTIO','NO_REALIZADA',1);
\echo '--- T07 REALIZADA sin asistencia (esperado: ck_atencion_realizada_asistio)'
INSERT INTO atencion (id_caso,id_profesional,id_tipo_prestacion,fecha_atencion,numero_sesion,asistencia,resultado,id_usuario_registra) VALUES (1,1,1,CURRENT_DATE,2,'NO_ASISTIO','REALIZADA',1);
\echo '--- T10 sesión repetida (esperado: uq_atencion_caso_sesion)'
INSERT INTO atencion (id_caso,id_profesional,id_tipo_prestacion,fecha_atencion,numero_sesion,asistencia,resultado,id_usuario_registra) VALUES (1,1,1,CURRENT_DATE,1,'ASISTIO','REALIZADA',1);
\echo '--- T12 segunda alerta ACTIVA (esperado: ux_alerta_activa_por_caso)'
INSERT INTO alerta (id_caso, dias_sin_actualizacion, umbral_dias) VALUES (1, 21, 14);
\echo '--- T15 apoderado sin contacto (esperado: ck_apoderado_contacto)'
INSERT INTO apoderado (nombre_completo) VALUES ('Sin Contacto');
\echo '--- T18 baja repetida (esperado: uq_baja_beneficiario_causal_fecha)'
INSERT INTO baja (id_beneficiario,id_causal,fecha_baja,id_usuario_registra) VALUES (1,2,CURRENT_DATE,1);
\echo '--- T20 ayuda sin guía (esperado: ck_ayuda_entregada_numero_guia)'
INSERT INTO ayuda_entregada (id_beneficiario,id_tipo_ayuda,fecha_entrega,numero_guia,id_usuario_registra) VALUES (1,1,CURRENT_DATE,'  ',1);
\echo '--- T22 informe mensual sin período (esperado: ck_reporte_periodo_oblig)'
INSERT INTO reporte_generado (tipo,formato,id_usuario) VALUES ('INFORME_MENSUAL','XLSX',1);
\echo '--- T25 borrar beneficiario con historial (esperado: fk_caso_atencion_id_beneficiario)'
DELETE FROM beneficiario WHERE id_beneficiario = 1;
\echo '--- Vista v_caso_resumen (esperado: 1 sesión realizada)'
SELECT id_caso, sesiones_realizadas, ciclo_terminado FROM v_caso_resumen;
