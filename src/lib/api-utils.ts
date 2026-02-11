import { NextResponse } from "next/server";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";

/**
 * Standardized API error response with correlation IDs.
 */
export function createErrorResponse(
    message: string, 
    status: number = 500, 
    error?: unknown
) {
    const errorId = `ERR-${uuidv4().split('-')[0].toUpperCase()}`;
    
    // Log the full error on the server
    logger.error(`[${errorId}] ${message}`, error);
    
    return NextResponse.json(
        { 
            error: message, 
            errorId 
        }, 
        { status }
    );
}

/**
 * Helper to catch and log errors in API routes.
 */
export function handleApiError(error: unknown, customMessage: string = "Internal Server Error") {
    return createErrorResponse(customMessage, 500, error);
}
