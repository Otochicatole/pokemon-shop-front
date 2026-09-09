import { createSupplier, listSuppliers, setSupplierActive, updateSupplier, type SupplierListQuery } from '../infrastructure/api';
import type { SupplierFormValues } from '../domain/contracts';

export function listSupplierDirectory(query: SupplierListQuery) { return listSuppliers(query); }
export function registerSupplier(values: SupplierFormValues) { return createSupplier(values); }
export function editSupplier(id: string, version: number, values: SupplierFormValues) { return updateSupplier(id, version, values); }
export function changeSupplierStatus(id: string, active: boolean, expectedVersion: number) { return setSupplierActive(id, active, expectedVersion); }
