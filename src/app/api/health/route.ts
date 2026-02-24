import { NextResponse } from 'next/server';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      return NextResponse.json(
        {
          status: 'skipped',
          database: 'unavailable',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
    // Check database connectivity
    await db.run(sql`SELECT 1`);
    
    return NextResponse.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString() 
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, "Health check failed");
  }
}
