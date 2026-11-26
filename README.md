# Sistema de Registro, Gestión y Trazabilidad de la Atención del Beneficiario

**Fundación Deportistas por un Sueño** · Ingeniería de Software · Universidad del Desarrollo
Integrantes: **Nicolás Opazo** y **Martín Lorca** · Grupo 2 · Entrega final 

Aplicación web interna para registrar derivaciones, centralizar la ficha de gestión de cada beneficiario y dar trazabilidad al ciclo de atención dental, kinesiológica y de otras prestaciones, desde la derivación hasta el cierre del ciclo o la baja. Reemplaza las planillas Excel separadas y el seguimiento «de memoria» que se identificaron en el levantamiento (diagnóstico D1–D8).

>  **Solo datos ficticios.** Todas las personas, RUT y teléfonos del repositorio son inventados. No se publican contraseñas reales, claves ni archivos `.env`.

---

## 1. Modalidad de demostración 

**Demostración en línea:** https://nicolasopazo27.github.io/deportistas-por-un-sue-o/ (GitHub Pages, rama `gh-pages`).

**Demostración local reproducible:** ver sección 3. El prototipo es una aplicación React que corre en el navegador y guarda los datos en el almacenamiento local (`localStorage`). El despliegue con backend y PostgreSQL corresponde a la etapa siguiente (ver sección 7).

## 2. Requisitos del ambiente

