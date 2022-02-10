
/**
 * 
 * @param {HTMLElement} el 
 * @param {*} event 
 * @param {*} fn 
 */
 function addEventListenerOnce(el, event, fn, checker = null) {
    el.addEventListener(event, function method(e) {
        if (checker) {
            if (!checker(e)) return;
        }
        fn(e);
        el.removeEventListener(event, method);
    });
}

module.exports = addEventListenerOnce;