FROM usabilitydynamics/udx-worker-nodejs:0.6.0

ARG OPENSSH_VERSION=9.9p1

ENV KUBECTL_VERSION=1.32.0
ENV NODE_ENV=production

USER root

RUN apt-get update && apt-get install -y wget \
    curl \
    gnupg2 \
    apt-transport-https \
    lsb-release \
    ca-certificates \
    libssl-dev \
    libffi-dev \
    file \
    openssl \
    openssh-server \
    openssh-client

RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# # Update and install dependencies
# RUN apt-get update && \
#   apt-get install -y --no-install-recommends \
#   tar=1.35+dfsg-3build1 \
#   wget=1.21.4-1ubuntu4.1 \
#   build-essential=12.10ubuntu1 \
#   linux-headers-generic=6.8.0-51.52 \
#   libssl-dev=3.0.13-0ubuntu3.4 \
#   zlib1g-dev=1:1.3.dfsg-3.1ubuntu2.1 \
#   file=1:5.45-3build1 && \
#   apt-get clean && \
#   rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# # Download and compile OpenSSH
# RUN wget https://ftp.openbsd.org/pub/OpenBSD/OpenSSH/portable/openssh-${OPENSSH_VERSION}.tar.gz \
#   && tar -xzf openssh-${OPENSSH_VERSION}.tar.gz \
#   && cd openssh-${OPENSSH_VERSION} \
#   && ./configure \
#   && make \
#   && make install \
#   && cd .. \
#   && rm -rf openssh-${OPENSSH_VERSION}.tar.gz openssh-${OPENSSH_VERSION}

# # Cleanup build dependencies, no longer needed files, and update PATH
# RUN apt-get purge -y build-essential linux-headers-generic libssl-dev zlib1g-dev wget \
#   && apt-get autoremove -y \
#   && apt-get clean \
#   && rm -rf /var/lib/apt/lists/*

RUN curl -L https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl \
  && kubectl version --client \
  && rm -rf /etc/ssh/* \
  && mkdir -p /etc/ssh/authorized_keys.d \
  && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
  && echo "America/New_York" >  /etc/timezone

# Install the GKE gcloud auth plugin
RUN gcloud components install gke-gcloud-auth-plugin

# Set up environment variable to use the GKE gcloud auth plugin
ENV USE_GKE_GCLOUD_AUTH_PLUGIN=True

RUN \
  mkdir -p /home/${USER}/.kube && \
  mkdir -p /opt/sources/rabbitci/rabbit-ssh && \
  mkdir -p /root/.ssh

ADD . /opt/sources/rabbitci/rabbit-ssh

COPY static/etc/ssh/ /etc/ssh/

WORKDIR /opt/sources/rabbitci/rabbit-ssh

RUN \
  chown ${USER}:${USER} /opt/sources/rabbitci/rabbit-ssh/bin/controller.ssh.entrypoint.sh && \
  chmod +x /opt/sources/rabbitci/rabbit-ssh/bin/controller.ssh.entrypoint.sh && \
  touch /var/log/sshd.log && \
  chown ${USER}:${USER} /var/log/sshd.log && \
  chown ${USER}:${USER} /etc/ssh/authorized_keys.d && \
  chmod 700 /etc/ssh/authorized_keys.d && \
  #chown ${USER}:${USER} /etc/ssh/ssh_host_dsa_key && \
  chown -R ${USER}:${USER} /home/${USER} && \
  chown -R ${USER}:${USER} /usr/local/bin/kubectl && \
  chown -R ${USER}:${USER} /home/${USER}/.kube && \
  chown -R ${USER}:${USER} /etc/ssh/ && \
  chown -R ${USER}:${USER} /opt/sources/rabbitci/rabbit-ssh

USER ${USER}

VOLUME [ "/etc/ssh/authorized_keys.d" ]

ENTRYPOINT ["/opt/sources/rabbitci/rabbit-ssh/bin/entrypoint.sh"]

EXPOSE 22

# CMD ["sh", "-c", "worker service logs rabbit-ssh-server"]
#CMD ["sh", "-c", "node -v"]

# Set the default command
CMD ["tail", "-f", "/dev/null"]