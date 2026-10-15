import { createServer } from 'node:http'

// A silent PCM WAV keeps playback/seek tests independent of music services and copyright content.
const sampleRate = 8000
const dataSize = sampleRate * 2 * 20
const wav = Buffer.alloc(44 + dataSize)
wav.write('RIFF', 0)
wav.writeUInt32LE(36 + dataSize, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(dataSize, 40)

createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:8091')
  if (url.pathname === '/health') return response.writeHead(200).end('ok')
  if (url.pathname === '/meting') {
    if (url.searchParams.get('id') === '99999') return response.writeHead(503).end('unavailable')
    if (url.searchParams.get('server') !== 'tencent' || url.searchParams.get('type') !== 'playlist')
      return response.writeHead(400).end('invalid query')
    const tracks = [1, 2].map((number) => ({
      title: `测试音乐 ${number}`,
      author: '自动化测试音源',
      url: `http://127.0.0.1:8091/audio.wav?track=${number}`,
      pic: '',
    }))
    return response
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(tracks))
  }
  if (url.pathname === '/audio.wav') {
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range || '')
    const start = range ? Number(range[1]) : 0
    const end = range && range[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1
    if (start > end || start >= wav.length) return response.writeHead(416).end()
    response.writeHead(range ? 206 : 200, {
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
    })
    return response.end(wav.subarray(start, end + 1))
  }
  response.writeHead(404).end()
}).listen(8091, '127.0.0.1')
