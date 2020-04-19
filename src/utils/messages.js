const generateMessageBody = (username, message) => {
    return {
        username,
        message,
        createdAt: new Date().getTime()
    }
}

const generateLocationMessageBody = (username, url) => {
    return {
        username,
        url,
        createdAt: new Date().getTime()
    }
}

module.exports = {
    generateMessageBody,
    generateLocationMessageBody
}