# front-card-shop

El cliente consume la API modular `/api/v2` del backend mediante el proxy same-origin de Next.js. Las respuestas se validan con Zod y se normalizan desde el envelope `{ data, meta }`.

Frontend ecommerce modular para `back-card-shop`, construido con Next.js 16, React 19, TypeScript, Tailwind 4 y Bun.

## Desarrollo local

1. Copiá `.env.example` como `.env.local`.
2. Asegurate de que el backend escuche en `http://localhost:3000` y tenga `FRONTEND_ORIGINS=http://localhost:3001`.
3. Ejecutá `bun install` y `bun run dev`.

La tienda queda disponible en `http://localhost:3001`. El proxy same-origin de Next reenvía `/api/v2/*` y `/media/*` al backend; no se guardan tokens de sesión en el navegador.

## CMS administrativo

El CMS vive en `http://localhost:3001/admin/login` y usa un layout, una cookie opaca, CSRF y cliente HTTP independientes de la tienda. Incluye dashboard, productos e imágenes, inventario, proveedores, órdenes, pagos, fulfillment, clientes en consulta y auditoría.

La agenda de proveedores está en `http://localhost:3001/admin/suppliers`. Permite alta, edición, desactivación y reactivación; quitar un proveedor es una baja lógica y conserva su información.

Después de aplicar las migraciones y el seed del backend podés usar:

- Admin: `admin@cardshop.test` / `Admin123!seed-card-shop`

Las cuentas administrativas se crean solamente con la CLI del backend. Estas credenciales son exclusivamente locales y deben cambiarse antes de compartir el entorno.

La organización principal usa route groups: `(store)` compone Header/Footer de la tienda y `(admin)` compone el shell operativo. Las features administrativas exponen su API pública desde `index.ts`; sus componentes no acceden directamente a Prisma ni a la sesión del storefront.

## Comandos

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
```

El carrito es local y el backend vuelve a validar precio, versión, stock, entrega y total durante preview y creación de la orden. El checkout requiere usuario autenticado y email verificado.
