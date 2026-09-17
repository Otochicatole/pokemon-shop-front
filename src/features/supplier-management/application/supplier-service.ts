import {
  createSupplier,
  createSupplierPurchase,
  deleteSupplierPurchase,
  getSupplier,
  listSupplierPurchases,
  listSuppliers,
  setSupplierActive,
  updateSupplier,
  type SupplierListQuery,
} from '../infrastructure/api';
import type { PurchaseFormValues, SupplierFormValues } from '../domain/contracts';

export function listSupplierDirectory(query: SupplierListQuery) { return listSuppliers(query); }
export function loadSupplier(id: string) { return getSupplier(id); }
export function registerSupplier(values: SupplierFormValues) { return createSupplier(values); }
export function editSupplier(id: string, version: number, values: SupplierFormValues) { return updateSupplier(id, version, values); }
export function changeSupplierStatus(id: string, active: boolean, expectedVersion: number) { return setSupplierActive(id, active, expectedVersion); }
export function listPurchases(supplierId: string, cursor?: string) { return listSupplierPurchases(supplierId, cursor); }
export function registerPurchase(supplierId: string, values: PurchaseFormValues) { return createSupplierPurchase(supplierId, values); }
export function removePurchase(supplierId: string, purchaseId: string) { return deleteSupplierPurchase(supplierId, purchaseId); }
