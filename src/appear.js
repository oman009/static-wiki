
let observer;

function appearCallback(changes) {
    changes.forEach(change => {
        let target = change.target;
        if (change.intersectionRatio > 0) {
            setTimeout(() => {
                target.classList.add(target.dataset.appear);
            }, 30);
        } else {
            target.classList.remove(target.dataset.appear);
        }
    });
}

/**
 * 
 * @param {HTMLElement} element 
 */
module.exports = function (element) {
    if (window.IntersectionObserver) {
        if (!observer) {
            observer = new IntersectionObserver(appearCallback);
        }
        observer.observe(element);
    } else {
        element.classList.add(element.dataset.appear);
    }
};