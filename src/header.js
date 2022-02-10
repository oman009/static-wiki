
const getAnimation = require('./element_animation');

const translateButton = document.getElementById('translate-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

const extendButton = document.getElementById('extend-button');
const menuList = document.getElementById('menu-list');

if (extendButton) {
    let showing = false;
    extendButton.onclick = function (e) {
        let animation = getAnimation(menuList);
        showing = !showing;
        if (showing) {
            animation.dropDown();
        } else {
            animation.dropUp();
        }
    };
}