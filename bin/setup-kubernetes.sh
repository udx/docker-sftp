#!/bin/bash
set -e

# Log helper
log() {
    echo "[k8s-setup] $1"
}

log "Starting Kubernetes setup"

# Required environment variables
if [[ -z "${KUBERNETES_CLUSTER_ENDPOINT}" ]]; then
    log "KUBERNETES_CLUSTER_ENDPOINT not set, cannot continue"
    exit 1
fi

if [[ -z "${KUBERNETES_CLUSTER_USER_TOKEN}" ]]; then
    log "KUBERNETES_CLUSTER_USER_TOKEN not set, cannot continue"
    exit 1
fi

# Set defaults
KUBERNETES_CLUSTER_NAME=${KUBERNETES_CLUSTER_NAME:-"cluster-${RANDOM}"}
KUBERNETES_CLUSTER_SERVICEACCOUNT=${KUBERNETES_CLUSTER_SERVICEACCOUNT:-"default"}

# Setup kubectl config
log "Configuring kubectl"

# Handle certificate
CERT_PATH="/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
if [[ -f "${CERT_PATH}" ]]; then
    log "Using in-cluster certificate"
    kubectl config set-cluster ${KUBERNETES_CLUSTER_NAME} \
        --embed-certs=true \
        --server=${KUBERNETES_CLUSTER_ENDPOINT} \
        --certificate-authority=${CERT_PATH}
else
    log "Using insecure-skip-tls-verify"
    kubectl config set-cluster ${KUBERNETES_CLUSTER_NAME} \
        --server=${KUBERNETES_CLUSTER_ENDPOINT} \
        --insecure-skip-tls-verify=true
fi

# Set credentials
kubectl config set-credentials ${KUBERNETES_CLUSTER_SERVICEACCOUNT} \
    --token=${KUBERNETES_CLUSTER_USER_TOKEN}

# Set context
kubectl config set-context ${KUBERNETES_CLUSTER_NAME} \
    --cluster=${KUBERNETES_CLUSTER_NAME} \
    --user=${KUBERNETES_CLUSTER_SERVICEACCOUNT}

# Use context
kubectl config use-context ${KUBERNETES_CLUSTER_NAME}

log "Setup complete"
