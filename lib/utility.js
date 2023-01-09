var _ = require('lodash');
var dot = require('dot-object');
var admin = require("firebase-admin");
var debug = require('debug')('ssh');
var async = require('async');

/**
 * Converts Docker event message into a firebase-friendly container object.
 *
 * @param type
 * @param action
 * @param data
 * @returns {*}
 */
module.exports.normalizeMessage = function normalizeMessage(type, action, data) {

    if (action.indexOf('exec_start') === 0) {
        return null;
    }

    if (action.indexOf('exec_create') === 0) {
        return null;
    }

    if (type !== 'container') {
        return null;
    }

    var _attributes = _.get(data, 'Actor.Attributes', {});

    var _normalized = {
        _id: null,
        //_type: [ type, action ].join('-'),
        _type: 'container',
        host: (process.env.HOSTNAME || process.env.HOST || require('os').hostname()),
        fields: [],
        updated: _.get(data, 'timeNano'),
        lastAction: _.get(data, 'Action')
    }

    if (_attributes && type === 'container') {
        //_normalized.fields = dot.object(_attributes);

        _.forEach(_attributes, function(value, key) {

            var _field = {
                key: key,
                value: value,
                type: 'string'
            };

            // serialized JSON
            if (key === 'annotation.io.kubernetes.container.ports') {
                _field.value = module.exports.json_parse(value);
                _field.type = 'object';
            }

            _normalized.fields.push(_field)

        });

    }

    if (_.get(data, 'Actor.ID')) {
        _normalized._id = _.get(data, 'Actor.ID', '').substring(0, 16);
    }

    // only containers for now.
    if (!_normalized._id) {
        return null;
    }

    return _normalized;

}

module.exports.json_parse = function json_parse(data) {

    try {

        return JSON.parse(data);

    } catch (error) {
        return data;
    }

}

module.exports.getFirebase = function() {

    if (module._firebase) {
        return module._firebase;
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            "type": "service_account",
            "project_id": process.env.FIREBASE_PROJECT_ID,
            "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
            "private_key": process.env.FIREBASE_PRIVATE_KEY.split('\\n').join('\n'),
            "client_email": process.env.FIREBASE_CLIENT_EMAIL,
            "client_id": process.env.FIREBASE_CLIENT_ID,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    return module._firebase = admin;

}

module.exports.parseContainerCollection = function(data) {

    var _items = {};

    _.each(data, function(singleItem) {
        if (['kill', 'destroy', 'die', 'oom', 'stop'].indexOf(singleItem.lastAction) >= 0) {
            return;
        }

        if (!_.find(singleItem.fields, { key: 'ci.rabbit.ssh.user' })) {
            return;
        }

        if (!_.find(singleItem.fields, { key: 'git.name' })) {
            return;
        }

        var _fields = {};

        _.each(singleItem.fields, function(item) {
            _fields[item.key] = item.value;
        })

        //_.set(singleItem, 'containerName', _.get( _fields, ) );

        _.set(singleItem, 'metadata.labels', _fields)
        _.set(singleItem, 'metadata.labels', _fields)


        _.set(singleItem, 'meta.name', _.get(_fields, 'io.kubernetes.pod.name'));
        _.set(singleItem, 'meta.parent', _.kebabCase([
            _.get(_fields, 'git.name'),
            _.get(_fields, 'git.branch')
        ].join('-')));

        console.log(require('util').inspect(singleItem.meta, { showHidden: false, depth: 2, colors: true }));
        //process.exit();

        _items[singleItem._id] = singleItem;

    });

    return _items;


}

module.exports.getCollection = function(collectionName, sortField, done) {

    var _collection = exports.getFirebase().database().ref(collectionName);

    _collection.orderByChild(sortField || '_id').once('value', function haveRoute(snapshot) {
        //console.log('haveRoute');

        var _result = [];

        snapshot.forEach(function(childSnapshot) {
            var childKey = childSnapshot.key;
            var childData = childSnapshot.val();

            childData._path = [collectionName, childKey].join('/');

            _result.push(childData);

        });

        done(null, _result);

    })


    return _collection;

}

module.exports.updateKeys = function updateKeys(options, callback) {
    debug('updateKeys', options);

    var updateKeysOptions = {
        keysPath: options.keysPath || '/etc/ssh/authorized_keys.d',
        passwordFile: options.passwordFile || '/etc/passwd',
        passwordTemplate: options.passwordTemplate || 'alpine.passwords',
        accessToken: options.accessToken || ""
    };

    if (require('fs').existsSync(updateKeysOptions.keysPath)) {
        debug('updateKeys', 'controllerKeys.updateKeys');

        require('../bin/controller.keys').updateKeys(updateKeysOptions, callback)

        debug('controllerKeys.updateKeys');

    } else {
        debug('updateKeys - Missing directory [%s].', updateKeysOptions.keysPath);
    }


};