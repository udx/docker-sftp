# Docker SFTP/SSH Gateway for Kubernetes

[![Docker Image Version](https://img.shields.io/docker/v/usabilitydynamics/docker-sftp?sort=semver&logo=docker&label=release)](https://hub.docker.com/r/usabilitydynamics/docker-sftp/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/usabilitydynamics/docker-sftp?logo=docker&label=Docker%20pulls)](https://hub.docker.com/r/usabilitydynamics/docker-sftp)
[![Image workflow](https://img.shields.io/github/actions/workflow/status/udx/docker-sftp/docker-ops.yml?branch=master&label=image%20workflow)](https://github.com/udx/docker-sftp/actions/workflows/docker-ops.yml)

Secure SSH/SFTP access to Kubernetes workloads, authenticated with GitHub SSH
keys and repository permissions. It proxies approved sessions into running
pods; it is not a standalone file server.

[Quick Start](#quick-start) · [Configuration](#configuration) · [Documentation](#documentation) · [Development](#development)

## Overview

The gateway:

- authenticates users with their GitHub public SSH keys
- checks repository access before allowing a connection
- proxies SSH sessions to selected workloads with `kubectl exec`
- supports SFTP when the target workload supports it
- can record gateway state through Firebase

Published images are available at
[`usabilitydynamics/docker-sftp`](https://hub.docker.com/r/usabilitydynamics/docker-sftp).
Use a semantic version tag such as `0.14.1` for deployments; `latest` follows
the most recent release. Release images support `linux/amd64` and `linux/arm64`.

## Quick Start

### Prerequisites

- Docker for local image execution
- Kubernetes access appropriate for the target workload
- GitHub token with access to the repositories the gateway evaluates
- SSH key registered with the GitHub account that will connect

### Run Locally

Export secrets and cluster values in your shell, then pass only their names to
Docker:

```bash
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  --env ACCESS_TOKEN \
  --env KUBERNETES_CLUSTER_ENDPOINT \
  --env KUBERNETES_CLUSTER_USER_TOKEN \
  usabilitydynamics/docker-sftp:0.14.1
```

### Connect to a Workload

```bash
# Interactive shell
ssh -p 2222 namespace.pod-name@YOUR_GATEWAY_ADDRESS

# Upload a file
scp -P 2222 local-file namespace.pod-name@YOUR_GATEWAY_ADDRESS:/remote/path/
```

The authenticated GitHub user must have a permitted repository role. See the
[Client Guide](docs/client-guide.md) for SSH configuration, namespaces, and
advanced usage.

## Configuration

The image includes safe Worker defaults. Deployments normally provide only the
cluster-specific values and secrets:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ACCESS_TOKEN` | Yes | GitHub token used for repository access checks. |
| `KUBERNETES_CLUSTER_ENDPOINT` | Yes | Kubernetes API endpoint. |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Yes | Service-account token with workload access. |
| `ALLOW_SSH_ACCESS_ROLES` | No | Permitted GitHub roles; defaults to `admin,maintain,write`. |

Use Docker secrets, Kubernetes Secrets, or the deployment system for sensitive
values. Do not commit rendered credentials or pass them in image layers. See
[Runtime Configuration](docs/environment.md) for the complete reference and
[Deployment Guide](docs/deployment.md) for Kubernetes manifests.

## Documentation

- [Deployment Guide](docs/deployment.md) — deploy and verify the gateway
- [Runtime Configuration](docs/environment.md) — service settings and secrets
- [Client Guide](docs/client-guide.md) — SSH and SFTP connections
- [Troubleshooting](docs/troubleshooting.md) — connection and service diagnosis
- [Architecture](docs/architecture.md) — components and data flow
- [User Management](docs/user-management.md) — GitHub access control
- [API Reference](docs/api-reference.md) — internal HTTP endpoints

Rabbit CI release behavior and Docker Hub configuration live in
[`.rabbit/README.md`](.rabbit/README.md).

## Development

Local tooling requires Node.js 22.12 or newer, npm, and Docker.

```bash
npm ci
npm test
make build
```

For pull requests, update the relevant docs or runtime behavior, run the
smallest applicable checks, and let the image workflow build and scan the
change.

## Contributing and Security

- Bugs and feature requests: [GitHub Issues](https://github.com/udx/docker-sftp/issues)
- Security reports: security@udx.io
- Contributions: fork the repository and open a pull request
