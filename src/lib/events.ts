import { EventEmitter } from 'events';

class AppEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(0); // Unlimited listeners
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
};
