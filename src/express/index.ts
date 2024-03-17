import { log } from '@/settings';
import ck from 'chalk';
import express from 'express';
import * as http from 'http';
import { Server } from 'socket.io';
import { join } from 'path'

export function startExpress() {
    const app = express()
    const server = http.createServer(app)
    
   const ioServer = new Server(server)
    
   ioServer.on('connection', (socket) => {
        console.log('User Connect')
        socket.on('audioStream', (audioData) => {
            console.log(audioData)
            socket.broadcast.emit('audioStream', audioData)
        })

        socket.on('disconnect', (socket) => {
            console.log(socket)
        })
    })

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/index.html')
    })

    server.listen(3000, () => {
        log.success(ck.green('Listen on http://localhost:3000'));
    })
}