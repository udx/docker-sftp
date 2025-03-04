FROM usabilitydynamics/udx-worker-nodejs:0.11.0

ENV KUBECTL_VERSION=1.32.0 \
    NODE_ENV=production \
    APP_HOME=/opt/sources/rabbitci/rabbit-ssh

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget=1.24.5-2ubuntu1 \
    gnupg2=2.4.4-2ubuntu22 \
    apt-transport-https=2.9.31ubuntu1 \
    libssl-dev=3.4.1-1ubuntu1 \
    libffi-dev=3.4.7-1 \
    file=1:5.45-3build1 \
    openssl=3.4.1-1ubuntu1 \
    openssh-server=1:9.9p1-3ubuntu3 \
    openssh-client=1:9.9p1-3ubuntu3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Setup kubectl and timezone
RUN curl -L https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client \
    && rm -rf /etc/ssh/* \
    && mkdir -p /etc/ssh/authorized_keys.d \
    && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
    && echo "America/New_York" > /etc/timezone

# Install the GKE gcloud auth plugin
RUN gcloud components install gke-gcloud-auth-plugin
ENV USE_GKE_GCLOUD_AUTH_PLUGIN=True

# Create required directories
RUN mkdir -p \
    /home/${USER}/.kube \
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
RUN npm install --production

# Copy remaining application files
COPY --chown=${USER}:${USER} . ${APP_HOME}/
COPY --chown=${USER}:${USER} static/etc/ssh/ /etc/ssh/
COPY --chown=${USER}:${USER} etc/configs/worker/services.yaml $HOME/.config/worker/services.yaml

# Generate SSH host keys and set up permissions
RUN ssh-keygen -A \
    && chmod +x ${APP_HOME}/bin/controller.ssh.entrypoint.sh \
    && chmod +x ${APP_HOME}/bin/setup-kubernetes.sh \
    && touch /var/log/sshd.log \
    && chown ${USER}:${USER} /var/log/sshd.log \
    && chown ${USER}:${USER} /etc/ssh/authorized_keys.d \
    && chmod 700 /etc/ssh/authorized_keys.d \
    && chown -R ${USER}:${USER} \
        /home/${USER} \
        /usr/local/bin/kubectl \
        /home/${USER}/.kube \
        /etc/ssh/ \
        ${APP_HOME} \
        ${WORKER_CONFIG_DIR}/services.d

USER ${USER}

VOLUME [ "/etc/ssh/authorized_keys.d" ]

EXPOSE 22

# Keep container running
CMD ["tail", "-f", "/dev/null"]