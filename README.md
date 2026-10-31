# Zapatería Canizales

Proyecto académico hondureño: catálogo responsive azul y amarillo, consultas por WhatsApp, CRUD con acceso administrativo, inventario por talla EU/US y color, y registro manual de ventas en lempiras.

## Empezar

Requiere Node.js 22.12 o superior y npm.

```powershell
npm ci
npm run dev
```

Abre la URL que imprime Vite. Sin variables de entorno, muestra productos ficticios y el panel explica cómo habilitar el acceso real. No hay contraseña predeterminada ni administración simulada con localStorage.

```powershell
npm test
npm run build
npm run preview
```

## Habilitar la base de datos y el administrador

1. Crea un proyecto en https://supabase.com/dashboard. Guarda la contraseña de la base fuera del repositorio.
2. En SQL Editor ejecuta **supabase/schema.sql** una sola vez en una base nueva. Crea tablas, restricciones, políticas RLS y la función transaccional de ventas.
3. En Authentication > Providers desactiva el registro público por correo. En Authentication > Users crea tu único administrador con correo y una contraseña fuerte; confirma el correo desde el panel si usas creación manual. No subas esa contraseña al repositorio.
4. Copia el UUID del usuario creado y ejecuta desde SQL Editor:

```sql
insert into public.admins(user_id) values ('REEMPLAZAR-POR-UUID-REAL');
```

5. Copia `.env.example` a `.env.local`. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con la URL del proyecto y la clave **publicable** `sb_publishable_…` del diálogo Connect. Nunca uses `service_role`, `sb_secret_…`, contraseña de PostgreSQL ni tokens de GitHub. Toda variable VITE se entrega al navegador. La seguridad depende de las políticas RLS, no de ocultar la clave publicable.
6. Reinicia `npm run dev`. Visita `/#admin` e ingresa con el usuario creado. El catálogo conectado empieza vacío: los ejemplos locales no se insertan automáticamente.

