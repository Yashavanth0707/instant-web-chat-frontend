import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatMessage } from '../types/room';

interface ChatDBSchema extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'instant-web-chat';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ChatDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.put('messages', message);
}

export async function getAllMessages(): Promise<ChatMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'by-timestamp');
}

export async function clearAllMessages(): Promise<void> {
  const db = await getDB();
  await db.clear('messages');
}

export async function deleteDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await indexedDB.deleteDatabase(DB_NAME);
}
