import { startExpress } from '@/express';
import { Event } from '@discord/base';

new Event({
    name: 'ready', once: true, 
    async run() {
        startExpress()
    },
});