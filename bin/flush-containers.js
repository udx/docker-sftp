/**
 * Flush Containers from Firebase
 *
 *
 * node bin/flush-containers.js
 *
 */
var utility = require( '../lib/utility' );
var _ = require( 'lodash' );

var _containerCollection = utility.getCollection( 'container', '', function( error, data ) {

  console.log("Get [%s] container item.", _.size(data) );

  _containerCollection.remove(function( error ) {

    if( !error ) {
      console.log( "Done flushing." );
    } else {
      console.error( "Error flushing" );
      console.log(require('util').inspect(error, {showHidden: false, depth: 2, colors: true}));
    }

    process.exit();

  });

});