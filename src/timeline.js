
const fetch = require('./fetch');
// const Animon = require('animon');
const path = require('path');
const moment = require('moment');
const Appear = require('./appear');
const getAnimation = require('./element_animation');

const MarginTop = 0;
const ImportentSize = 40;
const NormalSize = 12;

class TimelineItem {
    constructor({
        date,
        file,
        des
    }) {
        this.date = date;
        this.file = file;
        this.des = des;

        this.parsed = path.parse(this.file);
        this.filePath;
        this.importent = false;
        if (this.parsed.ext[this.parsed.ext.length - 1] === '!') {
            this.importent = true;
            this.filePath = 'doc.html#!/docs/' + encodeURI(this.parsed.name + this.parsed.ext.substring(0, this.parsed.ext.length - 1));
        } else {
            this.filePath = 'doc.html#!/docs/' + encodeURI(this.parsed.name + this.parsed.ext);
        }
    }

    get element() {
        if (!this._element) {
            let itemElem = document.createElement('div');
            itemElem.className = this.importent ? 'importent-item' : 'timeline-item';
    
            let content = document.createElement('div');
            content.className = 'content';
            itemElem.appendChild(content);
    
            let dot = document.createElement('div');
            dot.className = 'dot';
            content.appendChild(dot);

            let text = document.createElement('div');
            text.className = 'text';
            content.appendChild(text);
    
            let time = document.createElement('span');
            time.className = 'time';
            time.innerText = moment(this.date).format('YYYY年MM月DD日');
            text.appendChild(time);
    
            let title = document.createElement('a');
            title.className = 'title';
            title.href = this.filePath;
            title.innerText = this.parsed.name;
            text.appendChild(title);
    
            let des = document.createTextNode(this.des);
            text.appendChild(des);

            itemElem.dataset.appear = 'appear';

            Appear(itemElem);
            this._element = itemElem;
        }

        return this._element;
    }
}

class GroupItem {
    constructor() {
        this._element = document.createElement('div');
        this._element.className = 'timeline-dropdown-item';
        this._element.innerHTML = `<div class="content">
        <div class="dot">
            <i class="icon-plus"></i>
        </div>
        <div class="timeline-slot-hint">
            <i class="icon-dot-3"></i>
        </div>
    </div>
    <div class="timeline-slots">
        <div class="timeline-slots-footer">
            <div class="dot">
                <i class="icon-up-open-mini"></i>
            </div>
            <div class="content">
                <i class="icon-up-open-mini"></i>
            </div>
        </div>
    </div>`;

        this.extendDot = this._element.querySelector('.dot');
        this.slots = this._element.querySelector('.timeline-slots');

        this.footer = this._element.querySelector('.timeline-slots-footer');

        this._element.querySelector('.content').onclick = this.onClick.bind(this);
        this.footer.onclick = this.onClick.bind(this);
    }

    get element() {
        return this._element;
    }

    append(child) {
        this.slots.insertBefore(child.element, this.footer);
    }

    onClick() {
        if (this._element.classList.contains('extend')) {
            getAnimation(this.slots).dropUp({
                onComplete: () => {
                    this._element.classList.remove('extend');
                    this.slots.style.removeProperty('display');
                }
            });
        } else {
            this._element.classList.add('extend');
            getAnimation(this.slots).dropDown();
            setTimeout(() => {
                for (let el of this.slots.children) {
                    if (el.classList.contains('timeline-item')) {
                        el.classList.add('appear');
                        break;
                    }
                }
            }, 100);
        }
    }
}

let items = [];

async function setupTimeline(el) {
    let data = await fetch('timeline.yaml', {type: 'yaml'});

    let offset = 0;
    let lastOffset = 0;
    let temp = [];

    function sortAndEach(data, fn) {
        let arr = [];
        for (let key in data) {
            arr.push({
                num: parseInt(key),
                value: data[key]
            });
        }
        arr = arr.sort(function (item1, item2) {
            return item1.num - item2.num;
        });
        for (let item of arr) {
            fn(item.num, item.value);
        }
    }

    function createItem(date, value) {
        let file, des = '';
        if (typeof(value) === 'string') {
            file = value;
        } else {
            file = value.file;
            des = value.des;
        }

        return new TimelineItem({
            date,
            file,
            des
        });
    }

    let rawItems = [];
    const timelineItems = document.querySelector('.timeline-items');
    sortAndEach(data, function (year, data) {
        sortAndEach(data, function (month, data) {
            sortAndEach(data, function (day, data) {
                for (let itemData of data) {
                    rawItems.push(createItem(`${year}-${month}-${day}`, itemData));
                }
            });
        });
    });

    items = [];

    let group;
    for (let item of rawItems) {
        if (item.importent) {
            items.push(item);
            group = null;
        } else {
            if (!group) {
                group = new GroupItem();
                items.push(group);
            }
            group.append(item);
        }
    }

    timelineItems.innerHTML = '';
    for (let item of items) {
        timelineItems.appendChild(item.element);
    }

    let order = true;
    let orderButton = document.getElementById('order-button');
    let icon = orderButton.querySelector('i');
    let footerIcon = document.querySelector('.timeline-footer .dot i');
    orderButton.onclick = function () {
        order = !order;
        timelineItems.innerHTML = '';
        if (order) {
            icon.className = 'icon-down';
            footerIcon.className = 'icon-dot-3';
            for (let item of items) {
                timelineItems.appendChild(item.element);
            }
        } else {
            icon.className = 'icon-up';
            footerIcon.className = 'icon-record';
            for (let item of items) {
                timelineItems.insertBefore(item.element, timelineItems.firstChild);
            }
        }
    };

    getAnimation(document.querySelector('.timeline-loading')).fadeOut();
    getAnimation(document.querySelector('.timeline-body')).fadeIn();
}

const el = document.getElementById('timeline');
if (el) {
    setupTimeline(el);
}