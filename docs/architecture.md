# Architecture Details

## Overview

The Docker SFTP/SSH Gateway is designed as a secure bridge between users and Kubernetes pods, using GitHub for authentication and authorization. The system consists of several interconnected components that work together to provide secure access.

## Core Components

### 1. SSH Gateway (SSHD)

- **Process Management**: Runs under PM2 for reliability
- **Authentication**: Uses GitHub SSH keys
- **Configuration**: Custom `sshd_config` with ForceCommand
- **SFTP Support**: Internal SFTP subsystem enabled

#### Key Files:
- `/etc/ssh/sshd_config`: SSH daemon configuration
- `/bin/controller.ssh.entrypoint.sh`: Connection handler
- `/etc/ssh/authorized_keys.d/`: Dynamic key storage

### 2. API Server

The API server provides internal services for pod management and authentication.

#### Endpoints:
- `/_cat/connection-string/:user`: Get pod connection details
- `/users`: List available users
- `/apps`: List available applications
- `/v1/pods`: Kubernetes pod management
- `/flushFirebaseContainers`: Maintenance endpoint

#### Key Files:
- `/bin/server.js`: Main API implementation
- `/lib/utility.js`: Helper functions

### 3. Key Management

Handles SSH key synchronization and access control.

#### Features:
- GitHub collaborator synchronization
- Role-based access control
- Key rotation and updates
- Slack notifications

#### Key Files:
- `/bin/controller.keys.js`: Key management logic
- `/static/templates/*.mustache`: Password file templates

### 4. State Management

Uses Firebase for maintaining container state and configuration.

#### Features:
- Real-time container tracking
- State persistence
- Automatic cleanup
- Event handling

## Security Model

### Authentication Flow

1. User connects with SSH key
2. System validates key against GitHub
3. Checks user's repository permissions
4. Grants appropriate access level

### Authorization Levels

1. **Production Access**
   - Limited to admin roles
   - Stricter security controls
   - Additional validation

2. **Development Access**
   - Available to write, maintain, admin roles
   - Standard security controls

## Container Integration

### Pod Connection Process

1. SSH connection received
2. User authenticated via GitHub
3. Pod identified from connection string
4. kubectl exec establishes connection
5. Session handed over to user

### SFTP Handling

1. SFTP subsystem activated
2. Path resolution in container
3. File operations proxied to pod
4. Access controls enforced

## Monitoring and Maintenance

### Health Checks
- API server status
- Pod connectivity
- Firebase state
- SSH daemon health

### Notifications
- Key updates
- Access attempts
- System events
- Error conditions

## Deployment

### Container Setup
- Alpine Linux base
- Node.js runtime
- PM2 process manager
- OpenSSH server

### Kubernetes Integration
- Service account configuration
- RBAC policies
- Network policies
- Security contexts
