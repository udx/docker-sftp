#!/usr/local/bin/node

/**
 * Need to trigger when a docker "application" is launched and when a user changes their GitHub keys.
 *
 * 1. Get list of running Docker applications, extract the GitHub "id" of each application.
 * 2. Fetch GitHub "collaborators" for each of the application, record them in an object, using only those permissions.push permission.
 * 3. Fetch all public GitHub keys for each "collaborator"
 * 4. Generate /etc/passwd and /etc/ssh/authorized_keys.d/{APP} for each application/user.
 *
 *
 * For Production on Kubernetes rabbit-ssh VM:
 *    DIRECTORY_KEYS_BASE=/etc/ssh/authorized_keys.d PASSWORD_FILE=/etc/passwd PASSWORDS_TEMPLATE=alpine.passwords controller.keys
 *
 * For Production on Kubernetes rabbit-ssh VM (write to state.json):
 *    CONTROLLER_KEYS_PATH=/var/lib/rabbit-ssh/state.json DIRECTORY_KEYS_BASE=/etc/ssh/authorized_keys.d PASSWORD_FILE=/etc/passwd PASSWORDS_TEMPLATE=alpine.passwords opt/controller.keys.js
 *
 *
 */
const axios = require('axios');
var async = require('async');
var Mustache = require('mustache');
var repositoryCollaborators = require('./collaborators');

var fs = require('fs');
var debug = require('debug')('update-ssh');
var _ = require('lodash');

