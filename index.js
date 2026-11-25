import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import fs from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)

/** Solicita e normaliza um número ou JID de WhatsApp. */
async function askDestinationJid() {
    const readline = createInterface({ input, output })
    try {
        const answer = (await readline.question('Número de destino com DDI: ')).trim()
        if (answer.endsWith('@s.whatsapp.net')) return answer
        const digits = answer.replace(/\D/g, '')
        if (!digits) throw new Error('Número de destino inválido.')
        return `${digits}@s.whatsapp.net`
    } finally {
        readline.close()
    }
}

/** Lista os arquivos de entrada e retorna a escolha de imagem e áudio. */
async function selectInputFiles() {
    const files = await fs.readdir('./input', { withFileTypes: true })
    const imageExtensions = ['.webp', '.gif', '.png', '.jpg', '.jpeg']
    const audioExtensions = ['.ogg', '.mp3', '.mp4', '.wav']
    const images = files.filter(file => file.isFile() && imageExtensions.some(extension => file.name.toLowerCase().endsWith(extension)))
    const audios = files.filter(file => file.isFile() && audioExtensions.some(extension => file.name.toLowerCase().endsWith(extension)))

    if (!images.length) throw new Error('Nenhuma imagem encontrada em input/.')
    if (!audios.length) throw new Error('Nenhum áudio ou vídeo encontrado em input/.')

    const choose = async (label, candidates) => {
        console.log(`\n${label}:`)
        candidates.forEach((file, index) => console.log(`${index + 1}. ${file.name}`))
        const readline = createInterface({ input, output })
        try {
            const answer = await readline.question('Escolha o número: ')
            const index = Number.parseInt(answer, 10) - 1
            if (!Number.isInteger(index) || !candidates[index]) throw new Error(`Seleção de ${label.toLowerCase()} inválida.`)
            return `./input/${candidates[index].name}`
        } finally {
            readline.close()
        }
    }

    return {
        imagePath: await choose('Imagens', images),
        audioPath: await choose('Áudios e vídeos', audios)
    }
}

/** Converte a imagem para WebP e o áudio para OGG/Opus. */
async function prepareMedia(inputFiles) {
    await fs.mkdir('./output', { recursive: true })
    const imageIsAnimated = inputFiles.imagePath.toLowerCase().endsWith('.gif')
    const imageFilter = imageIsAnimated
        ? 'fps=8,scale=512:512:force_original_aspect_ratio=decrease:force_divisible_by=2'
        : 'scale=512:512:force_original_aspect_ratio=decrease:force_divisible_by=2'
    const imageOptions = ['-y', '-i', inputFiles.imagePath, '-vf', imageFilter, '-an', '-c:v', 'libwebp', '-q:v', '55', '-loop', '0']
    if (!imageIsAnimated) imageOptions.push('-frames:v', '1')
    imageOptions.push('./output/selected-sticker.webp')

    await execFileAsync(ffmpegPath, imageOptions)
    await execFileAsync(ffmpegPath, ['-y', '-i', inputFiles.audioPath, '-vn', '-c:a', 'libopus', '-b:a', '96k', '-ac', '1', './output/selected-audio-opus.ogg'])
    return { imagePath: './output/selected-sticker.webp', audioPath: './output/selected-audio-opus.ogg' }
}

/** Valida o destinatário e envia uma única figurinha sonora. */
async function sendStickerAudio(sock, targetJid, mediaFiles) {
    const [contact] = await sock.onWhatsApp(targetJid)
    if (!contact?.exists) throw new Error('O número informado não está registrado no WhatsApp.')

    await sock.sendMessage(contact.jid, {
        stickerAudio: {
            sticker: await fs.readFile(mediaFiles.imagePath),
            audio: await fs.readFile(mediaFiles.audioPath),
            audioOptions: { mimetype: 'audio/ogg; codecs=opus' }
        }
    })
}

/** Inicia a sessão, aguarda o QR Code e controla o ciclo de conexão. */
async function startWhatsApp() {
    const targetJid = await askDestinationJid()
    const mediaFiles = await prepareMedia(await selectInputFiles())
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('Escaneie o QR Code no WhatsApp.')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'open') {
            try {
                await sendStickerAudio(sock, targetJid, mediaFiles)
                console.log('Figurinha sonora enviada com sucesso.')
            } catch (error) {
                console.error(`Erro ao enviar: ${error.message}`)
            }
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
                console.error('A sessão foi desconectada. Faça um novo pareamento.')
                return
            }
            console.error('Conexão encerrada. Tentando reconectar...')
            await startWhatsApp()
        }
    })
}

startWhatsApp().catch(error => console.error(`Erro: ${error.message}`))
