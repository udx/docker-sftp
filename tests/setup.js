// Add environment variables for local testing if not set
process.env.TEST_SSH_HOST = process.env.TEST_SSH_HOST || 'localhost';
process.env.TEST_SSH_USER = process.env.TEST_SSH_USER || 'test-user';
process.env.TEST_SSH_KEY_PATH = process.env.TEST_SSH_KEY_PATH || '~/.ssh/id_rsa';

// Add environment variables for K8s testing if not set
process.env.KUBERNETES_CLUSTER_ENDPOINT = process.env.KUBERNETES_CLUSTER_ENDPOINT || 'https://localhost:6443';
process.env.KUBERNETES_CLUSTER_NAMESPACE = process.env.KUBERNETES_CLUSTER_NAMESPACE || 'default';
process.env.KUBERNETES_CLUSTER_USER_TOKEN = process.env.KUBERNETES_CLUSTER_USER_TOKEN || 'test-token';

// Note: Jest timeout is configured in jest.config.js
