const chalk = require('chalk')
const express = require('express')
const bodyParser = require('body-parser')
const { networkInterfaces: getNetworkInterfaces } = require('os')

const player = require('./lib/player')
const {
  addToPlaylist,
  savePlaylist,
  randomizePlaylist,
  getPlaylist,
  playNext,
  pause,
} = player

module.exports = ({ contents, port }) => {
  const app = express()
  app.use(bodyParser.json())
  app.get('/contents', (req, res) => res.json(contents))

  app.post('/request', (req, res) => {
    const id = parseInt(req.body.id, 10)
    const content = contents.find(c => c.id === id)
    if (!content) return res.status(404).json({ message: 'Not found' })
    const existingContent = getPlaylist().find(c => c.id === id)
    if (existingContent && !existingContent.played) {
      return res.send({ message: `${content.fileName} is already in playlist` })
    }
    addToPlaylist(content)
    savePlaylist()
    if (!player.isPlaying) playNext()
    res.send({ message: `${content.fileName} has been added` })
  })

  app.get('/playlist', (req, res) => res.json(getPlaylist()))

  app.get('/pause', (req, res) => {
    pause()
    res.send()
  })

  // TODO when the app will handle this, change to app.post
  app.all('/randomize', (req, res) => {
    randomizePlaylist()
    res.send({ message: 'randomized' })
  })

  app.listen(port, () => {
    const networkInterfaces = getNetworkInterfaces()
    const addresses = Object.keys(networkInterfaces).reduce((array, interfaceName) => (
      array.concat(...networkInterfaces[interfaceName])
    ), [])
      .filter(element => !element.internal && element.family === 'IPv4')
      .map(element => element.address)

    console.log('Karakuri listening at')
    addresses.forEach(address => console.log(chalk.bold(address)))
    console.log(`on port ${chalk.bold(port)}`)
  })
}