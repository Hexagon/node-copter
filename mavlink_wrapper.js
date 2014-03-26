var SerialPort = require('serialport').SerialPort,
	mavlink = require('mavlink');

module.exports = {
	Init: function(sport,baud,readyfunc) {
		var me = this;
		me.port = new SerialPort(sport, {
			baudrate: baud
		});
		me.port.on('open', function() {
			console.log("Serial Port is ready");
			me.m = new mavlink(1,1);
			me.m.on('ready', function() {
				console.log("Mavlink is ready!");
				me.port.on('data', function(data) {
					me.on_raw(data);
					me.m.parse(data);
				});
				me.m.createMessage("REQUEST_DATA_STREAM", {
					'req_message_rate': 2,
					'req_stream_id': 0,
					'start_stop': 1,
					'target_system': 1,
					'target_component': 0,
				}, function(message) {
					me.port.write(message.buffer);
				});
				readyfunc();
			});
		});
	},
	on_raw: function(data) {},
	send_raw: function(data) {
		this.port.write(data);
	}
};
