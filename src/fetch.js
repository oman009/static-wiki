
const YAML = require('yaml')

module.exports = async function(url, ops = {}) {
    let {type} = ops;
    let cacheTime = 60000 * 10;
    let cacheKey = 'fetch_cache:' + url;
    let cache = localStorage.getItem(cacheKey);
    if (cache) {
        cache = JSON.parse(cache);
    }
    let result;
    if (!cache || (cache.date + cacheTime) < (new Date()).getTime()) {
        let res = await fetch(url);
        result = await res.text();
        localStorage.setItem(cacheKey, JSON.stringify({
            date: (new Date()).getTime(),
            value: result
        }))
    } else {
        result = cache.value;
    }
    switch (type) {
        case 'yaml':
            return YAML.parse(result);
        case 'json':
            return JSON.parse(result);
        default:
            return result;
    }
}