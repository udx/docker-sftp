const admin = require('firebase-admin');
const debug = require('debug')('k8gate:firebase');
const StateProvider = require('./StateProvider');

/**
 * Firebase implementation of the state provider interface
 */
class FirebaseProvider extends StateProvider {
    /**
   * Create a new Firebase provider
   * @param {Object} config Configuration object
   * @param {Object} config.credentials Firebase credentials
   * @param {string} config.databaseURL Firebase database URL
   */
    constructor(config) {
        super();
        this.config = config;
        this.db = null;
    }

    /**
   * Initialize Firebase connection
   */
    async initialize() {
        if (this.db) {
            return; // Already initialized
        }

        debug('Initializing Firebase connection');
    
        // Setup firebase admin using provided credentials
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: this.config.credentials.projectId,
                privateKey: this.config.credentials.privateKey.split('\\n').join('\n'),
                clientEmail: this.config.credentials.clientEmail
            }),
            databaseURL: this.config.databaseURL
        });

        this.db = admin.database();
        debug('Firebase connection initialized');
    }

    /**
   * Load state from Firebase
   * @param {string} key Path to load from
   * @returns {Promise<any>} The loaded state
   */
    async loadState(key) {
        debug(`Loading state for key: ${key}`);
        const snapshot = await this.db.ref(key).once('value');
        return snapshot.val();
    }

    /**
   * Save state to Firebase
   * @param {string} key Path to save to
   * @param {any} data Data to save
   */
    async saveState(key, data) {
        debug(`Saving state for key: ${key}`);
        return this.db.ref(key).set(data);
    }

    /**
   * Watch for state changes in Firebase
   * @param {string} key Path to watch
   * @param {Function} callback Called when state changes
   */
    watchState(key, callback) {
        debug(`Setting up watch for key: ${key}`);
        this.db.ref(key).on('value', (snapshot) => {
            callback(snapshot.val());
        });
    }

    /**
   * Firebase supports real-time updates
   */
    supportsRealtime() {
        return true;
    }
}

module.exports = FirebaseProvider;
