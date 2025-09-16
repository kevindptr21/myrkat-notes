import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'

// Base structure for all documents, with auto-managed fields.
export interface BaseDocument {
  id: string
  createdAt: number
  updatedAt: number
}

// Type for data being inserted, making auto-generated fields optional.
type InsertData<T> = Omit<T, keyof BaseDocument> &
  Partial<Pick<BaseDocument, 'id'>>

// Type for data being updated, cannot update metadata directly.
type UpdateData<T> = Partial<Omit<T, keyof BaseDocument>>

// Generic 'where' clause for querying.
type WhereClause<T> = Partial<T>

/**
 * A file-system-based service that mimics a NoSQL database.
 * - Each "table" is a single JSON file containing an array of documents.
 */
class JsonDbService {
  private readonly rootDataDir: string

  constructor() {
    this.rootDataDir = path.join(process.cwd(), 'myrkat-data')
  }

  /**
   * Initializes the service by creating the root data directory.
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.rootDataDir, { recursive: true })
      console.log(`JSON DB Service initialized at: ${this.rootDataDir}`)
    } catch (error) {
      console.error('Failed to initialize JSON DB Service:', error)
      throw error
    }
  }

  private getTablePath(tableName: string): string {
    return path.join(this.rootDataDir, `${tableName}.json`)
  }

  private async readTable<T extends BaseDocument>(
    tableName: string,
  ): Promise<Array<T>> {
    const filePath = this.getTablePath(tableName)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error: any) {
      // If the file doesn't exist, it's an empty table.
      if (error.code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  public async writeTable<T extends BaseDocument>(
    tableName: string,
    data: Array<T>,
  ): Promise<void> {
    const filePath = this.getTablePath(tableName)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Inserts one or more documents into a table file.
   * Creates the file if it doesn't exist.
   * @param tableName The name of the table (file).
   * @param data A single document or an array of documents to insert.
   * @returns The newly created document or documents.
   */
  async insert<T extends BaseDocument>(
    tableName: string,
    data: InsertData<T> | Array<InsertData<T>>,
  ): Promise<T | Array<T>> {
    const tableData = await this.readTable<T>(tableName)
    const items = Array.isArray(data) ? data : [data]
    const now = DateTime.now().toUnixInteger()

    const createdDocs: Array<T> =
      items?.map(
        (item) =>
          ({
            ...item,
            id: item?.id || uuidv4(),
            createdAt: now,
            updatedAt: now,
          }) as T,
      ) || []

    const newData = [...tableData, ...createdDocs]
    await this.writeTable(tableName, newData)

    return Array.isArray(data) ? createdDocs : createdDocs[0]
  }

  /**
   * Finds documents in a table that match a query.
   * @param tableName The name of the table.
   * @param where An object of key-value pairs to match.
   * @returns An array of matching documents.
   */
  async find<T extends BaseDocument>(
    tableName: string,
    where: WhereClause<T> = {},
  ): Promise<Array<T>> {
    const tableData = await this.readTable<T>(tableName)

    if (Object.keys(where).length === 0) {
      return tableData
    }

    return tableData.filter((doc) => {
      return Object.entries(where).every(
        ([key, value]) => doc[key as keyof T] === value,
      )
    })
  }

  /**
   * Updates documents in a table that match a query.
   * @param tableName The name of the table.
   * @param where The query to select documents to update.
   * @param data The data to update in the matching documents.
   * @returns An array of the updated documents.
   */
  async update<T extends BaseDocument>(
    tableName: string,
    where: WhereClause<T>,
    data: UpdateData<T>,
  ): Promise<Array<T>> {
    const tableData = await this.readTable<T>(tableName)
    const now = DateTime.now().toUnixInteger()
    const updatedDocs: Array<T> = []

    const newData = tableData.map((doc) => {
      const shouldUpdate = Object.entries(where).every(
        ([key, value]) => doc[key as keyof T] === value,
      )
      if (shouldUpdate) {
        const updatedDoc = { ...doc, ...data, updatedAt: now }
        updatedDocs.push(updatedDoc)
        return updatedDoc
      }
      return doc
    })

    if (updatedDocs.length > 0) {
      await this.writeTable(tableName, newData)
    }

    return updatedDocs
  }

  /**
   * Deletes documents from a table that match a query.
   * @param tableName The name of the table.
   * @param where The query to select documents to delete.
   * @returns The number of documents deleted.
   */
  async delete<T extends BaseDocument>(
    tableName: string,
    where: WhereClause<T>,
  ): Promise<number> {
    const tableData = await this.readTable<T>(tableName)

    const newData = tableData.filter((doc) => {
      return !Object.entries(where).every(
        ([key, value]) => doc[key as keyof T] === value,
      )
    })

    const deletedCount = tableData.length - newData.length
    if (deletedCount > 0) {
      await this.writeTable(tableName, newData)
    }

    return deletedCount
  }
}

export const jsonDbService = new JsonDbService()

export type StorageRequestPayload = {
  operation: 'find' | 'insert' | 'update' | 'delete' | 'writeTable'
  tableName: string
  where?: any
  data?: any
}

/*
Example Usage:

// Define the structure for your data, extending the BaseDocument
interface Note extends BaseDocument {
  title: string;
  content: string;
  tags?: string[];
}

async function main() {
  // 1. Initialize the service
  await jsonDbService.initialize();

  // 2. Insert a single note into 'notes.json'
  const firstNote = await jsonDbService.insert<Note>('notes', {
    title: 'My First Note',
    content: 'This is stored in a single JSON file.',
  });
  console.log('Inserted Note:', firstNote);

  // 3. Insert multiple notes
  await jsonDbService.insert<Note>('notes', [
    { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] },
    { title: 'Note 3', content: 'Content 3', tags: ['b', 'c'] },
  ]);

  // 4. Find all notes
  const allNotes = await jsonDbService.find<Note>('notes');
  console.log('All Notes count:', allNotes.length);

  // 5. Find notes with a specific tag
  const notesWithTagB = await jsonDbService.find<Note>('notes', { title: 'Note 3' });
  console.log('Notes with title "Note 3":', notesWithTagB);

  // 6. Update a note
  const updatedNotes = await jsonDbService.update<Note>(
    'notes',
    { title: 'Note 2' }, // where
    { content: 'This content has been updated.' } // data
  );
  console.log('Updated Note:', updatedNotes[0]);

  // 7. Delete a note
  const deletedCount = await jsonDbService.delete<Note>('notes', { id: firstNote.id });
  console.log(`Deleted ${deletedCount} note(s).`);

  // 8. Verify deletion
  const finalNotes = await jsonDbService.find<Note>('notes');
  console.log('Final notes count:', finalNotes.length);
}

main().catch(console.error);
*/
