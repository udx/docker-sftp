module.exports.apps = []

if( process.env.SERVICE_ENABLE_SSHD === 'true' ) {

  module.exports.apps.push({
    "user": "node",
    "script": "/usr/sbin/sshd",
    "args": "-D -f /etc/ssh/sshd_config -e",
    "name": "sshd",
    "merge_logs": true,
    "vizion": false,
    "exec_mode": "fork",
    "max_restarts": 50,
    "restart_delay": 10000,
    "log_date_format": "YYYY-MM-DD HH:mm Z"
  })

}

if( process.env.SERVICE_ENABLE_API === 'true' ) {

  module.exports.apps.push({
    "user": "node",
    "script": "/opt/sources/rabbitci/rabbit-ssh/bin/server.js",
    "name": "rabbit-ssh-server",
    "merge_logs": true,
    "vizion": false,
    "exec_mode": "fork",
    "max_memory_restart": "512M",
    "max_restarts": 50,
    "restart_delay": 10000,
    "log_date_format": "YYYY-MM-DD HH:mm Z"
  })
}

if( process.env.SERVICE_ENABLE_FIREBASE === 'true' ) {
  module.exports.apps.push({
    "script": "/opt/sources/rabbitci/rabbit-ssh/bin/firebase.consume.js",
    "name": "firebase-consume",
    "merge_logs": true,
    "vizion": false,
    "exec_mode": "fork",
    "max_memory_restart": "512M",
    "max_restarts": 50,
    "restart_delay": 10000,
    "log_date_format": "YYYY-MM-DD HH:mm Z"
  });
}