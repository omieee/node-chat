const users = []

const addUser = ({id, username, roomname}) => {
    //Clean
    username = username.trim().toLowerCase()
    roomname = roomname.trim().toLowerCase()
    //Validate
    if(!username || !roomname) {
        return {
            error: "Something like username and roomname are required"
        }
    }
    //Check for existing user
    const existinguser = users.find((user) => {
        return user.roomname === roomname && user.username === username
    })

    //Validate username
    if(existinguser) {
        return {
            error: "Username is already in use!"
        }
    }

    const user = {id, username, roomname}
    users.push(user)
    return {user}
}

const removeUser = (id) => {
    const index = users.findIndex((user) => {
        return user.id === id
    })
    if(index !== -1) {
        return users.splice(index, 1)[0]
    }
}

const getUser = (id) => {
    return users.find((user) => user.id === id)
}

const getUsersInRoom = (roomname) => {
    roomname = roomname.trim().toLowerCase()
    return users.filter((user) => user.roomname === roomname)
}

module.exports = {
    addUser,
    getUser,
    getUsersInRoom,
    removeUser
}