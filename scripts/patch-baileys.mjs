import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../node_modules/@whiskeysockets/baileys/', import.meta.url)

async function patchFile(path, replacements) {
  const url = new URL(path, root)
  let source = await readFile(url, 'utf8')
  for (const [from, to] of replacements) {
    if (source.includes(to)) continue
    if (!source.includes(from)) throw new Error(`Patch context not found: ${path}`)
    source = source.replace(from, to)
  }
  await writeFile(url, source)
}

await patchFile('WAProto/index.js', [
  ['            StickerMessage.prototype.mediaKeyDomain = null;\n', '            StickerMessage.prototype.mediaKeyDomain = null;\n            StickerMessage.prototype.audioMessage = null;\n'],
  ['                if (m.mediaKeyDomain != null && Object.hasOwnProperty.call(m, "mediaKeyDomain"))\n                    w.uint32(184).int32(m.mediaKeyDomain);\n', '                if (m.mediaKeyDomain != null && Object.hasOwnProperty.call(m, "mediaKeyDomain"))\n                    w.uint32(184).int32(m.mediaKeyDomain);\n                if (m.audioMessage != null && Object.hasOwnProperty.call(m, "audioMessage"))\n                    $root.proto.Message.AudioMessage.encode(m.audioMessage, w.uint32(210).fork()).ldelim();\n'],
  ['                    case 23: {\n                            m.mediaKeyDomain = r.int32();\n                            break;\n                        }\n', '                    case 23: {\n                            m.mediaKeyDomain = r.int32();\n                            break;\n                        }\n                    case 26: {\n                            m.audioMessage = $root.proto.Message.AudioMessage.decode(r, r.uint32());\n                            break;\n                        }\n'],
  ['                return m;\n            };\n\n            StickerMessage.toObject = function toObject(m, o) {', '                if (d.audioMessage != null) {\n                    if (typeof d.audioMessage !== "object")\n                        throw TypeError(".proto.Message.StickerMessage.audioMessage: object expected");\n                    m.audioMessage = $root.proto.Message.AudioMessage.fromObject(d.audioMessage);\n                }\n                return m;\n            };\n\n            StickerMessage.toObject = function toObject(m, o) {'],
  ['                return d;\n            };\n\n            StickerMessage.prototype.toJSON', '                if (m.audioMessage != null && m.hasOwnProperty("audioMessage"))\n                    d.audioMessage = $root.proto.Message.AudioMessage.toObject(m.audioMessage, o);\n                return d;\n            };\n\n            StickerMessage.prototype.toJSON']
])

await patchFile('lib/Utils/messages.js', [
  ["    else if (hasNonNullishProperty(message, 'listReply')) {", "    else if (hasNonNullishProperty(message, 'stickerAudio')) {\n        const stickerAudio = message.stickerAudio;\n        if (!hasNonNullishProperty(stickerAudio, 'sticker') || !hasNonNullishProperty(stickerAudio, 'audio')) {\n            throw new Boom('stickerAudio requires both sticker and audio', { statusCode: 400 });\n        }\n        const [{ stickerMessage }, { audioMessage }] = await Promise.all([\n            prepareWAMessageMedia({ sticker: stickerAudio.sticker }, options),\n            prepareWAMessageMedia({ audio: stickerAudio.audio, ...stickerAudio.audioOptions }, options)\n        ]);\n        stickerMessage.audioMessage = audioMessage;\n        m.stickerMessage = stickerMessage;\n    }\n    else if (hasNonNullishProperty(message, 'listReply')) {"]
])

console.log('Baileys sticker-audio patch applied.')
