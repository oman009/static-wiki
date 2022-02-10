const MarkdownIt = require('markdown-it');
const plainText = require('markdown-it-plain-text');
const CachedData = require('./cached_data');
const path = require('path');
const getAnimation = require('./element_animation');
const utils = require('./utils');

let previewBoard;
let arrow;
let container;
let spinner;
const Padding = 18;
let currentFile;

const md = new MarkdownIt();
md.use(plainText);

/**
 * 
 * @param {String} text 
 * @param {URL} url 
 */
function renderContent(text, url) {
    let parsedPath = path.parse(url.pathname);
    md.render(text);
    container.innerHTML = `<h1>${decodeURI(parsedPath.name)}</h1>${md.plainText.substring(0, 120)}`;
}

let currentTimer;
let currentActive;

async function fetchDocument(docUrl) {
    let url;
    if (docUrl instanceof URL) {
        url = docUrl;
    } else {
        url = new URL(location.origin + docUrl);
    }

    currentFile = url.pathname.replace(/^\//, '');
    let cached = CachedData.getWithTime(url.pathname);
    let oldText;
    if (cached) {
        oldText = cached.value;
        renderContent(oldText, url);
        // _fadeOut(STATE_SUCCESS);
    }

    if (!cached || cached.time + 30 * 60 * 1000 < new Date().getTime()) {
        let res = await fetch(docUrl);
        if (!(res.status >= 200 && res.status < 300)) {
            throw new Error(`Http state ${res.status}`);
        }
        let text = await res.text();
        CachedData.set(url.pathname, text);
        renderContent(text, url);
    }
}

async function showPreviewAt(element, docFile) {
    if (!previewBoard) {
        previewBoard = document.createElement('div');
        previewBoard.className = 'preview';
        previewBoard.addEventListener('mouseover', function () {
            clearTimeout(currentTimer);
        });
        previewBoard.addEventListener('mouseleave', function () {
            willMissPreview();
        });

        arrow = document.createElement('div');
        arrow.className = 'arrow';
        previewBoard.appendChild(arrow);
        container = document.createElement('div');
        container.className = 'preview-container';
        previewBoard.appendChild(container);

        spinner = document.createElement('div');
        spinner.className = 'spinner';
        container.appendChild(spinner);

        document.body.appendChild(previewBoard);

        await utils.wait(100);
    }
    clearTimeout(currentTimer);
    let style = getComputedStyle(previewBoard);
    let width = parseInt(style.width);
    let height = parseInt(style.height);
    let body = document.body;
    let html = document.documentElement;
    let windowWidth = Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth );
    let windowHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
    
    let rect = element.getBoundingClientRect();
    let x = (rect.left + rect.right) / 2;
    let y = (rect.top + rect.bottom) / 2 + window.scrollY;
    x -= 28;
    if (width + x > windowWidth - Padding) {
        let off = x - (windowWidth - Padding - width);
        x = (windowWidth - Padding - width);
        arrow.style.left = `${off + 10}px`;
    } else {
        arrow.style.left = '10px';
    }
    if (height + y > windowHeight - Padding) {
        y = y - height - Padding;
        arrow.className = 'arrow bottom';
    } else {
        y += Padding;
        arrow.className = 'arrow';
    }
    previewBoard.style.left = `${x}px`;
    previewBoard.style.top = `${y}px`;

    previewBoard.style.display = 'block';
    previewBoard.style.opacity = '0';

    let animation = getAnimation(previewBoard);
    animation.fadeIn();

    fetchDocument(docFile);
}

function willMissPreview(fn) {
    clearTimeout(currentTimer);
    currentTimer = setTimeout(function () {
        let animation = getAnimation(previewBoard);
        animation.fadeOut();
        currentActive = null;
    }, 1000);
}

class LinkController {
    constructor(element) {
        this.element = element;

        element.addEventListener('mouseenter', (e) => {
            if (currentActive != this) {
                currentActive = this;
                showPreviewAt(element, this.element.dataset['file']);
            } else {
                clearTimeout(currentTimer);
            }
        });
        element.addEventListener('mouseleave', (e) => {
            willMissPreview();
        });
    }
}

/**
 * 
 * @param {Array<HTMLElement>} elements 
 */
module.exports = function (elements) {
    for (let el of elements) {
        new LinkController(el);
    }
};