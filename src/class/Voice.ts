import { OpusEncoder } from '@discordjs/opus'
import { EndBehaviorType, VoiceConnection } from '@discordjs/voice'
import { VoiceState } from 'discord.js'
import { createWriteStream } from 'fs'
import { pipeline, PassThrough } from 'node:stream'
import prism from 'prism-media'
import { io } from 'socket.io-client'
import ffmpeg from 'fluent-ffmpeg';

interface ConstructorProps {
    state: VoiceState
    connection: VoiceConnection
}

export class VoiceTransmitter {
    private readonly receiver
    private readonly speakers
    private readonly encoder
    private readonly userId

    constructor({ state, connection }: ConstructorProps) {
        this.receiver = connection.receiver
        this.userId = state.id
        this.speakers = new Set()
        this.encoder = new OpusEncoder(48000, 2)

        // Removemos os ouvintes para utilizar a nossa própria função.
        this.receiver.speaking.removeAllListeners()
        this.receiver.speaking.on('start', () => this.listen())
        this.speakers.add(this.userId)
    }

    async socket() {
        return io('http://localhost:3000', {
            transports: ['websocket'],
            upgrade: false
        });
    }

    opusStream() {
        return this.receiver.subscribe(this.userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 50
            }
        })
    }

    async listen() {
        const passThroughStream = new PassThrough({ allowHalfOpen: false });
        const socket = await this.socket()
        const opusStream = this.opusStream()

        const opusDecoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 2,
            rate: 48000,
          });


        const filename = `./recordings/${this.userId}_${Date.now()}.pcm`;
        const outFile = createWriteStream(filename, { flags: 'a' })

        socket.on('connect', () => {
            console.log(`👂 Started Sending audio by ${this.userId}`);
        })

        pipeline(opusStream, opusDecoder, outFile, (err) => {
            if (err) {
                console.warn(`❌ Error recording file ${filename} - ${err.message}`);
            } else {
                console.log(`✅ Recorded ${filename}`);
            }
        })

        opusStream.once('data', (chunk) => {
            ffmpeg(chunk)
                .inputOptions(['-f s16le', '-ar 48000', '-ac 2'])
                .outputFormat('mp3')
                .output(passThroughStream)
                .run();
            socket.emit('audioStream', passThroughStream)
        })

        opusStream.on('error', (error: Error) => {
            console.error(error, `Error while recording voice for user ${this.userId}`);
        });

        opusStream.once('end', async () => {   
            socket.disconnect()
            this.speakers.delete(this.userId)
        })
    }
}