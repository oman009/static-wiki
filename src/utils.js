
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
            top: rect.top + window.scrollY
        };
    }
};