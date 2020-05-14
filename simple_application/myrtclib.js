var	RTCPeerConnection	=	null;
var	room	=	null;
var	initiator;
var	pc	=	null;
var	signalingURL;

/*The	following	variable	will	be	used	for	handling	the	data	channel	object*/
var	data_channel	=	null;
var	channelReady;
var	channel;
//var	pc_config	=	{"iceServers":[{url:'stun:23.21.150.121'}, {url:'stun:stun.l.google.com:19302'}]};

/*Here, configuration is  an  entity  that  contains  different options for creating  peer
connection  object. T o utilize your  freshly installed STUN  server ,  you should  use
something like  the following code:*/
var pc_config = {'iceServers': [{'url':  'stun:stun.myserver.com:3478'}]}


function	myrtclibinit(sURL)	{
  signalingURL	=	sURL;
  openChannel();
};


function	openChannel()	{
  channelReady	=	false;
  channel	=	new	WebSocket(signalingURL);
  channel.onopen	=	onChannelOpened;
  channel.onmessage	=	onChannelMessage;
  channel.onclose	=	onChannelClosed;
};


function	onChannelOpened()	{
  channelReady	=	true;
  createPeerConnection();
  if(location.search.substring(1,5)	==	"room")	{
    room	=	location.search.substring(6);
    sendMessage({"type"	:	"ENTERROOM",	"value"	:	room	*	1});
    initiator	=	true;
    doCall();
  }	else	{
    sendMessage({"type"	:	"GETROOM",	"value"	:	""});
    initiator	=	false;
  }
};


function	onChannelMessage(message)	{
  processSignalingMessage(message.data);
};


function	onChannelClosed()	{
  channelReady	=	false;
};


function	sendMessage(message)	{
  var	msgString	=	JSON.stringify(message);
  channel.send(msgString);
};


/*Assuming	that	we	will	use	WebSockets	as	a	transport	protocol	for	exchanging	data	with
signaling	server ,	every	client	application	should	have	a	function	to	process	messages
coming	from	the	server .	In	general,	it	looks	as	follows*/
/*function	processSignalingMessage(message)	{
  var	msg	=	JSON.parse(message);
  if	(msg.type	===	'offer')	{
    pc.setRemoteDescription(new	RTCSessionDescription(msg));
    doAnswer();
  }	else	if	(msg.type	===	'answer')	{
    pc.setRemoteDescription(new	RTCSessionDescription(msg));
  }	else	if	(msg.type	===	'candidate')	{
    var	candidate	=	new	RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
    pc.addIceCandidate(candidate);
  }	else	if	(msg.type	===	'GETROOM')	{
    room	=	msg.value;
    onRoomReceived(room);
  }	else	if	(msg.type	===	'WRONGROOM')	{
    window.location.href	=	"/";
  }
};*/
function  processSignalingMessage(message)  {
  var msg = JSON.parse(message);
  if (msg.type === 'CHATMSG') {
    onChatMsgReceived(msg.value);
  } else if (msg.type === 'offer')  {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
  } else  if  (msg.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
  } else  if  (msg.type === 'candidate')  {
    var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
    pc.addIceCandidate(candidate);
  } else  if  (msg.type === 'GETROOM')  {
    room  = msg.value;
    onRoomReceived(room);
  } else  if  (msg.type === 'WRONGROOM')  {
    window.location.href  = "/";
  }
};


/*create	a	peer	connection	object*/
function	createPeerConnection()	{
  try	{
    pc	=	new	RTCPeerConnection(pc_config,	null);
    pc.onicecandidate	=	onIceCandidate;

    /*We will set up a handler for the ondatachannel event of the PeerConnection object.	This callback function will	be called
    when the peer asks us to create	a data channel and establish a data connection*/
    pc.ondatachannel	=	onDataChannel;
  }	catch	(e)	{
    console.log(e);
    pc	=	null;
    return;
  }
};


/*We will store	the	reference in the data channel and initialize it*/
function	onDataChannel(evt)	{
  console.log('Received	data	channel	creating	request');
  data_channel	=	evt.channel;
  initDataChannel();
}


/*By	initializing	the	data	channel,	I	mean	setting	up	a	channel’ s	event	handlers*/
function	initDataChannel()	{
  data_channel.onopen	=	onChannelStateChange;
  data_channel.onclose	=	onChannelStateChange;
  data_channel.onmessage	=	onReceiveMessageCallback;
}


/*In	the	following	function,	we	need	to	create	a	new	data	channel—not	when	the	remote
peer	is	asking	us,	but	when	we’re	the	initiator	of	the	peer	connection	and	want	to	create	a
new	data	channel.	After	we	have	created	a	new	data	channel,	we	should	ask	the	remote
peer	to	do	the	same*/
function	createDataChannel(role)	{
  try	{
  	/*When	we	create	a	new	data	channel,	we	can	set	up	a	name	of	the	channel.	In	the	following
    piece	of	code,	we	will	use	the	number	of	the	virtual	room	to	name	the	channel*/
	data_channel	=	pc.createDataChannel("datachannel_"+room+role, null);
  }	catch	(e)	{
    console.log('error	creating	data	channel	'	+	e);
    return;
  }
  initDataChannel();
}

onChatMsgReceived
function	onIceCandidate(event)	{
  if	(event.candidate)
    sendMessage({type:	'candidate',	label: event.candidate.sdpMLineIndex,	id:	event.candidate.sdpMid,	candidate:event.candidate.candidate});
};


function	failureCallback(e)	{
  console.log("failure	callback	"+	e.message);
}


function	doCall()	{
  /*When	we	are	playing	the	role	of	the	connection	initiator	(caller),	we	create	a	new	data
  channel.	Then,	during	the	connection	establishment,	the	remote	peer	will	be	asked	to	do
  the	same	and	the	data	channel	connection	will	be	established*/
  createDataChannel("caller");
  pc.createOffer(setLocalAndSendMessage,	failureCallback,	null);
};


function	doAnswer()	{
  pc.createAnswer(setLocalAndSendMessage,	failureCallback,	null);
};


/*The	setLocalAndSendMessage	function	sets	the	local	session	description	and	sends	it	back
to	the	signaling	server .	This	data	will	be	sent	as	an	answer	type	of	message,	and	then	the
signaling	server	will	route	this	message	to	the	caller*/
function	setLocalAndSendMessage(sessionDescription)	{
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
};


/*To send text messages	via	the	data	channel, we	need to	implement the appropriate
function.	As	you	can	see	in	the	following	code, sending data to the data channel is pretty easy*/
function	sendDataMessage(data)	{
  data_channel.send(data);
};


/*The	following	handler	is	necessary	to	print	the	state	of	the	data	channel	when	it	is changed*/
function	onChannelStateChange()	{
  console.log('Data	channel	state	is:	'	+	data_channel.readyState);
}


/*When	the	remote	peer	sends	us	a	message	via	the	data	channel,	we	will	parse	it	and	call
the	appropriate	function	to	show	the	message	on	the	web	page*/
function	onReceiveMessageCallback(event)	{
  console.log(event);
  try	{
    var	msg	=	JSON.parse(event.data);
    if	(msg.type	===	'chatmessage')
      onPrivateMessageReceived(msg.txt);
    }
  catch	(e)	{}
};