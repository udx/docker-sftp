# Firebase Integration

## Overview
The system uses Firebase Realtime Database to maintain container state and configuration. This allows for real-time tracking of containers and automatic cleanup of stale resources.

## Configuration

### Environment Setup
See [Environment Variables](environment.md#firebase-configuration) for required Firebase configuration.

### Service Account Setup
1. Create a Firebase project
2. Generate a service account key
3. Set the environment variables using the service account details

## Data Structure

### Deployment Collection
The system maintains a `deployment` collection in Firebase with the following structure:

```json
{
  "deployment": {
    "[pod-id]": {
      "status": "active|terminated",
      "lastSeen": "timestamp",
      "metadata": {
        "namespace": "string",
        "name": "string"
      }
    }
  }
}
```

## Components

### Firebase Consumer
The `firebase-consume` service:
- Watches for changes in the deployment collection
- Updates local state based on Firebase changes
- Handles container lifecycle events
- Performs automatic cleanup of terminated containers

### Health Monitoring
- Service automatically exits if Firebase configuration is missing
- Provides detailed logs via `worker service logs firebase-consume`
- Automatically reconnects on connection loss
