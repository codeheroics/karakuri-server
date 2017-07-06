const Mplayer = require('mplayer')
const fs = require('fs')
const m3u = require('m3u')
const moment = require('moment')
const { notifyPlaylist } = require('./websockets')

let mplayer
let contents = []
let playingContent
const users = []

const createNewPlaylistFile = (previousTriesNb = 0) => {
  let playlistName = moment().format('YYYY-MM-DD')
  if (previousTriesNb) playlistName += `-${previousTriesNb}`
  // Try accessing a file with the planned playlist filename.
  // If it exists, then find another name.
  try {
    fs.accessSync(`${playlistName}.m3u`, fs.F_OK)
    return createNewPlaylistFile(previousTriesNb + 1)
  } catch (e) {
    return `${playlistName}.m3u`
  }
}
const playlistName = createNewPlaylistFile()

const getPlaylist = () => ({ playingContent, playlistContents: contents })
const setPlaylist = elements => (contents = [...elements])
const addToPlaylist = ({ content, username }) => {
  contents.push(Object.assign({}, content, { username }))
  if (users.find(({ name }) => username === name)) return
  users.unshift({ name: username })
}
const saveToM3uPlaylist = (content) => {
  const m3uWriter = m3u.writer()
  m3uWriter.file(content.path)
  fs.appendFileSync(playlistName, m3uWriter.toString(), { encoding: 'utf8' })
}

// TODO save username for each song in the comments, so we can load from an m3u file
// to the app after a crash and resume the fun
const loadPlaylist = (filepath, allContents) => {
  const filePaths = fs.readFileSync(filepath, { encoding: 'utf8' })
    .split('\n')
    .filter(filePath => !filePath.startsWith('#')) // Comments in m3u files start with #

  setPlaylist(allContents.filter(content => filePaths.includes(content.path)))
}

const setUserPlaylist = (username, newContents) => {
  contents = contents.filter(content => content.username !== username)
  newContents.forEach(content => addToPlaylist({ content, username }))
  notifyPlaylist(getPlaylist())
}

const randomizeUserPlaylist = username => (
  contents = contents.filter(content => content.username !== username).concat(
    contents.filter(content => content.username === username).sort(() => 0.5 - Math.random())
  )
)
const pause = () => mplayer.pause()
const getPlayingContent = () => playingContent

const playNext = () => {
  if (playingContent) return
  let content
  for (const { name } of [...users]) { // loop on clone as we'll change the original
    content = contents.find(({ username }) => username === name)
    users.push(users.shift()) // update users order for next time
    if (content) break
  }
  playingContent = content
  notifyPlaylist(getPlaylist())

  if (!content) return
  saveToM3uPlaylist(content)
  mplayer.openFile(content.path)
}
const initPlayer = options => {
  mplayer = new Mplayer(options)
  mplayer.on('stop', () => {
    contents = contents.filter(({ id }) => id !== playingContent.id)
    playingContent = null
    notifyPlaylist(getPlaylist())
    playNext()
  })
}

module.exports = {
  getPlaylist,
  setPlaylist,
  addToPlaylist,
  saveToM3uPlaylist,
  loadPlaylist,
  setUserPlaylist,
  randomizeUserPlaylist,
  pause,
  playNext,
  initPlayer,
  getPlayingContent,
}
