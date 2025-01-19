const axios = require('axios');
const debug = require('debug')('k8gate:kubernetes');
const StateProvider = require('./StateProvider');

/**
 * Kubernetes implementation of the state provider interface using Secrets
 */
class KubernetesProvider extends StateProvider {
  /**
   * Create a new Kubernetes provider
   * @param {Object} config Configuration object
   * @param {string} config.endpoint Kubernetes API endpoint
   * @param {string} config.namespace Kubernetes namespace
   * @param {string} config.token Kubernetes auth token
   * @param {string} config.secretName Name of the secret to use (default: k8-container-gate-keys)
   */
  constructor(config) {
    super();
    this.config = {
      ...config,
      secretName: config.secretName || 'k8-container-gate-keys'
    };
    this.axiosInstance = null;
  }

  /**
   * Initialize Kubernetes client
   */
  async initialize() {
    if (this.axiosInstance) {
      return; // Already initialized
    }

    debug('Initializing Kubernetes client');
    
    this.axiosInstance = axios.create({
      baseURL: this.config.endpoint,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/strategic-merge-patch+json'
      }
    });

    // Verify connection by trying to get the secret
    try {
      await this.loadState('test');
      debug('Kubernetes client initialized');
    } catch (err) {
      debug('Failed to initialize Kubernetes client:', err.message);
      throw new Error(`Failed to initialize Kubernetes client: ${err.message}`);
    }
  }

  /**
   * Load state from Kubernetes Secret
   * @param {string} key Key within the secret
   * @returns {Promise<any>} The loaded state
   */
  async loadState(key) {
    debug(`Loading state for key: ${key}`);
    try {
      const response = await this.axiosInstance.get(
        `/api/v1/namespaces/${this.config.namespace}/secrets/${this.config.secretName}`
      );

      if (response.data && response.data.data && response.data.data[`${key}.json`]) {
        const value = Buffer.from(response.data.data[`${key}.json`], 'base64').toString();
        return JSON.parse(value);
      }
      return null;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        debug('Secret not found, returning null');
        return null;
      }
      throw err;
    }
  }

  /**
   * Save state to Kubernetes Secret
   * @param {string} key Key within the secret
   * @param {any} data Data to save
   */
  async saveState(key, data) {
    debug(`Saving state for key: ${key}`);
    const secretData = {
      [`${key}.json`]: Buffer.from(JSON.stringify(data)).toString('base64')
    };

    try {
      await this.axiosInstance.patch(
        `/api/v1/namespaces/${this.config.namespace}/secrets/${this.config.secretName}`,
        {
          data: secretData
        }
      );
      debug(`State saved for key: ${key}`);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Secret doesn't exist, create it
        debug('Secret not found, creating new secret');
        await this.axiosInstance.post(
          `/api/v1/namespaces/${this.config.namespace}/secrets`,
          {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
              name: this.config.secretName
            },
            data: secretData
          }
        );
        debug(`Created new secret and saved state for key: ${key}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Watch for state changes in Kubernetes Secret
   * Note: This is implemented through polling since K8s Secrets don't support real-time updates
   * @param {string} key Key within the secret
   * @param {Function} callback Called when state changes
   */
  watchState(key, callback) {
    debug(`Setting up watch for key: ${key}`);
    let lastValue = null;

    // Poll every 30 seconds
    const interval = setInterval(async () => {
      try {
        const currentValue = await this.loadState(key);
        if (JSON.stringify(currentValue) !== JSON.stringify(lastValue)) {
          lastValue = currentValue;
          callback(currentValue);
        }
      } catch (err) {
        debug(`Error watching state for key ${key}:`, err.message);
      }
    }, 30000);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Kubernetes Secrets don't support real-time updates
   */
  supportsRealtime() {
    return false;
  }

  /**
   * Kubernetes supports concurrent access
   */
  supportsConcurrentAccess() {
    return true;
  }
}

module.exports = KubernetesProvider;
