/**
 * Base class for state management providers.
 * Implements a common interface for different backend storage solutions.
 */
class StateProvider {
    /**
   * Initialize the provider with any necessary setup
   * @returns {Promise<void>}
   */
    async initialize() {
        throw new Error('Not Implemented');
    }

    /**
   * Load state data for a given key
   * @param {string} key - The key to load state for
   * @returns {Promise<any>} The state data
   */
    async loadState(key) {
        throw new Error('Not Implemented');
    }

    /**
   * Save state data for a given key
   * @param {string} key - The key to save state for
   * @param {any} data - The data to save
   * @returns {Promise<void>}
   */
    async saveState(key, data) {
        throw new Error('Not Implemented');
    }

    /**
   * Watch for changes to a key's state
   * @param {string} key - The key to watch
   * @param {Function} callback - Called when state changes
   */
    watchState(key, callback) {
        throw new Error('Not Implemented');
    }

    /**
   * Whether this provider supports real-time updates
   * @returns {boolean}
   */
    supportsRealtime() {
        return false;
    }

    /**
   * Whether this provider supports concurrent access
   * @returns {boolean}
   */
    supportsConcurrentAccess() {
        return true;
    }
}

module.exports = StateProvider;
