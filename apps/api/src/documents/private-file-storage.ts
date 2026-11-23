import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { del, get, put } from '@vercel/blob';

export interface StoredFile {
  provider: string;
  pathname: string;
}

@Injectable()
export class PrivateFileStorage {
  private readonly driver =
    process.env.FILE_STORAGE_DRIVER?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'vercel' : 'local');
  private readonly localRoot = resolve(process.cwd(), '.tmp', 'private-files');

  constructor() {
    if (!['local', 'vercel'].includes(this.driver)) {
      throw new Error('FILE_STORAGE_DRIVER must be local or vercel.');
    }
    if (process.env.NODE_ENV === 'production' && this.driver !== 'vercel') {
      throw new Error('Production file storage must use private Vercel Blob.');
    }
  }

  async save(
    companyId: string,
    contentType: string,
    extension: string,
    bytes: Buffer,
  ): Promise<StoredFile> {
    const pathname = `documents/${companyId}/${randomUUID()}.${extension}`;
    if (this.driver === 'vercel') {
      const result = await put(pathname, bytes, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
      });
      return { provider: 'VERCEL_BLOB', pathname: result.pathname };
    }
    await mkdir(this.localRoot, { recursive: true });
    // The opaque basename is generated server-side and never returned to the browser.
    const localName = pathname.replaceAll('/', '_');
    await writeFile(resolve(this.localRoot, localName), bytes, { flag: 'wx' });
    return { provider: 'LOCAL_PRIVATE', pathname };
  }

  async read(object: StoredFile): Promise<Buffer | null> {
    if (object.provider === 'VERCEL_BLOB') {
      const result = await get(object.pathname, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return null;
      }
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    }
    if (object.provider !== 'LOCAL_PRIVATE') {
      return null;
    }
    try {
      return await readFile(resolve(this.localRoot, object.pathname.replaceAll('/', '_')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async remove(object: StoredFile): Promise<void> {
    if (object.provider === 'VERCEL_BLOB') {
      await del(object.pathname);
    } else if (object.provider === 'LOCAL_PRIVATE') {
      await unlink(resolve(this.localRoot, object.pathname.replaceAll('/', '_'))).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        },
      );
    }
  }
}
