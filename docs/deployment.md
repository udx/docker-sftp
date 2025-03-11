# Deployment Guide

This guide covers deployment steps for the SFTP Gateway. For architecture details, see [Architecture Details](architecture.md).

## Prerequisites

Before deploying, ensure you have:

1. Kubernetes cluster access with `kubectl` configured
2. GitHub token with repo access permissions
3. Network access to required services

See [Architecture Details](architecture.md#prerequisites) for detailed requirements.

## Deployment Steps

### 1. Configure Environment

Set up required environment variables:

```bash
# Required for all deployments
export GITHUB_TOKEN="your-github-token"

# For local deployment only
export KUBE_ENDPOINT=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
export KUBE_TOKEN=$(kubectl get secret $(kubectl get sa default -n default -o jsonpath='{.secrets[0].name}') \
  -o jsonpath='{.data.token}' | base64 -d)
```

See [Environment Variables](environment.md) for all configuration options.

### 2. Choose Deployment Mode

#### Option A: Local Development

Run as a Docker container:

```bash
docker run -d \
  --name sftp-gateway \
  -p 2222:22 \
  -p 8080:8080 \
  -e KUBERNETES_CLUSTER_NAME=my-cluster \
  -e KUBERNETES_CLUSTER_ENDPOINT=$KUBE_ENDPOINT \
  -e KUBERNETES_CLUSTER_USER_TOKEN=$KUBE_TOKEN \
  -e ACCESS_TOKEN=$GITHUB_TOKEN \
  udx/docker-sftp
```

#### Option B: Kubernetes Deployment

1. Create service account:

```bash
# Set namespace
NAMESPACE=kube-system  # Or your preferred namespace

# Create service account and grant permissions
kubectl create serviceaccount sftp-gateway -n $NAMESPACE
kubectl create rolebinding sftp-gateway-admin -n $NAMESPACE \
  --clusterrole=admin \
  --serviceaccount=$NAMESPACE:sftp-gateway
```

2. Store credentials:

```bash
# Get service account token
SA_TOKEN=$(kubectl get secret $(kubectl get sa sftp-gateway -n $NAMESPACE -o jsonpath='{.secrets[0].name}') \
  -n $NAMESPACE -o jsonpath='{.data.token}' | base64 -d)

# Store tokens in secret
kubectl create secret generic sftp-secrets -n $NAMESPACE \
  --from-literal=github-token=$GITHUB_TOKEN
```

3. Deploy service:

```bash
# Create deployment
kubectl apply -f deployment.yml

# Verify
kubectl get pods -n $NAMESPACE -l app=sftp-gateway
kubectl get service -n $NAMESPACE sftp-gateway
```

See [deployment.yml](../ci/deployment-v2.yml) for the full configuration.

### 3. Verify Deployment

Test SSH access:

```bash
# Get service address
SSH_HOST=$(kubectl get service -n $NAMESPACE sftp-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test connection
ssh -p 22 pod-myapp@$SSH_HOST
```

See [Client Guide](client-guide.md) for usage instructions.

### Next Steps

- [Configure Environment Variables](environment.md)
- [Manage User Access](user-management.md)
- [Troubleshooting Guide](troubleshooting.md)

NAMESPACE=kube-system  # Or your preferred namespace

# Create service account
kubectl create serviceaccount sftp-gateway -n $NAMESPACE

# Grant permissions (customize based on requirements)
kubectl create rolebinding sftp-gateway-admin -n $NAMESPACE \
  --clusterrole=admin \
  --serviceaccount=$NAMESPACE:sftp-gateway
```

### 2. Store Credentials

Create secret with required tokens:

```bash
# Get service account token
SA_TOKEN=$(kubectl get secret $(kubectl get sa sftp-gateway -n $NAMESPACE -o jsonpath='{.secrets[0].name}') \
  -n $NAMESPACE -o jsonpath='{.data.token}' | base64 -d)

# Store tokens in secret
kubectl create secret generic sftp-secrets -n $NAMESPACE \
  --from-literal=kube-token=$SA_TOKEN \
  --from-literal=github-token=$GITHUB_TOKEN
```

### 3. Deploy Service

Create deployment configuration:

```yaml
# deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sftp-gateway
  namespace: ${NAMESPACE}
  labels:
    app: sftp-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sftp-gateway
  template:
    metadata:
      labels:
        app: sftp-gateway
      annotations:
        container.apparmor.security.beta.kubernetes.io/sftp: runtime/default
    spec:
      serviceAccountName: sftp-gateway
      containers:
        - name: sftp
          image: udx/docker-sftp:latest
          ports:
            - name: ssh
              containerPort: 22
          resources:
            limits:
              cpu: "2"
              memory: 2Gi
            requests:
              cpu: 200m
              memory: 212Mi
          env:
            - name: KUBERNETES_CLUSTER_ENDPOINT
              value: $(KUBE_ENDPOINT) # Will be set by service account
            - name: KUBERNETES_CLUSTER_USER_TOKEN
              valueFrom:
                secretKeyRef:
                  name: sftp-secrets
                  key: kube-token
            - name: ACCESS_TOKEN
              valueFrom:
                secretKeyRef:
                  name: sftp-secrets
                  key: github-token
          livenessProbe:
            tcpSocket:
              port: ssh
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 2
          readinessProbe:
            tcpSocket:
              port: ssh
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: sftp-gateway
  namespace: ${NAMESPACE}
spec:
  type: LoadBalancer # Or NodePort if internal access only
  ports:
    - port: 22
      targetPort: ssh
  selector:
    app: sftp-gateway
```

### 4. Apply Configuration

```bash
# Deploy
envsubst < deployment.yml | kubectl apply -f -

# Verify
kubectl get pods -n $NAMESPACE -l app=sftp-gateway
kubectl get service -n $NAMESPACE sftp-gateway
```

See [Environment Variables](environment.md) for all configuration options.
