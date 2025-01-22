#!/bin/sh
##
##
##

export _SERVICE=${USER};
export CONNECTION_STRING=$(echo ${ENV_VARS} | cut -d ';' -f 1)
export USER_LOGIN=$(echo ${ENV_VARS} | cut -d ';' -f 2)

if [ -z "${SSH_ORIGINAL_COMMAND}" ]; then
  echo "[$(date)] SSH_ORIGINAL_COMMAND is empty. Have a session for [${USER_LOGIN}] : ${USER}, ${SSH_CLIENT}, ${SSH_CONNECTION} and [${CONNECTION_STRING}] command." >> /var/log/sshd.log
else
  echo "[$(date)] Have a session for [${USER_LOGIN}] : ${USER}, ${SSH_ORIGINAL_COMMAND}, ${SSH_CLIENT}, ${SSH_CONNECTION} and [${CONNECTION_STRING}] command." >> /var/log/sshd.log
fi

## SFTP handling with Alpine-specific paths
if [[ "${SSH_ORIGINAL_COMMAND}" == "internal-sftp" ]] || [[ "${SSH_ORIGINAL_COMMAND}" == "/usr/lib/ssh/sftp-server" ]]; then
  echo "[$(date)] SFTP connection attempt from [${SSH_CLIENT}] for user [${USER}] to pod [${CONNECTION_STRING}]" >> /var/log/sshd.log

  # Check container OS type for better error reporting
  CONTAINER_OS="unknown"
  if /usr/local/bin/kubectl exec -n ${CONNECTION_STRING} -- which apk >/dev/null 2>&1; then
    CONTAINER_OS="Alpine"
  elif /usr/local/bin/kubectl exec -n ${CONNECTION_STRING} -- which apt-get >/dev/null 2>&1; then
    CONTAINER_OS="Debian/Ubuntu"
  elif /usr/local/bin/kubectl exec -n ${CONNECTION_STRING} -- which yum >/dev/null 2>&1; then
    CONTAINER_OS="RHEL/CentOS"
  fi
  echo "[$(date)] Container OS detected: ${CONTAINER_OS}" >> /var/log/sshd.log

  # Try common SFTP server paths
  for SFTP_PATH in "/usr/lib/ssh/sftp-server" "/usr/lib/sftp-server" "/usr/libexec/sftp-server"; do
    echo "[$(date)] Checking for SFTP server at ${SFTP_PATH}" >> /var/log/sshd.log
    if /usr/local/bin/kubectl exec -n ${CONNECTION_STRING} -- test -f ${SFTP_PATH} 2>/dev/null; then
      echo "[$(date)] Found SFTP server at ${SFTP_PATH}, establishing connection" >> /var/log/sshd.log
      exec /usr/local/bin/kubectl exec -n ${CONNECTION_STRING} -i -- ${SFTP_PATH}
      exit 0
    fi
  done

  # If we get here, we couldn't find the SFTP server
  echo "[$(date)] Error: SFTP server not found in ${CONTAINER_OS} container [${CONNECTION_STRING}]. Client IP: ${SSH_CLIENT}" >> /var/log/sshd.log
  echo "Error: SFTP access requires openssh-sftp-server to be installed in the container. Please contact your administrator." >&2
  exit 1
fi

## Specific Command, pipe into container.
if [[ "x${SSH_ORIGINAL_COMMAND}" != "x" ]]; then

  if [ -z "${API_REQUEST_URL}" ]; then
    echo "[$(date)] Have SSH session using command: [kubectl exec -n $CONNECTION_STRING -ti -- ${SSH_ORIGINAL_COMMAND})] for [${USER}] from [${SSH_CLIENT}]." >> /var/log/sshd.log
  else
    echo "[$(date)] Have SSH session using command: [kubectl exec -n $CONNECTION_STRING -ti -- ${SSH_ORIGINAL_COMMAND})] for [${USER}] from [${API_REQUEST_URL}]." >> /var/log/sshd.log
  fi

  ##/usr/local/bin/kubectl exec ${_SERVICE} -ti -- "${SSH_ORIGINAL_COMMAND}"
  __commad="/usr/local/bin/kubectl exec -n $CONNECTION_STRING -ti -- $SSH_ORIGINAL_COMMAND"
  
  echo $__commad >> /var/log/sshd.log

  $__commad;

fi;

## Terminal, pipe into container.
if [[ "x${SSH_ORIGINAL_COMMAND}" == "x" ]]; then

  echo "kubectl exec -n ${CONNECTION_STRING} -ti /bin/bash" >> /var/log/sshd.log

  #if [  "x${SSH_CONNECTION}" != "x" ]; then
  #  export GIT_AUTHOR_EMAIL="${SSH_USER}";
  #  export GIT_AUTHOR_NAME="${SSH_USER}";
  #fi;

  ## Detect Max Columns and Rows.

  export _COLUMNS=$(tput cols);
  export _ROWS=$(tput lines);
  
  ## Set Columns and Rows
  stty rows ${_ROWS} cols ${_COLUMNS};
  
  ## Log screen size.
  echo "[$(date)] Container [${USER}] has [${_COLUMNS}] columns and [${_ROWS}] rows." >> /var/log/sshd.log

  _command="/usr/local/bin/kubectl exec -n $CONNECTION_STRING -ti -- /bin/bash"

  echo $_command >> /var/log/sshd.log

  $_command;

fi;

exit;
