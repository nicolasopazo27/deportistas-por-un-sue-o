
-- SISTEMA DE REGISTRO, GESTIÓN Y TRAZABILIDAD DE LA ATENCIÓN DEL BENEFICIARIO
-- Fundación Deportistas por un Sueño  |  Integrantes: Nicolás Opazo, Martín Lorca
-- SGBD: PostgreSQL 16  |  Script DDL completo (28 tablas, 2 vistas)
-- Orden de creación: seguridad y catálogos -> beneficiario -> caso y derivación
--                    -> atención y seguimiento -> bajas, ayudas, reportes

-- [Seguridad y acceso] ROL: Perfil de acceso al sistema (comunicación, trabajo social, TENS, profesional, administrador).
CREATE TABLE rol (
    id_rol      SMALLINT GENERATED ALWAYS AS IDENTITY,
    codigo      VARCHAR(30) NOT NULL,
    nombre      VARCHAR(60) NOT NULL,
    descripcion VARCHAR(200),
    CONSTRAINT pk_rol PRIMARY KEY (id_rol),
    CONSTRAINT uq_rol_codigo UNIQUE (codigo),
    CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);

-- [Seguridad y acceso] PERMISO: Acción o dato que puede habilitarse a un rol (consultar ficha, ver datos de salud, exportar, etc.).
CREATE TABLE permiso (
    id_permiso  SMALLINT GENERATED ALWAYS AS IDENTITY,
    codigo      VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    CONSTRAINT pk_permiso PRIMARY KEY (id_permiso),
    CONSTRAINT uq_permiso_codigo UNIQUE (codigo)
);

-- [Seguridad y acceso] ROL_PERMISO: Tabla asociativa de la relación N:M ROL–PERMISO.
CREATE TABLE rol_permiso (
    id_rol     SMALLINT NOT NULL,
    id_permiso SMALLINT NOT NULL,
    CONSTRAINT pk_rol_permiso PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rol_permiso_id_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_rol_permiso_id_permiso FOREIGN KEY (id_permiso) REFERENCES permiso (id_permiso)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Seguridad y acceso] USUARIO: Persona que accede al sistema con credenciales individuales.
