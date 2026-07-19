# Docker SFTP/SSH Gateway for Kubernetes

[![Docker Pulls](https://img.shields.io/docker/pulls/usabilitydynamics/docker-sftp?logo=docker&label=Docker%20pulls)](https://hub.docker.com/r/usabilitydynamics/docker-sftp)
[![Docker Image Version](https://img.shields.io/docker/v/usabilitydynamics/docker-sftp?sort=semver&logo=docker&label=release)](https://hub.docker.com/r/usabilitydynamics/docker-sftp/tags)
[![Docker Image Size](https://img.shields.io/docker/image-size/usabilitydynamics/docker-sftp?sort=semver&logo=docker&label=image)](https://hub.docker.com/r/usabilitydynamics/docker-sftp/tags)
[![Image workflow](https://img.shields.io/github/actions/workflow/status/udx/docker-sftp/docker-ops.yml?branch=master&label=image%20workflow)](https://github.com/udx/docker-sftp/actions/workflows/docker-ops.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.12.0-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/docs-GitHub-181717?logo=github)](docs/)

Secure SSH/SFTP gateway for controlled access to Kubernetes workloads using
GitHub SSH keys and repository permissions. It proxies approved sessions into
running pods; it is not a standalone file server.

[Quick Start](#quick-start) · [Configuration](#configuration) · [Documentation](#documentation) · [Development](#development)

## Overview

The gateway:

- authenticates users through their GitHub public SSH keys
- evaluates repository access before granting gateway access
- proxies SSH sessions into selected Kubernetes workloads through `kubectl exec`
- supports SFTP when the target container provides an SFTP server
- records gateway state through the optional Firebase integration

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
ssh namespace.pod-name@YOUR_GATEWAY_ADDRESS

# Upload a file
scp local-file namespace.pod-name@YOUR_GATEWAY_ADDRESS:/remote/path/
```

The authenticated GitHub user must have a permitted repository role. See the
[Client Guide](docs/client-guide.md) for SSH configuration, namespaces, and
advanced usage.

## Configuration

The image includes safe Worker defaults. Deployments normally provide only the
cluster-specific values and secrets:

| Variable | Purpose |
| --- | --- |
| `ACCESS_TOKEN` | GitHub token used for repository access checks. |
| `KUBERNETES_CLUSTER_ENDPOINT` | Kubernetes API endpoint. |
| `KUBERNETES_CLUSTER_USER_TOKEN` | Service-account token with the required workload access. |
| `ALLOW_SSH_ACCESS_ROLES` | Optional permitted GitHub roles; defaults to `admin,maintain,write`. |

Use Docker secrets, Kubernetes Secrets, or the deployment system for sensitive
values. Do not commit rendered credentials or pass them in image layers. See
[Runtime Configuration](docs/environment.md) for the full contract and
[Deployment Guide](docs/deployment.md) for Kubernetes manifests.

## Documentation

- [Architecture](docs/architecture.md) — gateway components and data flow
- [Deployment Guide](docs/deployment.md) — Docker and Kubernetes setup
- [Runtime Configuration](docs/environment.md) — defaults, overrides, and secrets
- [Client Guide](docs/client-guide.md) — SSH and SFTP usage
- [User Management](docs/user-management.md) — GitHub access control
- [Troubleshooting](docs/troubleshooting.md) — connection and service diagnosis
- [API Reference](docs/api-reference.md) — HTTP API endpoints

Rabbit CI release behavior and Docker Hub configuration live in
[`.rabbit/README.md`](.rabbit/README.md).

## Development

Local tooling requires Node.js 22.12 or newer, npm, and Docker.

```bash
npm ci
npm test
make build
```

For pull requests, use the same focused loop: update the relevant docs or
runtime contract, run the smallest applicable checks, and let the image
workflow build and scan the change.

## Contributing and Security

- Bugs and feature requests: [GitHub Issues](https://github.com/udx/docker-sftp/issues)
- Security reports: security@udx.io
- Contributions: fork the repository and open a pull request
