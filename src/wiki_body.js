
const MarkdownIt = require('markdown-it');
const path = require('path');
const scrolTo = require('animated-scroll-to').default;
const CodeMirror = require('codemirror');
const CachedData = require('./cached_data');
require('codemirror/mode/markdown/markdown');
const ProgressBar = require('./progress_bar');
const setupPreview = require('./preview');
const getAnimation = require('./element_animation');
const utils = require('./utils');
const config = require('../config.json');

let wikiElement = document.getElementById('wiki-content');
let loadingElement = document.querySelector('.wiki-loading');
let errorElement = document.querySelector('.wiki-error');
let textElement = document.querySelector('.wiki-text');

class Reference {
    constructor({
        links,
        content,
        index,
    }) {
        this.links = links;
        this.content = content;
        this.index = index;
    }

    get element() {
        if (!this._element) {
            this._element = document.createElement('li');
            let label;

            function backupLabel(timeSeg) {
                return `备份于${timeSeg.substring(0, 4)}-${parseInt(timeSeg.substring(4,6)).toString()}-${parseInt(timeSeg.substring(6,8)).toString()}`;
            }

            let link_list = [];
            for (let link of this.links) {
                if (link.match(/^https?:\/\//)) {
                    let url = new URL(link);
                    label = url.hostname;
                    if (label === 'web.archive.org') {
                        let arr = url.pathname.split('/');
                        if (arr[1] === 'web' && arr[2].match(/^\d+$/)) {
                            label = backupLabel(arr[2]);
                        } else {
                            label = "备份";
                        }
                    } else if (label === 'archive.is' || label === 'www.archive.is') {
                        let arr = url.pathname.split('/');
                        label = backupLabel(arr[1]);
                    }
                    link_list.push(`<a class="link" href="${link}">[${label}]</a>`);
                } else {
                    let p = path.parse(link);
                    label = decodeURI(p.name);
                    link_list.push(`<a class="link" href="${link}">[${label}]</a>`);
                }
            }
            let html = `<a class="sup">^</a>${this.content} ${link_list.join(' ')}`;
            this._element.innerHTML = html;

            this._element.querySelector('.sup').onclick = () => {
                let tar = document.getElementById(`wiki-ref-${this.index}`);
                let offset = utils.getOffset(tar);
                scrolTo(offset.top, {
                });
            };
        }
        return this._element;
    }
}

class Heading {
    constructor({
        index,
        text,
    }) {
        this.index = index;
        this.text = text;
        this.children = [];
    }

    get indexText() {
        return (this.index + 1) + '';
    }

    getElement(parent) {
        if (!this._element) {
            this._element = document.createElement('li');
            this._element.innerHTML = `<a href="javascript:jumpToHeading('heading-${parent ? parent.index + '-' + this.index : this.index}')"><span class="index">${parent ? parent.indexText + '.' + this.indexText : this.indexText}</span>${this.text}</a>`;
            if (this.children.length > 0) {
                let menu = document.createElement('ul');
                for (let item of this.children) {
                    menu.appendChild(item.getElement(this));
                } 
                this._element.appendChild(menu);
            }
        }
        return this._element;
    }
}

class FixedHeading {

    constructor({
        index,
        text,
        id,
    }) {
        this.index = index;
        this.text = text;
        this.id = id;
    }
    get indexText() {
        return (this.index + 1) + '';
    }

