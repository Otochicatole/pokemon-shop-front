# front-card-shop

Frontend ecommerce modular para `back-card-shop`, construido con Next.js 16, React 19, TypeScript, Tailwind 4 y Bun.

## Desarrollo local

1. Copiá `.env.example` como `.env.local`.
2. Asegurate de que el backend escuche en `http://localhost:3000` y tenga `FRONTEND_ORIGINS=http://localhost:3001`.
3. Ejecutá `bun install` y `bun run dev`.

La tienda queda disponible en `http://localhost:3001`. El proxy same-origin de Next reenvía `/api/v1/*` y `/media/*` al backend; no se guardan tokens de sesión en el navegador.

## Comandos

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
```

El carrito es local y el backend vuelve a validar precio, versión, stock, entrega y total durante preview y creación de la orden. El checkout requiere usuario autenticado y email verificado.
