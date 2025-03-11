#!/bin/bash

# Basic logging
log_info() {
    echo "[k8s-setup] $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    log_info "kubectl not found, service will stay running but inactive"
    # Stay running but do nothing
    while true; do sleep 1000000; done
    exit 0
fi

# Check for Kubernetes-managed service account
SA_TOKEN_PATH="/var/run/secrets/kubernetes.io/serviceaccount/token"
SA_CERT_PATH="/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"

# Check environment and keep running
validate_env() {
    if [[ -z "${KUBERNETES_CLUSTER_ENDPOINT}" ]] || \
       [[ -z "${KUBERNETES_CLUSTER_USER_TOKEN}" ]] || \
       [[ -z "${KUBERNETES_CLUSTER_NAME}" ]] || \
       [[ -z "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" ]]; then
        log_info "Waiting for configuration..."
        return 1
    fi
    return 0
}

# Try to use Kubernetes-managed service account first
if [[ -f "${SA_TOKEN_PATH}" ]] && [[ -f "${SA_CERT_PATH}" ]]; then
    log_info "Using Kubernetes-managed service account"
    KUBERNETES_CLUSTER_USER_TOKEN=$(cat "${SA_TOKEN_PATH}")
    KUBERNETES_CLUSTER_CERTIFICATE="${SA_CERT_PATH}"
    # For in-cluster, default to internal API endpoint if not specified
    KUBERNETES_CLUSTER_ENDPOINT=${KUBERNETES_CLUSTER_ENDPOINT:-"https://kubernetes.default.svc"}
    KUBERNETES_CLUSTER_NAME=${KUBERNETES_CLUSTER_NAME:-"default"}
    KUBERNETES_CLUSTER_SERVICEACCOUNT=${KUBERNETES_CLUSTER_SERVICEACCOUNT:-"default"}
else
    log_info "No Kubernetes-managed service account found"
    # Check if we have manual credentials
    if [[ -n "${KUBERNETES_CLUSTER_USER_TOKEN}" ]] && \
       [[ -n "${KUBERNETES_CLUSTER_ENDPOINT}" ]] && \
       [[ -n "${KUBERNETES_CLUSTER_NAME}" ]] && \
       [[ -n "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" ]]; then
        log_info "Using manual authentication"
        # Certificate path already set or empty
    else
        log_info "No Kubernetes credentials found (neither service account nor manual). Exiting gracefully."
        exit 0
    fi
fi

# Configure kubectl with initial logging
configure_kubectl() {
    if [ "$INITIALIZED" = "false" ]; then
        log_info "Configuring kubectl for cluster: ${KUBERNETES_CLUSTER_NAME}" force
    fi

    # Handle certificate
    if [[ -n "${KUBERNETES_CLUSTER_CERTIFICATE}" ]]; then
        if [[ -f "${KUBERNETES_CLUSTER_CERTIFICATE}" ]]; then
            if [ "$INITIALIZED" = "false" ]; then
                log_info "Using certificate from file: ${KUBERNETES_CLUSTER_CERTIFICATE}" force
            fi
            CERT_ARG=(--certificate-authority="${KUBERNETES_CLUSTER_CERTIFICATE}")
        else
            if [ "$INITIALIZED" = "false" ]; then
                log_info "Using certificate from environment variable" force
            fi
            echo "${KUBERNETES_CLUSTER_CERTIFICATE}" > /tmp/k8s-ca.crt
            CERT_ARG=(--certificate-authority=/tmp/k8s-ca.crt)
        fi

        kubectl config set-cluster "${KUBERNETES_CLUSTER_NAME}" \
            --embed-certs=true \
            --server="${KUBERNETES_CLUSTER_ENDPOINT}" \
            "${CERT_ARG[@]}" &>/dev/null || return 1
            
        [[ -f /tmp/k8s-ca.crt ]] && rm -f /tmp/k8s-ca.crt
    else
        [[ "${KUBERNETES_CLUSTER_ENDPOINT}" == "https://kubernetes.default.svc" ]] && return 1
        
        if [ "$INITIALIZED" = "false" ]; then
            log_info "No certificate provided, using insecure-skip-tls-verify (not recommended for production)" force
        fi
        kubectl config set-cluster "${KUBERNETES_CLUSTER_NAME}" \
            --server="${KUBERNETES_CLUSTER_ENDPOINT}" \
            --insecure-skip-tls-verify=true &>/dev/null || return 1
    fi

    # Set credentials and context
    if [ "$INITIALIZED" = "false" ]; then
        log_info "Configuring credentials and context" force
    fi

    kubectl config set-credentials "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" \
        --token="${KUBERNETES_CLUSTER_USER_TOKEN}" &>/dev/null || return 1

    kubectl config set-context "${KUBERNETES_CLUSTER_NAME}" \
        --cluster="${KUBERNETES_CLUSTER_NAME}" \
        --user="${KUBERNETES_CLUSTER_SERVICEACCOUNT}" &>/dev/null || return 1

    kubectl config use-context "${KUBERNETES_CLUSTER_NAME}" &>/dev/null || return 1
    
    # Verify connection
    if [ "$INITIALIZED" = "false" ]; then
        log_info "Verifying connection" force
    fi
    kubectl get namespaces &>/dev/null || return 1
    
    return 0
}

# Try service account first
if [[ -f "${SA_TOKEN_PATH}" ]] && [[ -f "${SA_CERT_PATH}" ]]; then
    log_info "Using Kubernetes service account"
    KUBERNETES_CLUSTER_USER_TOKEN=$(cat "${SA_TOKEN_PATH}")
    KUBERNETES_CLUSTER_CERTIFICATE="${SA_CERT_PATH}"
    KUBERNETES_CLUSTER_ENDPOINT=${KUBERNETES_CLUSTER_ENDPOINT:-"https://kubernetes.default.svc"}
    KUBERNETES_CLUSTER_NAME=${KUBERNETES_CLUSTER_NAME:-"in-cluster"}
    KUBERNETES_CLUSTER_SERVICEACCOUNT=${KUBERNETES_CLUSTER_SERVICEACCOUNT:-"default"}
    
    if configure_kubectl; then
        log_info "Successfully connected using service account"
        # Stay running but do nothing
        while true; do sleep 1000000; done
        exit 0
    else
        log_info "Failed to configure using service account"
    fi
fi

# Try manual credentials
if [[ -n "${KUBERNETES_CLUSTER_USER_TOKEN}" ]] && \
   [[ -n "${KUBERNETES_CLUSTER_ENDPOINT}" ]] && \
   [[ -n "${KUBERNETES_CLUSTER_NAME}" ]] && \
   [[ -n "${KUBERNETES_CLUSTER_SERVICEACCOUNT}" ]]; then
    log_info "Using manual Kubernetes configuration"
    if configure_kubectl; then
        log_info "Successfully connected using manual credentials"
        # Stay running but do nothing
        while true; do sleep 1000000; done
        exit 0
    else
        log_info "Failed to configure using manual credentials"
    fi
fi

# No valid credentials found
log_info "No valid Kubernetes credentials found (neither service account nor manual)"
log_info "Service will stay running but inactive"
# Stay running but do nothing
while true; do sleep 1000000; done
