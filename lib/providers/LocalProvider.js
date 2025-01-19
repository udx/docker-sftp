const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const debug = require('debug')('k8gate:local');
const StateProvider = require('./StateProvider');

/**
 * Local file system implementation of the state provider interface
 */
class LocalProvider extends StateProvider {
    /**
   * Create a new Local provider
   * @param {Object} config Configuration object
   * @param {string} config.statePath Base directory for state files
   * @param {string} config.keysPath Path for SSH keys
   */
    constructor(config) {
        super();
        this.config = config;
        this.watchers = new Map();
    }

    /**
   * Initialize local storage
   */
    async initialize() {
        debug('Initializing local storage');
    
        // Ensure state directory exists
        const stateDir = path.dirname(this.config.statePath);
        try {
            await fs.mkdir(stateDir, { recursive: true });
            debug(`Created state directory: ${stateDir}`);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    }

    /**
   * Get the full path for a state file
   * @param {string} key State key
   * @returns {string} Full file path
   */
    getStatePath(key) {
    // Special case for SSH keys
        if (key === 'keys') {
            return path.join(this.config.keysPath, 'state.json');
        }
        return path.join(path.dirname(this.config.statePath), `${key}.json`);
    }

    /**
   * Load state from local file
   * @param {string} key Key to load
   * @returns {Promise<any>} Loaded state
   */
    async loadState(key) {
        const filePath = this.getStatePath(key);
        debug(`Loading state from: ${filePath}`);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') {
                debug(`No state file exists for key: ${key}`);
                return null;
            }
            throw err;
        }
    }

    /**
   * Save state to local file
   * @param {string} key Key to save
   * @param {any} data Data to save
   */
    async saveState(key, data) {
        const filePath = this.getStatePath(key);
        debug(`Saving state to: ${filePath}`);

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write atomically by using a temporary file
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
        await fs.rename(tempPath, filePath);

        debug(`State saved for key: ${key}`);
    }

    /**
   * Watch for state changes in local files
   * @param {string} key Key to watch
   * @param {Function} callback Called when state changes
   */
    watchState(key, callback) {
        const filePath = this.getStatePath(key);
        debug(`Setting up watch for: ${filePath}`);

        // Clean up any existing watcher
        if (this.watchers.has(key)) {
            this.watchers.get(key).close();
        }

        // Set up new watcher
        const watcher = chokidar.watch(filePath, {
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', async () => {
            try {
                const data = await this.loadState(key);
                callback(data);
            } catch (err) {
                debug(`Error loading state for key ${key}:`, err.message);
            }
        });

        this.watchers.set(key, watcher);

        // Return cleanup function
        return () => {
            watcher.close();
            this.watchers.delete(key);
        };
    }

    /**
   * Local provider supports real-time updates through file watching
   */
    supportsRealtime() {
        return true;
    }

    /**
   * Local provider has limited concurrent access support
   */
    supportsConcurrentAccess() {
        return false;
    }
}

module.exports = LocalProvider;
