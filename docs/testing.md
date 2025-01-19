# Testing Guide

## SSH Integration Tests

The SSH integration tests verify that:
1. SSH connectivity works
2. WordPress CLI commands execute successfully
3. Git commands work inside containers
4. SFTP file transfers function properly

### Running Tests Locally

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run only SSH integration tests
npm run test:integration
```

### Environment Variables

Configure these environment variables for testing:

```bash
# SSH Configuration
TEST_SSH_HOST=localhost          # SSH server hostname
TEST_SSH_USER=test-user         # SSH username
TEST_SSH_KEY_PATH=~/.ssh/id_rsa # Path to SSH private key

# Kubernetes Configuration (if testing against K8s)
KUBERNETES_CLUSTER_ENDPOINT=https://your-cluster-api
KUBERNETES_CLUSTER_NAMESPACE=your-namespace
KUBERNETES_CLUSTER_USER_TOKEN=your-token
```

### Testing in Different Environments

#### Local Development
```bash
# Start the container locally
docker-compose up -d

# Run tests against local container
npm run test:integration
```

#### Kubernetes (AKS/GKE/etc)
```bash
# Deploy to K8s
kubectl apply -f ci/deployment-aks.yml

# Get service IP
export TEST_SSH_HOST=$(kubectl get svc k8-container-gate -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Run tests against K8s deployment
npm run test:integration
```

### Adding New Tests

1. Create test file in `tests/` directory
2. Follow existing patterns in `ssh-integration.test.js`
3. Add test documentation in this file
4. Update CI workflow if needed

### Troubleshooting

Common issues and solutions:

1. SSH Connection Timeout
   - Verify service is running
   - Check firewall rules
   - Ensure correct SSH key permissions

2. Command Execution Failures
   - Verify required tools are installed in container
   - Check user permissions
   - Review container logs

3. SFTP Issues
   - Verify SFTP service is enabled
   - Check file permissions
   - Ensure sufficient disk space
