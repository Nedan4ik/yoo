const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {scan, getVulns} = require("./utils");
const fs = require("node:fs");

const port = 8080;

const app = express();
app.use(express.json());
app.set('view engine', 'ejs');

let lastUpdateData = new Date();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ponpon123',
    database: 'exploits'
});

const secret = '8d81ca96d6993864422a7efdd6b0369f88be81bddc9431e3af563d9cf77a6ac723e8fa28429bb224ef66aa333e74251cef5e2516d00c4f797fbad6e0a30d9644\n';

const users = [
    {
        username: 'dummyUsername',
        password: bcrypt.hashSync('dummyPass', 10),
    }
];

app.post('/api/v1/register', (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'Отсутствует тело запроса' });

    const { username, password } = req.body;

    const user = users.find(u => u.username === username);

    if (user) {
        return res.status(409).json({ status: 'error', message: 'Пользователь с таким ником уже существует. Придумайте другой.'})
    }

    users.push({
        username: username,
        password: bcrypt.hashSync(password, 10)
    })

    const token = generateToken(username);
    res.json({ status: 'OK', message: `Вы успешно зарагестрировались, ваш токен: ${token} (работает 24 часа)`, token: token })
});

app.post('/api/v1/login', (req, res) => {
    if (!req.body) return res.status(400).json({ error: 'Отсутствует тело запроса' });

    const { username, password } = req.body;

    const user = users.find(u => u.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ status: 'error', message: 'Неверный логин или пароль' });
    }

    const token = generateToken(user.username);
    res.json({ status: 'OK', message: `Ваш токен: ${token} (работает 24 часа)`, token: token });
});

app.get('/api/v1/vulnerabilities', authenticateToken, (req, res) => {
    console.log(`Новый запрос на получение последних уязвимостей от ${req.user.username}`);

    connection.query('SELECT * FROM vulnerabilities', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка сервера' });
        } else {
            res.json(results);
        }
    });
});

app.get('/', (req, res) => {
    const formattedDate = `${lastUpdateData.getDate().toString().padStart(2, '0')} ${lastUpdateData.toLocaleString('ru', { month: 'long' })} ${lastUpdateData.getFullYear()}, ${lastUpdateData.getHours().toString().padStart(2, '0')}:${lastUpdateData.getMinutes().toString().padStart(2, '0')}`;

    connection.query('SELECT * FROM vulnerabilities', (err, results) => {
        if (err) {
        } else {
            res.render('index', { moment: formattedDate, vulnerabilities: results });
        }
    });

});

app.post('/api/v1/scan', authenticateToken, async (req, res) => {
    try {
        console.log(`Новый запрос на скан от пользователя ${req.user.username}`);

        await scanFull();

        res.json({ status: 'OK', message: 'Скан успешно завершён! Можете гетать!' })
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Случилась непредвиденная ошибка!' })
    }
});

app.post('/api/v1/scanIp', authenticateToken, async (req, res) => {
    console.log(`Новый запрос на получение уязвимости на айпи от пользователя ${req.user.username}`);

    try {
        const ip = req.body.ip;

        if (!ip) {
            return res.status(400).json({ status: 'error', message: 'Нет IP для проверки' });
        }

        const vulns = await getVulns(req.body.ip);

        res.status(400).json({ status: 'OK', data: vulns, message: 'Успешно!' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Ошибка сервера', details: e.message })
    }
});

setInterval(async () => {
    await scanFull();
}, 86400000);

async function scanFull() {
    console.log('Начинаю скан...');
    await scan('https://sploitus.com/?query=exploit#exploits');
    await scan('https://sploitus.com/?query=POC#exploits_');
    lastUpdateData = new Date();
    console.log('Скан успешно завершён!');
}

function generateToken(username) {
    return jwt.sign({ username }, secret, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Токен не найден' });
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({ status: 'error', message: 'Неверный или истекший токен' });
        }

        req.user = user;
        next();
    });
}

app.listen(port, async () => {
    console.log(`Сервер открыт на порту: ${port}`);

    await scanFull();
});