Documentación: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [claves publicables y secretas](https://supabase.com/docs/guides/getting-started/api-keys).

## Capacitación de uso

### Publicar un producto

1. En el pie de página elige **Administración** e inicia sesión.
2. Pulsa **Nuevo producto**. Ingresa un código único (ejemplo `ZC-010`), nombre, descripción, categoría, precio en HNL y URL HTTPS de una fotografía que tengas derecho a utilizar.
3. Activa **Publicado en el catálogo** y guarda. No publiques datos personales de prueba.
4. En **Tallas / stock**, añade cada variante: SKU único (`ZC-010-EU-38-AZUL`), talla `38`, sistema `EU`, color `Azul` y existencias. Para US, crea otra variante con su talla explícita; no se convierte automáticamente entre sistemas.
5. Revisa la ficha pública. Un producto sin variantes disponibles no permite iniciar una consulta de compra.

### Editar, reponer u ocultar

- **Editar** cambia los datos y el precio del producto.
- **Tallas / stock > Editar** permite reponer existencias o corregir una variante. El número es el total actual, no una cantidad a sumar.
- Desmarca **Publicado** para retirar temporalmente un producto.
- **Eliminar** pide confirmación y borra el producto con sus variantes. Las ventas previas conservan una copia del nombre, SKU, talla, color y precio.

### Atender WhatsApp y registrar una venta

1. El cliente abre un producto, selecciona talla, color y cantidad, y pulsa **Consultar por WhatsApp**.
2. El mensaje a **+504 9821-1001** incluye nombre, código, SKU, talla/sistema, color, cantidad, precio consultado y enlace compartible. El cliente debe enviar el mensaje en WhatsApp.
3. Confirma disponibilidad, entrega y pago con el cliente. Abrir WhatsApp no reserva ni descuenta stock, ni registra automáticamente una venta.
4. Cuando confirmes la venta, abre **Administración > Ventas**, selecciona la variante exacta y cantidad y pulsa **Confirmar venta**.
5. El servidor comprueba permisos y stock, descuenta unidades y guarda el precio actual del catálogo en una sola transacción. Para pedidos con varios modelos registra una venta por variante.
6. Consulta el historial (últimos 200 registros, hora de Honduras). El importe mostrado suma únicamente esos registros. No hay edición, cancelación o devolución de ventas en esta versión; verifica los datos antes de confirmar.
7. Cierra sesión al terminar.

### Recuperar acceso

Esta versión no incluye una pantalla de recuperación. Gestiona el usuario y la recuperación desde Authentication en Supabase. No borres el administrador sin tener acceso al panel del proyecto. No existe registro público en la interfaz.

## Publicación

### GitHub Pages: demostración académica de solo lectura

El workflow `.github/workflows/pages.yml` compila sin variables Supabase y publica solo el catálogo ficticio. En GitHub abre Settings > Pages > Build and deployment > Source y elige **GitHub Actions**. Ejecuta el workflow o sube un commit a main. La URL esperada es `https://emersoncanizales-oss.github.io/muebleria/`; no se considera publicada hasta que Actions termine correctamente.

GitHub Pages es alojamiento estático y restringe sitios orientados principalmente a transacciones comerciales. Esta demostración se identifica como académica y no recoge credenciales ni datos de clientes. Para el catálogo conectado con acceso administrativo usa otro alojamiento. [Límites oficiales](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

### Aplicación completa

Importa el repositorio en un alojamiento de frontend estático como Cloudflare Pages, Netlify o Vercel. Configura comando `npm run build`, carpeta de salida `dist`, y las dos variables públicas de Supabase en el panel del alojamiento. Configura en Supabase la URL del sitio publicado. Las rutas usan fragmentos (#) para funcionar sin reglas de reescritura. No se ha contratado ni creado ningún servicio de pago.

## Seguridad y verificación

- `.env*`, dependencias, compilaciones, bases y respaldos están excluidos de Git. `.env.example` tiene solo nombres de variables vacíos.
- No hay secretos administrativos en el cliente. El rol administrador se asigna exclusivamente desde la base; un usuario autenticado sin ese rol no puede modificar datos ni consultar ventas.
- El historial es inmutable desde el navegador. `record_sale` es la única vía para registrar ventas y valida el rol en PostgreSQL. Bloquea filas para impedir sobreventa e incluye identificador de solicitud para reintentos idempotentes.
- Las fotos se referencian por URL; no hay carga de archivos en esta versión. Se admiten direcciones HTTPS. Google Fonts e imágenes requieren conexión a Internet y contactan servicios externos; existen fuentes de sistema de respaldo.
- Comprueba en un proyecto de pruebas: acceso anónimo solo a productos activos; rechazo de escrituras anónimas y de usuarios sin rol; CRUD con administrador; venta con stock insuficiente rechazada; dos ventas concurrentes no sobrepasan stock; reintentar la misma solicitud no duplica ventas; borrar un producto conserva su historial.
- Pruebas locales automatizadas: contenido del mensaje de WhatsApp, cantidades inválidas y HTTPS; además, PostgreSQL embebido verifica el esquema SQL, lectura anónima, rechazo de escalamiento de permisos, ventas transaccionales, stock insuficiente, reintentos idempotentes y conservación del historial al eliminar productos. Pasan las 4 pruebas y la compilación. La autenticación real de Supabase y las solicitudes concurrentes entre conexiones aún requieren validación con el proyecto conectado.

## Imágenes y autoría

Consulta [IMAGENES.md](IMAGENES.md). Los nombres, precios y cantidades del catálogo local son genéricos y ficticios. La paleta se inspira en azul y amarillo; no se reproduce el escudo de Boca Juniors ni se afirma asociación con el club. Las marcas visibles en fotos no implican afiliación comercial.

Los commits se realizan con la identidad Git de Emerson (`emersoncanizales`, `emerson.canizales@gmail.com`), sin coautores añadidos. El código fue preparado con asistencia de Codex.
