# State Management

K8 Container Gate supports multiple state management backends through a provider abstraction layer. This allows for flexible deployment scenarios and different scaling requirements.

## Configuration

State management is configured in your `worker.yml`:

```yaml
state:
  # Choose your state provider: kubernetes, firebase, or local
  provider: kubernetes
  
  options:
    # Kubernetes provider configuration
    kubernetes:
      secretName: k8-container-gate-keys
      namespace: ${KUBERNETES_CLUSTER_NAMESPACE}
    
    # Firebase provider configuration
    firebase:
      projectId: ${FIREBASE_PROJECT_ID}
      databaseUrl: ${FIREBASE_DATABASE_URL}
      
    # Local provider configuration
    local:
      statePath: /var/lib/k8gate/state.json
      keysPath: /etc/ssh/authorized_keys.d
```

## Environment Variables

### Kubernetes Provider
- `KUBERNETES_CLUSTER_ENDPOINT`: Kubernetes API endpoint
- `KUBERNETES_CLUSTER_NAMESPACE`: Target namespace
- `KUBERNETES_CLUSTER_USER_TOKEN`: Service account token

### Firebase Provider
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Service account private key
- `FIREBASE_CLIENT_EMAIL`: Service account email
- `FIREBASE_DATABASE_URL`: Realtime Database URL

### Local Provider
No specific environment variables required. Paths are configured in worker.yml.

## Provider Features

### Kubernetes Provider
- Uses Kubernetes Secrets for state storage
- Supports concurrent access
- Polling-based updates (30s interval)
- Best for Kubernetes-native deployments

### Firebase Provider
- Real-time updates via Firebase Realtime Database
- Supports concurrent access
- Event-driven updates
- Best for multi-cloud deployments

### Local Provider
- File-based storage
- File watching for updates
- Limited concurrent access
- Best for development and single-instance deployments

## Rate Limiting

Rate limiting is configured through environment variables and tracked per user/repository:

```yaml
env:
  # Rate limiting configuration
  RATE_LIMIT_LOGIN_PER_HOUR: "100"
  RATE_LIMIT_KEY_ROTATION: "10"
  RATE_LIMIT_ENABLED: "true"
```

Rate limits are tracked but not enforced by default. To enable enforcement, set `RATE_LIMIT_ENABLED=true`.

## Integration Points

### Event System
The state management system integrates with the event system for tracking state changes:

```javascript
const events = require('./events');

// Listen for state changes
events.on('state_change', (data) => {
  console.log('State changed:', data);
});

// Listen for rate limit events
events.on('rate_limit', (data) => {
  console.log('Rate limit hit:', data);
});
```

### Custom Providers
You can implement custom providers by extending the StateProvider class:

```javascript
const StateProvider = require('./providers/StateProvider');

class CustomProvider extends StateProvider {
  async initialize() {
    // Setup your provider
  }

  async loadState(key) {
    // Load state for key
  }

  async saveState(key, data) {
    // Save state for key
  }

  watchState(key, callback) {
    // Watch for state changes
  }
}
```
