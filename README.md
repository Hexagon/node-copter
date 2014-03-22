node-copter

===

node.js powered web-interface for your tri/quad/hexa/octa/helicopter. Socket.io makes communication silky smooth, even over 3g-link.

![node-copter web interface](/docs/screenshot-web.png)
![node-copter mobile interface](/docs/screenshot-mob.png)


Features

===

	* MAVLink connectivity (arducopter, megapirate)
	* TCP and UDP relaying of raw mavlink-packets
	* HTML5 interface
	* Raspberry pi camera support (start/stop recording)


Installation

===

Download tarball, extract to a spot that feels good, install node deps with `npm install`, copy config.json.template to config.json, edit to preferences, run copter.js!

Dependencies:
	mavlink
	socket.io
	sqlite3
	serialport

Start on boot: 
	copy docs/nodecopter.initscript to /etc/init.d/nodecopter
	edit DIR (working directory) USER (some user with write permissions in working directory) and DAEMON (usually have to include full path to node) in the new file
	sudo chmod +x /etc/init.d/nodecopter
	update-rc.d nodecopter defaults

