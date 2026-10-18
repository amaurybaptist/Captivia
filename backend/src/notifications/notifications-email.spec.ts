import type { PushDispatcher } from './push-dispatcher';
import { createServer, Socket } from 'net';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

it('livre réellement un email à un serveur SMTP local, sans destinataire externe', async () => {
  const variables = [
    'MAIL_HOST',
    'MAIL_PORT',
    'MAIL_FROM',
    'MAIL_SECURE',
    'MAIL_REQUIRE_TLS',
    'MAIL_USER',
    'MAIL_PASS',
  ];
  const previous = Object.fromEntries(
    variables.map((key) => [key, process.env[key]]),
  );
  const sockets = new Set<Socket>();
  let message = '';
  let recipient = '';
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.setEncoding('utf8');
    socket.write('220 localhost ESMTP test\r\n');
    let buffer = '';
    let inData = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            socket.write('250 queued locally\r\n');
          } else message += `${line}\n`;
        } else if (/^EHLO/.test(line))
          socket.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (/^RCPT TO:/.test(line)) {
          recipient = line;
          socket.write('250 OK\r\n');
        } else if (line === 'DATA') {
          inData = true;
          socket.write('354 End with dot\r\n');
        } else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('SMTP local indisponible');
    process.env.MAIL_HOST = '127.0.0.1';
    process.env.MAIL_PORT = String(address.port);
    process.env.MAIL_FROM = 'Captivia <local@example.test>';
    process.env.MAIL_SECURE = 'false';
    process.env.MAIL_REQUIRE_TLS = 'false';
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;
    const service = new NotificationsService({} as PrismaService, {} as PushDispatcher);
    await service.sendEmail('recipient@example.test', {
      title: 'Rappel local',
      body: 'Nettoyage pour Kiwi',
    });
    expect(recipient).toBe('RCPT TO:<recipient@example.test>');
    expect(message).toContain('Subject: Rappel local');
    expect(message).toContain('Nettoyage pour Kiwi');
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const key of variables) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
