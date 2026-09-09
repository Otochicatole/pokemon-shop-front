import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'back-card-shop');
const bunExecutable = process.platform === 'win32' ? 'bun.exe' : 'bun';

function backendCommand(script: string) {
  return execFileSync(bunExecutable, ['run', script], { cwd: backendRoot, encoding: 'utf8' });
}

function firstWebp(directory: string): string | null {
  for (const name of readdirSync(directory)) {
    const candidate = path.join(directory, name);
    if (statSync(candidate).isDirectory()) { const nested = firstWebp(candidate); if (nested) return nested; }
    else if (name.toLowerCase().endsWith('.webp')) return candidate;
  }
  return null;
}

test.describe('CMS administrativo integrado', () => {
  test.skip(process.env.RUN_ADMIN_E2E !== '1', 'Requiere backend local migrado y habilitación explícita porque modifica datos de desarrollo.');

  test.beforeAll(() => { backendCommand('db:seed'); });

  test('login → producto → imagen → stock → publicación → transferencia → auditoría', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('admin@cardshop.test');
    await page.getByLabel('Contraseña').fill('Admin123!seed-card-shop');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('link', { name: 'Productos', exact: true }).click();
    await page.getByRole('link', { name: 'Nuevo producto' }).click();
    const suffix = Date.now().toString(36);
    const name = `Carta E2E ${suffix}`;
    await page.getByLabel('SKU').fill(`E2E-${suffix}`);
    await page.getByLabel('Slug').fill(`carta-e2e-${suffix}`);
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Descripción').fill('Producto de verificación integral del CMS.');
    await page.getByLabel('Precio final').fill('12500.00');
    await page.getByLabel('Stock inicial').fill('0');
    await page.getByLabel('Colección / set').fill('E2E Set');
    await page.getByLabel('Número').fill('001');
    await page.getByLabel('Rareza').fill('Promo');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+$/);
    const productUrl = page.url();

    const productImage = firstWebp(path.join(backendRoot, 'storage', 'public', 'products'));
    expect(productImage).not.toBeNull();
    await page.locator('input[type="file"]').setInputFiles(productImage!);
    await page.getByRole('button', { name: 'Subir' }).click();
    await expect(page.getByText('Imágenes (1/8)')).toBeVisible();

    await page.getByRole('link', { name: 'Inventario' }).click();
    await page.getByLabel('Buscar producto').fill(name);
    await expect(page.getByRole('link', { name })).toBeVisible();
    await page.getByRole('button', { name: `Ajustar stock de ${name}` }).click();
    await page.getByLabel('Delta').fill('1');
    await page.getByLabel('Motivo').fill('Ingreso de unidad para prueba E2E');
    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(page.getByText('Stock ajustado y auditado')).toBeVisible();

    await page.goto(productUrl);
    await page.getByRole('button', { name: 'Publicar' }).click();
    await page.getByRole('dialog', { name: 'Publicar producto' }).getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('Publicado', { exact: true })).toBeVisible();

    await page.goto('/admin/payments?queue=TRANSFER_REVIEW');
    const reviewLink = page.locator('a[aria-label^="Revisar pago de"]').first();
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();
    await page.getByRole('button', { name: 'Aprobar' }).first().click();
    await page.getByRole('dialog', { name: 'Aprobar comprobante' }).getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Pagada', { exact: true }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Auditoría' }).click();
    await page.getByLabel('Acción').fill('TRANSFER_APPROVED');
    await expect(page.getByText('TRANSFER_APPROVED').first()).toBeVisible();

    await page.goto(productUrl);
    await page.getByRole('button', { name: 'Archivar' }).click();
    await page.getByRole('dialog', { name: 'Archivar producto' }).getByRole('button', { name: 'Archivar' }).click();
    await expect(page.getByText('Archivado', { exact: true })).toBeVisible();
  });

  test('login y navegación administrativa responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('admin@cardshop.test');
    await page.getByLabel('Contraseña').fill('Admin123!seed-card-shop');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const menuButton = page.getByRole('button', { name: 'Abrir menú' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const navigation = page.getByRole('complementary', { name: 'Navegación administrativa' });
    await expect(navigation).toBeVisible();
    await navigation.getByRole('link', { name: 'Productos', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  });
});
