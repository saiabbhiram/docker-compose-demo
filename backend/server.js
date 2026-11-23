const http = require('http');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'database',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'app_password',
  database: process.env.DB_NAME || 'mydb',
  waitForConnections: true,
  connectionLimit: 5,
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    // GET /health
    if (req.method === 'GET' && req.url === '/health') {
      const [rows] = await pool.query('SELECT 1 AS ok');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ db: rows[0].ok === 1 ? 'up' : 'down' }));
    }

    // GET /users
    if (req.method === 'GET' && req.url === '/users') {
      const [rows] = await pool.query('SELECT * FROM users ORDER BY id');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rows));
    }

    // POST /users  { "name": "...", "email": "..." }
    if (req.method === 'POST' && req.url === '/users') {
      const body = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      const { name, email } = payload || {};
      if (!name || !email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'name and email are required' }));
      }
      const [result] = await pool.execute(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [name, email]
      );
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: result.insertId, name, email }));
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Try GET /health, GET /users, POST /users\n');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(3000, () => console.log('Backend on :3000'));
