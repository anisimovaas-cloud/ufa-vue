// Маленький локальный сервер для просмотра проекта. Запуск: npm run serve.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.zip': 'application/zip' };
createServer(async (request, response) => {
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Неверный путь');
    const file = path === root ? resolve(root, 'index.html') : path;
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Файл не найден');
  }
}).listen(8080, '127.0.0.1', () => console.log('Сайт: http://localhost:8080'));
