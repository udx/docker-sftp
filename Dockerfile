ARG KUBECTL_VERSION=1.36.2
ARG KUBECTL_X_NET_VERSION=0.55.0

FROM golang:1.26.0-bookworm AS kubectl-builder

ARG KUBECTL_VERSION
ARG KUBECTL_X_NET_VERSION

RUN git clone --depth 1 --branch "v${KUBECTL_VERSION}" \
        https://github.com/kubernetes/kubernetes.git /src/kubernetes \
    && cd /src/kubernetes \
    && go mod edit -require="golang.org/x/net@v${KUBECTL_X_NET_VERSION}" \
    && KUBECTL_GIT_COMMIT="$(git rev-parse HEAD)" \
    && KUBECTL_MAJOR="${KUBECTL_VERSION%%.*}" \
    && KUBECTL_MINOR="${KUBECTL_VERSION#*.}" \
    && KUBECTL_MINOR="${KUBECTL_MINOR%%.*}" \
    && KUBECTL_LDFLAGS="-X k8s.io/client-go/pkg/version.gitVersion=v${KUBECTL_VERSION} -X k8s.io/client-go/pkg/version.gitCommit=${KUBECTL_GIT_COMMIT} -X k8s.io/client-go/pkg/version.gitTreeState=clean -X k8s.io/client-go/pkg/version.gitMajor=${KUBECTL_MAJOR} -X k8s.io/client-go/pkg/version.gitMinor=${KUBECTL_MINOR} -X k8s.io/component-base/version.gitVersion=v${KUBECTL_VERSION} -X k8s.io/component-base/version.gitCommit=${KUBECTL_GIT_COMMIT} -X k8s.io/component-base/version.gitTreeState=clean -X k8s.io/component-base/version.gitMajor=${KUBECTL_MAJOR} -X k8s.io/component-base/version.gitMinor=${KUBECTL_MINOR}" \
    && GOWORK=off GOFLAGS=-mod=mod go build -trimpath -ldflags="${KUBECTL_LDFLAGS}" -o /out/kubectl ./cmd/kubectl

FROM usabilitydynamics/udx-worker-nodejs:0.35.0

ARG KUBECTL_VERSION
ARG KUBECTL_X_NET_VERSION

ENV KUBECTL_VERSION=${KUBECTL_VERSION} \
    KUBECTL_X_NET_VERSION=${KUBECTL_X_NET_VERSION} \
    NODE_ENV=production \
    APP_HOME=/opt/sources/rabbitci/rabbit-ssh

USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    authbind=2.2.0ubuntu1 \
    wget=1.25.0-2ubuntu3 \
    gnupg2=2.4.8-2ubuntu2.1 \
    apt-transport-https=3.1.6ubuntu2 \
    libssl-dev=3.5.3-1ubuntu3.4 \
    libffi-dev=3.5.2-1build1 \
    file=1:5.46-5build1 \
    openssl=3.5.3-1ubuntu3.4 \
    openssh-server=1:10.0p1-5ubuntu5.4 \
    openssh-client=1:10.0p1-5ubuntu5.4 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install the Kubernetes 1.36.2 client with the fixed golang.org/x/net dependency.
COPY --from=kubectl-builder /out/kubectl /usr/local/bin/kubectl

# Setup kubectl and timezone
RUN chmod +x /usr/local/bin/kubectl \
    && kubectl version --client \
    && rm -rf /etc/ssh/* \
    && mkdir -p /etc/ssh/authorized_keys.d \
    && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
    && echo "America/New_York" > /etc/timezone

# Create required directories
RUN mkdir -p \
    /home/${USER}/.kube \
    /home/${USER}/.config/worker \
    ${APP_HOME} \
    /root/.ssh \
    ${WORKER_CONFIG_DIR}/services.d \
    && touch /home/${USER}/.kube/config \
    && chown -R ${USER}:${USER} /home/${USER}/.kube \
    && chmod 700 /home/${USER}/.kube \
    && chmod 600 /home/${USER}/.kube/config

# Copy package files first for better caching
COPY --chown=${USER}:${USER} package*.json ${APP_HOME}/

# Install dependencies
WORKDIR ${APP_HOME}
RUN npm ci --omit=dev --omit=optional

# Copy remaining application files
COPY --chown=${USER}:${USER} . ${APP_HOME}/
COPY --chown=${USER}:${USER} static/etc/ssh/ /etc/ssh/
COPY --chown=${USER}:${USER} etc/configs/worker/worker.yaml /home/${USER}/.config/worker/worker.yaml
COPY --chown=${USER}:${USER} etc/configs/worker/services.yaml /home/${USER}/.config/worker/services.yaml

# Generate SSH host keys and set up permissions
RUN ssh-keygen -A \
    && chmod +x ${APP_HOME}/bin/controller.ssh.entrypoint.sh \
    && chmod +x ${APP_HOME}/bin/setup-kubernetes.sh \
    && touch /var/log/sshd.log \
    && chown ${USER}:${USER} /var/log/sshd.log \
    && chown -R ${USER}:${USER} /etc/ssh/authorized_keys.d \
    && chmod 755 /etc/ssh/authorized_keys.d \
    && touch /etc/ssh/authorized_keys.d/.keep \
    && chmod 600 /etc/ssh/authorized_keys.d/.keep \
    && chown ${USER}:${USER} /etc/ssh/authorized_keys.d/.keep \
    && chown ${USER}:${USER} /etc/passwd \
    && chmod 600 /etc/passwd \
    && chown -R ${USER}:${USER} \
        /home/${USER} \
        /usr/local/bin/kubectl \
        /home/${USER}/.kube \
        /etc/ssh/ \
        ${APP_HOME} \
        ${WORKER_CONFIG_DIR}/services.d

# Allow user to bind to port 22 (for authbind)
RUN touch /etc/authbind/byport/22 \
    && chmod 755 /etc/authbind/byport/22 \
    && chown ${USER}:${USER} /etc/authbind/byport/22

# Set default umask to ensure new files have correct permissions
RUN echo "umask 0077" >> /home/${USER}/.profile

USER ${USER}

VOLUME [ "/etc/ssh/authorized_keys.d" ]

EXPOSE 22

# Keep container running
CMD ["tail", "-f", "/dev/null"]
