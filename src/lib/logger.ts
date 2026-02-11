import { getRuntimeConfig } from "./runtime-config";

/**
 * Centralized logger for Swiparr.
 * Prefixes all logs with [Swiparr] and handles debug level based on configuration.
 */

const PREFIX = "[Swiparr]";

const isDebugEnabled = () => {
    try {
        const config = getRuntimeConfig();
        return config.enableDebug === true;
    } catch (e) {
        // Fallback for cases where config might not be available yet
        return process.env.ENABLE_DEBUG === 'true';
    }
};

export const logger = {
    debug: (...args: any[]) => {
        if (isDebugEnabled()) {
            console.debug(PREFIX, ...args);
        }
    },
    info: (...args: any[]) => {
        console.info(PREFIX, ...args);
    },
    warn: (...args: any[]) => {
        console.warn(PREFIX, ...args);
    },
    error: (...args: any[]) => {
        console.error(PREFIX, ...args);
    }
};
