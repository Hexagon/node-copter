var dgram = require('dgram')
    ,server = dgram.createSocket('udp4')

    // Include configuration
    , config = require('./config.json');

module.exports = {
  received: function(data) {},
  Init: function(udp_port,udp_host,readyfunc) {
    var this_ref = this;
    this.udp_port = udp_port;
    this.udp_host = udp_host;

    server.on('listening', function () {
        var address = server.address();
        console.log('UDP Server listening on ' + address.address + ":" + address.port);
    });

    server.on('message', function (message, remote) {
        this_ref.received(message);
    });

    server.bind(udp_port, '0.0.0.0');

    readyfunc();

  },
  broadcast: function(message) {
    server.send(message, 0, message.length, this.udp_port, this.udp_host);
  }
};




