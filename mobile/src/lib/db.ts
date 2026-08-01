// Kavana CleanStock Mobile — IndexedDB Offline Cache
// Uses 'idb' library for a promise-based IndexedDB wrapper

import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

const DB_NAME = 'kavana-cleanstock-offline'
const DB_VERSION = 3

interface InventoryItem {
  id: string // composite: `${id_centro}-${id_producto}`
  id_centro: number
  id_producto: number
  cantidad_actual: number
  nombre_producto: string
  unidad_medida: string
  stock_minimo_alerta: number
  synced_at: number
}

interface PendingConsumption {
  offline_id: string
  id_producto: number
  cantidad: number
  created_at: number
  synced: boolean
}

interface CachedCentro {
  id_centro: number
  nombre_centro: string
  direccion?: string
  synced_at: number
}

interface CleanStockDB extends DBSchema {
  inventory: {
    key: string
    value: InventoryItem
    indexes: { 'by-centro': number }
  }
  pending_consumptions: {
    key: string
    value: PendingConsumption
  }
  centro_activo: {
    key: number
    value: CachedCentro
  }
}

let dbPromise: Promise<IDBPDatabase<CleanStockDB>> | null = null

function centroKey(idCentro: number, idProducto: number): string {
  return `${idCentro}-${idProducto}`
}

function getDB(): Promise<IDBPDatabase<CleanStockDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CleanStockDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion) {
        // Delete existing stores to ensure clean schema
        if (db.objectStoreNames.contains('inventory')) {
          db.deleteObjectStore('inventory')
        }
        if (db.objectStoreNames.contains('pending_consumptions')) {
          db.deleteObjectStore('pending_consumptions')
        }
        if (db.objectStoreNames.contains('centro_activo')) {
          db.deleteObjectStore('centro_activo')
        }
        // Create fresh stores
        const invStore = db.createObjectStore('inventory', { keyPath: 'id' })
        invStore.createIndex('by-centro', 'id_centro')
        db.createObjectStore('pending_consumptions', { keyPath: 'offline_id' })
        db.createObjectStore('centro_activo', { keyPath: 'id_centro' })
      },
    })
  }
  return dbPromise
}

// --- Inventory Cache ---

export async function cacheInventory(
  items: Array<{
    id_centro: number
    id_producto: number
    cantidad_actual: number
    producto: {
      nombre_producto: string
      unidad_medida: string
      stock_minimo_alerta: number
    }
  }>
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('inventory', 'readwrite')
  const now = Date.now()

  for (const item of items) {
    await tx.store.put({
      id: centroKey(item.id_centro, item.id_producto),
      id_centro: item.id_centro,
      id_producto: item.id_producto,
      cantidad_actual: item.cantidad_actual,
      nombre_producto: item.producto.nombre_producto,
      unidad_medida: item.producto.unidad_medida,
      stock_minimo_alerta: item.producto.stock_minimo_alerta,
      synced_at: now,
    })
  }
  await tx.done
}

export async function getCachedInventory(
  idCentro: number
): Promise<InventoryItem[]> {
  const db = await getDB()
  const index = db.transaction('inventory').store.index('by-centro')
  return index.getAll(idCentro)
}

export async function updateCachedInventoryItem(
  idCentro: number,
  idProducto: number,
  cantidadActual: number
): Promise<void> {
  const db = await getDB()
  const key = centroKey(idCentro, idProducto)
  const item = await db.get('inventory', key)
  if (item) {
    item.cantidad_actual = cantidadActual
    item.synced_at = Date.now()
    await db.put('inventory', item)
  }
}

// --- Pending Consumptions (Offline Queue) ---

export async function addPendingConsumption(
  offlineId: string,
  idProducto: number,
  cantidad: number
): Promise<void> {
  const db = await getDB()
  await db.add('pending_consumptions', {
    offline_id: offlineId,
    id_producto: idProducto,
    cantidad: Math.abs(cantidad),
    created_at: Date.now(),
    synced: false,
  })
}

export async function getPendingConsumptions(): Promise<PendingConsumption[]> {
  const db = await getDB()
  return db.getAll('pending_consumptions')
}

export async function markPendingSynced(offlineId: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('pending_consumptions', offlineId)
  if (item) {
    item.synced = true
    await db.put('pending_consumptions', item)
  }
}

export async function removePendingConsumption(offlineId: string): Promise<void> {
  const db = await getDB()
  await db.delete('pending_consumptions', offlineId)
}

export async function clearSyncedConsumptions(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('pending_consumptions')
  const tx = db.transaction('pending_consumptions', 'readwrite')
  for (const item of all) {
    if (item.synced) {
      await tx.store.delete(item.offline_id)
    }
  }
  await tx.done
}

// --- Centro Activo Cache ---

export async function cacheCentroActivo(
  centro: { id_centro: number; nombre_centro: string; direccion?: string }
): Promise<void> {
  if (!centro || !centro.id_centro) {
    console.warn('[DB] cacheCentroActivo: invalid centro data', centro)
    return
  }
  const db = await getDB()
  await db.put('centro_activo', {
    id_centro: centro.id_centro,
    nombre_centro: centro.nombre_centro,
    direccion: centro.direccion,
    synced_at: Date.now(),
  })
}

export async function getCachedCentroActivo(): Promise<CachedCentro | undefined> {
  const db = await getDB()
  const all = await db.getAll('centro_activo')
  return all[0]
}
