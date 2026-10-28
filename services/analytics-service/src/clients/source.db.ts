import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

/** Quita el parámetro ?schema= que usa Prisma (pg no lo entiende). */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('schema');
    return u.toString();
  } catch {
    return url;
  }
}

/** Nombres de los schemas de origen (uno por microservicio). */
export const SOURCES = {
  membership: process.env.SOURCE_SCHEMA_MEMBERSHIP ?? 'membership',
  space: process.env.SOURCE_SCHEMA_SPACE ?? 'space',
  booking: process.env.SOURCE_SCHEMA_BOOKING ?? 'booking',
  billing: process.env.SOURCE_SCHEMA_BILLING ?? 'billing',
};

/**
 * Conexión de SOLO LECTURA a las bases de los demás servicios (réplica de lectura).
 * La sesión se abre con default_transaction_read_only=on: aunque hubiera un error en
 * una consulta, Analytics nunca puede modificar datos de otro microservicio.
 */
@Injectable()
export class SourceDb implements OnModuleDestroy {
  private readonly logger = new Logger(SourceDb.name);
  private pool?: Pool;

  private getPool(): Pool {
    if (!this.pool) {
      const url = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
      if (!url) throw new Error('SOURCE_DATABASE_URL no configurada');
      const ssl = /render\.com|neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined;
      this.pool = new Pool({ connectionString: cleanUrl(url), ssl, max: 3, options: '-c default_transaction_read_only=on -c statement_timeout=30000' });
      this.pool.on('error', (err) => this.logger.error(`Réplica: ${err.message}`));
    }
    return this.pool;
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.getPool().query(sql, params);
    return res.rows as T[];
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end().catch(() => undefined);
  }
}
