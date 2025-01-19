const EventEmitter = require('events');
const debug = require('debug')('k8gate:events');

class K8GateEvents extends EventEmitter {
    constructor() {
        super();
        this.setupListeners();
    }

    setupListeners() {
        // Log all events
        this.on('auth_event', (data) => {
            debug('Auth Event:', data);
            console.log('[K8Gate Event] Auth:', JSON.stringify(data));
        });

        this.on('key_rotation', (data) => {
            debug('Key Rotation:', data);
            console.log('[K8Gate Event] Key Rotation:', JSON.stringify(data));
        });

        this.on('repo_update', (data) => {
            debug('Repository Update:', data);
            console.log('[K8Gate Event] Repo Update:', JSON.stringify(data));
        });
    }

    // Auth events
    emitLogin(userName, repoName) {
        this.emit('auth_event', {
            type: 'login',
            user: userName,
            repo: repoName,
            timestamp: new Date().toISOString()
        });
    }

    emitKeyRotation(userName, keyCount) {
        this.emit('key_rotation', {
            type: 'key_update',
            user: userName,
            keyCount,
            timestamp: new Date().toISOString()
        });
    }

    emitRepoUpdate(repoName, action) {
        this.emit('repo_update', {
            type: 'repo_change',
            repo: repoName,
            action,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new K8GateEvents();
