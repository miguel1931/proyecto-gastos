# GastosApp

Aplicación de control de gastos personal con backend serverless en Vercel.

## Características

- Dashboard con estadísticas en tiempo real
- Gestión de gastos por proyectos y categorías
- Diseño moderno y responsive
- Autenticación con contraseña
- Backend serverless con Vercel KV

## Estructura del Proyecto

```
proyecto-gastos/
├── api/
│   ├── auth.js       # Endpoint de autenticación
│   └── expenses.js   # CRUD de gastos
├── index.html        # Frontend HTML
├── style.css         # Estilos
├── app.js            # Lógica frontend
├── package.json      # Dependencias
└── vercel.json       # Configuración Vercel
```

## Despliegue en Vercel

### 1. Crear cuenta en Vercel
Ve a [vercel.com](https://vercel.com) y crea una cuenta gratuita.

### 2. Instalar Vercel CLI (opcional)
```bash
npm install -g vercel
```

### 3. Configurar Vercel KV (Base de datos)

1. En el dashboard de Vercel, ve a tu proyecto
2. Ve a la pestaña **Storage**
3. Crea una base de datos **KV (Redis)**
4. Conecta la base de datos a tu proyecto

### 4. Configurar Variables de Entorno

En el dashboard de Vercel, ve a **Settings > Environment Variables** y añade:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `APP_PASSWORD` | `tu_contraseña` | Contraseña de acceso a la app |

> Nota: Cuando conectas KV, Vercel añade automáticamente las variables `KV_URL`, `KV_REST_API_URL`, etc.

### 5. Desplegar

**Opción A: Desde GitHub (recomendado)**
1. Sube el proyecto a un repositorio de GitHub
2. En Vercel, importa el repositorio
3. Vercel detectará automáticamente la configuración

**Opción B: Desde CLI**
```bash
vercel
```

Para producción:
```bash
vercel --prod
```

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.

## Configuración de la Contraseña

Por defecto, la contraseña es `panza`. Para cambiarla:

1. Establece la variable de entorno `APP_PASSWORD` en Vercel
2. O modifica el valor por defecto en `api/auth.js` y `api/expenses.js`

## Notas Importantes

- Sin Vercel KV configurado, la app funciona con localStorage (modo offline)
- Los datos en localStorage son locales al navegador
- Para persistencia real en producción, configura Vercel KV

## Tecnologías

- Frontend: HTML, CSS, JavaScript vanilla
- Backend: Vercel Serverless Functions
- Base de datos: Vercel KV (Redis)
- Autenticación: Token simple (mejorar con JWT en producción)
