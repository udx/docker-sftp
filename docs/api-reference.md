# API Reference

The SFTP Gateway API provides endpoints for managing SSH connections, users, and Kubernetes pods.

## Overview

- **Base URL**: `http://localhost:8080` (configurable via `NODE_PORT`)
- **Default Format**: All responses are in JSON
- **Authentication**: See [Authentication](#authentication) section

## Core Endpoints

### Pod Access

#### `GET /v1/pods`

List all accessible Kubernetes pods.

```bash
# Example
curl -H "x-rabbit-internal-token: $TOKEN" http://localhost:8080/v1/pods
```

**Parameters:**

- `namespace` (query, optional) - Filter by namespace

**Response:**

```json
{
  "pods": [
    {
      "name": "web-app-prod",
      "namespace": "default",
      "status": "Running"
    }
  ]
}
```

### User Management

#### `GET /users`

List all users with SSH access.

```bash
# Example
curl http://localhost:8080/users
```

**Response:**

```json
{
  "users": [
    {
      "name": "dev-user",
      "pods": ["web-app-dev"],
      "permissions": ["admin"]
    }
  ]
}
```

#### `GET /_cat/connection-string/:user`

Get SSH connection details for a user.

```bash
# Example
curl http://localhost:8080/_cat/connection-string/dev-user
```

**Response:**

```json
{
  "connectionString": "ssh dev-user@sftp.company.com",
  "pod": "web-app-dev",
  "namespace": "default"
}
```

### Application Management

#### `GET /apps`

List all managed applications.

```bash
# Example
curl http://localhost:8080/apps
```

**Response:**

```json
{
  "apps": [
    {
      "name": "web-app",
      "pods": ["web-app-dev", "web-app-prod"],
      "users": ["dev-user"]
    }
  ]
}
```

### System Maintenance

#### `DELETE /flushFirebaseContainers`

Clean up stale container data from Firebase.

⚠️ **Admin only. Use with caution in production.**

```bash
# Example
curl -X DELETE http://localhost:8080/flushFirebaseContainers
```

**Response:**

```json
{
  "ok": true,
  "message": "Successfully flushed container data",
  "removedCount": 42
}
```

This operation:

- Removes stale container records
- Triggers automatic container re-sync
- Logs all changes for audit
- Helps resolve memory issues


