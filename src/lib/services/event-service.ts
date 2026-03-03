import { db } from '@/lib/db';
import { sessionEvents } from '@/db/schema';
import { events } from '@/lib/events';
import { lt, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Global session code used for events that broadcast to all connected clients
 * regardless of which session they are in (e.g. ADMIN_CONFIG_UPDATED).
 */
export const GLOBAL_SESSION_CODE = '__global__';

export class EventService {
    /**
     * Emit an event both:
     *  1. In-process via the Node.js EventEmitter — zero-latency delivery for
     *     single-process deployments (Docker / self-hosted).
     *  2. Persisted to the SessionEvent DB table — enables cross-instance
     *     delivery on multi-process / serverless deployments (Vercel + Turso).
     *
     * The SSE route at /api/events reads from the DB table, so both paths are
     * covered without the client needing to do anything differently.
     */
    static async emit(type: string, payload: any): Promise<void> {
        // Resolve the session code from the payload.
        // Payloads are either a plain string code (SESSION_UPDATED legacy) or
        // an object with a sessionCode field.  Global events have no code.
        const sessionCode: string =
            typeof payload === 'string'
                ? payload
                : (payload?.sessionCode ?? GLOBAL_SESSION_CODE);

        // 1. In-process emit — instant for same-process listeners (Docker).
        events.emit(type, payload);

        // 2. Persist to DB for cross-instance SSE delivery.
        try {
            await db.insert(sessionEvents).values({
                sessionCode,
                type,
                payload: JSON.stringify(payload),
            });
        } catch (err) {
            logger.error('[EventService] Failed to persist event to DB', { type, sessionCode, err });
            // Do not throw — in-process delivery already happened; DB persistence
            // is best-effort for cross-instance scenarios.
        }

        // 3. Cleanup events older than 5 minutes — fire-and-forget to keep the
        //    table small without blocking the current request.
        db.delete(sessionEvents)
            .where(lt(sessionEvents.createdAt, sql`datetime('now', '-5 minutes')`))
            .catch((err: unknown) => {
                logger.error('[EventService] Failed to cleanup old events', err);
            });
    }
}