CREATE TABLE usuario (
    id_usuario      BIGINT GENERATED ALWAYS AS IDENTITY,
    id_rol          SMALLINT NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_acceso   TIMESTAMPTZ,
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuario_id_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_email CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- [Beneficiario y ficha] COMUNA: Comuna de residencia del beneficiario; agrupa las atenciones.
CREATE TABLE comuna (
    id_comuna SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre    VARCHAR(80) NOT NULL,
    region    VARCHAR(80),
    CONSTRAINT pk_comuna PRIMARY KEY (id_comuna),
    CONSTRAINT uq_comuna_nombre UNIQUE (nombre)
);

-- [Beneficiario y ficha] PREVISION_SALUD: Catálogo de previsión de salud del apoderado.
CREATE TABLE prevision_salud (
    id_prevision SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre       VARCHAR(60) NOT NULL,
    CONSTRAINT pk_prevision_salud PRIMARY KEY (id_prevision),
    CONSTRAINT uq_prevision_salud_nombre UNIQUE (nombre)
);

-- [Beneficiario y ficha] ENFERMEDAD: Catálogo estructurado de condiciones de salud; permite filtrar.
CREATE TABLE enfermedad (
    id_enfermedad INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre        VARCHAR(120) NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_enfermedad PRIMARY KEY (id_enfermedad),
    CONSTRAINT uq_enfermedad_nombre UNIQUE (nombre)
);

-- [Atención y seguimiento] TIPO_PRESTACION: Catálogo de prestaciones (dental, kinesiología y otras).
CREATE TABLE tipo_prestacion (
    id_tipo_prestacion SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre             VARCHAR(80) NOT NULL,
    area               VARCHAR(15) NOT NULL,
    CONSTRAINT pk_tipo_prestacion PRIMARY KEY (id_tipo_prestacion),
    CONSTRAINT uq_tipo_prestacion_nombre UNIQUE (nombre),
    CONSTRAINT ck_tipo_prestacion_area CHECK (area IN ('DENTAL','KINESIOLOGIA','OTRA'))
);

-- [Atención y seguimiento] MOTIVO_NO_ATENCION: Catálogo de motivos de no atención o no gestión de un caso.
CREATE TABLE motivo_no_atencion (
    id_motivo SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre    VARCHAR(100) NOT NULL,
    ambito    VARCHAR(12) NOT NULL,
    activo    BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_motivo_no_atencion PRIMARY KEY (id_motivo),
    CONSTRAINT uq_motivo_no_atencion_nombre UNIQUE (nombre),
    CONSTRAINT ck_motivo_no_atencion_ambito CHECK (ambito IN ('NO_ATENCION','NO_GESTION','AMBOS'))
);

-- [Bajas] CAUSAL_BAJA: Causales de baja admitidas: fallecimiento, egreso o desvinculación.
CREATE TABLE causal_baja (
    id_causal SMALLINT GENERATED ALWAYS AS IDENTITY,
    codigo    VARCHAR(20) NOT NULL,
    nombre    VARCHAR(60) NOT NULL,
    CONSTRAINT pk_causal_baja PRIMARY KEY (id_causal),
    CONSTRAINT uq_causal_baja_codigo UNIQUE (codigo),
    CONSTRAINT ck_causal_baja_codigo CHECK (codigo IN ('FALLECIMIENTO','EGRESO','DESVINCULACION')),
    CONSTRAINT uq_causal_baja_nombre UNIQUE (nombre)
);

-- [Ayudas y urgencia] TIPO_AYUDA: Catálogo de ayudas entregables (ORASMI, vivienda, insumos, otras).
CREATE TABLE tipo_ayuda (
    id_tipo_ayuda SMALLINT GENERATED ALWAYS AS IDENTITY,
    nombre        VARCHAR(80) NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_tipo_ayuda PRIMARY KEY (id_tipo_ayuda),
    CONSTRAINT uq_tipo_ayuda_nombre UNIQUE (nombre)
);

-- [Reportes y exportaciones] PLANTILLA_REPORTE: Plantilla oficial de reporte (p. ej. del Ministerio) con su versión.
CREATE TABLE plantilla_reporte (
    id_plantilla        SMALLINT GENERATED ALWAYS AS IDENTITY,
    tipo_reporte        VARCHAR(20) NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    version             VARCHAR(20) NOT NULL,
    vigente             BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_incorporacion DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT pk_plantilla_reporte PRIMARY KEY (id_plantilla),
    CONSTRAINT ck_plantilla_reporte_tipo_reporte CHECK (tipo_reporte IN ('INFORME_MENSUAL','REPORTE_BAJAS')),
    CONSTRAINT uq_plantilla_reporte_tipo_version UNIQUE (tipo_reporte, version)
);

-- [Atención y seguimiento] PARAMETRO_SISTEMA: Parámetros configurables (p. ej. umbral de días para las alertas).
CREATE TABLE parametro_sistema (
    clave               VARCHAR(60) NOT NULL,
    valor               VARCHAR(200) NOT NULL,
    descripcion         VARCHAR(250),
    id_usuario_modifica BIGINT,
    fecha_modificacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_parametro_sistema PRIMARY KEY (clave),
    CONSTRAINT fk_parametro_sistema_id_usuario_modifica FOREIGN KEY (id_usuario_modifica) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Atención y seguimiento] PROFESIONAL: Profesional dental o kinesiólogo que ejecuta atenciones.
CREATE TABLE profesional (
    id_profesional  BIGINT GENERATED ALWAYS AS IDENTITY,
    id_usuario      BIGINT,
    nombre_completo VARCHAR(120) NOT NULL,
    especialidad    VARCHAR(15) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_profesional PRIMARY KEY (id_profesional),
    CONSTRAINT fk_profesional_id_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT uq_profesional_id_usuario UNIQUE (id_usuario),
    CONSTRAINT ck_profesional_especialidad CHECK (especialidad IN ('DENTAL','KINESIOLOGIA','OTRA'))
);

-- [Beneficiario y ficha] APODERADO: Adulto responsable del beneficiario; contacto y previsión.
CREATE TABLE apoderado (
    id_apoderado    BIGINT GENERATED ALWAYS AS IDENTITY,
    rut             VARCHAR(12),
    nombre_completo VARCHAR(120) NOT NULL,
    telefono        VARCHAR(20),
    email           VARCHAR(150),
    id_prevision    SMALLINT,
    CONSTRAINT pk_apoderado PRIMARY KEY (id_apoderado),
    CONSTRAINT uq_apoderado_rut UNIQUE (rut),
    CONSTRAINT ck_apoderado_rut CHECK (rut ~ '^[0-9]{7,8}-[0-9K]$'),
    CONSTRAINT fk_apoderado_id_prevision FOREIGN KEY (id_prevision) REFERENCES prevision_salud (id_prevision)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_apoderado_contacto CHECK (telefono IS NOT NULL OR email IS NOT NULL)
);

-- [Beneficiario y ficha] BENEFICIARIO: Niño o niña atendido por la Fundación; eje de la ficha única.
CREATE TABLE beneficiario (
    id_beneficiario      BIGINT GENERATED ALWAYS AS IDENTITY,
    rut                  VARCHAR(12),
    nombres              VARCHAR(80) NOT NULL,
    apellidos            VARCHAR(80) NOT NULL,
    fecha_nacimiento     DATE,
    id_comuna            SMALLINT NOT NULL,
    id_apoderado         BIGINT NOT NULL,
    situacion_documental VARCHAR(15) NOT NULL DEFAULT 'POR_VERIFICAR',
    electrodependiente   BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_beneficiario PRIMARY KEY (id_beneficiario),
    CONSTRAINT uq_beneficiario_rut UNIQUE (rut),
    CONSTRAINT ck_beneficiario_rut CHECK (rut ~ '^[0-9]{7,8}-[0-9K]$'),
    CONSTRAINT fk_beneficiario_id_comuna FOREIGN KEY (id_comuna) REFERENCES comuna (id_comuna)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_beneficiario_id_apoderado FOREIGN KEY (id_apoderado) REFERENCES apoderado (id_apoderado)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_beneficiario_situacion_documental CHECK (situacion_documental IN ('DOCUMENTADO','INDOCUMENTADO','POR_VERIFICAR'))
);

-- [Beneficiario y ficha] BENEFICIARIO_ENFERMEDAD: Tabla asociativa N:M BENEFICIARIO–ENFERMEDAD con descripción.
CREATE TABLE beneficiario_enfermedad (
    id_beneficiario     BIGINT NOT NULL,
    id_enfermedad       INTEGER NOT NULL,
    descripcion         TEXT,
    fecha_registro      DATE NOT NULL DEFAULT CURRENT_DATE,
    id_usuario_registra BIGINT NOT NULL,
    CONSTRAINT pk_beneficiario_enfermedad PRIMARY KEY (id_beneficiario, id_enfermedad),
    CONSTRAINT fk_beneficiario_enfermedad_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_beneficiario_enfermedad_id_enfermedad FOREIGN KEY (id_enfermedad) REFERENCES enfermedad (id_enfermedad)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_beneficiario_enfermedad_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Beneficiario y ficha] HOSPITALIZACION: Hospitalización informada para un beneficiario.
CREATE TABLE hospitalizacion (
    id_hospitalizacion  BIGINT GENERATED ALWAYS AS IDENTITY,
    id_beneficiario     BIGINT NOT NULL,
    fecha_ingreso       DATE,
    fecha_alta          DATE,
    descripcion         TEXT NOT NULL,
    id_usuario_registra BIGINT NOT NULL,
    CONSTRAINT pk_hospitalizacion PRIMARY KEY (id_hospitalizacion),
    CONSTRAINT fk_hospitalizacion_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_hospitalizacion_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_hospitalizacion_fechas CHECK (fecha_alta IS NULL OR fecha_ingreso IS NULL OR fecha_alta >= fecha_ingreso)
);

-- [Derivación] CASO_ATENCION: Ciclo de atención de un beneficiario: estado, cierre y última actualización.
CREATE TABLE caso_atencion (
    id_caso                   BIGINT GENERATED ALWAYS AS IDENTITY,
    id_beneficiario           BIGINT NOT NULL,
    estado_caso               VARCHAR(12) NOT NULL DEFAULT 'EN_ATENCION',
    fecha_inicio              DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_cierre_ciclo        DATE,
    ciclo_terminado           BOOLEAN GENERATED ALWAYS AS (fecha_cierre_ciclo IS NOT NULL) STORED,
    id_motivo_no_gestion      SMALLINT,
    id_usuario_confirma_ciclo BIGINT,
    ultima_actualizacion      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_caso_atencion PRIMARY KEY (id_caso),
    CONSTRAINT fk_caso_atencion_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_caso_atencion_estado_caso CHECK (estado_caso IN ('EN_ATENCION','ATENDIDO','NO_ATENDIDO')),
    CONSTRAINT fk_caso_atencion_id_motivo_no_gestion FOREIGN KEY (id_motivo_no_gestion) REFERENCES motivo_no_atencion (id_motivo)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_caso_atencion_id_usuario_confirma_ciclo FOREIGN KEY (id_usuario_confirma_ciclo) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_caso_atencion_cierre CHECK (fecha_cierre_ciclo IS NULL OR fecha_cierre_ciclo >= fecha_inicio)
);

-- [Derivación] DERIVACION: Registro de la derivación que origina o refuerza un caso.
CREATE TABLE derivacion (
    id_derivacion        BIGINT GENERATED ALWAYS AS IDENTITY,
    id_caso              BIGINT NOT NULL,
    tipo_ingreso         VARCHAR(10) NOT NULL,
    fecha_derivacion     DATE NOT NULL DEFAULT CURRENT_DATE,
    area_destino         VARCHAR(15),
    origen_deteccion     VARCHAR(20),
    observacion          TEXT,
    advertencia_ignorada BOOLEAN NOT NULL DEFAULT FALSE,
    id_usuario_registra  BIGINT NOT NULL,
    fecha_registro       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_derivacion PRIMARY KEY (id_derivacion),
    CONSTRAINT fk_derivacion_id_caso FOREIGN KEY (id_caso) REFERENCES caso_atencion (id_caso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_derivacion_tipo_ingreso CHECK (tipo_ingreso IN ('INGRESO','REINGRESO')),
    CONSTRAINT ck_derivacion_area_destino CHECK (area_destino IN ('DENTAL','KINESIOLOGIA','OTRA')),
    CONSTRAINT ck_derivacion_origen_deteccion CHECK (origen_deteccion IN ('LLAMADO_SEMANAL','SOLICITUD_APODERADO')),
    CONSTRAINT fk_derivacion_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Atención y seguimiento] ATENCION: Atención o intento de atención dental/kinesiología (solo datos de gestión).
CREATE TABLE atencion (
    id_atencion            BIGINT GENERATED ALWAYS AS IDENTITY,
    id_caso                BIGINT NOT NULL,
    id_profesional         BIGINT NOT NULL,
    id_tipo_prestacion     SMALLINT NOT NULL,
    fecha_atencion         DATE NOT NULL,
    numero_sesion          SMALLINT,
    asistencia             VARCHAR(12) NOT NULL,
    resultado              VARCHAR(12) NOT NULL,
    id_motivo              SMALLINT,
    detalle_motivo         TEXT,
    referencia_dental_soft VARCHAR(100),
    id_usuario_registra    BIGINT NOT NULL,
    fecha_registro         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_atencion PRIMARY KEY (id_atencion),
    CONSTRAINT fk_atencion_id_caso FOREIGN KEY (id_caso) REFERENCES caso_atencion (id_caso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_atencion_id_profesional FOREIGN KEY (id_profesional) REFERENCES profesional (id_profesional)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_atencion_id_tipo_prestacion FOREIGN KEY (id_tipo_prestacion) REFERENCES tipo_prestacion (id_tipo_prestacion)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_atencion_numero_sesion CHECK (numero_sesion > 0),
    CONSTRAINT ck_atencion_asistencia CHECK (asistencia IN ('ASISTIO','NO_ASISTIO')),
    CONSTRAINT ck_atencion_resultado CHECK (resultado IN ('REALIZADA','NO_REALIZADA')),
    CONSTRAINT fk_atencion_id_motivo FOREIGN KEY (id_motivo) REFERENCES motivo_no_atencion (id_motivo)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_atencion_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT uq_atencion_caso_sesion UNIQUE (id_caso, numero_sesion),
    CONSTRAINT ck_atencion_motivo CHECK ((resultado = 'REALIZADA' AND id_motivo IS NULL) OR (resultado = 'NO_REALIZADA' AND id_motivo IS NOT NULL)),
    CONSTRAINT ck_atencion_realizada_asistio CHECK (resultado <> 'REALIZADA' OR asistencia = 'ASISTIO')
);

-- [Atención y seguimiento] ALERTA: Alerta por caso sin actualización dentro del plazo acordado.
CREATE TABLE alerta (
    id_alerta              BIGINT GENERATED ALWAYS AS IDENTITY,
    id_caso                BIGINT NOT NULL,
    fecha_generacion       TIMESTAMPTZ NOT NULL DEFAULT now(),
    dias_sin_actualizacion INTEGER NOT NULL,
    umbral_dias            INTEGER NOT NULL,
    estado                 VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',
    fecha_resolucion       TIMESTAMPTZ,
    CONSTRAINT pk_alerta PRIMARY KEY (id_alerta),
    CONSTRAINT fk_alerta_id_caso FOREIGN KEY (id_caso) REFERENCES caso_atencion (id_caso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_alerta_dias_sin_actualizacion CHECK (dias_sin_actualizacion >= 0),
    CONSTRAINT ck_alerta_umbral_dias CHECK (umbral_dias > 0),
    CONSTRAINT ck_alerta_estado CHECK (estado IN ('ACTIVA','RESUELTA')),
    CONSTRAINT ck_alerta_resolucion CHECK ((estado = 'RESUELTA') = (fecha_resolucion IS NOT NULL))
);

-- [Atención y seguimiento] NOTIFICACION: Aviso emitido por el sistema (atención realizada o alerta) por plataforma o correo.
CREATE TABLE notificacion (
    id_notificacion    BIGINT GENERATED ALWAYS AS IDENTITY,
    tipo               VARCHAR(20) NOT NULL,
    canal              VARCHAR(12) NOT NULL,
    id_usuario_destino BIGINT NOT NULL,
    id_atencion        BIGINT,
    id_alerta          BIGINT,
    mensaje            VARCHAR(500) NOT NULL,
    estado             VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_envio        TIMESTAMPTZ,
    CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
    CONSTRAINT ck_notificacion_tipo CHECK (tipo IN ('ATENCION_REALIZADA','ALERTA_CASO')),
    CONSTRAINT ck_notificacion_canal CHECK (canal IN ('PLATAFORMA','CORREO')),
    CONSTRAINT fk_notificacion_id_usuario_destino FOREIGN KEY (id_usuario_destino) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_notificacion_id_atencion FOREIGN KEY (id_atencion) REFERENCES atencion (id_atencion)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_notificacion_id_alerta FOREIGN KEY (id_alerta) REFERENCES alerta (id_alerta)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_notificacion_estado CHECK (estado IN ('PENDIENTE','ENVIADA','FALLIDA','LEIDA')),
    CONSTRAINT ck_notificacion_origen CHECK (num_nonnulls(id_atencion, id_alerta) = 1),
    CONSTRAINT ck_notificacion_tipo_origen CHECK ((tipo = 'ATENCION_REALIZADA' AND id_atencion IS NOT NULL) OR (tipo = 'ALERTA_CASO' AND id_alerta IS NOT NULL))
);

-- [Beneficiario y ficha] OBSERVACION: Nota libre asociada a un beneficiario (y opcionalmente a un caso).
CREATE TABLE observacion (
    id_observacion  BIGINT GENERATED ALWAYS AS IDENTITY,
    id_beneficiario BIGINT NOT NULL,
    id_caso         BIGINT,
    id_usuario      BIGINT NOT NULL,
    fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
    texto           TEXT NOT NULL,
    CONSTRAINT pk_observacion PRIMARY KEY (id_observacion),
    CONSTRAINT fk_observacion_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_observacion_id_caso FOREIGN KEY (id_caso) REFERENCES caso_atencion (id_caso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_observacion_id_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_observacion_texto CHECK (length(btrim(texto)) > 0)
);

-- [Bajas] BAJA: Baja de un beneficiario por fallecimiento, egreso o desvinculación.
CREATE TABLE baja (
    id_baja             BIGINT GENERATED ALWAYS AS IDENTITY,
    id_beneficiario     BIGINT NOT NULL,
    id_causal           SMALLINT NOT NULL,
    fecha_baja          DATE NOT NULL,
    observacion         TEXT,
    id_usuario_registra BIGINT NOT NULL,
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_baja PRIMARY KEY (id_baja),
    CONSTRAINT fk_baja_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_baja_id_causal FOREIGN KEY (id_causal) REFERENCES causal_baja (id_causal)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_baja_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT uq_baja_beneficiario_causal_fecha UNIQUE (id_beneficiario, id_causal, fecha_baja)
);

-- [Ayudas y urgencia] AYUDA_ENTREGADA: Ayuda ya entregada a un beneficiario (sin postulaciones ni stock).
CREATE TABLE ayuda_entregada (
    id_ayuda            BIGINT GENERATED ALWAYS AS IDENTITY,
    id_beneficiario     BIGINT NOT NULL,
    id_tipo_ayuda       SMALLINT NOT NULL,
    fecha_entrega       DATE NOT NULL,
    numero_guia         VARCHAR(30) NOT NULL,
    id_usuario_registra BIGINT NOT NULL,
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_ayuda_entregada PRIMARY KEY (id_ayuda),
    CONSTRAINT fk_ayuda_entregada_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ayuda_entregada_id_tipo_ayuda FOREIGN KEY (id_tipo_ayuda) REFERENCES tipo_ayuda (id_tipo_ayuda)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_ayuda_entregada_numero_guia CHECK (length(btrim(numero_guia)) > 0),
    CONSTRAINT fk_ayuda_entregada_id_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Ayudas y urgencia] MARCA_URGENCIA: Marca de urgencia sobre un caso, independiente de cualquier entrega.
CREATE TABLE marca_urgencia (
    id_urgencia      BIGINT GENERATED ALWAYS AS IDENTITY,
    id_caso          BIGINT NOT NULL,
    motivo           VARCHAR(300),
    id_usuario_marca BIGINT NOT NULL,
    fecha_marca      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_marca_urgencia PRIMARY KEY (id_urgencia),
    CONSTRAINT fk_marca_urgencia_id_caso FOREIGN KEY (id_caso) REFERENCES caso_atencion (id_caso)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_marca_urgencia_id_usuario_marca FOREIGN KEY (id_usuario_marca) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- [Reportes y exportaciones] REPORTE_GENERADO: Registro de cada informe o exportación generada (incluye registro de descargas).
CREATE TABLE reporte_generado (
    id_reporte              BIGINT GENERATED ALWAYS AS IDENTITY,
    tipo                    VARCHAR(25) NOT NULL,
    formato                 VARCHAR(5) NOT NULL,
    periodo_desde           DATE,
    periodo_hasta           DATE,
    id_beneficiario         BIGINT,
    id_plantilla            SMALLINT,
    incluye_datos_apoderado BOOLEAN NOT NULL DEFAULT FALSE,
    total_registros         INTEGER,
    resultado               VARCHAR(10) NOT NULL DEFAULT 'GENERADO',
    id_usuario              BIGINT NOT NULL,
    fecha_generacion        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_reporte_generado PRIMARY KEY (id_reporte),
    CONSTRAINT ck_reporte_generado_tipo CHECK (tipo IN ('INFORME_MENSUAL','REPORTE_BAJAS','EXPORT_FICHA','EXPORT_EXCEL_GENERAL')),
    CONSTRAINT ck_reporte_generado_formato CHECK (formato IN ('XLSX','PDF')),
    CONSTRAINT fk_reporte_generado_id_beneficiario FOREIGN KEY (id_beneficiario) REFERENCES beneficiario (id_beneficiario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_reporte_generado_id_plantilla FOREIGN KEY (id_plantilla) REFERENCES plantilla_reporte (id_plantilla)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_reporte_generado_total_registros CHECK (total_registros >= 0),
    CONSTRAINT ck_reporte_generado_resultado CHECK (resultado IN ('GENERADO','VACIO','FALLIDO')),
    CONSTRAINT fk_reporte_generado_id_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_reporte_periodo CHECK (periodo_hasta IS NULL OR periodo_desde IS NULL OR periodo_hasta >= periodo_desde),
    CONSTRAINT ck_reporte_periodo_oblig CHECK (tipo NOT IN ('INFORME_MENSUAL','REPORTE_BAJAS') OR (periodo_desde IS NOT NULL AND periodo_hasta IS NOT NULL)),
    CONSTRAINT ck_reporte_ficha CHECK (tipo <> 'EXPORT_FICHA' OR id_beneficiario IS NOT NULL)
);


-- ÍNDICES

CREATE INDEX ix_rol_permiso_id_permiso ON rol_permiso (id_permiso);
CREATE INDEX ix_usuario_id_rol ON usuario (id_rol);
CREATE INDEX ix_parametro_sistema_id_usuario_modifica ON parametro_sistema (id_usuario_modifica);
CREATE INDEX ix_apoderado_id_prevision ON apoderado (id_prevision);
CREATE INDEX ix_beneficiario_id_comuna ON beneficiario (id_comuna);
CREATE INDEX ix_beneficiario_id_apoderado ON beneficiario (id_apoderado);
CREATE INDEX ix_beneficiario_enfermedad_id_enfermedad ON beneficiario_enfermedad (id_enfermedad);
CREATE INDEX ix_beneficiario_enfermedad_id_usuario_registra ON beneficiario_enfermedad (id_usuario_registra);
CREATE INDEX ix_hospitalizacion_id_beneficiario ON hospitalizacion (id_beneficiario);
CREATE INDEX ix_hospitalizacion_id_usuario_registra ON hospitalizacion (id_usuario_registra);
CREATE INDEX ix_caso_atencion_id_motivo_no_gestion ON caso_atencion (id_motivo_no_gestion);
CREATE INDEX ix_caso_atencion_id_usuario_confirma_ciclo ON caso_atencion (id_usuario_confirma_ciclo);
CREATE INDEX ix_derivacion_id_caso ON derivacion (id_caso);
CREATE INDEX ix_derivacion_id_usuario_registra ON derivacion (id_usuario_registra);
CREATE INDEX ix_atencion_id_profesional ON atencion (id_profesional);
CREATE INDEX ix_atencion_id_tipo_prestacion ON atencion (id_tipo_prestacion);
CREATE INDEX ix_atencion_id_motivo ON atencion (id_motivo);
CREATE INDEX ix_atencion_id_usuario_registra ON atencion (id_usuario_registra);
CREATE INDEX ix_notificacion_id_atencion ON notificacion (id_atencion);
CREATE INDEX ix_notificacion_id_alerta ON notificacion (id_alerta);
CREATE INDEX ix_observacion_id_beneficiario ON observacion (id_beneficiario);
CREATE INDEX ix_observacion_id_caso ON observacion (id_caso);
CREATE INDEX ix_observacion_id_usuario ON observacion (id_usuario);
CREATE INDEX ix_baja_id_beneficiario ON baja (id_beneficiario);
CREATE INDEX ix_baja_id_causal ON baja (id_causal);
CREATE INDEX ix_baja_id_usuario_registra ON baja (id_usuario_registra);
CREATE INDEX ix_ayuda_entregada_id_beneficiario ON ayuda_entregada (id_beneficiario);
CREATE INDEX ix_ayuda_entregada_id_tipo_ayuda ON ayuda_entregada (id_tipo_ayuda);
CREATE INDEX ix_ayuda_entregada_id_usuario_registra ON ayuda_entregada (id_usuario_registra);
CREATE INDEX ix_marca_urgencia_id_caso ON marca_urgencia (id_caso);
CREATE INDEX ix_marca_urgencia_id_usuario_marca ON marca_urgencia (id_usuario_marca);
CREATE INDEX ix_reporte_generado_id_beneficiario ON reporte_generado (id_beneficiario);
CREATE INDEX ix_reporte_generado_id_plantilla ON reporte_generado (id_plantilla);
CREATE INDEX ix_reporte_generado_id_usuario ON reporte_generado (id_usuario);
CREATE INDEX ix_beneficiario_nombre ON beneficiario (lower(apellidos), lower(nombres), fecha_nacimiento);
CREATE INDEX ix_caso_beneficiario_abierto ON caso_atencion (id_beneficiario) WHERE fecha_cierre_ciclo IS NULL;
CREATE INDEX ix_caso_seguimiento ON caso_atencion (estado_caso, ultima_actualizacion) WHERE fecha_cierre_ciclo IS NULL;
CREATE INDEX ix_atencion_caso_fecha ON atencion (id_caso, fecha_atencion);
CREATE UNIQUE INDEX ux_alerta_activa_por_caso ON alerta (id_caso) WHERE estado = 'ACTIVA';
CREATE INDEX ix_notificacion_destino_estado ON notificacion (id_usuario_destino, estado);
CREATE INDEX ix_ayuda_numero_guia ON ayuda_entregada (numero_guia);
CREATE INDEX ix_baja_fecha ON baja (fecha_baja);
CREATE INDEX ix_reporte_fecha ON reporte_generado (fecha_generacion);

-- VISTAS DE APOYO (consultas derivadas; no almacenan datos)

CREATE VIEW v_caso_resumen AS
SELECT c.id_caso,
       c.id_beneficiario,
       c.estado_caso,
       c.ciclo_terminado,
       c.fecha_inicio,
       c.fecha_cierre_ciclo,
       COUNT(a.id_atencion) FILTER (WHERE a.resultado = 'REALIZADA') AS sesiones_realizadas,
       MAX(a.fecha_atencion)                                        AS ultima_atencion,
       c.ultima_actualizacion
FROM caso_atencion c
LEFT JOIN atencion a ON a.id_caso = c.id_caso
GROUP BY c.id_caso;

CREATE VIEW v_casos_para_alerta AS
SELECT c.id_caso,
       c.id_beneficiario,
       c.ultima_actualizacion,
       (CURRENT_DATE - c.ultima_actualizacion::date) AS dias_sin_actualizacion,
       p.valor::integer                              AS umbral_dias
FROM caso_atencion c
JOIN parametro_sistema p ON p.clave = 'umbral_dias_alerta'
WHERE c.fecha_cierre_ciclo IS NULL
  AND (CURRENT_DATE - c.ultima_actualizacion::date) > p.valor::integer
  AND NOT EXISTS (SELECT 1 FROM alerta al WHERE al.id_caso = c.id_caso AND al.estado = 'ACTIVA');



-- DATOS INICIALES DE CATÁLOGOS (provisionales: ver decisiones pendientes DP-07 y DP-08)

INSERT INTO rol (codigo, nombre, descripcion) VALUES
    ('COMUNICACION',  'Encargada de comunicación', 'Registra derivaciones y revisa coincidencias.'),
    ('TRABAJO_SOCIAL','Trabajadora social',        'Gestiona fichas, bajas, ayudas, reportes y exportaciones.'),
    ('TENS',          'TENS',                      'Registra gestión, actualiza el ciclo y revisa alertas.'),
    ('PROFESIONAL',   'Profesional dental/kine',   'Registra resultado y motivo de la atención.'),
    ('ADMIN',         'Administrador funcional',   'Administra usuarios y parámetros.');

INSERT INTO permiso (codigo, descripcion) VALUES
    ('DERIVACION_REGISTRAR',  'Registrar una derivación'),
    ('FICHA_CONSULTAR',       'Consultar la ficha del beneficiario'),
    ('FICHA_EDITAR',          'Editar datos complementarios de la ficha'),
    ('SALUD_VER',             'Ver enfermedades y hospitalizaciones'),
    ('SALUD_EDITAR',          'Registrar enfermedades y hospitalizaciones'),
    ('DATOS_SENSIBLES_VER',   'Ver situación documental, previsión y electrodependencia'),
    ('DATOS_SENSIBLES_EDITAR','Editar situación documental, previsión y electrodependencia'),
    ('OBSERVACION_REGISTRAR', 'Registrar observaciones'),
    ('ATENCION_REGISTRAR',    'Registrar atenciones y motivos'),
    ('CICLO_ACTUALIZAR',      'Confirmar estado y término del ciclo'),
    ('ALERTA_CONSULTAR',      'Consultar alertas de seguimiento'),
    ('BAJA_REGISTRAR',        'Registrar bajas'),
    ('AYUDA_REGISTRAR',       'Registrar ayudas entregadas'),
    ('URGENCIA_MARCAR',       'Marcar urgencia'),
    ('REPORTE_GENERAR',       'Generar informes y reportes'),
    ('EXPORTAR_FICHA',        'Exportar ficha o Excel general con datos del apoderado'),
    ('ADMIN_USUARIOS',        'Administrar usuarios y roles'),
    ('ADMIN_PARAMETROS',      'Administrar parámetros del sistema');

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM (VALUES
    ('COMUNICACION',  'DERIVACION_REGISTRAR'),
    ('TRABAJO_SOCIAL','DERIVACION_REGISTRAR'), ('TRABAJO_SOCIAL','FICHA_CONSULTAR'), ('TRABAJO_SOCIAL','FICHA_EDITAR'),
    ('TRABAJO_SOCIAL','SALUD_VER'), ('TRABAJO_SOCIAL','SALUD_EDITAR'), ('TRABAJO_SOCIAL','DATOS_SENSIBLES_VER'),
    ('TRABAJO_SOCIAL','DATOS_SENSIBLES_EDITAR'), ('TRABAJO_SOCIAL','OBSERVACION_REGISTRAR'),
    ('TRABAJO_SOCIAL','ALERTA_CONSULTAR'), ('TRABAJO_SOCIAL','BAJA_REGISTRAR'), ('TRABAJO_SOCIAL','AYUDA_REGISTRAR'),
    ('TRABAJO_SOCIAL','URGENCIA_MARCAR'), ('TRABAJO_SOCIAL','REPORTE_GENERAR'), ('TRABAJO_SOCIAL','EXPORTAR_FICHA'),
    ('TENS','FICHA_CONSULTAR'), ('TENS','OBSERVACION_REGISTRAR'), ('TENS','ATENCION_REGISTRAR'),
    ('TENS','CICLO_ACTUALIZAR'), ('TENS','ALERTA_CONSULTAR'), ('TENS','URGENCIA_MARCAR'),
    ('PROFESIONAL','FICHA_CONSULTAR'), ('PROFESIONAL','SALUD_VER'), ('PROFESIONAL','SALUD_EDITAR'),
    ('PROFESIONAL','ATENCION_REGISTRAR'),
    ('ADMIN','ADMIN_USUARIOS'), ('ADMIN','ADMIN_PARAMETROS')
) AS m (rol_codigo, permiso_codigo)
JOIN rol r     ON r.codigo = m.rol_codigo
JOIN permiso p ON p.codigo = m.permiso_codigo;

INSERT INTO prevision_salud (nombre) VALUES ('FONASA'), ('ISAPRE'), ('Otra'), ('Sin previsión');

INSERT INTO causal_baja (codigo, nombre) VALUES
    ('FALLECIMIENTO',  'Fallecimiento'),
    ('EGRESO',         'Egreso'),
    ('DESVINCULACION', 'Desvinculación');

INSERT INTO motivo_no_atencion (nombre, ambito) VALUES
    ('Contraindicación médica',          'NO_ATENCION'),
    ('Falta de adherencia al programa',  'NO_ATENCION'),
    ('Caso complejo de atender',         'AMBOS');

INSERT INTO tipo_prestacion (nombre, area) VALUES
    ('Atención dental', 'DENTAL'),
    ('Kinesiología',    'KINESIOLOGIA');

INSERT INTO tipo_ayuda (nombre) VALUES ('ORASMI'), ('Vivienda'), ('Insumos');
