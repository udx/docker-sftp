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

#### POST `/flushFirebaseContainers`
Maintenance endpoint to clean up Firebase container state.

**Response:**
```json
{
  "status": "success|error",
  "message": "string"
}
```

## Authentication
All API endpoints require appropriate authentication headers based on the configuration.
