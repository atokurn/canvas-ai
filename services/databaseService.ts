
import { HistoryItem } from '../types';

const DB_NAME = 'GeminiCanvasHistoryDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const dbInstance = (e.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            db = (e.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        request.onerror = (e) => {
            console.error("IndexedDB error:", (e.target as IDBOpenDBRequest).error);
            reject((e.target as IDBOpenDBRequest).error);
        };
    });
}

export async function saveImageToHistory(item: HistoryItem): Promise<void> {
    try {
        const dbInstance = await getDB();
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.add(item);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Error saving to IndexedDB:", error);
    }
}

export async function loadHistory(): Promise<HistoryItem[]> {
    try {
        const dbInstance = await getDB();
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const timestampIndex = store.index('timestamp');
        const request = timestampIndex.getAll();
        
        const result = await new Promise<HistoryItem[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        result.sort((a, b) => b.timestamp - a.timestamp);
        return result;
    } catch (error) {
        console.error("Error loading from IndexedDB:", error);
        return [];
    }
}

export async function clearHistory(): Promise<void> {
    try {
        const dbInstance = await getDB();
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Error clearing IndexedDB:", error);
    }
}
