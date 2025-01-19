const debug = require('debug')('k8gate:rate-limit');
const events = require('./events');

class RateLimit {
    constructor() {
        this.attempts = new Map();
        this.rules = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        events.on('auth_event', (data) => {
            if (data.type === 'login') {
                this.trackAttempt(data.user, data.repo);
            }
        });
    }

    trackAttempt(user, repo) {
        const key = `${user}:${repo}`;
        const now = Date.now();
        
        if (!this.attempts.has(key)) {
            this.attempts.set(key, []);
        }

        const attempts = this.attempts.get(key);
        attempts.push(now);

        // Clean up old attempts (older than 1 hour)
        const oneHourAgo = now - (60 * 60 * 1000);
        while (attempts.length > 0 && attempts[0] < oneHourAgo) {
            attempts.shift();
        }

        debug(`Rate tracking for ${key}: ${attempts.length} attempts in last hour`);
    }

    setRule(type, limit) {
        this.rules.set(type, limit);
        debug(`Set rate limit rule: ${type} = ${limit}`);
    }

    // Placeholder for future rate limit checking
    checkLimit(user, repo) {
        const key = `${user}:${repo}`;
        const attempts = this.attempts.get(key) || [];
        const count = attempts.length;

        debug(`Rate check for ${key}: ${count} attempts`);
        return {
            allowed: true, // Always allow for now
            current: count,
            remaining: Infinity // No enforcement yet
        };
    }

    // Get current attempt counts
    getStats() {
        const stats = {};
        for (const [key, attempts] of this.attempts.entries()) {
            const [user, repo] = key.split(':');
            stats[key] = {
                user,
                repo,
                attempts: attempts.length,
                oldest: attempts[0],
                newest: attempts[attempts.length - 1]
            };
        }
        return stats;
    }
}

module.exports = new RateLimit();
