import { OpusEncoder } from '@discordjs/opus';
import { EndBehaviorType, VoiceConnection } from '@discordjs/voice';
import { VoiceState } from 'discord.js';
import fs, { createWriteStream } from 'fs/promises';
import { PassThrough } from 'stream';
import prism from 'prism-media';
import { io, Socket } from 'socket.io-client';
import ffmpeg from 'fluent-ffmpeg';
import { sleep } from '@magicyan/discord';

interface ConstructorProps {
    state: VoiceState;
    connection: VoiceConnection;
}

export class VoiceTransmitter {
    private readonly receiver;
    private readonly speakers;
    private readonly encoder;
    private readonly userId;

    constructor({ state, connection }: ConstructorProps) {
        this.receiver = connection.receiver;
        this.userId = state.id;
        this.speakers = new Set();
        this.encoder = new OpusEncoder(48000, 2);

        // Removemos os ouvintes para utilizar a nossa própria função.
        this.receiver.speaking.removeAllListeners();
        this.receiver.speaking.on('start', () => this.listen());
        this.speakers.add(this.userId);
    }

    private async createSocket(): Promise<Socket> {
        return io('http://localhost:3000', {
            transports: ['websocket'],
            upgrade: false
        });
    }

    private opusStream() {
        return this.receiver.subscribe(this.userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 5000
            }
        });
    }

    private async listen() {
        const socket = await this.createSocket();
        const opusStream = this.opusStream();

        const opusDecoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 2,
            rate: 48000,
        });

        // const outFile = createWriteStream(filename, { flags: 'a' });

        socket.on('connect', () => {
            console.log(`👂 Started Sending audio by ${this.userId}`);
        });

        opusStream.once('data', (chunck) => {
            console.log(this.encoder.decode(chunck))
            socket.emit('audioStream', this.encoder.decode(chunck))
        })

        opusStream.on('error', (error: Error) => {
            console.error(error, `Error while recording voice for user ${this.userId}`);
        });

        opusStream.once('end', async () => {
            socket.disconnect();
            this.speakers.delete(this.userId);
        });
    }
}
