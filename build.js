
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

async function main() {
    let dir = __dirname + '/templates';
    let wwwDir = __dirname + '/docs';
    let files = fs.readdirSync(dir);
    for (f of files) {
        if (f.endsWith('.ejs')) {
            let txt = await ejs.renderFile(path.join(dir, f), {
                config
            });
            fs.writeFileSync(path.join(wwwDir, f.replace(/.ejs$/, '.html')), txt);
        }
    }
    console.log(files);
}

main();