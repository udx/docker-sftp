# Remote Access Guide

This guide explains how to access K8 Container Gate using SSH, SFTP, and SCP protocols.

## Prerequisites

1. GitHub account with repository access
2. SSH key added to your GitHub account
3. K8 Container Gate endpoint URL
4. Repository permissions (admin, maintain, or write)

## SSH Access

### Non-Interactive Mode (Preferred)

For running single commands or scripts:

```bash
# Basic command execution
ssh <github-username>@<endpoint> "<command>"

# Example: List WordPress plugins
ssh user@k8gate.example.com "wp plugin list"

# Example: Check git status
ssh user@k8gate.example.com "git status"

# Example: Run multiple commands
ssh user@k8gate.example.com "cd /var/www && wp core version && git status"
```

### Interactive Mode

Only use interactive mode when absolutely necessary:

```bash
# Set up interactive session
ssh <github-username>@<endpoint> "curl https://cognition-public.s3.amazonaws.com/install_shell_integration.sh | bash"

# Connect interactively
ssh -t <github-username>@<endpoint>
```

## SFTP Access

For file transfer operations:

```bash
# Start SFTP session
sftp <github-username>@<endpoint>

# Common SFTP commands:
put local-file           # Upload local file
get remote-file          # Download remote file
ls                       # List remote files
pwd                      # Show remote directory
lcd /local/path         # Change local directory
cd /remote/path         # Change remote directory
mkdir directory         # Create remote directory
rm file                 # Remove remote file
exit                    # Close session
```

## SCP Usage

For direct file transfers:

```bash
# Upload file to remote
scp /local/path/file <github-username>@<endpoint>:/remote/path/

# Download file from remote
scp <github-username>@<endpoint>:/remote/path/file /local/path/

# Transfer directory recursively
scp -r /local/directory <github-username>@<endpoint>:/remote/path/

# Transfer with specific SSH key
scp -i ~/.ssh/specific_key /local/file <github-username>@<endpoint>:/remote/path/
```

## Common Operations

### WordPress Management

```bash
# Update plugins
ssh user@k8gate.example.com "wp plugin update --all"

# Database operations
ssh user@k8gate.example.com "wp db export - | gzip" > backup.sql.gz

# File management
scp wp-content/themes/custom-theme user@k8gate.example.com:/var/www/wp-content/themes/
```

### Git Operations

```bash
# Check repository status
ssh user@k8gate.example.com "git status"

# Pull latest changes
ssh user@k8gate.example.com "git pull origin main"

# View recent commits
ssh user@k8gate.example.com "git log --oneline -n 5"
```

## Troubleshooting

### Connection Issues

1. Verify your SSH key is added to GitHub
2. Check repository permissions
3. Ensure endpoint is accessible
4. Verify correct username format

### Permission Denied

1. Check GitHub role (must be admin, maintain, or write)
2. Verify SSH key permissions (600)
3. Ensure correct endpoint URL

### Command Execution Failed

1. Verify command exists in container
2. Check working directory
3. Ensure proper quoting of commands

## Security Best Practices

1. Always use SSH key authentication
2. Keep private keys secure
3. Use non-interactive mode when possible
4. Avoid storing sensitive data in commands
5. Use specific paths in file transfers

## Environment Variables

The following variables affect remote access:

```bash
ALLOW_SSH_ACCESS_ROLES=admin,maintain,write
PRODUCTION_BRANCH=production
ALLOW_SSH_ACCESS_PROD_ROLES=admin
```

## Rate Limiting

Remote access is subject to rate limiting:
- Login attempts per hour: 100
- Key rotation operations: 10
- Concurrent sessions: Based on pod resources
