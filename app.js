var port = process.env.PORT || 3000,
    server   = require('http').createServer(),
    io       = require('socket.io').listen(server),
    users = {}, socks = {}, visitantes = 0;

function Uid() { this.id = ++Uid.lastid; }

Uid.lastid = 0;

//Handle users
io.sockets.on('connection', function (socket) {
  //add visitantes
  visitantes++;

  // Event received by new user
  socket.on('join', function (recv, fn) {

    if (!recv.user) {
      socket.emit('custom_error', { message: 'User not found or invalid' });
      return;
    }

    // The user is already logged
    if (users[recv.user]) {
      socket.emit('custom_error', { message: 'The user '+ recv.user +' is already logged' });
      return;
    }

    // If there is users online, send the list of them
    if (Object.keys(users).length > 0)
      socket.emit('chat', JSON.stringify( { 'action': 'usrlist', 'user': users } ));

    // Set new uid
    uid = new Uid();
    socket.user = recv.user;

    // Add the new data user
    users[socket.user] = {'uid': Uid.lastid, 'user': socket.user, 'name': recv.name, 'status': 'online'}
    socks[socket.user] = {'socket': socket}

    // Send to me my own data to get my avatar for example, usefull in future for db things
    //socket.emit('chat', JSON.stringify( { 'action': 'update_settings', 'data': users[socket.user] } ));

    // Send new user is connected to everyone
    socket.broadcast.emit('chat', JSON.stringify( {'action': 'newuser', 'user': users[socket.user]} ));

    if (typeof fn !== 'undefined')
      fn(JSON.stringify( {'login': 'successful', 'my_settings': users[socket.user]} ));
  });

  // Event received when user want change his status
  socket.on('user_status', function (recv) {
    if (users[socket.user]) {
      users[socket.user].status = recv.status;
      socket.broadcast.emit('chat', JSON.stringify( {'action': 'user_status', 'user': users[socket.user]} ));
    }
  });

  // Event received when user is typing
  socket.on('user_typing', function (recv) {
    var id = socks[recv.user].socket.id;
    io.sockets.socket(id).emit('chat', JSON.stringify( {'action': 'user_typing', 'data': users[socket.user]} ));
  });

  // Event received when user has disconnected
  socket.on('disconnect', function () {
    if (users[socket.user]) {
      socket.broadcast.emit('chat', JSON.stringify( {'action': 'disconnect', 'user': users[socket.user]} ));
      delete users[socket.user];
      delete socks[socket.user];
      visitantes--;
    }
  });
});

//Listen to the server port
server.listen(port, function () {
  var addr = server.address();
  console.log('Server running on ' + addr.address + addr.port);
});