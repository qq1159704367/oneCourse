import { getStorage } from './sifrr.storage.module.js'

const fill = (n) => {
    if (n >= 10) return String(n);
    else return '0' + n;
}
const time2num = (time) => {
    let t = time.split(':')
    return parseInt(t[0]) * 60 + parseInt(t[1])
}
const num2time = (num) => {
    let h = (num / 60) | 0
    let m = num % 60
    return fill(h) + ':' + fill(m)
}
const time2num_float = (time) => {
    let t = time.split(':')
    return parseInt(t[0]) + parseInt(t[1]) / 60
}
const num2time_float = (num) => {
    let h = num | 0
    let m = Math.round((num % 1) * 60)
    return fill(h) + ':' + fill(m)
}
const fileterKeys = (keys) => {
    let res = []
    keys.forEach(key => {
        if (!key.startsWith('Set-')) {
            res.push(key)
        }
    })
    return res;
}
const CheckWeek = (week, weeks) => {
    if (weeks == undefined || weeks.length == 0 || !(weeks instanceof Array)) return true;
    return weeks.some(i => {
        if (typeof i === 'number') i = String(i)
        if (i.indexOf('-') == -1) {
            return Number(i) == week
        } else {
            let k = i.split('-')
            return week >= Number(k[0]) && week <= Number(k[1])
        }
    });
}
const parseDate = (str) => {
    let t = str.split('-')
    return new Date(parseInt(t[0]), parseInt(t[1]) - 1, parseInt(t[2]), 0, 0, 0)
}
const formatDate = (date) => {
    return fill(date.getMonth() + 1) + "/" + fill(date.getDate())
}
const copy = (object) => {
    return JSON.parse(JSON.stringify(object))
}
const px2num = (str) => {
    return parseInt(str.slice(0, -2))
}
const wcn = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export { getStorage, fill, time2num, num2time, time2num_float, num2time_float, fileterKeys, CheckWeek, parseDate, formatDate, copy, px2num, wcn }