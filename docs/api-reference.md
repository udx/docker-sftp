# API Reference

## Base URL

The API server runs on port 8080 by default (configurable via `NODE_PORT`).

## Endpoints

### Connection Management

#### GET `/_cat/connection-string/:user`

Get pod connection details for a user.

**Parameters:**

- `:user` - Username/pod identifier

**Response:**

```json
{
  "connectionString": "string",
  "pod": "string",
  "namespace": "string"
}
```

### User Management

#### GET `/users`

List available users.

**Response:**

```json
{
  "users": ["user1", "user2"]
}
```

### Application Management

#### GET `/apps`

List available applications.

**Response:**

```json
{
  "apps": ["app1", "app2"]
}
```

### Pod Management

#### GET `/v1/pods`

List Kubernetes pods.

**Query Parameters:**

- `namespace` (optional) - Filter by namespace

**Response:**

```json
{
  "pods": [
    {
      "name": "string",
      "namespace": "string",
      "status": "string"
    }
  ]
}
```

### Maintenance

#### DELETE `/flushFirebaseContainers`

Maintenance endpoint to clean up Firebase container state. Use this to resolve memory issues or clean up stale data.

**Response:**

```json
{
  "ok": true,
  "message": "Successfully flushed container data",
  "removedCount": 42
}
```

**Error Response:**

```json
{
  "ok": false,
  "message": "Failed to flush containers",
  "error": "Error details"
}
```

**Notes:**

- Requires admin access
- Operation is logged for audit purposes
- Triggers automatic container re-sync
- Use with caution in production

## Authentication

All API endpoints require appropriate authentication headers based on the configuration.
