import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
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
