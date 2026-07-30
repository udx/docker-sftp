FROM usabilitydynamics/udx-worker-nodejs:0.35.0

ARG KUBECTL_VERSION=1.36.2

ENV KUBECTL_VERSION=${KUBECTL_VERSION} \
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

# Setup kubectl and timezone
RUN case "$(dpkg --print-architecture)" in \
        amd64) ARCH="amd64" ;; \
        arm64) ARCH="arm64" ;; \
        armhf) ARCH="arm" ;; \
        i386) ARCH="386" ;; \
        ppc64el) ARCH="ppc64le" ;; \
        s390x) ARCH="s390x" ;; \
        *) echo "Unsupported architecture: $(dpkg --print-architecture)" >&2; exit 1 ;; \
    esac \
    && curl -fsSLo /usr/local/bin/kubectl "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl" \
    && curl -fsSLo /tmp/kubectl.sha256 "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl.sha256" \
    && echo "$(cat /tmp/kubectl.sha256)  /usr/local/bin/kubectl" | sha256sum --check \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client \
    && rm -f /tmp/kubectl.sha256 \
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
