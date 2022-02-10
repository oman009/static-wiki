
const utils = require('./utils');

const STATE_WAITING = 0;
const STATE_RESOLVE = 1;
const STATE_ERROR = 2;

class PromiseController {
    constructor() {
        this.state = STATE_WAITING;

        let that = this;
        this._promise = new Promise(function (resolve, reject) {
            that._cbs = {
                resolve,
                reject
            };
        });
    }
    
    complete(result) {
        if (this.state === STATE_WAITING) {
            this.state = STATE_RESOLVE;

            this._cbs.resolve(result);
        }
    }

    error(err) {
        if (this.state === STATE_ERROR) {
            this.state = STATE_RESOLVE;

            this._cbs.reject(err);
        }
    }

    get promise() {
        return this._promise;
    }
}

/**
 * 
 * @param {HTMLElement} element 
 * @param {*} key 
 * @param {*} fn 
 * @returns 
 */
async function waitTransation(element, key, fn) {

    function transationEnd(e) {
        if (key && key !== e.propertyName) {
            return;
        }
        fn();
    }

    return new Promise(function (resolve, reject) {
        element.addEventListener('transitionend', transationEnd);
    });
}

class Animation extends PromiseController {
    constructor(element, transationKey, callbacks) {
        super();
        this.element = element;
        this.transationKey = transationKey;
        this.callbacks = callbacks;

    }

    transationEnd(e) {
        if (this.canceled) return;
        if (this.transationKey && this.transationKey !== e.propertyName) {
            return;
        }
        this.complete();
    }

    cancel() {
        this.canceled = true;
        this.element.removeEventListener('transitionend', this._fn);
        this.error(new Error('Canceled'));
    }

    async run() {
        let cbs = this.callbacks;
        let computedStyle;
        if (cbs.prepare) {
            this.element.style.removeProperty('transition');
            await utils.wait(30);
            if (this.canceled) return;
            cbs.prepare(this.element);
            computedStyle = copyStyle(getComputedStyle(this.element));
            if (cbs.postPrepare) {
                cbs.postPrepare(this.element);
            }
            await utils.nextFrame();
            if (this.canceled) return;
            if (cbs.from) {
                cbs.from(this.element, computedStyle);
                await utils.nextFrame();
                if (this.canceled) return;
            }
        } else {
            computedStyle = copyStyle(getComputedStyle(this.element));
        }
        cbs.animate(this.element, computedStyle);
        this._fn = this.transationEnd.bind(this);
        this.element.addEventListener('transitionend', this._fn);
        try {
            await this.promise;
            if (this.canceled) return;
            cbs.complete(this.element);
        } catch (error) {
        }
    }
}

function copyStyle(style) {
    return {
        width: style.width,
        height: style.height,
    };
}

class AnimationController {
    constructor(element) {
        this.element = element;
    }

    async animate(options) {
        if (this.animation) {
            this.animation.cancel();
        }
        this.animation = new Animation(this.element, options.transationKey, options);
        return this.animation.run();
    }

    fadeIn(ops) {
        ops = ops || {};
        let display = ops.display || 'block';
        let offset = ops.offset || 0;
        return this.animate({
            prepare(element) {
                element.style.opacity = '0';
                element.style.transform = `translateY(${offset}px)`;
                element.style.display = display;
            },
            postPrepare(element) {
                element.style.transition = 'opacity 300ms, transform 300ms';
            },
            animate(element, computedStyle) {
                element.style.opacity = '1';
                element.style.transform = `translateY(0px)`;
            },
            complete(element) {
                element.style.removeProperty('transition');
            }
        });
    }

    fadeOut(ops) {
        ops = ops || {};
        let offset = ops.offset || 0;
        return this.animate({
            prepare(element) {
                element.style.removeProperty('transition');
            },
            postPrepare(element) {
               element.style.transition = 'opacity 300ms, transform 300ms';
            },
            from(element) {
                element.style.transform = `translateY(0px)`;
            },
            animate(element, computedStyle) {
                element.style.opacity = '0';
                element.style.transform = `translateY(${offset}px)`;
            },
            complete(element) {
                element.style.removeProperty('transition');
                element.style.display = 'none';
            }
        });
    }

    dropDown(ops) {
        ops = ops || {};
        let display = ops.display || 'block';
        let onComplete = ops.onComplete;
        return this.animate({
            prepare(element) {
                element.style.height = 'auto';
                element.style.display = display;
                element.style.removeProperty('transition');
            },
            postPrepare(element) {
                element.style.removeProperty('height');
                element.style.transition = 'height 300ms';
            },
            from(element) {
                element.style.height = '0';
            },
            animate(element, computedStyle) {
                element.style.height = computedStyle.height;
            },
            complete(element) {
                element.style.removeProperty('transition');
                element.style.height = 'auto';
                element.style.removeProperty('overflow');
                if (onComplete)
                    onComplete();
            }
        });
    }

    dropUp(ops) {
        ops = ops || {};
        let onComplete = ops.onComplete;
        return this.animate({
            prepare(element) {
                element.style.removeProperty('transition');
                element.style.overflow = 'hidden';
            },
            postPrepare(element) {
                element.style.transition = 'height 300ms';
            },
            from(element, computedStyle) {
                element.style.height = computedStyle.height;
            },
            animate(element, computedStyle) {
                element.style.height = '0';
            },
            complete(element) {
                element.style.removeProperty('transition');
                element.style.height = '0';
                element.style.removeProperty('overflow');
                if (onComplete)
                    onComplete();
            }
        });
    }
}

let controllers = {};
let idCounter = 0x172;

/**
 * 
 * @param {HTMLElement} element 
 * @return {AnimationController}
 */
module.exports = function (element) {
    let id = element.dataset['aid'];
    if (!id) {
        id = (idCounter++).toString();
        element.dataset['aid'] = id;
    }
    let ctrl = controllers[id];
    if (!ctrl) {
        ctrl = controllers[id] = new AnimationController(element);
    }
    return ctrl;
};