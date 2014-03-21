// Include node.js modules
var fs = require('fs')
  , socketio = require('socket.io')
  , path = require('path')

  // Include copter.js modules
  , server = require('./server.js')
  , datasource = require('./datasource.js')
  , mavlink_wrapper = require('./mavlink_wrapper.js')
  , crc32 = require('./crc32.js')

  // Include configuration
  , config = require('./config.json');

console.log('Initiating datasource ...');
datasource.Init(function()  {

	console.log('Initiating mavlink ...');
	mavlink_wrapper.Init(config.mavlink.port,config.mavlink.baudrate,
		/* mavlink ok */
		function() {

			console.log('Initiating websockets ...');

		    // Start listening, disable on screen logging
		    var io = socketio.listen(server).set('log level', 0);

		    // On connection callback
		    io.on('connection', function (socket) {

		    	// On incoming message callback (has currently no use)
				socket.on('message', function (data) {});

				// Handle socket.io errors
				socket.on('error', function (err) {
					console.log('Socket.io connection error: ' + err.errno);
				});

		    });

			// Sign up for continous messages
			var listen_for = ['HEARTBEAT'];
			listen_for.forEach(function(item) { 
				console.log('Listening for ' + item);
				mavlink_wrapper.m.on(item,function(message,fields) {
					var fieldstring = JSON.stringify(fields);
        			io.sockets.emit(item,fieldstring);
        		});
			});

			// Sign up for some messages with checksum restriction
			var listen_for_restricted = ['GPS_RAW_INT','ATTITUDE','VFR_HUD'],
				listen_for_restricted_array = new Array();
			listen_for_restricted.forEach(function(item) { 
				console.log('Listening for ' + item);
				mavlink_wrapper.m.on(item,function(message,fields) {
					var fieldstring = JSON.stringify(fields)
						,checksum = crc32.crc32(fieldstring);
					if(listen_for_restricted_array[item]!=checksum) {
						listen_for_restricted_array[item] = checksum;
						io.sockets.emit(item,fieldstring);
					}
        		});
			});

		    // Handle socket.io errors
		    io.on('error', function (err) {
		      console.log('Socket.io Error: ' + err.errno);
		    });

		},
		/* mavlink error */
		function() {
			console.log('Mavlink connection error')
		}
	);
});