module.exports.updateKeys = function updateKeys(options, taskCallback) {

    let allowedRoles = process.env.ALLOW_SSH_ACCESS_ROLES || "admin,maintain,write";
    let productionBranch = process.env.PRODUCTION_BRANCH || "production";
    let allowedRolesForProd = process.env.ALLOW_SSH_ACCES_PROD_ROLES || "admin";

    taskCallback = 'function' === typeof taskCallback ? taskCallback : function taskCallback() {

        if (process.env.SLACK_NOTIFICACTION_URL && process.env.SLACK_NOTIFICACTION_URL.indexOf("https") === 0) {
            axios({
                method: 'post', //you can set what request you want to be
                url: process.env.SLACK_NOTIFICACTION_URL,
                data: {
                    channel: process.env.SLACK_NOTIFICACTION_CHANNEL,
                    username: 'SSH/Server',
                    text: "SSH Keys refreshed on " + (process.env.HOSTNAME || process.env.HOST) + " has finished. ```kubectl -n rabbit-system exec -it " + (process.env.HOSTNAME || process.env.HOST) + " sh```"
                }
            });

        } else {
            console.log("process.env.SLACK_NOTIFICACTION_URL isn't set");
        }

    }

    options = _.defaults(options, {
        statePath: process.env.CONTROLLER_KEYS_PATH || null,
        keysPath: process.env.DIRECTORY_KEYS_BASE || './tmp/authorized_keys.d',
        passwordFile: process.env.PASSWORD_FILE || './tmp/passwd-tmp',
        passwordTemplate: process.env.PASSWORDS_TEMPLATE || 'alpine.passwords',
        passwordPath: process.env.PASSWORDS_PATH || '/opt/sources/rabbitci/rabbit-ssh/static/templates/',
    });

    if (!options.accessToken) {
        return taskCallback(new Error('Missing [accessToken].'));
    }

    // check that target key directory exists
    if (!fs.existsSync(options.keysPath)) {
        console.error("authorized_keys [%s] directory missing.", options.keysPath);
        return;
    }

    if (!options.passwordFile) {
        console.error("the PASSWORD_FILE is not explicitly set.");
        return;
    }

    if (!options.passwordTemplate) {
        console.error("the PASSWORDS_TEMPLATE is not explicitly set.");
        return;
    }

    var _applications = {}; // application to GitHub users
    // Keyed by GitHub login. No prototype: a login such as "constructor" is a
    // key like any other.
    var _allKeys = Object.create(null); // contains a GitHub User -> Array of Keys
    var _users = Object.create(null); // list of all users
    var _lookups = {}; // repository -> what the collaborator lookup resolved to


    /**
     * Have Container List.
     *
     * @param err
     * @param resp
     * @param body
     */

    var _container_url = 'http://localhost:' + process.env.NODE_PORT + '/v1/pods';

    axios({
            method: "get",
            url: _container_url,
            headers: { 'x-rabbit-internal-token': process.env.KUBERNETES_CLUSTER_USER_TOKEN }
        })
        .then(response => {
            let body = _.get(response, "data", {});
            if (_.size(_.get(body, 'items', [])) === 0) {
                console.error("No response from container lookup at [%s].", _container_url);
                console.error("Error fetching Kuberneter Pods", err.message);
                console.error(" -headers ", _.get(resp, 'headers'));
                //body = require('../static/fixtures/pods');
                return false;
            }

            var _containers = body = _.map(body.items, function(singleItem) {

                singleItem.Labels = _.get(singleItem, 'metadata.labels');

                // Prevents the application from being added to the list if it does not have the required labels
                if ( _.get(singleItem.Labels, 'name', false) && _.get(singleItem.Labels, 'ci.rabbit.ssh.user', false) ) {
                    singleItem.Labels['ci.rabbit.name'] = singleItem.Labels['name'];
                    singleItem.Labels['ci.rabbit.ssh.user'] = singleItem.Labels['ci.rabbit.ssh.user'] || null;
                    return singleItem;
                }

            });

            (_containers || []).forEach(function(containerInfo) {

                var _labels = _.get(containerInfo, 'metadata.labels', {});

                if (!_labels['ci.rabbit.ssh.user'] || null) {
                    return;
                }

                var _ssh_user = _labels['ci.rabbit.ssh.user'];

                // @todo May need to identify non-primary-branch apps here, or use a special label
                _applications[_ssh_user] = {
                    _id: (_labels['git.owner'] || _labels['git_owner']) + '/' + (_labels['git.name'] || _labels['git_name']),
                    sshUser: containerInfo.Labels['ci.rabbit.ssh.user'] || null,
                    //name: containerInfo.Names[0],
                    namespace: _.get(containerInfo, 'metadata.namespace'),
                    users: {},
                    containers: []
                };

            });

            _.each(_applications, function addConainers(application) {

                application.containers = _.map(_.filter(body, { Labels: { 'ci.rabbit.ssh.user': application.sshUser } }), function(foundContainer) {
                    return {
                        podName: _.get(foundContainer, 'metadata.name') || foundContainer.Labels['ci.rabbit.name'],
                        containerName: _.get(foundContainer, 'spec.containers[0].name'),
                    }
                })

            });

            // One lookup per repository: the applications of a repository (its
            // branch environments) have the same collaborators. ./collaborators
            // remembers each answer for a while and stops asking while GitHub
            // reports the rate limit as spent.
            var _token = _.get(options, "accessToken");
            var _repositories = _.uniq(_.map(_.values(_applications), '_id'));
            var _limitReported = false;

            async.eachLimit(_repositories, 3, function fetchCollaborators(repository, callback) {

                repositoryCollaborators.list(repository, _token).then(function(result) {
                    _lookups[repository] = result;

                    if (result.source === 'github') {
                        console.log('GitHub API calls remaining: %s', result.remaining);
                        console.log('Found %d collaborators for %s', result.collaborators.length, repository);
                    } else if (result.reason === 'rate limit') {
                        if (!_limitReported) {
                            console.error("GitHub rate limit exceeded. Resets at: %s", new Date(result.pausedUntil));
                            _limitReported = true;
                        }
                    } else if (result.source === 'last') {
                        console.error("Error fetching collaborators for %s: %s. Using the last list.", repository, result.reason);
                    } else if (result.source === 'none') {
                        if (result.reason === 'not found') {
                            console.error("Repository not found: %s", repository);
                        } else if (result.reason === 'forbidden') {
                            console.error("Access forbidden for %s. Check token permissions.", repository);
                        } else {
                            console.error("Error fetching collaborators for %s: %s", repository, result.reason);
                        }
                    }
                }).catch(function(error) {
                    // The lookup resolves whatever GitHub does. Should it ever not,
                    // the refresh still finishes, without this repository.
                    console.error("Error fetching collaborators for %s: %s", repository, error && error.message);
                }).then(function() {
                    // Called once, here only: the last call runs the rest of the
                    // refresh, and an error from there must not come back as a
                    // second call.
                    callback();
                }).catch(function(error) {
                    // An unhandled rejection would end the process. The refresh
                    // stops here instead; the next pod change starts another.
                    console.error("SSH key refresh failed: %s", error && error.message);
                });

            }, function haveRepositories() {
                var _sources = _.countBy(_.values(_lookups), 'source');
                console.log('Collaborators of [%d] repositories: [%d] asked, [%d] remembered, [%d] from the last list, [%d] without one.',
                    _repositories.length, _sources.github || 0, _sources.cache || 0, _sources.last || 0, _sources.none || 0);

                _.values(_applications).forEach(function addCollaborators(data) {

                    // An entry that cannot be read costs its application the rest
                    // of its list, not the other applications their refresh.
                    try {

                    // get just the permissions, add users to application
                    const collaborators = (_lookups[data._id] || {}).collaborators || [];

                    collaborators.forEach(function(thisUser) {
                        const userRole = thisUser.role_name || 'none';
                        const allowedRolesList = _.split(allowedRoles, ",");
                        const allowedProdRolesList = _.split(allowedRolesForProd, ",");
                        const isProdBranch = data.sshUser.includes('.' + productionBranch);

                        // Log role check
                        console.log('Checking user %s with role %s for %s (prod: %s)', 
                            thisUser.login, userRole, data.sshUser, isProdBranch);

                        // Check role permissions
                        if ((_.includes(allowedRolesList, userRole) && !isProdBranch) || 
                            (isProdBranch && _.includes(allowedProdRolesList, userRole))) {
                            _applications[data.sshUser].users[thisUser.login] = {
                                _id: thisUser.login,
                                permissions: thisUser.permissions,
                                role: userRole
                            };
                            _users[thisUser.login] = _users[thisUser.login] || [];
                            _users[thisUser.login].push(data._id);
                            console.log('Added access for %s to %s', thisUser.login, data.sshUser);
                        } else {
                            console.log('Skipped %s: insufficient permissions (role: %s)', 
                                thisUser.login, userRole);
                        }
                    });

                    } catch (error) {
                        console.error("Error fetching collaborators for %s: %s", data._id, error.message);
                    }

                });

                haveCollaborators();
            });

        })
        .catch(err => {
            console.log('getPods error: ', err.message);
            console.error("No response from container lookup at [%s].", _container_url);
            console.error("Error processing: ", err.message);
            //console.error(" -headers ", _.get(resp, 'headers'));
            //body = require('../static/fixtures/pods');
            return false;
        });



    /**
     * Callback for when all collaborators have been collected from all the apps.
     *
     */
    function haveCollaborators() {
        console.log('haveCollaborators. Have [%d].', Object.keys(_users).length);

        _.each(_users, function eachCollaborator(collaboratorName) {
            //console.log( arguments );
        });

        getCollaboratorsKeys(haveAllKeys, _users)
    }

    /**
     * Fetch GitHub keys for a specific user from GitHub
     */
    function getCollaboratorsKeys(done, users) {
        debug('getCollaboratorsKeys');

        async.each(_.keys(users), function iterator(userName, singleComplete) {

            /**
             *
             * @todo Check that response is valid, not an error due to invalid user or whatever
             *
             * @param error
             * @param resp
             * @param body
             */

            // Keys go with the list that names the user. A list GitHub gave in
            // this refresh takes the user's keys as they are now. A remembered
            // list takes the keys remembered with it: the login may have changed
            // hands since, and its new holder is not the collaborator.
            var _listedNow = _.some(users[userName], function(repository) {
                return _.get(_lookups, [repository, 'source']) === 'github';
            });

            if (!_listedNow) {
                var _remembered = repositoryCollaborators.rememberedKeys(userName);
                if (_remembered) {
                    _allKeys[userName] = _remembered;
                }
                return singleComplete(null);
            }

            axios({
                    method: "get",
                    url: 'https://github.com/' + userName + '.keys',
                })
                .then(response => {
                    let body = _.get(response, "data")
                    debug('gitHubCallback', userName);

                    var _userKeys = body.split("\n");

                    _allKeys[userName] = cleanArray(_userKeys);
                    repositoryCollaborators.rememberKeys(userName, _allKeys[userName]);

                    singleComplete(null);
                })
                .catch(err => {
                    console.log('GitHub get keys error: ', err.message);
                    singleComplete(null);
                });

        }, function allDone() {
            debug('getCollaboratorsKeys:allDone');

            done(null, _allKeys);
        });

    }

    /**
     * Callback triggered when all the GitHub user keys are fetched
     * @param error
     * @param _allKeys
     */
    function haveAllKeys(error, _allKeys) {
        debug('haveAllKeys [%d]', Object.keys(_allKeys).length);

        //
        if (options.statePath && _allKeys) {
            fs.writeFileSync(options.statePath, JSON.stringify({ keys: _allKeys }, null, 2), 'utf8');
            return taskCallback(null, { ok: true, statePath: options.statePath })
        }

        // create /etc/ssh/authorized_keys.d/{APP} directories
        _.keys(_applications).forEach(function createDirectory(appID) {

            if (!_applications[appID].sshUser) {
                console.log("Skipping [%s] because it does not have the 'ci.rabbit.ssh.user' label.", appID);
                return;
            }

            var _path = (options.keysPath) + '/' + _applications[appID].sshUser;

            

            debug('Creating SSH keys file for [%s] at [%s]/', appID, _path);

            // loop through containers
            _.values(_applications[appID].containers).forEach(function(container) {
                var writableKeys = [];
                // loop through users
                _.values(_applications[appID].users).forEach(function(userData) {
                    var _envs = {
                        application: appID,
                        namespace: _applications[appID].namespace,
                        containerName: _.get(container, 'containerName'),
                        podName: _.get(container, 'podName'),
                        user_data: userData._id,
                        CONNECTION_STRING: [_applications[appID].namespace, ' ', _.get(container, 'podName'), ' -c ', _.get(container, 'containerName')].join(' ')
                    };

                    _.get(_allKeys, userData._id, []).forEach(function(thisUsersKey) {
                        writableKeys.push('environment="ENV_VARS=' + _envs.CONNECTION_STRING + ';'+userData._id+'"   ' + thisUsersKey);
                    });
                });

                // write user and container keys (after collecting all users' keys)
                if (writableKeys.length > 0) {
                    fs.writeFile(_path, writableKeys.join("\n"), { mode: 0o600 }, function(err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        debug("Wrote SSH Key file for [%s] identified as [%s] user.", appID, _applications[appID].sshUser);
                    });
                    
                    var _container_path = (options.keysPath) + '/' + _.get(container, 'podName');
                    fs.writeFile(_container_path, writableKeys.join("\n"), { mode: 0o600 }, function(err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log("Wrote SSH Key file for [%s] applications container [%s].", appID, _.get(container, 'podName'));
                    });

                } else {
                    console.error("No keys returned [%s] not updated.", _path)
                }
            });
        });

        var _full_path = (options.passwordPath) + '' + (options.passwordTemplate) + '.mustache';

        // create /etc/passwd file
        fs.readFile(_full_path, 'utf8', function(err, source) {

            if (err) {
                return console.error(err.message);
            }

            var userFile = Mustache.render(source, {
                applications: _.values(_applications)
            });

            fs.writeFile(options.passwordFile, userFile, 'utf8', function(error) {
                console.log('Updated [%s] file with [%d] applications.', options.passwordFile, _.size(_applications))
                taskCallback(null, { ok: true, applications: _applications, users: _users })
            });
        });

    }

    /**
     * Helper to remove blank values from array.
     * @param actual
     * @returns {Array}
     */
    function cleanArray(actual) {
        var newArray = new Array();
        for (var i = 0; i < actual.length; i++) {
            if (actual[i]) {
                newArray.push(actual[i]);
            }
        }
        return newArray;
    }

}

if (!module.parent) {
    module.exports.updateKeys();
}