# Remote Access Guide

This guide explains how to access K8 Container Gate using SSH, SFTP, and SCP protocols.

## Prerequisites

1. GitHub account with repository access
2. SSH key added to your GitHub account
3. K8 Container Gate endpoint URL
4. Repository permissions (admin, maintain, or write)

## SSH Access

### Important Note About Non-Interactive Commands

**WARNING**: Non-interactive commands like direct SCP or non-interactive SSH will fail with "pod not found" errors. Always use interactive SSH sessions for file operations.

### Command Execution (Interactive Mode Required)

All SSH operations must be performed in an interactive session:

```bash
# Start interactive session
ssh -t <github-username>@<endpoint>

# Then run commands inside the session
cd /var/www  # IMPORTANT: Always change to /var/www first
wp plugin list
git status

# For file operations, use the cat command:
cat > file.txt << 'EOF'
your file content here
EOF

# View file contents
cat file.txt
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

## File Transfer Guide

**IMPORTANT**: Direct SCP commands will fail with "pod not found" errors. Use these interactive methods instead:

### Method 1: Using cat for File Transfer

```bash
# Upload a file
ssh -t user@endpoint "cat > /var/www/file.txt" < local-file.txt

# Download a file
ssh -t user@endpoint "cat /var/www/file.txt" > local-file.txt

# Create/Edit file directly
ssh -t user@endpoint
cd /var/www  # Always change to /var/www first
cat > file.txt << 'EOF'
file content here
EOF
```

### Method 2: Using SFTP Interactive Mode

```bash
# Start SFTP session
sftp user@endpoint

# Important: Change to /var/www first
cd /var/www

# Then perform operations
put local-file.txt
get remote-file.txt
ls
pwd
```

Note: All file operations must be performed in the /var/www directory.

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
