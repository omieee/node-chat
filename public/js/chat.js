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
const snd = new Audio("/audio/ring.wav");

var isChannelReady = true;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
var room = roomname;

var pcConfig = {
    'iceServers': [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'turn:turn.twicahut.com:3478?transport=tcp',
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
var localVideo = undefined
var remoteVideo = undefined

function gotStream(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideo.volume = 0
    //sendMessage('got user media');
    if (isInitiator) {
        maybeStart();
    }
}

function ring() {
    snd.play();
}

function ringstop() {
    try {
        snd.pause();
        snd.currentTime = 0;
    }
    catch { }
}

function resizeScreens() {
    // document.getElementById("localVideo").width = "320";
    // document.getElementById("localVideo").height = "180";
    // document.getElementById("localVideo").style.right = "100%"; 
    // document.getElementById("localVideo").style.top = "10px"; 
    // document.getElementById("localVideo").style.marginRight= "10px";
}
var qvgaConstraints = {
    audio: true,
    video: {
        mandatory: {
            maxWidth: 320,
            maxHeight: 180
        }
    }
};

var vgaConstraints = {
    audio: true,
    video: {
        mandatory: {
            maxWidth: 640,
            maxHeight: 360
        }
    }
};

var hdConstraints = {
    audio: true,
    video: {
        mandatory: {
            minWidth: 1280,
            minHeight: 720
        }
    }
};
function getMedia(constraints) {
    if (window.stream) {
        video.src = null;
        window.stream.getVideoTracks()[0].stop();
    }
    navigator.mediaDevices.getUserMedia(
        constraints
    ).then(gotStream)
        .then(socket.emit('create_or_join', room))
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.toString());
        });
}
$(document).on('shown.bs.modal', '#callModal', function () {
    localVideo = document.querySelector('#localVideo');
    remoteVideo = document.querySelector('#remoteVideo');
    getMedia(hdConstraints)
})

$(document).on('shown.bs.modal', '#ringModal', function () {
    document.querySelector('#joinCall').addEventListener('click', () => {
        $("#ringModal").modal("hide");
    })

    document.querySelector('#rejectCall').addEventListener('click', () => {
        $('#ringModal').modal('hide')
    })
});


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
            console.log("Came Inside It Should Call")
            socket.emit('call-initiated')
        }
    }
}

window.onbeforeunload = function () {
    sendMessage('bye');
};


///////////// SOME MEGA CODE ... 
function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
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
        onCreateSessionDescriptionError,
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

function handleRemoteStreamAdded(event) {
    ringstop();
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
    resizeScreens();
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
    hangup();
}

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye');
    $('#callModal').modal('hide')
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
    $('#callModal').modal('hide')
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
    socket.emit('message-for-video', message);
}

// This client receives a message
socket.on('message-back', function (message) {
    console.log('Client received message:', message);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message))
        doAnswer()
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
    }
});


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
        location.href = 'https://twicahut.com'
    }
})

/*
FOR CALL EVENTS
*/
// if (room !== '') {
//     socket.emit('create_or_join', room);
//     console.log('Attempted to create or  join room', room);
// } else {
//     console.log("room", room)
// }

// socket.on('created', function (room) {
//     console.log('Created room ' + room);
//     isInitiator = true;
// });

socket.on('init-call', () => {
    console.log("Initiator Started The Call")
    isInitiator = true;
})


socket.on('join', function (room) {
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');
    isChannelReady = true;
});

socket.on('joined', function (room) {
    console.log('joined: ' + room);
    isChannelReady = true;
});

socket.on('log', function (array) {
    console.log.apply(console, array);
});
socket.on('ring', () => {
    ring();
    $("#ringModal").modal();
})
$(document).on('hide.bs.modal', '#ringModal', function (e) {
    ringstop();
    console.log(e.relatedTarget)
    var rejectcall = $(e.relatedTarget).is("#rejectCall");
    console.log("reject", rejectcall)
    if(rejectcall === true) {
        console.log("true")
    } else {
        console.log("false")
        $("#callModal").modal();
    };
})

document.querySelector('#startcall').addEventListener('click', () => {
    socket.emit('initiate-call')
    isInitiator = true
})