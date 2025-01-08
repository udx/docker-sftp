# Troubleshooting Guide

## Common Issues

### SSH Connection Issues

#### 1. "Permission denied (publickey)"
- Verify GitHub SSH key is properly added
- Check user has correct repository permissions
- Ensure key is synced to authorized_keys

#### 2. "Unknown operand" for SFTP
```
sh: internal-sftp: unknown operand
sh: /usr/lib/ssh/sftp-server: unknown operand
```
**Solution**:
- Check SFTP server path in container
- Verify OpenSSH installation
- Check container has required binaries

#### 3. Pod Not Found
```
Error from server (NotFound): pods "pod-name" not found
```
**Solution**:
- Verify pod exists in correct namespace
- Check connection string format
- Ensure proper Kubernetes permissions

### TTY Issues

#### 1. "Unable to use a TTY"
```
tput: No value for $TERM and no -T specified
stty: invalid number 'cols'
```
**Solution**:
- Set TERM environment variable
- Use proper SSH client flags
- Check terminal capabilities

## Debugging Steps

### 1. Check SSH Daemon
```bash
# View SSHD logs
pm2 logs sshd

# Check configuration
sshd -T
```

### 2. Verify Key Sync
```bash
# Check authorized keys
ls -la /etc/ssh/authorized_keys.d/

# Force key refresh
curl -X POST http://localhost:8080/refresh-keys
```

### 3. Container Health
```bash
# Check container status
kubectl get pods

# View container logs
kubectl logs pod-name
```

### 4. API Server Issues
```bash
# Check API server logs
pm2 logs rabbit-ssh-server

# Test connection endpoint
curl http://localhost:8080/_cat/connection-string/user
```

## Logging

### Enable Debug Logging
```bash
# SSH debugging
export DEBUG=ssh:*

# Key management debugging
export DEBUG=update-ssh:*
```

### Log Locations
- SSHD Logs: `/var/log/sshd.log`
- API Logs: PM2 logs
- Key Sync Logs: PM2 logs

## Security Verification

### 1. Check Permissions
```bash
# Verify key permissions
ls -la /etc/ssh/ssh_host_*

# Check authorized_keys
ls -la /etc/ssh/authorized_keys.d/
```

### 2. Verify Configuration
```bash
# Check SSHD config
sshd -T | grep -E 'passwordauthentication|permitrootlogin|subsystem'

# Verify Kubernetes auth
kubectl auth can-i create pods
```

## Recovery Procedures

### 1. Key Recovery
```bash
# Regenerate host keys
ssh-keygen -A

# Force key sync
curl -X POST http://localhost:8080/refresh-keys
```

### 2. Service Recovery
```bash
# Restart services
pm2 restart all

# Clear Firebase cache
curl -X DELETE http://localhost:8080/flushFirebaseContainers
```

## Support Information

### Required Information for Support
1. Pod name and namespace
2. SSH client version
3. Debug logs
4. Recent changes to configuration
5. GitHub username and repository

### Gathering Debug Information
```bash
# Collect system information
uname -a
sshd -V
pm2 list

# Get container status
docker ps
kubectl get pods

# Check logs
pm2 logs --lines 100
```
