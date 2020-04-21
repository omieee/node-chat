const socket = io()

//Elements
$messages = document.querySelector('#messages')
$chatsidebar = document.querySelector('#chat__sidebar')

//Templates
$msg_template = document.querySelector('#message-template').innerHTML
$location_template = document.querySelector('#location-template').innerHTML
$sidebar_template = document.querySelector('#sidebar-template').innerHTML

//Query String parse
const { username, roomname } = Qs.parse(location.search, { ignoreQueryPrefix: true })

var isChannelReady = true;
var isInitiator = true;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
    'iceServers': [
      {
        'urls': 'stun:stun.l.google.com:19302'
      },
      {
        'urls': 'turn:turn.twicahut.com?transport=udp',
        'credential': 'itunes_01',
        'username': 'omieee'
      }
    ]
  }

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};

/////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');;

function gotStream(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    //sendMessage('got user media');
    if (isInitiator) {
        maybeStart();
    }
}

document.querySelector('#startcall').addEventListener('click' , () => {
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
      })
      .then(gotStream)
      .catch(function(e) {
        alert('getUserMedia() error: ' + e.name);
      });
})

if (location.hostname !== 'localhost') {
    requestTurn(
        'https://turn.twicahut.com'
    );
}

function maybeStart() {
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

window.onbeforeunload = function () {
    sendMessage('bye');
};


///////////// SOME MEGA CODE ... 
function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('OM OM Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log('End of candidates.');
    }
}

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
    var turnExists = false;
    for (var i in pcConfig.iceServers) {
        if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
            turnExists = true;
            turnReady = true;
            break;
        }
    }
    if (!turnExists) {
        console.log('Getting TURN server from ', turnURL);
        // No TURN server. Get one from computeengineondemand.appspot.com:
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var turnServer = JSON.parse(xhr.responseText);
                console.log('Got TURN server: ', turnServer);
                pcConfig.iceServers.push({
                    'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
                    'credential': turnServer.password
                });
                turnReady = true;
            }
        };
        xhr.open('GET', turnURL, true);
        xhr.send();
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye');
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
}

function stop() {
    isStarted = false;
    pc.close();
    pc = null;
}
///// SOME MEGA CODE ENDS  


//Autoscroll 
const autoscroll = () => {
    //Get Latest message element
    const $newMsgElement = $messages.lastElementChild

    //Height of new message
    const newMessageStyle = getComputedStyle($newMsgElement)
    const newMessageMargin = parseInt(newMessageStyle.marginBottom)
    const newMsgHeight = $newMsgElement.offsetHeight + newMessageMargin

    //Visible Height
    const visibleHeight = $messages.offsetHeight

    //Height of Message Container
    const conatinerHeight = $messages.scrollHeight

    //How far I have scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (conatinerHeight - newMsgHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

const emitMessagesForVideo = (msg) => {

}

function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('message', message);
}

socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render($msg_template, {
        username: message.username,
        message: message.message,
        createdAt: moment(message.createdAt).format('h:mm')
    })
    $messages.insertAdjacentHTML('beforeEnd', html)
    autoscroll()
})

socket.on('locationMessage', (location) => {
    const html = Mustache.render($location_template, {
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm')
    })
    $messages.insertAdjacentHTML('beforeEnd', html)
    autoscroll()
})

socket.on('userlist', ({ roomname, members }) => {
    const html = Mustache.render($sidebar_template, {
        roomname, members
    })
    $chatsidebar.innerHTML = html
})

$msgsendbutton = document.querySelector('#sendmessage')

document.querySelector('#messgeform').addEventListener('submit', (e) => {
    e.preventDefault()
    message = e.target.message.value
    if (message.length > 0) {
        $msgsendbutton.setAttribute('disabled', 'disabled')
        socket.emit('sendMessage', message, (badwords) => {
            $msgsendbutton.removeAttribute('disabled')
            e.target.message.value = ''
            e.target.message.focus()
            if (badwords) {
                return console.log(badwords)
            }
        })
    }
})

document.querySelector('#sendlocation').addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert("Location not supported by your browser")
    }
    document.querySelector('#sendlocation').setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position) => {
        let latlng = {
            'latitude': position.coords.latitude,
            'longitude': position.coords.longitude
        }
        socket.emit('sharelocation', latlng, () => {
            document.querySelector('#sendlocation').removeAttribute('disabled')
        })
    })
})

socket.emit('join', { username, roomname }, (error) => {
    if (error) {
        alert(error)
        location.href = ''
    }
})