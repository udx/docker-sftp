# Kubernetes Authentication Setup

## Overview

This guide explains how to set up Kubernetes authentication for the SFTP gateway using a service account.

## Prerequisites

- `kubectl` installed and configured
- Access to create service accounts and role bindings
- `jq` command-line tool installed

## Setup Steps

### 1. Create Service Account

```bash
# Create service account
kubectl create sa docker-ssh -n default

# Get secret name
KUBERNETES_CLUSTER_USER_SECRET=$(kubectl get sa -n default docker-ssh -o json | jq -r .secrets[].name)
```

### 2. Extract Credentials

```bash
# Get cluster certificate
kubectl get secret -n default $KUBERNETES_CLUSTER_USER_SECRET -o json | \
  jq -r '.data["ca.crt"]' | base64 -D > kuberentes-ca.crt

# Get service account token
KUBERNETES_CLUSTER_USER_TOKEN=$(kubectl get -n default secret $KUBERNETES_CLUSTER_USER_SECRET -o json | \
  jq -r '.data["token"]' | base64 -D)

# Get cluster context and name
KUBERNETES_CLUSTER_CONTEXT=$(kubectl config current-context)
KUBERNETES_CLUSTER_NAME=$(kubectl config get-contexts $KUBERNETES_CLUSTER_CONTEXT | awk '{print $3}' | tail -n 1)

# Get cluster endpoint
KUBERNETES_CLUSTER_ENDPOINT=$(kubectl config view -o jsonpath="{.clusters[?(@.name == \"$KUBERNETES_CLUSTER_NAME\")].cluster.server}")
```

### 3. Verify Service Account

```bash
# Check service account
kubectl -n default get serviceaccount docker-ssh
kubectl -n default describe serviceaccount docker-ssh

# Check secret
kubectl -n default get secret $KUBERNETES_CLUSTER_USER_SECRET
kubectl -n default describe secret $KUBERNETES_CLUSTER_USER_SECRET
```

### 4. Configure RBAC

```bash
# Create admin role binding
kubectl -n default create rolebinding docker-ssh-admin \
  --clusterrole=admin \
  --serviceaccount=default:docker-ssh

# Verify role binding
kubectl -n default get rolebinding docker-ssh-admin
```

## Environment Variables

See [Environment Variables](environment.md#kubernetes-configuration) for required Kubernetes configuration.

## Security Considerations

- Store the certificate and token securely
- Use minimal required permissions
- Consider using namespaced role bindings
- Regularly rotate credentials
