const socket = io()

//Elements
$messages = document.querySelector('#messages')
$chatsidebar = document.querySelector('#chat__sidebar')

//Templates
$msg_template = document.querySelector('#message-template').innerHTML
$location_template = document.querySelector('#location-template').innerHTML
$sidebar_template = document.querySelector('#sidebar-template').innerHTML

//Query String parse
const {username, roomname} = Qs.parse(location.search, {ignoreQueryPrefix: true})

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

    if(conatinerHeight - newMsgHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
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

socket.on('userlist', ({roomname, members}) => {
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

socket.emit('join', {username, roomname}, (error) => {
    if(error){
        alert(error)
        location.href = ''
    }
})