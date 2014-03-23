// Include node.js modules
var fs = require('fs')
  , socketio = require('socket.io')
  , path = require('path')
  , cp = require('child_process')

  // Include copter.js modules
  , server = require('./server.js')
  , datasource = require('./datasource.js')
  , mavlink_wrapper = require('./mavlink_wrapper.js')
  , crc32 = require('./crc32.js')
  , tcp_server = require('./tcp_server.js')
  , udp_server = require('./udp_server.js')

  // Include configuration
  , config = require('./config.json');

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return ''+year+month+day+hour+min+sec;

}

var video_process=null;

console.log('Initiating datasource ...');
datasource.Init(function()  {

	console.log('Initiating mavlink ...');
	mavlink_wrapper.Init(config.mavlink.port,config.mavlink.baudrate,
		/* mavlink ok */
		function() {

			// Create TCP server
			var tcp_done_func = function() {
				var udp_done_func = function() {

				    // Relaying stuff
				    if(config.udp_relay.enable||config.tcp_relay.enable) {
					    mavlink_wrapper.on_raw = function(data){
					    	if(config.tcp_relay.enable) tcp_server.broadcast(data);
					    	if(config.udp_relay.enable) udp_server.broadcast(data);
					    };
					}
				    tcp_server.received = function(data){
				    	mavlink_wrapper.send_raw(data);
				    };
				  	udp_server.received = function(data){
				    	mavlink_wrapper.send_raw(data);
				    };

					console.log('Initiating websockets ...');

				    // Start listening, disable on screen logging
				    var io = socketio.listen(server).set('log level', 0);

				    // On connection callback
				    io.on('connection', function (socket) {

				    	// On incoming message callback (has currently no use)
						socket.on('gui_reboot', function (data) {
							console.log('gui_reboot');
							socket.emit('gui_rebooting');
						});

						// Handle video recording
						socket.on('gui_record', function (data) {
							if(video_process) {
								// Kill
								video_process.kill('SIGUSR1'); // End video
								setTimeout(function(){
								    if(video_process)video_process.kill('SIGHUP'); // One more is needed sometimes
								}, 1000);
							} else {
								// Star
								config.video.cmd_start_options.pop();
								config.video.cmd_start_options.push(config.video.video_dir+getDateTime()+'.h264');
								video_process = cp.spawn(config.video.cmd_start_record,config.video.cmd_start_options);
								socket.emit('gui_recording');
								video_process.on('close', function (code) {
									socket.emit('gui_recording_end');
									video_process = null;
								});
							}
						});

						// Send initial recording state
						if(video_process) {
							socket.emit('gui_recording');
						} else {
							socket.emit('gui_recording_end');
						}

						socket.on('disk_usage', function (data) {
							cp.exec("df / | grep \"/\" | tr -s \" \" | cut -d\" \" -f5", function(error, stdout, stderr){ 
								socket.emit('disk_usage_result',stdout);
							});
						});

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
					var listen_for_restricted = ['GPS_RAW_INT','ATTITUDE','VFR_HUD','GPS_GLOBAL_ORIGIN'],
						listen_for_restricted_array = new Array();
					listen_for_restricted.forEach(function(item) { 
						console.log('Listening for ' + item);
						mavlink_wrapper.m.on(item,function(message,fields) {
							var fieldstring = JSON.stringify(fields)
								,checksum = crc32.crc32(fieldstring);
							if(listen_for_restricted_array[item]!=checksum) {
								if(listen_for_restricted_array[item]==undefined) {
									console.log('New mtype: ' + item);
								}
								listen_for_restricted_array[item] = checksum;
								io.sockets.emit(item,fieldstring);
							}
		        		});
					});

				    // Handle socket.io errors
				    io.on('error', function (err) {
				      console.log('Socket.io Error: ' + err.errno);
				    });
				};
				
				if(config.udp_relay.enable) {
					console.log('Initiating UDP server ...');
					udp_server.Init(config.udp_relay.port,config.udp_relay.host,udp_done_func);
				} else {
					udp_done_func();
				}
			};
			if(config.tcp_relay.enable) {
				console.log('Initiating TCP server ...');
				tcp_server.Init(config.tcp_relay.port,tcp_done_func);
			} else {
				tcp_done_func();
			}
		},
		/* mavlink error */
		function() {
			console.log('Mavlink connection error')
		}
	);
});