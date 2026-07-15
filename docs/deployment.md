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

The maintained manifests are:

- [Deployment](../examples/configs/kubernetes/deployment.yml)
- [LoadBalancer service](../examples/configs/kubernetes/service.yml)
- [Deployment restart CronJob](../examples/configs/kubernetes/deployment-restart-cronjob.yml)

Copy the manifests you need and replace their `${...}` placeholders with values for your cluster, registry, GitHub organization, and release. Keep credentials in Kubernetes Secrets or your deployment system instead of committing them to rendered manifests.

1. Create a service account and grant only the permissions the gateway needs:

```bash
# Set your preferred namespace
NAMESPACE=kube-system

# Example only: tailor the role binding to your access policy
kubectl create serviceaccount sftp-gateway -n $NAMESPACE
kubectl create rolebinding sftp-gateway-admin -n $NAMESPACE \
  --clusterrole=admin \
  --serviceaccount=$NAMESPACE:sftp-gateway
```

2. Configure the deployment:

- Set `serviceAccountName` to the service account created above. Kubernetes mounts its token and CA certificate into the pod automatically.
- Provide `ACCESS_TOKEN` and Firebase credentials through Kubernetes Secrets or your deployment system.
- Set the image reference to the `0.14.0` release (or an immutable digest).
- Review all settings in the [Environment Variables](environment.md) reference.

3. Apply the rendered deployment and service manifests:

```bash
kubectl apply -n $NAMESPACE -f deployment.yml
kubectl apply -n $NAMESPACE -f service.yml

# Verify
kubectl get pods -n $NAMESPACE -l git.name=docker-sftp
kubectl get services -n $NAMESPACE -l git.name=docker-sftp
```

### 3. Verify Deployment

Test SSH access:

```bash
# Get service address
SSH_HOST=$(kubectl get services -n $NAMESPACE -l git.name=docker-sftp \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')

# Test connection
ssh -p 22 pod-myapp@$SSH_HOST
```

See [Client Guide](client-guide.md) for usage instructions.

### Next Steps

- [Configure Environment Variables](environment.md)
- [Manage User Access](user-management.md)
- [Troubleshooting Guide](troubleshooting.md)
