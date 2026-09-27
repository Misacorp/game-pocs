/**
 * Persistence layer. Characters are persisted as JSON files under server/data/ so the demo
 * server works with zero external dependencies. Swapping this for a real database later only
 * means writing a new class that implements `Store` — nothing else in the server touches disk
 * directly.
 *
 * Layout:
 *   server/data/accounts/<token>.json    -> { characterIds: string[] }
 *   server/data/characters/<id>.json     -> CharacterState
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CharacterState } from '../src/shared/types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, 'data');
const ACCOUNTS_DIR = path.join(DATA_DIR, 'accounts');
const CHARACTERS_DIR = path.join(DATA_DIR, 'characters');

interface AccountRecord {
  characterIds: string[];
}

function safeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || '_';
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, file);
}

export interface Store {
  getAccountCharacterIds(token: string): Promise<string[]>;
  loadCharacter(id: string): Promise<CharacterState | null>;
  saveCharacter(c: CharacterState): Promise<void>;
  addCharacterToAccount(token: string, id: string): Promise<void>;
  removeCharacterFromAccount(token: string, id: string): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
}

/** Simple file-backed store. Easy to swap for a DB-backed implementation later. */
export class FileStore implements Store {
  private ready: Promise<void>;

  constructor() {
    this.ready = fs
      .mkdir(ACCOUNTS_DIR, { recursive: true })
      .then(() => fs.mkdir(CHARACTERS_DIR, { recursive: true }))
      .then(() => undefined);
  }

  private accountFile(token: string): string {
    return path.join(ACCOUNTS_DIR, `${safeId(token)}.json`);
  }
  private characterFile(id: string): string {
    return path.join(CHARACTERS_DIR, `${safeId(id)}.json`);
  }

  async getAccountCharacterIds(token: string): Promise<string[]> {
    await this.ready;
    const rec = await readJson<AccountRecord>(this.accountFile(token));
    return rec?.characterIds ?? [];
  }

  async loadCharacter(id: string): Promise<CharacterState | null> {
    await this.ready;
    return readJson<CharacterState>(this.characterFile(id));
  }

  async saveCharacter(c: CharacterState): Promise<void> {
    await this.ready;
    await writeJsonAtomic(this.characterFile(c.id), c);
  }

  async addCharacterToAccount(token: string, id: string): Promise<void> {
    await this.ready;
    const ids = await this.getAccountCharacterIds(token);
    if (!ids.includes(id)) ids.push(id);
    await writeJsonAtomic(this.accountFile(token), { characterIds: ids } satisfies AccountRecord);
  }

  async removeCharacterFromAccount(token: string, id: string): Promise<void> {
    await this.ready;
    const ids = (await this.getAccountCharacterIds(token)).filter((x) => x !== id);
    await writeJsonAtomic(this.accountFile(token), { characterIds: ids } satisfies AccountRecord);
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.ready;
    try {
      await fs.unlink(this.characterFile(id));
    } catch {
      /* already gone */
    }
  }
}
