# Deploying Docker SFTP on Azure Kubernetes Service (AKS)

This guide demonstrates how to deploy the Docker SFTP service on Azure Kubernetes Service (AKS).

## Prerequisites

1. Azure CLI installed and configured
2. kubectl installed and configured
3. Access to an Azure subscription
4. Docker registry access (e.g., Docker Hub)

## Setup Steps

### 1. Create AKS Cluster

```bash
# Login to Azure
az login

# Create resource group
az group create --name docker-sftp-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group docker-sftp-rg \
  --name docker-sftp-cluster \
  --node-count 1 \
  --enable-addons monitoring \
  --generate-ssh-keys
```

### 2. Connect to AKS Cluster

```bash
# Get credentials
az aks get-credentials --resource-group docker-sftp-rg --name docker-sftp-cluster

# Verify connection
kubectl get nodes
```

### 3. Create Secrets

```bash
# Create secret for GitHub access token and Kubernetes credentials
kubectl create secret generic docker-sftp-secrets \
  --from-literal=ACCESS_TOKEN=<github-token> \
  --from-literal=KUBERNETES_CLUSTER_ENDPOINT=<cluster-endpoint> \
  --from-literal=KUBERNETES_CLUSTER_USER_TOKEN=<user-token>
```

### 4. Deploy Application

```bash
# Apply deployment configuration
kubectl apply -f ci/deployment-aks.yml

# Verify deployment
kubectl get pods
kubectl get services
```

### 5. Access the Service

Once deployed, you can access the SFTP service using the external IP provided by the LoadBalancer:

```bash
# Get external IP
kubectl get service docker-sftp

# Connect via SSH/SFTP
sftp -P 22 user@<external-ip>
```

## Configuration

The deployment uses several Kubernetes resources:

1. **Deployment**: Manages the Docker SFTP pods
2. **Service**: Exposes SFTP port (22) via LoadBalancer
3. **ConfigMap**: Stores cluster configuration and worker.yml
4. **Secrets**: Stores sensitive credentials

## Monitoring

Monitor the deployment using:

```bash
# View pod logs
kubectl logs -f deployment/docker-sftp

# Check pod status
kubectl describe pod -l app=docker-sftp
```

## Cleanup

To remove the deployment:

```bash
# Delete all resources
kubectl delete -f ci/deployment-aks.yml

# Delete AKS cluster
az aks delete --resource-group docker-sftp-rg --name docker-sftp-cluster --yes --no-wait
```
