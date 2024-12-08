const domParser = require('node-html-parser').parse;
const axios = require('axios');
const fs = require("node:fs");

const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ponpon123',
    database: 'exploits'
});

const utils = class {
    static async fetch_(url = '', type = 'POST', body = {}) {
        try {
            const method = type.toUpperCase();
            const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];

            if (!validMethods.includes(method)) {
                console.log(`Invalid HTTP method: ${method}`);
                return;
            }

            let options = {
                method: method,
                url: url,
            };

            if (method === 'POST' || method === 'PUT') {
                options.data = body;
            }

            const response = await axios(options);
            return response.data;
        } catch (e) {
            console.log(`Произошла ошибка: ${e}`);
        }
    }

    static parseJSONData(el) {
        const json = {};

        const accordion = el.querySelector('.accordion');
        const tileContent = accordion.querySelector('.tile-content');
        const title = tileContent.querySelector('.accordion-header').innerHTML;
        const data = tileContent.querySelector('.tile-subtitle').innerHTML;
        const codeElements = accordion.querySelector('.centered .code').innerHTML;

        const code = codeElements.replace(/<[^>]+>/g, '').trim();
        const firstElement = code.split('\n')[0];

        const match = firstElement.match(/id=([A-Za-z0-9-]+)/);
        const id = match[1];

        const btnGroup = accordion.querySelector('.btn-group');

        let sourceButton = null;

        for (const button of btnGroup.querySelectorAll('button')) {
            if (button.innerHTML === 'Source')
                sourceButton = button;
        }

        json.title = title;
        json.date = data;
        json.info = code;
        json.id = id;
        json.source = firstElement.replaceAll('## ', '');

        return json;
    }
}

module.exports.utils = utils;

const puppeteer = require('puppeteer');

async function getVulns(ip) {
    const result = {
        ip: ip,
        status: 'ошибка',
        vulns: [],
        message: ''
    };

    try {
        const url = `https://www.shodan.io/host/${ip}`;
        const response = await utils.fetch_(url, 'GET');

        if (!response) {
            result.status = 'ошибка';
            result.message = 'Нет ответа от Shodan';
            return result;
        }

        const dom = domParser(response);

        const scriptContent = Array.from(dom.querySelectorAll('script')).find(script =>
            script.textContent && script.textContent.includes('VULNS =')
        );

        if (scriptContent) {
            const vulnsScript = scriptContent.textContent;
            const vulnsData = vulnsScript.split('const VULNS = ')[1].split(';')[0].trim();

            const parsedData = JSON.parse(vulnsData);

            let vulnsArray = [];

            if (typeof parsedData === 'object') {
                vulnsArray = await Promise.all(Object.entries(parsedData).map(async ([cveId, vuln]) => {
                    const exploit = await utils.fetch_(`https://sploitus.com/exploit?id=${cveId}`, 'GET');
                    const dom = domParser(exploit);

                    const accordion = dom.querySelector('.accordion');
                    const title = accordion.querySelector('.tile-content').querySelector('h1').innerHTML;

                    const pocElement = dom.querySelector('pre');
                    let poc = pocElement ? pocElement.innerText : 'PoC не найден';
                    poc = poc.replace(/<[^>]+>/g, '').trim();

                    return {
                        name: cveId,
                        cvss: vuln.cvss,
                        ports: vuln.ports,
                        summary: vuln.summary,
                        verified: vuln.verified,
                        exploit: {
                            name: title,
                            source: `https://sploitus.com/exploit?id=${cveId}`
                        },
                        poc: poc
                    };
                }));
            }

            result.status = 'уязвим';
            result.vulns = vulnsArray;
        } else {
            result.status = 'не уязвим';
            result.message = 'Уязвимости не найдены';
        }
    } catch (e) {
        console.error('Ошибка при проверке уязвимостей:', e);
        result.status = 'ошибка';
        result.message = e.message || 'Неизвестная ошибка';
    }

    return result;
}

function parseExploit(id) {
    try {

    } catch (e) {
        return 'Неизвестно';
    }
}

(async () => {
    // const vulns = await getVulns('62.122.213.120');
    // console.log(vulns);

    // await resetData('https://sploitus.com/?query=POC#exploits_');

    const body = {
        username: 'dummyUsername',
        password: 'dummyPass'
    }

    const i = await getVulns('2.132.193.199');
    console.log(i.vulns);

    /*    const i = await fetch('http://localhost:8080/api/v1/vulnerabilities', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImR1bW15VXNlcm5hbWUiLCJpYXQiOjE3MzM2MDE3NzIsImV4cCI6MTczMzY4ODE3Mn0.BtVZbFLm1acw3fcsWULu71i32UXxJ1EMGH3Srz26QoE'
            },
        });

        console.log(await i.json());*/
})();

async function saveToDatabase(data) {
    const query = `
        INSERT INTO vulnerabilities (id, title, date, info, source) 
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            date = VALUES(date), 
            info = VALUES(info), 
            source = VALUES(source)
    `;

    connection.execute(query, [data.id, data.title, data.date, data.info, data.source]);
}

async function getFromDatabase(id) {
    const query = `SELECT * FROM vulnerabilities WHERE id = ?`;

    return new Promise((resolve, reject) => {
        connection.execute(query, [id], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results[0]);
            }
        });
    });
}

async function resetData(url) {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');

    await page.goto(url);

    await page.waitForSelector('.panel');

    const pon = await page.content();
    const dom = domParser(pon);
    const els = dom.querySelectorAll('.panel');

    for (const el of els) {
        const jsonData = utils.parseJSONData(el);
        await saveToDatabase(jsonData);
    }

    await browser.close();
}

module.exports.scan = resetData;
module.exports.getVulns = getVulns;