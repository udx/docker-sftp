FROM node:23.8-alpine
ENV KUBECTL_VERSION=1.32.0
ENV NODE_ENV=production
ENV SERVICE_ENABLE_SSHD=true
ENV SERVICE_ENABLE_API=true
ENV SERVICE_ENABLE_FIREBASE=false

RUN apk update --no-cache && apk upgrade --no-cache && apk add bash tar

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    linux-headers \
    openssl-dev \
    zlib-dev \
    file \
    wget

# Download the latest OpenSSH (9.8p1) source
RUN wget https://ftp.openbsd.org/pub/OpenBSD/OpenSSH/portable/openssh-9.9p1.tar.gz \
    && tar -xzf openssh-9.9p1.tar.gz \
    && cd openssh-9.9p1 \
    # Configure and compile the source
    && ./configure \
    && make \
    && make install

# Cleanup build dependencies and unnecessary files
RUN apk del build-base linux-headers openssl-dev zlib-dev file wget \
    && rm -rf /openssh-9.9p1.tar.gz /openssh-9.9p1

RUN apk add --no-cache nfs-utils rpcbind curl ca-certificates nano tzdata ncurses make tcpdump \
  && curl -L https://dl.k8s.io/release/v$KUBECTL_VERSION/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl \
  && kubectl version --client \
  && rm -rf /etc/ssh/* \
  && mkdir -p /etc/ssh/authorized_keys.d \
  && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
  && echo "America/New_York" >  /etc/timezone \
  && apk del tzdata

RUN curl -sSL https://sdk.cloud.google.com > /tmp/gcl && bash /tmp/gcl --install-dir=/root --disable-prompts

ENV PATH $PATH:/root/google-cloud-sdk/bin

#RUN gcloud components update kubectl

RUN gcloud components install gke-gcloud-auth-plugin

ENV USE_GKE_GCLOUD_AUTH_PLUGIN True

RUN \
  npm -g install pm2

RUN \
  mkdir -p /home/node/.kube && \
  mkdir -p /opt/sources/rabbitci/rabbit-ssh && \
  mkdir -p /root/.ssh

ADD . /opt/sources/rabbitci/rabbit-ssh

COPY static/etc/ssh/ /etc/ssh/

WORKDIR /opt/sources/rabbitci/rabbit-ssh

RUN \
    chown node:node /opt/sources/rabbitci/rabbit-ssh/bin/controller.ssh.entrypoint.sh && \
    chmod +x /opt/sources/rabbitci/rabbit-ssh/bin/controller.ssh.entrypoint.sh && \
    touch /var/log/sshd.log && \
    chown node:node /var/log/sshd.log && \
    chown -R node:node /home/node

VOLUME [ "/etc/ssh/authorized_keys.d" ]

ENTRYPOINT ["/opt/sources/rabbitci/rabbit-ssh/bin/entrypoint.sh"]

EXPOSE 22

CMD [ "/usr/local/bin/node", "/usr/local/bin/pm2", "logs" ]