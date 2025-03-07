#!/bin/bash

# Exit on any error
set -e

# Log levels
log_info() { echo "[k8s-setup] INFO: $1"; }
log_warn() { echo "[k8s-setup] WARN: $1" >&2; }
log_error() { echo "[k8s-setup] ERROR: $1" >&2; }

# Validate kubectl is available
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found"
    exit 1
fi

log_info "Starting Kubernetes setup"

# Check for Kubernetes-managed service account
SA_TOKEN_PATH="/var/run/secrets/kubernetes.io/serviceaccount/token"
SA_CERT_PATH="/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"

# Validate environment
validate_env() {
    local missing_vars=false

    if [[ -z "${KUBERNETES_CLUSTER_ENDPOINT}" ]]; then
        log_error "KUBERNETES_CLUSTER_ENDPOINT not set"
        missing_vars=true
    fi

    if [[ -z "${KUBERNETES_CLUSTER_USER_TOKEN}" ]]; then
        log_error "KUBERNETES_CLUSTER_USER_TOKEN not set"
        missing_vars=true
    fi

    if [[ -z "${KUBERNETES_CLUSTER_NAME}" ]]; then
        log_error "KUBERNETES_CLUSTER_NAME not set"
        missing_vars=true
    fi

    if [[ -z "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" ]]; then
        log_error "KUBERNETES_CLUSTER_SERVICEACCOUNT not set"
        missing_vars=true
    fi

    if [[ "${missing_vars}" == "true" ]]; then
        exit 1
    fi
}

# Try to use Kubernetes-managed service account first
if [[ -f "${SA_TOKEN_PATH}" ]] && [[ -f "${SA_CERT_PATH}" ]]; then
    log_info "Using Kubernetes-managed service account"
    KUBERNETES_CLUSTER_USER_TOKEN=$(cat "${SA_TOKEN_PATH}")
    CERT_PATH="${SA_CERT_PATH}"
    # For in-cluster, default to internal API endpoint if not specified
    KUBERNETES_CLUSTER_ENDPOINT=${KUBERNETES_CLUSTER_ENDPOINT:-"https://kubernetes.default.svc"}
else
    log_info "Using manual authentication"
    # Use provided certificate if available
    CERT_PATH="${KUBERNETES_CLUSTER_CERTIFICATE:-}"
fi

# Validate all required values are set (either from k8s or manually)
validate_env

log_info "Configuring kubectl for cluster: ${KUBERNETES_CLUSTER_NAME}"

# Configure cluster
trap 'log_error "Failed to configure kubectl"' ERR

# Configure cluster with certificate if available
if [[ -f "${CERT_PATH}" ]]; then
    log_info "Using certificate at: ${CERT_PATH}"
    if ! kubectl config set-cluster "${KUBERNETES_CLUSTER_NAME}" \
        --embed-certs=true \
        --server="${KUBERNETES_CLUSTER_ENDPOINT}" \
        --certificate-authority="${CERT_PATH}"; then
        log_error "Failed to set cluster config with certificate"
        exit 1
    fi
else
    if [[ "${KUBERNETES_CLUSTER_ENDPOINT}" == "https://kubernetes.default.svc" ]]; then
        log_error "Missing required in-cluster certificate"
        exit 1
    fi
    
    log_warn "No certificate provided, using insecure-skip-tls-verify (not recommended for production)"
    if ! kubectl config set-cluster "${KUBERNETES_CLUSTER_NAME}" \
        --server="${KUBERNETES_CLUSTER_ENDPOINT}" \
        --insecure-skip-tls-verify=true; then
        log_error "Failed to set cluster config without certificate"
        exit 1
    fi
fi

# Set credentials using token
log_info "Configuring credentials"
if ! kubectl config set-credentials "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" \
    --token="${KUBERNETES_CLUSTER_USER_TOKEN}"; then
    log_error "Failed to set credentials"
    exit 1
fi

# Set and use context
log_info "Setting up context"
if ! kubectl config set-context "${KUBERNETES_CLUSTER_NAME}" \
    --cluster="${KUBERNETES_CLUSTER_NAME}" \
    --user="${KUBERNETES_CLUSTER_SERVICEACCOUNT}"; then
    log_error "Failed to set context"
    exit 1
fi

if ! kubectl config use-context "${KUBERNETES_CLUSTER_NAME}"; then
    log_error "Failed to switch context"
    exit 1
fi

# Verify connection
log_info "Verifying connection"
if ! kubectl version --short > /dev/null 2>&1; then
    log_error "Failed to connect to Kubernetes cluster"
    exit 1
fi

log_info "Setup complete"
exit 0
