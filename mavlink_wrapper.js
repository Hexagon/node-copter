var SerialPort = require('serialport').SerialPort,
	mavlink = require('mavlink');

module.exports = {
	Init: function(sport,baud,readyfunc) {
		var port = new SerialPort(sport, {
			baudrate: baud
		});
		port.on('open', function() {
			console.log("Serial Port is ready");
			this.m = new mavlink(1,1);
			this.m.on('ready', function() {
				console.log("Mavlink is ready!");
				port.on('data', function(data) {
					this.m.parse(data);
				}.bind(this));
				this.m.createMessage("REQUEST_DATA_STREAM", {
					'req_message_rate': 2,
	                'req_stream_id': 0,
	                'start_stop': 1,
	                'target_system': 1,
	                'target_component': 0,
				}, function(message) {
	           		port.write(message.buffer);
	        	});
				readyfunc();
			}.bind(this));
		}.bind(this));
	}
};