| Herramienta | Versión | Para qué |
|---|---|---|
| [Node.js](https://nodejs.org) | 20 LTS o superior (probado con 22) | Ejecutar el prototipo |
| npm | incluido con Node.js | Instalar dependencias |
| Navegador | Chrome, Edge, Firefox o Safari actualizados | Usar la aplicación |
| PostgreSQL *(opcional)* | 16 | Validar el script de base de datos |

## 3. Instalación y ejecución

```bash
git clone https://github.com/nicolasopazo27/deportistas-por-un-sue-o.git
cd deportistas-por-un-sue-o/prototipo
npm install
npm run dev
```

Abrir en el navegador la dirección que muestra la consola (por defecto **http://localhost:5173**).

Otros comandos (dentro de `prototipo/`):

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta los 30 casos de prueba automatizados y regenera las evidencias en `pruebas/evidencias/` |
| `npm run build` | Compila la versión de producción en `prototipo/dist/` (se puede abrir con `npm run preview`) |
| `npm run lint` | Revisa la calidad del código |

## 4. Usuarios de prueba (ficticios)

Contraseña de todos los usuarios de demostración: **`demo2026`**

| Usuario | Perfil | Puede |
|---|---|---|
| `social@demo.cl` | Trabajo social | Gestión completa del NNA: evaluar postulaciones, derivaciones, fichas, datos de salud, foto, bajas, ayudas, alertas, reportes y exportaciones |
| `comunicacion@demo.cl` | Encargada de comunicación | Registrar derivaciones y consultar fichas |
| `admin@demo.cl` | Administrador | Todo: todos los permisos y además modificar los permisos de los demás perfiles en «Perfiles y permisos» |
| `tutor@demo.cl` | Tutor/a | Consultar fichas, agregar observaciones y foto (las postulaciones se envían desde el formulario público) |
| `tens@demo.cl` | TENS | Fichas, atenciones, ciclo, alertas, observaciones y marcar urgencias (no registra ayudas) |
| `profesional@demo.cl` | Profesional dental/kine | Fichas, datos de salud y atenciones |
| `consulta@demo.cl` | Consulta | Solo consultar fichas (sin datos sensibles ni exportaciones) |

En la pantalla de ingreso está el enlace **«Restablecer datos de demostración»**, que vuelve al conjunto inicial: dos beneficiarios (Camila Rojas Soto y Tomás Díaz Pérez) y dos postulaciones en curso (Sofía Muñoz Araya y Benjamín Soto Lagos).

## 5. Funcionalidades implementadas

| Pantalla | Módulo | Caso de uso | Requisitos |
|---|---|---|---|
| Ingreso e Inicio (panel) | M1 Seguridad y acceso | Transversal | RNF-1, RNF-3 |
| Postulaciones | M8 Postulación e ingreso | CU-01 | RF-01, RF-04 |
| M01 Nueva derivación | M3 Derivación | CU-01 | RF-01, RF-02 · RN-01, RN-02 |
| M02 Ficha del beneficiario | M2 Beneficiario y ficha | CU-02 | RF-04, RF-12 a RF-17, RF-23 |
| M03 Atención y ciclo | M4 Atención y seguimiento | CU-03 | RF-03, RF-05 a RF-07, RF-21, RF-22 |
| M04 Alertas (caso sin actualización y derivación sin atención) | M4 Atención y seguimiento | CU-03 | RF-08 |
| M05 Baja de beneficiario | M5 Bajas | CU-04 | RF-09 · RN-05 |
| M06 Ayudas y urgencia | M6 Ayudas y urgencia | CU-05 | RF-18, RF-20 |
| M07 Reportes y exportaciones | M7 Reportes | CU-06 | RF-10, RF-11, RF-25 · RNF-4 |
| Perfiles y permisos | M1 Seguridad y acceso | Transversal | RNF-3 |

### Mejoras incorporadas a partir de las observaciones del mandante (Certamen 1)

1. **Postulación separada de la derivación:** el NNA entra por una postulación que el apoderado o tutor envía desde el **formulario público** (`#/postular`, sin iniciar sesión); el área social la evalúa en la gestión interna y, al aceptarla, se crea la ficha. Solo se deriva a beneficiarios ya ingresados.
2. **Perfil Tutor** con permisos acotados y vista **Perfiles y permisos** con la matriz por rol.
3. **Antecedentes del NNA:** credencial de discapacidad, centros de salud y hospitalizaciones.
4. **Foto identificatoria** del NNA en la ficha.
5. **Observación por atención**, además de las observaciones generales de la ficha.
6. **Alertas asociadas a derivaciones:** aviso cuando una derivación pasa más de N días sin atención (umbral configurable), además del caso sin actualización.
7. **Panel de inicio** con el flujo del NNA, indicadores y pendientes; menú agrupado por etapa del proceso.

### Ajustes de la revisión final (profesora)

1. **Perfil Administrador** (`admin@demo.cl`): tiene todos los permisos y puede marcar o quitar permisos a los demás perfiles desde «Perfiles y permisos» (con opción de restablecer la matriz original).
2. **KPI con color** en el Inicio: cada indicador tiene su color e ícono, e incluye ingresos y bajas del año comparados con el año anterior.
3. **Gráficos comparativos** de los últimos 5 años en el Inicio: postulaciones, ingresos y bajas por año; beneficiarios activos al cierre de cada año; bajas por causal y derivaciones por prestación. Suman un consolidado anual ficticio de las planillas anteriores con lo registrado en el sistema. Cada gráfico tiene tooltip y una tabla «Ver datos».
4. **Pantalla de ingreso con bienvenida** de la Fundación (presentación, beneficios y botón «Ir a postulación pública»).
5. **Postulación pública:** la postulación se hace desde una página abierta (`#/postular`); la gestión interna ya no registra postulaciones, solo las evalúa.

Todas las vistas tienen botón **Volver** (RNF-1). Fuera del alcance de esta versión: stock de bodega (RF-19), informes sociales (RF-24), rutas e integración con Dental Soft.

## 6. Estructura del repositorio

```
├── prototipo/              Aplicación React + TypeScript (Vite)
│   └── src/
│       ├── domain/         Tipos y reglas de negocio (validaciones, RUT, permisos por rol)
│       ├── data/           Repositorio (patrón Repository), servicios por módulo y datos iniciales ficticios
│       ├── components/     Cabecera, menú lateral y componentes de formulario
│       ├── modules/        Una carpeta por módulo: seguridad, derivaciones, beneficiarios,
│       │                   postulaciones, seguimiento, bajas, ayudas, reportes, perfiles
│       └── test/           Casos de prueba automatizados (Matriz 03)
├── database/               Script DDL PostgreSQL 16 (28 tablas, 41 FK, 43 índices, 2 vistas),
│                           pruebas de integridad y su resultado
├── pruebas/evidencias/     EV-CP-P01 … EV-CP-P30 (.json y .html), resultados.json, ejecucion.txt
└── docs/                   BPMN AS-IS / TO-BE e informe final
```

**Arquitectura:** cliente web organizado por módulos (M1–M7) con capas de presentación (vistas React), aplicación (servicios que verifican permisos y orquestan), dominio (reglas) y datos (repositorio). Los servicios dependen de la interfaz `IRepositorioEstado`; hoy la implementa `RepositorioLocalStorage` y en la etapa siguiente se reemplaza por una implementación sobre la API y PostgreSQL sin cambiar las vistas.

## 7. Base de datos (PostgreSQL 16)

```bash
createdb dpus
psql -d dpus -v ON_ERROR_STOP=1 -f database/DDL_Deportistas_por_un_Sueno.sql
psql -d dpus -f database/pruebas_integridad.sql      # cada caso debe ser RECHAZADO
```

Resultado verificado (`database/resultado_pruebas_integridad.txt`): 28 tablas, 41 claves foráneas, 43 índices y 2 vistas; las 10 pruebas de integridad fueron rechazadas por la restricción esperada.

## 8. Pruebas

`npm test` ejecuta 30 casos (CP-P01 a CP-P30) mediante integración de componentes React con DOM emulado (jsdom). Cada caso parte del conjunto inicial ficticio y deja su evidencia en `pruebas/evidencias/`. Última ejecución: **30 aprobados, 0 fallidos**. Los HTML de evidencia son registros del DOM emulado, no capturas de navegador.

## 9. Limitaciones conocidas y siguiente etapa

- La autenticación y los permisos se verifican en el navegador; la autenticación real (contraseñas con hash y permisos verificados en servidor) requiere el backend.
- Los datos viven en el navegador de cada equipo: no se comparten entre usuarios ni computadores.
- Los avisos al área social son en la plataforma; el envío por correo requiere el backend.
- Los umbrales de alertas (14 días para casos y 7 días para derivaciones) son **valores de ensayo** pendiente de validar con la Fundación (DP-04).
- El reporte ministerial definitivo depende de la plantilla oficial (DP-05).

**Etapa siguiente (prevista):** backend del monolito modular sobre PostgreSQL 16 con autenticación individual, despliegue en la nube con HTTPS y respaldos diarios, avisos por correo y ejecución de los casos CP-01 a CP-34 sobre el sistema completo.
