

let element;
let bar;
let running = false;

async function waitFrame() {
    return new Promise(function (resolve, reject) {
        requestAnimationFrame(function () {
            resolve();
        });
    });
}

const addEventListenerOnce = require('./event_once');

module.exports = {
    async progress(p) {
        if (!running) {
            if (!element) {
                element = document.createElement('div');
                element.className = 'wiki-progress-bar';
                bar = document.createElement('div');
                bar.className = 'bar';
                element.append(bar);
                document.body.append(element);
            }
            bar.style.width = 0;
            element.style.opacity = 0;

            await waitFrame();

            element.style.opacity = 1;
            running = true;
        }
        
        bar.style.backgroundColor = '#2196f3';
        bar.style.width = `${p * 100}%`;
    },
    complete() {
        if (running) {
            running = false;
            bar.style.width = '100%';
            bar.style.backgroundColor = '#2196f3';
    
            setTimeout(function () {
                element.style.opacity = 0;
            }, 300);
        }
    },
    error() {
        if (running) {
            running = false;
            bar.style.width = '100%';
            bar.style.backgroundColor = 'red';
    
            setTimeout(function () {
                element.style.opacity = 0;
            }, 300);
        }
    }
};