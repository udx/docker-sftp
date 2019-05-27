/**
 *
 *
 * node ./server
 *
 */
var request = require( 'request' );
var _ = require( 'lodash' );
var express = require( 'express' );
var debug = require( 'debug' )('ssh');
var app = express();
var utility = require( '../lib/utility' );

// for SSH Entrypoint to get Kubernetes connection string that includes namespace and pod name
app.get( '/_cat/connection-string/:user', singleUserEndpoint );

// list of all containers
app.get( '/users', userEndpoint );
app.get( '/apps', appEndpoint );
app.get( '/v1/pods', getPods );
app.delete( '/flushFirebaseContainers', flushFirebaseContainers );
app.use(singleEndpoint);

app.listen(process.env.NODE_PORT || 8080, '0.0.0.0', serverOnline )

/**
 *
 * curl localhost:8080/users/
 *
 * @param req
 * @param res
 */
function userEndpoint( req, res ) {

  res.send({items:app.get('sshUser')});

}

/**
 *
 * curl localhost:7010/v1/pods
 * @param req
 * @param res
 */
function getPods( req, res ) {
  debug( 'getPods', req.url );

  request({
    url: process.env.KUBERNETES_CLUSTER_ENDPOINT + '/api/v1/namespaces/' + process.env.KUBERNETES_CLUSTER_NAMESPACE + '/pods',
    strictSSL: false,
    headers: {
      'Authorization': 'Bearer ' + process.env.KUBERNETES_CLUSTER_USER_TOKEN
    }
  }, function haveResponse( error, resp, body ) {
    res.send(body);
  });

}

/**
 * Remove old containers. This is a hack in case we run out of memory again.
 *
 * curl -XDELETE localhost:8080/flushFirebaseContainers
 *
 */
function flushFirebaseContainers( req, res ) {

  var _containerCollection = utility.getCollection( 'container', '', function( error, data ) {

    _containerCollection.remove();

    res.send({
      ok: false,
      message: "Flushing containers not fully implemented, come find me."
    });
  });


}

function appEndpoint( req, res ) {

  res.send({items:_.map(app.get('sshUser'), function( someUser ) {
    return {
      _id: someUser._id,
      sshUser: _.get( someUser, 'meta.sshUser' ),
      connectionString: [ 'ssh ', _.get( someUser, 'meta.sshUser' ), '@ssh.rabbit.ci' ].join( '' ),
      pod: _.get( someUser, 'metadata.labels', {} )['io.kubernetes.pod.name'],
    }
  })});

}

/**
 *
 *
 * @param req
 * @param res
 */
function singleUserEndpoint( req, res ) {

  var _result = _.find( app.get('sshUser'), function( someUser ) {

    var _ssh = _.get( someUser, 'metadata.labels', {} )['ci.rabbit.ssh.user'];
    var _pod = _.get( someUser, 'metadata.labels', {} )['io.kubernetes.pod.name'];

    if( _ssh === req.params.user ) {
      return true;
    }

    if( _pod === req.params.user ) {
      return true;
    }

  });

  if( !_result ) {
    res.set( 404 );
  }

  var _connection_string = [];

  if( _result ) {

    _connection_string = [
      "-n",
      _.get( _result, 'metadata.labels', {} )['io.kubernetes.pod.namespace'],
      'exec ',
      _.get( _result, 'metadata.labels', {} )['io.kubernetes.pod.name']
    ]

  }

  res.send(_connection_string.join(" "))
}

function singleEndpoint( req, res ) {
  console.log( 'default', req.url );
  res.send('ok!');
}

function serverOnline( ) {
  console.log('rabbit-ssh-server online!');

  var sshUser = app.get('sshUser') || {};


  if( process.env.SERVICE_ENABLE_FIREBASE === 'true' ) {

    var _collection = utility.getCollection('container', 'meta/sshUser', function (error, data) {

      app.set('sshUser', utility.parseContainerCollection(data));

    });

    _collection.once('child_added', function (data) {

      data = utility.parseContainerCollection(data.val());

      if (!data) {
        return;
      }

      return;

    });

    _collection.on('child_changed', function (data) {
      sshUser[_.get(data.val(), '_id')] = data.val();
    });

    _collection.on('child_removed', function (data) {
      delete sshUser[_.get(data.val(), '_id')];
    });

  }

  // detect non-kubernetes
  if( process.env.KUBERNETES_CLUSTER_ENDPOINT ) {

    utility.updateKeys({
      keysPath: '/etc/ssh/authorized_keys.d',
      passwordFile: '/etc/passwd',
      passwordTemplate: 'alpine.passwords'
    }, function keysUpdated( error, data ) {
      console.log( 'Updated state with [%s] SSH keys.', error || _.size( data.users ) );
      app.set('sshUser', data.users );
    })

  }

  if( process.env.SLACK_NOTIFICACTION_URL ) {

    request({
      method: 'POST',
      url: process.env.SLACK_NOTIFICACTION_URL,
      json: true,
      body: {
        channel: process.env.SLACK_NOTIFICACTION_CHANNEL,
        username: 'Rabbit/SSH',
        text: "Container " + (process.env.HOSTNAME || process.env.HOST) + " is up. ```kubectl -n rabbit-system logs -f " + (process.env.HOSTNAME || process.env.HOST) + "```"
      }
    })
  }

}