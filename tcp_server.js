net = require('net');

module.exports = {
  received: function(data) {},
  Init: function(tcp_port,readyfunc) {
    var this_ref = this;
    console.log(this);
    this.clients = [];
    net.createServer(function (socket) {

      socket.name = socket.remoteAddress + ":" + socket.remotePort 
      this_ref.clients.push(socket);

      socket.on('data', function (data) {
        this_ref.received(data);
      });

      socket.on('end', function () {
        this_ref.clients.splice(this_ref.clients.indexOf(socket), 1);
      });

    }).listen(5000,readyfunc());
  },
  broadcast: function(message, sender) {
    this.clients.forEach(function (client) {
      if (client === sender) return;
      client.write(message);
    });
  }
};