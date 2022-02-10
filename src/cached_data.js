
const PREFIX = 'cached_data:';

module.exports = {
    get: function (key, expire) {
        let str = localStorage.getItem(PREFIX + key);
        if (str) {
            let data = JSON.parse(str);
            if (expire) {
                if (data.time + expire < new Date().getTime()) {
                    return null;
                }
            }
            return data.value;
        }
        return null;
    },
    getWithTime(key) {
        let str = localStorage.getItem(PREFIX + key);
        if (str) 
            return JSON.parse(str);;
        return null;
    },
    set: function (key, value) {
        localStorage.setItem(PREFIX + key, JSON.stringify({
            value,
            time: new Date().getTime(),
        }));
    }
};