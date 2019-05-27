/**
 * node opt/firebase.consume.js
 *
 * @type {admin}
 */
//var newrelic = require('newrelic')
var admin = require("firebase-admin/lib/index");
var request = require( 'request' );
var execFile = require( 'child_process' ).execFile;
var request = require( 'request' );
var async = require( 'async' );
var _ = require( 'lodash' );
var controllerKeys = require( './controller.keys' );

exports.changeQueue = [];

var firebaseConfig = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY.split('\\n' ).join( '\n' ),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: 'https://rabbit-v2.firebaseio.com'
});

var deploymentCollection = admin.database().ref('deployment');

// once initial data is loaded.
deploymentCollection.once('value', haveInitialData );

function haveInitialData( snapshot ) {
  console.log('haveInitialData - Have initial data with [%d] documents.', _.size( snapshot.val() ) );

  //console.log(require('util').inspect(snapshot.toJSON(), {showHidden: false, depth: 2, colors: true}));
  //process.exit();
  updateKeys( snapshot );

}

// do not use child_added or it'll iterate over every single one
deploymentCollection.on('child_changed', addtToChangeQueue );

function addtToChangeQueue( data ) {
  console.log('addtToChangeQueue', _.size( data.val( ) ) );

  exports.changeQueue.push( data );
}

/**
 * Ran on initial load as well.
 *
 * @param data
 */

/**
 * If have items in changeQueue, run once first payload from first item.
 */
function maybeUpdateKeys() {
  console.log( 'maybeUpdateKeys - ', _.size( exports.changeQueue ) );


  if( _.size( exports.changeQueue ) > 0 ) {
    console.log( 'maybeUpdateKeys - have keys' );
    updateKeys(_.first(exports.changeQueue));
    exports.changeQueue = [];

  } else {
    console.log( 'maybeUpdateKeys - skip' );
  }

}

// Check every 30s
setInterval(maybeUpdateKeys,30000);

function deploymnetRemoved(data) {
  // console.log('child_removed', require('util').inspect(data.val(), {showHidden: false, depth: 2, colors: true}));
};


