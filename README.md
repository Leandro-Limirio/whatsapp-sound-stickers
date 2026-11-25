# WhatsApp Sound Stickers

Projeto experimental para enviar uma figurinha e um áudio incorporado na mesma mensagem `StickerMessage`, usando Baileys.

> O campo `StickerMessage.audioMessage` é baseado em engenharia reversa e não é uma API oficial do WhatsApp. A serialização funciona localmente, mas a reprodução depende da versão do WhatsApp do destinatário.

## Requisitos

- Node.js 20 ou superior
- Uma conta do WhatsApp para parear pelo QR Code
- Imagem em GIF, PNG, JPG, JPEG ou WebP e qualquer formato de áudio/vídeo suportado pelo FFmpeg

## Instalação

```bash
npm install
```

O `postinstall` aplica automaticamente o patch necessário dentro do Baileys. `node_modules` não deve ser versionado.

As pastas `input/`, `output/` e `session/` são criadas automaticamente ao iniciar o projeto. Coloque os arquivos de mídia em `input/` antes de executar.

## Mídia e destino

Os arquivos de trabalho ficam em `input/` e `output/`, ignorados pelo Git. A configuração atual usa `output/teste3.webp` e `output/teste3-video-opus.ogg`.

Ao iniciar, o programa pede o número no terminal. Digite somente o número com DDI, por exemplo `5511999999999`, ou um JID completo como `5511999999999@s.whatsapp.net`. Depois, ele lista as imagens e áudios disponíveis em `input/` para seleção. A imagem escolhida é convertida automaticamente para WebP com até 512 px, e o áudio para OGG/Opus, antes do envio. O programa valida o número com `onWhatsApp()` e envia para o JID canônico retornado pelo WhatsApp.

## Execução

```bash
node index.js
```

Após escanear o QR Code em **WhatsApp → Configurações → Aparelhos conectados**, o programa envia uma única mensagem:

```js
await sock.sendMessage(jid, {
  stickerAudio: { sticker: imageBuffer, audio: audioBuffer }
})
```

Imagem e áudio usam o fluxo nativo `prepareWAMessageMedia()`. Não é enviado um áudio separado.

## Testes

```bash
npm test
```

Os testes validam o campo protobuf 26, a tag 210 e o round-trip de serialização do áudio dentro da figurinha.

## Limitações

- O WhatsApp pode entregar a figurinha sem reproduzir o áudio em versões sem suporte a sound stickers.
- A reprodução depende do cliente/dispositivo e normalmente exige tocar na figurinha.
- Não versione `session/`, mídias privadas ou credenciais.
