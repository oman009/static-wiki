
const addEventListenerOnce = require('./event_once');
const CachedData = require('./cached_data');
const config = require('../config.json');
const path = require('path');
const MiniSearch = require('minisearch').default;
const apiURL = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/docs/docs`;

const HistoryKey = 'search_history';

let historyList = CachedData.get(HistoryKey) || [];
let dataList = null;

async function asyncUpdate() {
    let res = await fetch(apiURL);
    let json = await res.json();
    
    if (Array.isArray(json)) {
        dataList = [];
        for (let d of json) {
            let p = path.parse(d.name);
            if (p.name === 'README'/* || p.ext.toLowerCase() !== '.md'*/) {
                continue;
            }
            dataList.push({
                id: dataList.length,
                name: p.name,
                path: d.path,
            });
        }
        CachedData.set(apiURL, dataList);
    }
}

function setupSearch(elements) {

    let readyCallbacks = [];
    let data = CachedData.getWithTime(apiURL);
    function _asyncUpdate() {
        asyncUpdate().then(function() {
            for (let cb of readyCallbacks) {
                cb();
            }
        });
    }
    if (data) {
        dataList = data.value;

        if (new Date().getTime() - data.time > 10 * 60 * 1000) {
            _asyncUpdate();
        }
    } else {
        _asyncUpdate();
    }

    /**
     * 
     * @param {HTMLElement} input 
     */
    function setupInput(input) {
        let minisearch = new MiniSearch({
            fields: ['name'],
            storeFields: ['name', 'path'],
        });

        let container = document.createElement('div');
        container.className = 'search-hints';
        container.style.display = 'none';

        let list = document.createElement('ul');
        list.className = 'list-unstyled w-100';
        let loading = document.createElement('div');
        loading.className = 'spinner';

        
        if (dataList) {
            minisearch.addAll(dataList);
            container.append(list);
        } else {
            container.append(loading);
        }
        readyCallbacks.push(function () {
            minisearch.removeAll();
            minisearch.addAll(dataList);

            if (loading.parentElement === container) {
                container.removeChild(loading);
                container.append(list);
            }
            update();
        });
        container.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        document.body.append(container);

        input.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        function disappearCallback() {
            container.style.display = 'none';
            window.removeEventListener('click', disappearCallback);
        }

        input.onfocus = function (e) {
            let rect = input.getBoundingClientRect();
            if (rect.width > 0) {
                container.style.left = `${rect.left}px`;
                container.style.top = `${rect.bottom + 4}px`;
                container.style.width = `${rect.width}px`;
                container.style.display = 'flex';

                window.addEventListener('click', disappearCallback);
            }
        };

        input.oninput = function () {
            update();
        };

        update();
        function update() {
            if (!dataList) return;
            list.innerHTML = '';
            let str = input.value.trim();
            let data = [];
            if (str.length === 0) {
                let count = 0;
                let cached = {};
                for (let item of historyList) {
                    if (count >= 30) 
                        break;
                    cached[item.path] = true;
                    data.push(item);
                    ++count;
                }
                for (let item of dataList) {
                    if (cached[item.path]) continue;
                    if (count >= 30) 
                        break;
                    data.push(item);
                    ++count;
                }
            } else {
                data = minisearch.search(str, {
                    prefix: true
                });
            }

            for (var d of data) {
                let li = document.createElement('li');
                let text = d.name;
                let key = input.value.trim();
                let keyLength = key.length;
                if (keyLength > 0) {
                    let pos = text.length;
                    while (pos > 0) {
                        pos = text.lastIndexOf(key, pos);
                        if (pos >= 0) {
                            text = `${text.substring(0, pos)}<b>${text.substring(pos, pos + keyLength)}</b>${text.substring(pos + keyLength)}`;
                            pos -= 1;
                        }
                    }
                }
                
                li.innerHTML = text;
                li.dataset['name'] = d.name;
                li.dataset['path'] = d.path;
                li.title = d.name;
                li.onclick = searchItemClicked;
                list.appendChild(li);
            }
        }

        function searchItemClicked() {
            let name = this.dataset['name'];
            let path = this.dataset['path'];
            for (let i = 0, t = historyList.length; i < t; ++i) {
                let item = historyList[i];
                if (item.path === path) {
                    historyList.splice(i, 1);
                    --i;
                    --t;
                }
            }
            historyList.unshift({
                name,
                path
            });
            CachedData.set(HistoryKey, historyList);
            location.href = '/doc.html#/' + encodeURI(path);
            disappearCallback();
        }
    }

    for (let el of elements) {
        setupInput(el);
    }
}

let elements = document.querySelectorAll('#search-input, #input-mobile');

if (elements.length > 0) {
    setupSearch(elements);
}