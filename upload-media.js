const https = require('http'); // b-pilot.jp is http
const fs = require('fs');
const path = require('path');

const USERNAME = 'excia2021@icloud.com';
const PASSWORD = 'Toshiki19980108/';
const HOST = 'b-pilot.jp';
const IMAGE_PATH = '/Users/nakagawatoshiki/.gemini/antigravity/brain/ae4bfcc8-571c-4a2b-a426-395c19651705/japanese_salesperson_modern_office_1770294507049.png';

const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
const fileStats = fs.statSync(IMAGE_PATH);
const fileContent = fs.readFileSync(IMAGE_PATH);
const fileName = path.basename(IMAGE_PATH);

const options = {
    hostname: HOST,
    port: 80,
    path: '/?rest_route=/wp/v2/media', // Using rest_route as discovered
    method: 'POST',
    headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Authorization': `Basic ${auth}`,
        'Content-Length': fileStats.size
    }
};

console.log(`Uploading ${fileName} (${fileStats.size} bytes)...`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 201) {
            const media = JSON.parse(data);
            console.log('Upload Success!');
            console.log('Media ID:', media.id);
            console.log('Source URL:', media.source_url);
        } else {
            console.log('Upload Failed.');
            console.log(data.substring(0, 500)); // Print first 500 chars of error
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(fileContent);
req.end();