    getElement() {
        if (!this._element) {
            this._element = document.createElement('li');
            this._element.innerHTML = `<a href="javascript:jumpToHeading('${this.id}')"><span class="index">${this.indexText}</span>${this.text}</a>`;
        }
        return this._element;
    }
}

let references = [];
function ease(t, b, c, d) {
    return (-c * (t /= d) * (t - 2)) + b;
}

let headings = [];

window.jumpToRef = async function (idx) {
    let ref = references[idx];
    let rect = ref.element.getBoundingClientRect();
    ref.element.classList.remove('hint-disappear');
    ref.element.classList.add('hint-appear');
    await scrolTo(rect.top, {
    });
    setTimeout(function () {
        ref.element.classList.remove('hint-appear');
        ref.element.classList.add('hint-disappear');
    }, 2000);
};

window.jumpToHeading = async function (id) {
    let tar = document.getElementById(id);
    if (tar) {
        let rect = tar.getBoundingClientRect();
        await scrolTo(rect.top, {
        });
    }
};

let hintContainer = document.getElementById('hint-container');
let opened = false;
window.showHint = function () {
    if (!opened) {
        opened = true;
        getAnimation(hintContainer).dropDown();
    }
};

let closeHint = document.getElementById('close-hint');
closeHint.onclick = function () {
    if (opened) {
        opened = false;
        getAnimation(hintContainer).dropUp({
            onComplete() {
                hintContainer.style.display = 'none';
            }
        });
    }
};

function setClickEvent(buttons, fn) {
    for (let btn of buttons) {
        btn.onclick = fn;
    }
}

async function _setupWiki(element) {
    require('codemirror/lib/codemirror.css');
    require('codemirror/theme/paraiso-light.css');

    let createButtons = document.querySelectorAll('#create-desktop, #create-mobile');
    let viewButtons = document.querySelectorAll('#view-desktop, #view-mobile');
    let codeButtons = document.querySelectorAll('#code-desktop, #code-mobile');

    let viewContainer = document.getElementById('view-container');
    let codeContainer = document.getElementById('code-container');
    let historyContainer = document.getElementById('history-container');

    let menuList = document.getElementById('wiki-menu');
    let menuRefs = document.getElementById('menu-ref');

    let code = document.getElementById('code');

    let codeMirror = CodeMirror(code, {
        mode: 'markdown',
        lineNumbers: true,
        readOnly: true,
        lineWrapping: true,
        theme: 'paraiso-light',
    });

    let modeButtons = [
        viewButtons,
        codeButtons,
        // historyButtons
    ];
    let modeContianers = [
        viewContainer,
        codeContainer,
        // historyContainer,
    ];
    let events = [
        null,
        function () {
            setTimeout(function () {
                codeMirror.refresh();
            }, 100);
        },
        null
    ];

    const STATE_LOADING = 0;
    const STATE_SUCCESS = 1;
    const STATE_ERROR = 2;
    let _state = STATE_LOADING;
    function _fadeOut(state) {
        if (_state === state) return; 
        switch (_state) {
            case STATE_LOADING: {
                getAnimation(loadingElement).fadeOut();
                break;
            }
            case STATE_SUCCESS: {
                getAnimation(wikiElement).fadeOut();
                break;
            }
            case STATE_ERROR: {
                getAnimation(errorElement).fadeOut();
                break;
            }
        }
        _state = state;
        switch (state) {
            case STATE_LOADING: {
                getAnimation(loadingElement).fadeIn({
                    display: 'block'
                });
                break;
            }
            case STATE_SUCCESS: {
                getAnimation(wikiElement).fadeIn({
                    display: 'flex'
                });
                break;
            }
            case STATE_ERROR: {
                getAnimation(errorElement).fadeIn({
                    display: 'block'
                });
                break;
            }
            default: {
                break;
            }
        }
    }

    let selectedMode = -1;
    let loading = false;
    let currentFile;
    let ready = false;

    function setSelectMode(mode) {
        if (selectedMode != mode) {
            location.hash = `#!${currentFile}?mode=${mode}`;
        }
    }

    window.addEventListener('hashchange', async function(e) {
        let fullUrl = new URL(e.newURL);
        let hash = fullUrl.hash.replace(/^#!/, '');
        let url = new URL(location.origin + hash);
        if (url.pathname === currentFile) {
            processParams(url.searchParams);
        } else {
            _fadeOut(STATE_LOADING);
            await scrolTo(0, {
                maxDuration: 300,
                easing(t) {
                    return t
                },
                speed: 300
            });
            _loadDocument(url);
        }
        setupPreview.missPreview();
    });
    function processParams(searchParams) {
        let strMode = searchParams.get('mode');
        let mode = 0;
        if (strMode) {
            mode = parseInt(strMode);
            if (!(typeof(mode) === 'number' && mode >= 0 && mode <= 2)) {
                mode = 0;
            }
        }

        if (selectedMode != mode) {
            if (selectedMode >= 0) {
                let buttons = modeButtons[selectedMode];
                for (let btn of buttons) {
                    btn.classList.remove('active');
                }
                modeContianers[selectedMode].style.display = 'none';
            }
            selectedMode = mode;
            let buttons = modeButtons[mode];
            for (let btn of buttons) {
                btn.classList.add('active');
            }
            modeContianers[selectedMode].style.display = 'flex';
            
            if (events[selectedMode]) {
                events[selectedMode]();
            }
        }
    }

    function selectFunction(mode) {
        return function () {
            if (!ready) return;
            if (selectedMode !== mode) {
                setSelectMode(mode);
            }
        }
    }
    
    setClickEvent(viewButtons, selectFunction(0));
    setClickEvent(codeButtons, selectFunction(1));
    // setClickEvent(historyButtons, selectFunction(2));

    references.splice(0, references.length);

    let hash = location.hash;
    if (hash.length === 0) {
        throw new Error('No file');
    } 
    let file = hash.replace(/^#!/, '');
    let parsedPath;

    let md = MarkdownIt();
    md.renderer.rules.image = function (tokens, idx, options, env, slf) {
        let token = tokens[idx];
        if (token.content.startsWith('video:')) {
            let url;
            for (let attr of token.attrs) {
                if (attr[0] === 'src') {
                    url = new URL(attr[1]);
                    if (url.toString().indexOf('embed') < 0) {
                        url = new URL('https://www.youtube.com/embed/' + url.searchParams.get('v'));
                    }
                }
            }
            return `<iframe class="inner-video" src="${url.toString()}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>`+
            `</iframe>`;
        } else {
            for (let attr of token.attrs) {
                if (attr[0] === 'src') {
                    let src = attr[1];
                    if (!src.match(/^https?:\/\//)) {
                        attr[1] = path.normalize('/docs/' + src);
                    }
                }
            }
            return slf.renderToken(tokens, idx, options);
        }
    };

    function findReference(urls) {
        for (let ref of references) {
            if (ref.links.length === urls.length) {
                let match = true;
                for (let i = 0, t = urls.length; i < t; ++i) {
                    if (urls[i] !== ref.links[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return ref;
                }
            }
        }
    }
    md.renderer.rules.link_open = function (tokens, idx, options, env, slf) {
        let open = tokens[idx];
        let text = tokens[idx + 1];
        let close = tokens[idx + 2];
        
        let content = text.content;
        let urls = [];
        for (let attr of open.attrs) {
            if (attr[0] === 'href') {
                let arr = attr[1].split('#@');
                for (let url of arr) {
                    if (url.match(/^https?:\/\//)) {
                        urls.push(url);
                    } else {
                        urls.push('#!/docs/' + url);
                    }
                }
            }
        }

        if (content.startsWith('ref:')) {
            open.attrPush(['class', 'wiki-ref-link']);
            let ref = findReference(urls);
            if (!ref) {
                ref = new Reference({
                    links: urls,
                    content: content,
                    index: references.length,
                });
                references.push(ref);
            } 
            open.attrSet('href', `javascript:jumpToRef(${ref.index})`);
            open.attrPush(['id', `wiki-ref-${ref.index}`]);
            content = content.substring(4);
            open.attrSet('title', content);
            text.content = `[${ref.index + 1}]`;
        } else if (urls.length > 0) {
            let url = urls[0];
            if (!url.match(/^https?:\/\//)) {
                open.attrSet('href', url);
                open.attrSet('class', 'preview-ref');
                open.attrSet('data-file', url.replace(/^#!/, ''));
            }
        }

        return slf.renderToken(tokens, idx, options);
    };

    let currentHeading;
    md.renderer.rules.heading_open = function (tokens, idx, options, env, slf) {
        let open = tokens[idx];
        let text = tokens[idx + 1];
        let close = tokens[idx + 2];

        if (open.tag === 'h1') {
            let index = headings.length;
            let heading = new Heading({
                index,
                text: text.content,
            });
            open.attrSet('id', `heading-${index}`);
            currentHeading = heading;
            headings.push(heading);
        } else if (open.tag === 'h2') {
            let index = currentHeading.children.length;
            let heading = new Heading({
                index,
                text: text.content,
            });
            open.attrSet('id', `heading-${currentHeading.index}-${index}`);
            currentHeading.children.push(heading);
        }

        return slf.renderToken(tokens, idx, options);
    };

    let docTitle = document.getElementById('doc-title');
    let docContent = document.getElementById('doc-content');
    let wikiRefs = document.getElementById('wiki-refs');
    let codeTitle = document.getElementById('code-title');
    let historyButton = document.getElementById('history-desktop');
    let his2Button = document.querySelector('#history-mobile a');
    let editButton = document.getElementById('edit-button');
    let titleElement = document.querySelector('title');

    function _renderContent(text, url) {
        let hash = location.hash;
        if (hash.length === 0) {
            throw new Error('No file');
        } 
        file = hash.replace(/^#!/, '');
        parsedPath = path.parse(file);

        let historyLink = `https://github.com/${config.owner}/${config.repo}/commits/main/docs${file}`;
        historyButton.setAttribute('href', historyLink);

        his2Button.setAttribute('href', historyLink);

        editButton.setAttribute('href', `https://github.com/${config.owner}/${config.repo}/edit/main/docs${file}`);

        ready = true;
        references.splice(0, references.length);
        headings.splice(0, headings.length);
        let strText = md.render(text);
        headings.push(new FixedHeading({
            index: headings.length,
            text: '引用',
            id: 'refs-heading',
        }));
        let title = decodeURI(parsedPath.name);
        titleElement.innerText = title;
        docTitle.innerText = title;
        codeTitle.innerText = `${title}.md`;
        docContent.innerHTML = strText;
        wikiRefs.innerHTML = '';
        for (let i = 0, t = references.length; i < t; ++i) {
            let ref = references[i];
            wikiRefs.append(ref.element);
        }
        codeMirror.setValue(text);
        codeMirror.refresh();

        menuList.innerHTML = '';
        for (let heading of headings) {
            menuList.appendChild(heading.getElement());
        }

        let previewRefs = docContent.querySelectorAll('.preview-ref');
        setupPreview(previewRefs);

        processParams(url.searchParams);
    }

    async function _loadDocument(docUrl) {
        try {
            let url;
            if (docUrl instanceof URL) {
                url = docUrl;
            } else {
                url = new URL(location.origin + docUrl);
            }
            currentFile = url.pathname;
            let cached = CachedData.getWithTime(currentFile);
            let oldText;
            if (cached) {
                oldText = cached.value;
                _renderContent(oldText, url);
                _fadeOut(STATE_SUCCESS);
            }

            if (!cached || cached.time + 30 * 60 * 1000 < new Date().getTime()) {
                loading = true;
                ProgressBar.progress(0.8);
                console.log('load ' + currentFile);
                let res = await fetch(`.${currentFile}`);
                if (!(res.status >= 200 && res.status < 300)) {
                    throw new Error(`Http state ${res.status}`);
                }
                let text = await res.text();
                CachedData.set(currentFile, text);
                ProgressBar.complete();
                
                if (text !== oldText) {
                    _renderContent(text, url);
    
                    if (!cached) {
                        _fadeOut(STATE_SUCCESS);
                    }
                }

                loading = false;
            }
            
        } catch (e) {
            console.log(e);
            ProgressBar.error();
            _fadeOut(STATE_ERROR);
            loading = false;
        }
    }

    _loadDocument(file);
}

if (wikiElement) {
    _setupWiki(wikiElement);
}