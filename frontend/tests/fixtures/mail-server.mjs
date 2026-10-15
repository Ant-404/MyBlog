import net from 'node:net'
import http from 'node:http'

// Isolated loopback SMTP inbox for browser tests. Never included in the application build.
const inbox = []
const smtp = net
  .createServer((socket) => {
    socket.setEncoding('utf8')
    socket.write('220 localhost test SMTP\r\n')
    let buffer = '',
      recipient = '',
      data = false,
      lines = []
    socket.on('data', (chunk) => {
      buffer += chunk
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n')
        const line = buffer.slice(0, end).replace(/\r$/, '')
        buffer = buffer.slice(end + 1)
        if (data) {
          if (line === '.') {
            const raw = lines.join('\n')
            const body = raw.split(/\n\n/).slice(1).join('\n\n')
            const text = /Content-Transfer-Encoding: base64/i.test(raw)
              ? Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8')
              : body
                  .replace(/=\n/g, '')
                  .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            inbox.push({ recipient, text })
            if (inbox.length > 50) inbox.shift()
            data = false
            lines = []
            socket.write('250 accepted\r\n')
          } else lines.push(line)
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n')
        else if (/^MAIL FROM:/i.test(line)) socket.write('250 ok\r\n')
        else if (/^RCPT TO:/i.test(line)) {
          recipient = /<([^>]+)>/.exec(line)?.[1] || ''
          socket.write('250 ok\r\n')
        } else if (/^DATA$/i.test(line)) {
          data = true
          socket.write('354 send data\r\n')
        } else if (/^QUIT$/i.test(line)) socket.end('221 bye\r\n')
        else socket.write('250 ok\r\n')
      }
    })
    socket.on('error', () => {})
  })
  .listen(2526, '127.0.0.1')
const api = http
  .createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1:8092')
    if (url.pathname === '/health') return response.writeHead(200).end('ok')
    response
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(inbox.filter((mail) => mail.recipient === url.searchParams.get('email'))))
  })
  .listen(8092, '127.0.0.1')
process.on('SIGTERM', () => {
  smtp.close()
  api.close()
})
