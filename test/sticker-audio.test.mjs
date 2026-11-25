import assert from 'node:assert/strict';
import { proto } from '@whiskeysockets/baileys/WAProto/index.js';

const audio = proto.Message.AudioMessage.fromObject({
  url: 'https://example.invalid/audio',
  mimetype: 'audio/ogg; codecs=opus',
  seconds: 1,
  ptt: true
});
const sticker = proto.Message.StickerMessage.fromObject({
  url: 'https://example.invalid/sticker',
  mimetype: 'image/webp',
  audioMessage: audio
});
const encoded = proto.Message.StickerMessage.encode(sticker).finish();

// Field 26, wire type 2, is encoded as tag 210 (0xd2, 0x01).
assert.ok(encoded.includes(0xd2) && encoded.includes(0x01), 'audioMessage field tag is missing');
const decoded = proto.Message.StickerMessage.decode(encoded);
assert.equal(decoded.audioMessage.url, audio.url);
assert.equal(decoded.audioMessage.mimetype, audio.mimetype);
assert.equal(proto.Message.StickerMessage.fromObject(proto.Message.StickerMessage.toObject(sticker)).audioMessage.seconds, 1);

const ordinarySticker = proto.Message.StickerMessage.create({ mimetype: 'image/webp' });
assert.equal(proto.Message.StickerMessage.decode(proto.Message.StickerMessage.encode(ordinarySticker).finish()).mimetype, 'image/webp');
const ordinaryAudio = proto.Message.AudioMessage.create({ mimetype: 'audio/ogg; codecs=opus' });
assert.equal(proto.Message.AudioMessage.decode(proto.Message.AudioMessage.encode(ordinaryAudio).finish()).mimetype, ordinaryAudio.mimetype);

console.log('protobuf sticker-audio tests passed');
