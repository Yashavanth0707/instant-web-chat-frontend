import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { ChatMessage } from '../types/room';

interface ChatDBSchema extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: {
      'by-timestamp': number;
      'by-roomId': string;
    };
  };
}

const DB_NAME = 'instant-web-chat';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<ChatDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-roomId', 'roomId');
        } else if (oldVersion < 3) {
          // Upgrading from v1/v2 — add roomId index
          const store = transaction.objectStore('messages');
          if (!store.indexNames.contains('by-roomId')) {
            store.createIndex('by-roomId', 'roomId');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.put('messages', message);
}

export async function getMessagesByRoomId(roomId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-roomId', roomId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearMessagesByRoomId(roomId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const index = tx.store.index('by-roomId');
  let cursor = await index.openCursor(roomId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
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
