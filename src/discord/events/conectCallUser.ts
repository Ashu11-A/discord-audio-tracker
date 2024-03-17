import { VoiceTransmitter } from '@/class/Voice'
import { Event } from '@discord/base'
import { joinVoiceChannel } from '@discordjs/voice'

new Event({
    name: 'voiceStateUpdate',
    run(oldState, newState) {
        // console.log(oldState.toJSON())
        console.log(newState)
        if (newState.id === '379089880887721995'){
            const connection = joinVoiceChannel({
                channelId: String(newState.channelId),
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
                selfDeaf: false,
                // selfMute: true
            })

            new VoiceTransmitter({ connection, state: newState})
        }
    },
})