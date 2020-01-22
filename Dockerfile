FROM node:9-alpine
ENV VERSION=v1.8.5
ENV NODE_ENV=production
ENV SERVICE_ENABLE_SSHD=true
ENV SERVICE_ENABLE_API=true
ENV SERVICE_ENABLE_FIREBASE=false

RUN apk update && apk upgrade && apk add bash

RUN apk add --no-cache git openssh nfs-utils rpcbind curl ca-certificates tzdata ncurses \
  && curl -L https://storage.googleapis.com/kubernetes-release/release/$VERSION/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl \
  && kubectl version --client \
  && rm -rf /etc/ssh/* \
  && mkdir /etc/ssh/authorized_keys.d \
  && cp /usr/share/zoneinfo/America/New_York /etc/localtime \
  && echo "America/New_York" >  /etc/timezone \
  && apk del tzdata

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
