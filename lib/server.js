/**
 *
 * This is the SSH server that is used to connect to the Kubernetes cluster.
 * node ./server
 *
 */

const axios = require('axios');
const _ = require('lodash');
const express = require('express');
const debug = require('debug')('ssh');
const app = express();
let utility = require('./utility');
const md5 = require('md5');

const accessToken = process.env.ACCESS_TOKEN;
const PORT = process.env.NODE_PORT || 8080;

// for SSH Entrypoint to get Kubernetes connection string that includes namespace and pod name
app.get('/_cat/connection-string/:user', singleUserEndpoint);

// list of all containers
app.get('/users', userEndpoint);
app.get('/apps', appEndpoint);
app.get('/v1/pods', getPods);
app.delete('/flushFirebaseContainers', flushFirebaseContainers);
app.use(singleEndpoint);

app.listen(PORT, '0.0.0.0', serverOnline);

var _containersStateHash = "";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

setInterval(function() {
    var _container_url = 'http://localhost:' + PORT + '/v1/pods';

    axios({
            method: "get",
            url: _container_url,
            headers: { 'x-rabbit-internal-token': process.env.KUBERNETES_CLUSTER_USER_TOKEN }
        })
        .then(res => {
            let body = _.get(res, "data", {});
            if (_.size(_.get(body, 'items', [])) === 0) {
                console.error("No response from container lookup at [%s].", _container_url);
                console.error(" -err ", err);
                console.error(" -headers ", _.get(res, 'headers'));
                //body = require('../static/fixtures/pods');
                return false;
            }

            var _containers = body = _.map(body.items, function(singleItem) {
                singleItem.Labels = _.get(singleItem, 'metadata.labels');
                singleItem.Labels['ci.rabbit.name'] = _.get(singleItem.Labels,'name', null);
                singleItem.Labels['ci.rabbit.ssh.user'] = _.get(singleItem.Labels,'ci.rabbit.ssh.user', null);
                return singleItem;
            });

            var _checkString = "";
            //console.log("_checkString1", _checkString);
            (_containers || []).forEach(function(containerInfo) {
                _checkString += _.get(containerInfo, 'metadata.name', "");
            });

            if (_containersStateHash === md5(_checkString)) {
                console.log("SSH keys is up to date.");
            } else {
                console.log("Need to upgrade SSH keys.");
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
            console.error("No response from container lookup at [%s].", _container_url);
            console.error(" -err ", err);
            //console.error(" -headers ", _.get(resp, 'headers'));
            //body = require('../static/fixtures/pods');
            return false;
        });

}, 60000)

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

    axios({
            method: "get",
            url: process.env.KUBERNETES_CLUSTER_ENDPOINT + '/api/v1/pods',
            headers: {
                'Authorization': 'Bearer ' + process.env.KUBERNETES_CLUSTER_USER_TOKEN
            }
        })
        .then(response => {
            res.send(response.data);
        })
        .catch(err => {
            console.log('getPods error: ', err.message);
        });

}

/**
 * Flush all container data from Firebase.
 * This is used to clean up stale container data and resolve memory issues.
 *
 * @api {delete} /flushFirebaseContainers Flush container data
 * @apiName FlushContainers
 * @apiGroup Maintenance
 * @apiSuccess {Boolean} ok Operation status
 * @apiSuccess {String} message Operation details
 * @apiSuccess {Number} removedCount Number of containers removed
 */
function flushFirebaseContainers(req, res) {
    console.log('[Maintenance] Container flush requested from:', req.ip);

    var _containerCollection = utility.getCollection('container', '', function(error, data) {
        if (error) {
            console.error('[Maintenance] Failed to get container collection:', error);
            return res.status(500).send({
                ok: false,
                message: 'Failed to access container data',
                error: error.message
            });
        }

        const containerCount = _.size(data);
        console.log(`[Maintenance] Found ${containerCount} containers to flush`);

        _containerCollection.remove(function(removeError) {
            if (removeError) {
                console.error('[Maintenance] Failed to flush containers:', removeError);
                return res.status(500).send({
                    ok: false,
                    message: 'Failed to flush containers',
                    error: removeError.message
                });
            }

            console.log(`[Maintenance] Successfully flushed ${containerCount} containers`);
            res.send({
                ok: true,
                message: 'Successfully flushed container data',
                removedCount: containerCount
            });
        });
    });
}

function appEndpoint(req, res) {

    res.send({
        items: _.map(app.get('sshUser'), function(someUser) {
            return {
                _id: someUser._id,
                sshUser: _.get(someUser, 'meta.sshUser'),
                connectionString: ['ssh ', _.get(someUser, 'meta.sshUser'), '@ssh.rabbit.ci'].join(''),
                pod: _.get(someUser, 'metadata.labels', {})['io.kubernetes.pod.name'],
            }
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

    var _result = _.find(app.get('sshUser'), function(someUser) {

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
            "-n",
            _.get(_result, 'metadata.labels', {})['io.kubernetes.pod.namespace'],
            'exec ',
            _.get(_result, 'metadata.labels', {})['io.kubernetes.pod.name']
        ]

    }

    res.send(_connection_string.join(" "))
}

function singleEndpoint(req, res) {
    console.log('default', req.url);
    res.send('ok!');
}

function serverOnline() {
    console.log('rabbit-ssh-server online!');

    var sshUser = app.get('sshUser') || {};


    if (process.env.SERVICE_ENABLE_FIREBASE === 'true') {

        var _collection = utility.getCollection('container', 'meta/sshUser', function(error, data) {

            app.set('sshUser', utility.parseContainerCollection(data));

        });

        _collection.once('child_added', function(data) {

            data = utility.parseContainerCollection(data.val());

            if (!data) {
                return;
            }

            return;

        });

        _collection.on('child_changed', function(data) {
            sshUser[_.get(data.val(), '_id')] = data.val();
        });

        _collection.on('child_removed', function(data) {
            delete sshUser[_.get(data.val(), '_id')];
        });

    }

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

    if (process.env.SLACK_NOTIFICACTION_URL && process.env.SLACK_NOTIFICACTION_URL.indexOf("https") === 0) {
        axios({
            method: 'post', //you can set what request you want to be
            url: process.env.SLACK_NOTIFICACTION_URL,
            data: {
                channel: process.env.SLACK_NOTIFICACTION_CHANNEL,
                username: 'SSH/Server',
                text: "Container " + (process.env.HOSTNAME || process.env.HOST) + " is up. ```kubectl -n rabbit-system logs -f " + (process.env.HOSTNAME || process.env.HOST) + "```"
            }
        });
    } else {
        console.log("Warning: SLACK_NOTIFICACTION_URL not configured - notifications will be disabled");
    }

}