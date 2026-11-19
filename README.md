# Sistema de Registro, Gestión y Trazabilidad de la Atención del Beneficiario

**Fundación Deportistas por un Sueño** · Ingeniería de Software · Universidad del Desarrollo
Integrantes: **Nicolás Opazo** y **Martín Lorca** · Grupo 2 · Entrega final 23/11/2026

Aplicación web interna para registrar derivaciones, centralizar la ficha de gestión de cada beneficiario y dar trazabilidad al ciclo de atención dental, kinesiológica y de otras prestaciones, desde la derivación hasta el cierre del ciclo o la baja. Reemplaza las planillas Excel separadas y el seguimiento «de memoria» que se identificaron en el levantamiento (diagnóstico D1–D8).

> ⚠️ **Solo datos ficticios.** Todas las personas, RUT y teléfonos del repositorio son inventados. No se publican contraseñas reales, claves ni archivos `.env`.

---

## 1. Modalidad de demostración (entrega del 23/11)

**Demostración local reproducible.** El prototipo es una aplicación React que corre en el navegador y guarda los datos en el almacenamiento local (`localStorage`). El despliegue en la nube con backend y PostgreSQL corresponde a la etapa siguiente (ver sección 7).

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
| `npm test` | Ejecuta los 23 casos de prueba automatizados y regenera las evidencias en `pruebas/evidencias/` |
| `npm run build` | Compila la versión de producción en `prototipo/dist/` (se puede abrir con `npm run preview`) |
| `npm run lint` | Revisa la calidad del código |

## 4. Usuarios de prueba (ficticios)

Contraseña de todos los usuarios de demostración: **`demo2026`**

| Usuario | Perfil | Puede |
|---|---|---|
| `social@demo.cl` | Trabajo social | Todo: derivaciones, fichas, datos de salud, bajas, ayudas, alertas, reportes y exportaciones |
| `comunicacion@demo.cl` | Encargada de comunicación | Registrar derivaciones |
| `tens@demo.cl` | TENS | Fichas, atenciones, ciclo, alertas, observaciones y marcar urgencias (no registra ayudas) |
| `profesional@demo.cl` | Profesional dental/kine | Fichas, datos de salud y atenciones |
| `consulta@demo.cl` | Consulta | Solo consultar fichas (sin datos sensibles ni exportaciones) |

En la pantalla de ingreso está el enlace **«Restablecer datos de demostración»**, que vuelve al conjunto inicial de dos beneficiarios (Camila Rojas Soto y Tomás Díaz Pérez).

## 5. Funcionalidades implementadas

| Pantalla | Módulo | Caso de uso | Requisitos |
|---|---|---|---|
| Ingreso | M1 Seguridad y acceso | Transversal | RNF-3 |
| M01 Nueva derivación | M3 Derivación | CU-01 | RF-01, RF-02 · RN-01, RN-02 |
| M02 Ficha del beneficiario | M2 Beneficiario y ficha | CU-02 | RF-04, RF-12 a RF-17, RF-23 |
| M03 Atención y ciclo | M4 Atención y seguimiento | CU-03 | RF-03, RF-05 a RF-07, RF-21, RF-22 |
| M04 Alertas de seguimiento | M4 Atención y seguimiento | CU-03 | RF-08 |
| M05 Baja de beneficiario | M5 Bajas | CU-04 | RF-09 · RN-05 |
| M06 Ayudas y urgencia | M6 Ayudas y urgencia | CU-05 | RF-18, RF-20 |
| M07 Reportes y exportaciones | M7 Reportes | CU-06 | RF-10, RF-11, RF-25 · RNF-4 |

Todas las vistas tienen botón **Volver** (RNF-1). Fuera del alcance de esta versión: postulaciones, stock de bodega (RF-19), informes sociales (RF-24), rutas e integración con Dental Soft.

## 6. Estructura del repositorio

```
├── prototipo/              Aplicación React + TypeScript (Vite)
│   └── src/
│       ├── domain/         Tipos y reglas de negocio (validaciones, RUT, permisos por rol)
│       ├── data/           Repositorio (patrón Repository), servicios por módulo y datos iniciales ficticios
│       ├── components/     Cabecera, menú lateral y componentes de formulario
│       ├── modules/        Una carpeta por módulo: seguridad, derivaciones, beneficiarios,
│       │                   seguimiento, bajas, ayudas, reportes
│       └── test/           Casos de prueba automatizados (Matriz 03)
├── database/               Script DDL PostgreSQL 16 (28 tablas, 41 FK, 43 índices, 2 vistas),
│                           pruebas de integridad y su resultado
├── pruebas/evidencias/     EV-CP-P01 … EV-CP-P23 (.json y .html), resultados.json, ejecucion.txt
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

`npm test` ejecuta 23 casos (CP-P01 a CP-P23) mediante integración de componentes React con DOM emulado (jsdom). Cada caso parte del conjunto inicial ficticio y deja su evidencia en `pruebas/evidencias/`. Última ejecución: **23 aprobados, 0 fallidos**. Los HTML de evidencia son registros del DOM emulado, no capturas de navegador.

## 9. Limitaciones conocidas y siguiente etapa

- La autenticación y los permisos se verifican en el navegador; la autenticación real (contraseñas con hash y permisos verificados en servidor) requiere el backend.
- Los datos viven en el navegador de cada equipo: no se comparten entre usuarios ni computadores.
- Los avisos al área social son en la plataforma; el envío por correo requiere el backend.
- El umbral de alertas (14 días) es un **valor de ensayo** pendiente de validar con la Fundación (DP-04).
- El reporte ministerial definitivo depende de la plantilla oficial (DP-05).

**Etapa siguiente (prevista):** backend del monolito modular sobre PostgreSQL 16 con autenticación individual, despliegue en la nube con HTTPS y respaldos diarios, avisos por correo y ejecución de los casos CP-01 a CP-34 sobre el sistema completo.
