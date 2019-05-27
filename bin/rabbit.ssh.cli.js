#!/usr/local/bin/node

/**
 *
 * node opt/rabbit.ssh.cli
 *
 */
var utility = require( '../lib/utility' );
var dot = require( 'dot-object' );
var _ = require( 'lodash' );
var admin = utility.getFirebase();

utility.getCollection( 'container', 'meta/sshUser', function( error, data ) {

  _.each(data, function( singleItem ) {
    if (['kill', 'destroy', 'die', 'oom', 'stop' ].indexOf(singleItem.lastAction) >= 0) {
      return;
    }

    if( !_.find(singleItem.fields, { key: 'ci.rabbit.ssh.user'} ) ) {
      return;
    }

    if( !_.find(singleItem.fields, { key: 'git.name'} ) ) {
      return;
    }

    var _fields = {};

    _.each(singleItem.fields, function( item ) {
      _fields[ item.key ] = item.value;
    })

    singleItem.fields = dot.object(_fields);
    //console.log(require('util').inspect(singleItem, {showHidden: false, depth: 2, colors: true}));

    console.log( _.get(singleItem, 'fields.io.kubernetes.pod.namespace' ),_.get(singleItem, 'fields.io.kubernetes.pod.name' ), _.get(singleItem, 'fields.git.name' ),  _.get(singleItem, 'fields.git.branch' ),  _.get(singleItem, 'fields.ci.rabbit.ssh.user' ) )

    //process.exit();
  });

  process.exit();

})
console.log( "Rabbit SSH CLI" );

