# API Reference

The SFTP Gateway exposes a small internal HTTP API used by its SSH and key
management processes. It is not an authenticated public API: deploy it on a
private network and restrict access with Kubernetes NetworkPolicies, an ingress
rule, or equivalent controls.

## Overview

- **Base URL**: `http://localhost:8080` (configurable via `NODE_PORT`)
- **Response format**: Kubernetes responses are JSON; some utility endpoints
  return plain text.
- **Authentication**: The application does not enforce HTTP authentication.

## Core Endpoints

### Pod Access

#### `GET /v1/pods`

Proxy the Kubernetes `GET /api/v1/pods` response using the gateway's configured
service-account token. The gateway does not implement query filtering; callers
receive the Kubernetes API response unchanged.

```bash
# Example
curl http://localhost:8080/v1/pods
```

**Success response:** Kubernetes `PodList` JSON.

**Failure response:** HTTP 502 with:

```json
{
  "error": "Unable to retrieve Kubernetes pods",
  "message": "…"
}
```

### User Management

#### `GET /users`

Return the in-memory SSH-user state as `{ "items": … }`. The exact item shape
depends on the configured state source and may be absent before the first key
refresh.

```bash
# Example
curl http://localhost:8080/users
```

**Response:**

```json
{
  "items": {}
}
```

#### `GET /_cat/connection-string/:user`

Resolve an SSH-user label or pod name to the command fragment consumed by the
forced SSH command. This is an internal integration endpoint, not a client
connection string.

```bash
# Example
curl http://localhost:8080/_cat/connection-string/dev-user
```

**Response:**

```text
 -n default exec web-app-dev
```

### Application Management

#### `GET /apps`

List the current in-memory application records.

```bash
# Example
curl http://localhost:8080/apps
```

**Response:**

```json
{
  "items": []
}
```

### System Maintenance

#### `DELETE /flushFirebaseContainers`

Clean up stale container data from Firebase.

⚠️ This removes the entire Firebase `container` collection. The application
does not authorize this endpoint; only expose it to trusted operators.

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
