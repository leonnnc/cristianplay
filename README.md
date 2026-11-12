# CristianPlay

Dashboard web para descubrir y reproducir música de alabanza, adoración y
predicaciones cristianas de YouTube. Interfaz oscura tipo "glassmorphism" con
gradientes violeta/cian, reproductor central, buscador lateral y biblioteca
personal (playlists, favoritos, historial y cola).

## Características

- **Búsqueda enfocada**: consulta YouTube y filtra/ordena por relevancia
  cristiana (alabanza, adoración, predicación y podcasts). Descarta contenido
  claramente secular (reggaetón, parodias, karaoke, etc.).
- **Dos proveedores**: YouTube Data API v3 si existe `YOUTUBE_API_KEY`;
  fallback automático a Innertube (`youtubei.js`) sin clave.
- **Reproductor integrado** con la IFrame API de YouTube: play/pausa, anterior,
  siguiente, barra de progreso, volumen, silencio y pantalla completa.
- **Cola de reproducción** persistente en la sesión, con reordenar, quitar y
  reproducción continua.
- **Biblioteca personal**: playlists, favoritos e historial.
- **Sincronización opcional** con Firebase Auth (Google) + Firestore. Sin
  configuración de Firebase, todo se guarda en `localStorage`.
- **Diseño responsive**: tres columnas en escritorio, navegación inferior y
  hoja de búsqueda en móvil.
- **Caché y rate limit** en el servidor para proteger la API de YouTube.
- **Accesibilidad básica**: foco visible, etiquetas ARIA, navegación por teclado
  (`/` enfoca la búsqueda, `Esc` cierra paneles).

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components)
- React 19 + TypeScript
- Tailwind CSS v4
- `lucide-react`, `clsx`
- Firebase (Auth + Firestore), `youtubei.js`
- Vitest para pruebas unitarias

## Requisitos

- Node.js 20+ (probado con Node 24)
- pnpm 10+

## Instalación

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre <http://localhost:3000>.

### Acceso desde otro equipo

`localhost` solo funciona en la misma máquina donde corre el servidor. Si vas a
probar la app desde otro PC o móvil, usa la IP del servidor:

```bash
pnpm dev --port 3010 --hostname 0.0.0.0
```

- Red local: `http://<IP-DEL-SERVIDOR>:3010`
- Tailscale/VPN: `http://<IP-TAILSCALE>:3010`

Next.js muestra ambas URLs al arrancar. Si prefieres conservar `localhost` en tu
equipo, abre un túnel SSH:

```bash
ssh -L 3010:127.0.0.1:3010 usuario@<IP-DEL-SERVIDOR>
```

> La app funciona sin variables de entorno: usa Innertube para buscar y
> `localStorage` para la biblioteca. La configuración de YouTube/Firebase es
> opcional, pero recomendable en producción.

## Variables de entorno

Todas las variables viven en `.env.local` (ignorado por Git). Consulta
`.env.example` para la lista completa.

### YouTube (opcional)

| Variable | Descripción |
| --- | --- |
| `YOUTUBE_API_KEY` | Clave de YouTube Data API v3. Si falta se usa Innertube. |
| `YOUTUBE_REGION` | Región para la API oficial (por defecto `MX`). |

Para obtener la clave: Google Cloud Console → habilitar **YouTube Data API v3**
→ crear una API key. Restringe la clave a esa API y, si es posible, a las IPs
del servidor. **No** la expongas con prefijo `NEXT_PUBLIC_`.

Sin clave, la app usa `youtubei.js`. Es un cliente no oficial: puede dejar de
funcionar si YouTube cambia sus APIs internas, y la paginación se guarda en
memoria del servidor (los tokens `kt_` caducan a los 10 minutos).

### Firebase (opcional)

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key del proyecto Firebase. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Storage (opcional). |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID (opcional). |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID. |

Pasos:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Activa **Authentication → Google**.
3. Crea una base de datos **Firestore**.
4. Añade `localhost` y tu dominio de producción a los dominios autorizados de
   Authentication.
5. Publica las reglas incluidas:

   ```bash
   firebase deploy --only firestore:rules --project TU_PROYECTO
   ```

   O copia `firestore.rules` en la consola de Firestore.

La biblioteca se guarda en `users/{uid}/library/main` y las reglas solo
permiten al propietario leer/escribir su documento.

> Las claves `NEXT_PUBLIC_*` son públicas por diseño en Firebase; la seguridad
> real la aportan las reglas de Firestore y los dominios autorizados.

## Scripts

```bash
pnpm dev        # servidor de desarrollo
pnpm build      # build de producción
pnpm start      # servir el build
pnpm lint       # ESLint
pnpm typecheck  # TypeScript sin emitir
pnpm test       # pruebas unitarias (Vitest)
pnpm test:watch # Vitest en modo watch
```

## Estructura

```
src/
  app/
    api/search/route.ts     # endpoint de búsqueda (validación + rate limit)
    layout.tsx              # fuentes, metadata y providers
    page.tsx                # entrada del dashboard
    globals.css             # sistema visual
  components/
    dashboard/              # layout, reproductor, paneles y vistas
    providers/              # UI, Player, Library y Search (contexto)
    ui/                     # piezas reutilizables
  lib/
    christian.ts            # motor de relevancia y filtros
    youtube.ts              # proveedores, caché y paginación
    firebase/client.ts      # Auth + Firestore perezoso
    store/local.ts          # persistencia en localStorage
    format.ts               # formateo de duración/vistas/fechas
    types.ts                # tipos compartidos
```

### Flujo de búsqueda

1. `GET /api/search?q=...&category=...&duration=...&order=...`
2. El servidor construye la consulta (`buildQuery`), consulta el proveedor
   disponible y filtra por duración.
3. `filterAndRank` puntúa cada resultado, descarta contenido bloqueado, filtra
   por categoría y ordena por relevancia/vistas. Si nada supera el umbral,
   activa el modo ampliado (`relaxed`).
4. El cliente muestra los resultados con caché en memoria y paginación.

## Pruebas

Las pruebas cubren funciones puras: parsers de YouTube, motor de relevancia y
formateo.

```bash
pnpm test
```

## Despliegue

La app está pensada para Vercel, pero funciona en cualquier entorno Node.js:

```bash
pnpm build
pnpm start
```

Recuerda configurar las variables de entorno en el proveedor y añadir el
dominio de producción a Firebase Authentication.

## Panel de configuración

Además de `.env.local`, la app permite configurar Firebase/Google y la clave de
YouTube desde un panel web accesible externamente:

- URL: `http://<IP-DEL-SERVIDOR>:3010/panel` (alias `/panel.html`)
- La primera visita pide crear la contraseña del administrador.
- Guarda la configuración en `data/settings.json` (ignorado por Git) y se
  aplica al recargar la app.
- Incluye pruebas reales de conexión: YouTube Data API y Firebase Identity
  Toolkit (informa si el host actual está autorizado).

La contraseña también puede definirse con la variable `PANEL_PASSWORD`; si está
presente, tiene prioridad sobre la guardada. El secreto de sesión se genera
automáticamente.

## Limitaciones y notas

- El filtro cristiano es heurístico (léxico), no un clasificador semántico.
- La reproducción depende de que el propietario del video permita incrustarlo.
- El modo sin clave usa un cliente no oficial de YouTube.
- El rate limit es en memoria por instancia; en serverless conviene un almacén
  compartido (Redis/Upstash) si se espera mucho tráfico.
