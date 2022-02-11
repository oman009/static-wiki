
module.exports = {
    nextFrame() {
        return new Promise(function (resolve, reject) {
            requestAnimationFrame(function (e) {
                resolve(e);
            });
        });
    },
    wait(time) {
        return new Promise(function (resolve, reject) {
            setTimeout(function (e) {
                resolve(e);
            }, time);
        });
    },
    getOffset(el) {
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            bottom: rect.top + window.scrollY + rect.height,
            right: rect.left + window.scrollX + rect.width,
        };
    }
};