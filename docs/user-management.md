# User Management

## Overview

The SSH/SFTP gateway uses GitHub-based authentication and authorization. Users are managed through GitHub collaborator permissions and SSH keys.

## Authentication Flow

1. User connects with their GitHub SSH key
2. System validates the key against GitHub
3. Checks user's repository permissions
4. Grants appropriate access level based on GitHub roles

## GitHub Integration

### Environment Setup

See [Environment Variables](environment.md#github-configuration) for required GitHub configuration.

### Role-Based Access

Access levels are determined by GitHub repository roles:

- `admin`: Full access to all features
- `maintain`: Access to development resources
- `write`: Limited access to development resources

## Key Management

### Key Synchronization

The system automatically:

- Syncs with GitHub collaborator SSH keys
- Updates authorized_keys files
- Handles key rotation
- Manages access permissions

### Manual Key Operations

```bash
# Sync GitHub keys
node controller.keys.js sync

# List authorized keys
node controller.keys.js list

# View key directory
ls -la /etc/ssh/authorized_keys.d/
```

## User Creation

Users are automatically created and managed through GitHub integration:

1. When a collaborator is added to the repository:

   - System detects their GitHub role
   - Creates necessary system user
   - Syncs their SSH keys

2. User permissions are managed by:
   - GitHub repository roles
   - `ALLOW_SSH_ACCESS_ROLES` setting
   - Automatic key synchronization

### User Directory Structure

```
/home/[username]/
├── .ssh/
│   └── authorized_keys  # Auto-updated from GitHub
└── .config/
    └── ssh/
        └── config       # System-managed
```

## Security Considerations

### Key Storage

- Keys are stored in `/etc/ssh/authorized_keys.d/`
- Proper permissions (600) are enforced
- Regular key rotation is recommended

### Access Control

- No password authentication allowed
- SSH key-based authentication only
- Role-based access tied to GitHub permissions
- Regular permission audits recommended

## Troubleshooting

### Common Issues

1. "Permission denied (publickey)"

   - Check GitHub SSH key setup
   - Verify repository permissions
   - Ensure key sync is working

2. "Access denied"
   - Check GitHub role permissions
   - Verify ALLOW_SSH_ACCESS_ROLES setting
   - Check user exists in system

### Logging

```bash
# View SSH logs
tail -f /var/log/sshd.log

# View key sync service logs
worker service logs rabbit-ssh-server
```
