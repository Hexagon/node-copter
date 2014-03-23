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
  , helpers = require('./helpers.js')

  // Include configuration
  , config = require('./config.json');



var video_process=null;
var time_unix_usec=0;

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
								config.video.cmd_start_options.push(config.video.video_dir+helpers.getDateTime()+'.h264');
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

						socket.on('request_videos', function (data) {
							fs.readdir('videos/', function(error, stdout){ 
								socket.emit('videos_result',stdout);
							});
						});

						socket.on('request_logs', function (data) {
							fs.readdir('db/', function(error, stdout){ 
								socket.emit('logs_result',stdout);
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
					mavlink_wrapper.m.on('RAW_IMU',function(message,fields) {
						// Always keep track of current usec, used for synchronizing logs
						time_unix_usec = fields.time_usec;
	        		});

					// Sign up for some messages with checksum restriction and logging
					var listen_for_restricted = ['GPS_RAW_INT','ATTITUDE','VFR_HUD'],
						listen_for_restricted_array = new Array();
					listen_for_restricted.forEach(function(item) { 
						console.log('Listening for ' + item);
						mavlink_wrapper.m.on(item,function(message,fields) {

							var t_recv = time_unix_usec
								,fieldstring = JSON.stringify(fields)
								,checksum = crc32.crc32(fieldstring)
								,query_fields = ""
								,query_values = "";

							for (var key in fields) {
							   query_fields += key + ","
							   query_values += fields[key] + ","
							}	

							query_fields = query_fields.replace(/(\s+)?.$/, '');
							query_values = query_values.replace(/(\s+)?.$/, '');

							datasource.db.exec("INSERT INTO " + item + "(ref_usec," + query_fields + ") VALUES ("+t_recv+","+query_values+")");

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