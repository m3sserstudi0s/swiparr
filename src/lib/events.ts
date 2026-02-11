import { EventEmitter } from 'events';
import { logger } from './logger';

class AppEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(0); // Unlimited listeners
    }

    emit(event: string | symbol, ...args: any[]): boolean {
        logger.debug(`[Event] ${String(event)}`, ...args);
        return super.emit(event, ...args);
    }
}

// Global singleton
let eventEmitter: AppEventEmitter;

if (process.env.NODE_ENV === 'production') {
    eventEmitter = new AppEventEmitter();
} else {
    // In development mode, use a global variable so the emitter is preserved across HMR
    if (!(global as any).eventEmitter) {
        (global as any).eventEmitter = new AppEventEmitter();
    }
    eventEmitter = (global as any).eventEmitter;
}

export const events = eventEmitter;

export const EVENT_TYPES = {
    SESSION_UPDATED: 'session_updated',
    MATCH_FOUND: 'match_found',
    MATCH_REMOVED: 'match_removed',
    QUICK_CONNECT_AUTHORIZED: 'quick_connect_authorized',
    FILTERS_UPDATED: 'filters_updated',
    SETTINGS_UPDATED: 'settings_updated',
    STATS_RESET: 'stats_reset',
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    LIKE_UPDATED: 'like_updated',
    ADMIN_CONFIG_UPDATED: 'admin_config_updated',
};
