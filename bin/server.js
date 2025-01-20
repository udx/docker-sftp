/**
 *
 * This is the SSH server that is used to connect to the Kubernetes cluster.
 * node ./server
 *
 */

const axios = require('axios');
const _ = require('lodash');
const express = require('express');
const https = require('https');
const debug = require('debug')('ssh');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const app = express();
let utility = require('../lib/utility');
const md5 = require('md5');
const rateLimit = require('../lib/rate-limit');
const events = require('../lib/events');

// Access token from worker.yml secrets
var accessToken = process.env.ACCESS_TOKEN;

// Health check endpoint for Kubernetes
app.get('/health', (req, res) => {
    res.send({ status: 'ok' });
});

// for SSH Entrypoint to get Kubernetes connection string that includes namespace and pod name
// Health check endpoint for Cloud Run
app.get('/health', async (req, res) => {
    try {
        // Check SSH daemon
        const sshStatus = await new Promise((resolve) => {
            require('child_process').exec('pgrep sshd', (error) => {
                resolve(error ? false : true);
            });
        });

        // Check state provider
        let stateStatus = false;
        try {
            const stateProvider = utility.getStateProvider({
                provider: process.env.STATE_PROVIDER || 'kubernetes'
            });
            await stateProvider.initialize();
            stateStatus = true;
        } catch (err) {
            console.error('State provider health check failed:', err.message);
        }

        // Overall health status
        const isHealthy = sshStatus && stateStatus;

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            checks: {
                ssh: sshStatus ? 'up' : 'down',
                stateProvider: stateStatus ? 'up' : 'down'
            },
            version: process.env.npm_package_version || 'unknown'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

app.get('/_cat/connection-string/:user', singleUserEndpoint);

// list of all containers
// Health check endpoint for Cloud Run
app.get('/_health', async (req, res) => {
    try {
        // Check SSH daemon
        await execAsync('pgrep sshd');
        
        // Check Kubernetes connectivity
        const k8sResponse = await axios({
            method: 'get',
            url: process.env.KUBERNETES_CLUSTER_ENDPOINT + '/api/v1/pods',
            headers: {
                'Authorization': 'Bearer ' + process.env.KUBERNETES_CLUSTER_USER_TOKEN,
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        
        if (k8sResponse.status === 200) {
            res.status(200).json({
                status: 'healthy',
                ssh: true,
                kubernetes: true,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                ssh: true,
                kubernetes: false,
                error: 'Kubernetes API returned non-200 status'
            });
        }
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            ssh: err.cmd === 'pgrep sshd' ? false : true,
            kubernetes: err.cmd === 'pgrep sshd' ? true : false,
            error: err.message
        });
    }
});

app.get('/users', userEndpoint);
app.get('/apps', appEndpoint);
app.get('/v1/pods', getPods);
app.delete('/flushFirebaseContainers', flushFirebaseContainers);
app.use(singleEndpoint);

// Listen on configured port with health check support
const port = process.env.PORT || process.env.NODE_PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`k8-container-gate-server listening on port ${port}`);
    serverOnline();
});

var _containersStateHash = '';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

setInterval(function () {
    var _container_url = process.env.KUBERNETES_CLUSTER_ENDPOINT ? 
        process.env.KUBERNETES_CLUSTER_ENDPOINT + '/api/v1/pods' :
        'http://localhost:' + process.env.NODE_PORT + '/v1/pods';

    axios({
        method: 'get',
        url: _container_url,
        headers: { 'x-rabbit-internal-token': process.env.KUBERNETES_CLUSTER_USER_TOKEN }
    })
        .then(res => {
            let body = _.get(res, 'data', {});
            if (_.size(_.get(body, 'items', [])) === 0) {
                console.error('No response from container lookup at [%s].', _container_url);
                console.error(' -headers ', _.get(res, 'headers'));
                //body = require('../static/fixtures/pods');
                return false;
            }

            var _containers = body = _.map(body.items, function (singleItem) {
                singleItem.Labels = _.get(singleItem, 'metadata.labels');
                singleItem.Labels['ci.rabbit.name'] = _.get(singleItem.Labels,'name', null);
                singleItem.Labels['ci.rabbit.ssh.user'] = _.get(singleItem.Labels,'ci.rabbit.ssh.user', null);
                return singleItem;
            });

            var _checkString = '';
            //console.log("_checkString1", _checkString);
            (_containers || []).forEach(function (containerInfo) {
                _checkString += _.get(containerInfo, 'metadata.name', '');
            });

            if (_containersStateHash === md5(_checkString)) {
                console.log('SSH keys is up to date.');
            } else {
                console.log('Need to upgrade SSH keys.');
                utility.updateKeys({
                    keysPath: '/etc/ssh/authorized_keys.d',
                    passwordFile: '/etc/passwd',
                    passwordTemplate: 'alpine.passwords',
                    accessToken: accessToken
                }, function keysUpdated(error, data) {
                    console.log('Updated state with [%s] SSH keys.', error || _.size(data.users));
                    app.set('sshUser', data.users);
                });
            }
            _containersStateHash = md5(_checkString);
        })
        .catch(err => {
            console.error('No response from container lookup at [%s].', _container_url);
            console.error(' -err ', err);
            //console.error(" -headers ", _.get(resp, 'headers'));
            //body = require('../static/fixtures/pods');
            return false;
        });

}, 60000);

/**
 *
 * curl localhost:8080/users/
 *
 * @param req
 * @param res
 */
function userEndpoint(req, res) {

    res.send({ items: app.get('sshUser') });

}

/**
 *
 * curl localhost:7010/v1/pods
 * @param req
 * @param res
 */
function getPods(req, res) {
    debug('getPods', req.url);

    // Use Kubernetes endpoint and token from worker.yml secrets
    axios({
        method: 'get',
        url: process.env.KUBERNETES_CLUSTER_ENDPOINT + '/api/v1/pods',
        headers: {
            'Authorization': 'Bearer ' + process.env.KUBERNETES_CLUSTER_USER_TOKEN,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        timeout: 10000, // 10 second timeout
        // Support for custom CA certificates
        ...(process.env.KUBERNETES_CLUSTER_CERTIFICATE && {
            httpsAgent: new https.Agent({
                ca: process.env.KUBERNETES_CLUSTER_CERTIFICATE
            })
        })
    })
        .then(response => {
            res.send(response.data);
        })
        .catch(err => {
            console.log('getPods error: ', err.message);
        });

}

/**
 * Remove old containers. This is a hack in case we run out of memory again.
 *
 * curl -XDELETE localhost:8080/flushFirebaseContainers
 *
 */
function flushFirebaseContainers(req, res) {

    var _containerCollection = utility.getCollection('container', '', function (error, data) {

        _containerCollection.remove();

        res.send({
            ok: false,
            message: 'Flushing containers not fully implemented, come find me.'
        });
    });


}

function appEndpoint(req, res) {

    res.send({
        items: _.map(app.get('sshUser'), function (someUser) {
            return {
                _id: someUser._id,
                sshUser: _.get(someUser, 'meta.sshUser'),
                connectionString: ['ssh ', _.get(someUser, 'meta.sshUser'), '@ssh.rabbit.ci'].join(''),
                pod: _.get(someUser, 'metadata.labels', {})['io.kubernetes.pod.name']
            };
        })
    });

}

/**
 *
 *
 * @param req
 * @param res
 */
function singleUserEndpoint(req, res) {
    // Check rate limits before processing request
    const check = rateLimit.checkLimit(req.params.user, 'any');
    if (!check.allowed) {
        res.status(429).send('Too many requests');
        return;
    }

    // Emit auth event for tracking
    events.emitLogin(req.params.user, 'any');

    var _result = _.find(app.get('sshUser'), function (someUser) {

        var _ssh = _.get(someUser, 'metadata.labels', {})['ci.rabbit.ssh.user'];
        var _pod = _.get(someUser, 'metadata.labels', {})['io.kubernetes.pod.name'];

        if (_ssh === req.params.user) {
            return true;
        }

        if (_pod === req.params.user) {
            return true;
        }

    });

    if (!_result) {
        res.set(404);
    }

    var _connection_string = [];

    if (_result) {

        _connection_string = [
            '-n',
            _.get(_result, 'metadata.labels', {})['io.kubernetes.pod.namespace'],
            'exec ',
            _.get(_result, 'metadata.labels', {})['io.kubernetes.pod.name']
        ];

    }

    res.send(_connection_string.join(' '));
}

function singleEndpoint(req, res) {
    console.log('default', req.url);
    res.send('ok!');
}

function serverOnline() {
    console.log('k8-container-gate-server online!');

    var sshUser = app.get('sshUser') || {};

    // Initialize state provider
    const stateProvider = utility.getStateProvider({
        provider: process.env.STATE_PROVIDER || 'kubernetes',
        options: {
            kubernetes: {
                endpoint: process.env.KUBERNETES_CLUSTER_ENDPOINT,
                namespace: process.env.KUBERNETES_CLUSTER_NAMESPACE,
                token: process.env.KUBERNETES_CLUSTER_USER_TOKEN
            },
            firebase: {
                credentials: {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
                },
                databaseURL: process.env.FIREBASE_DATABASE_URL
            },
            local: {
                statePath: '/var/lib/k8gate/state.json',
                keysPath: '/etc/ssh/authorized_keys.d'
            }
        }
    });

    // Load and watch state
    async function initializeState() {
        try {
            await stateProvider.initialize();
            const keys = await stateProvider.loadState('keys');
            if (keys) {
                app.set('sshUser', keys);
                debug('Loaded SSH keys from state provider');
            }

            // Set up state watching if supported
            if (stateProvider.supportsRealtime()) {
                stateProvider.watchState('keys', (updatedKeys) => {
                    if (updatedKeys) {
                        app.set('sshUser', updatedKeys);
                        debug('Updated SSH keys from state provider');
                    }
                });
            }
        } catch (err) {
            console.error('Failed to initialize state provider:', err.message);
            
            // Fallback to legacy Firebase if enabled
            if (process.env.SERVICE_ENABLE_FIREBASE === 'true') {
                var _collection = utility.getCollection('container', 'meta/sshUser', function (error, data) {
                    app.set('sshUser', utility.parseContainerCollection(data));
                });

                _collection.on('child_changed', function (data) {
                    sshUser[_.get(data.val(), '_id')] = data.val();
                });

                _collection.on('child_removed', function (data) {
                    delete sshUser[_.get(data.val(), '_id')];
                });
            }
        }
    }

    // Initialize state management
    initializeState();

    // detect non-kubernetes
    if (process.env.KUBERNETES_CLUSTER_ENDPOINT) {
        utility.updateKeys({
            keysPath: '/etc/ssh/authorized_keys.d',
            passwordFile: '/etc/passwd',
            passwordTemplate: 'alpine.passwords',
            accessToken: accessToken
        }, function keysUpdated(error, data) {
            console.log('Updated state with [%s] SSH keys.', error || _.size(data.users));
            app.set('sshUser', data.users);
        });
    }

    if (process.env.SLACK_NOTIFICACTION_URL && process.env.SLACK_NOTIFICACTION_URL.indexOf('https') === 0) {
        axios({
            method: 'post', //you can set what request you want to be
            url: process.env.SLACK_NOTIFICACTION_URL,
            data: {
                channel: process.env.SLACK_NOTIFICACTION_CHANNEL,
                username: 'SSH/Server',
                text: 'Container ' + (process.env.HOSTNAME || process.env.HOST) + ' is up. ```kubectl -n k8gate logs -f ' + (process.env.HOSTNAME || process.env.HOST) + '```'
            }
        });
    } else {
        console.log('process.env.SLACK_NOTIFICACTION_URL isn\'t set');
    }

}
