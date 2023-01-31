import * as utils from './utils.js'

const set_sotrage = utils.getStorage({
    priority: ['indexeddb'],
    name: 'Set'
})
const time_sotrage = utils.getStorage({
    priority: ['indexeddb'],
    name: 'Time'
})

const buildTimesV = function(times) {
    if (times instanceof Array) {
        let tv = []
        times.forEach(v => {
            tv.push(utils.time2num_float(v))
        })
        return tv
    }
}

const buildTimes = function(data) {
    if (data.last) {
        let times = [data.last]
        times = times.concat(...data.times)
        return times
    }
}

export class TimeTable{
    times = []
    timesV = []
    complexTime = []
    complexName = []
    type = 0
    end = 24
    length = 0
    normalLast = null
    constructor() {
    }

    static async loadTimeTable(uid) {
        let keys = await time_sotrage.keys()
        if (uid == null || uid === '' || keys.indexOf(uid) == -1) {
            uid = (await set_sotrage.get('nowTimeTableUID')).nowTimeTableUID
            if (uid == undefined) {
                if (keys.length == 0) {
                    return {
                        timeTable: this.defaultTime(),
                        timeCombine: []
                    }
                } else {
                    uid = keys[0]
                }
            }
        }
        let tt = (await time_sotrage.get(uid))[uid]
        let res = JSON.parse(tt)
        let data = res.timeTable
        let timeTable = new TimeTable()
        timeTable.type = (data.last ? 0 : 1)
        if (timeTable.type === 0) {
            timeTable.times = buildTimes(data)
            timeTable.timesV = buildTimesV(timeTable.times)
            timeTable.length = timeTable.times.length
        } else {
            timeTable.complexTime = data.times
            timeTable.complexName = data.names
            timeTable.length = data.times.length
        }
        timeTable.countEnd()
        return [timeTable, res.timeCombine];
    }

    static buildSimple(times) {
        let timeTable = new TimeTable()
        timeTable.times = utils.copy(times)
        timeTable.timesV = buildTimesV(timeTable.times)
        timeTable.type = 0
        timeTable.length = timeTable.times.length
        timeTable.countEnd()
        return timeTable;
    }

    static defaultTime() {
        let timeTable = new TimeTable()
        timeTable.times = ['01:45', '08:30', '10:30', '14:00', '16:00', '18:45', '20:45']
        timeTable.timesV = [1.75, 8.5, 10.5, 14, 16, 18.75, 20.75]
        timeTable.type = 0
        timeTable.end = 22.5
        timeTable.length = timeTable.times.length
        return timeTable;
    }

    buildTimeShowing() {
        let ts = []
        for (let i = 1; i < this.getBlockLength() + 1; i++) {
            ts.push({
                name: this.getName(i),
                time: this.getStart(i),
                last: this.getLast(i)
            })
        }
        return ts
    }

    clone() {
        let tt = new TimeTable()
        tt.times = utils.copy(this.times)
        tt.timesV = utils.copy(this.timesV)
        tt.type = this.type
        tt.end = this.end
        tt.length = this.length
        return tt;
    }

    getLastV(i) {
        if (this.type === 0) {
            return this.timesV[0]
        } else {
            i = Math.min(i, this.complexTime.length)
            return utils.time2num_float(this.complexTime[i - 1].last)
        }
    }

    getLast(i) {
        if (this.type === 0) {
            return this.times[0]
        } else {
            i = Math.min(i, this.complexTime.length)
            return this.complexTime[i - 1].last
        }
    }

    getStartV(i) {
        if (this.type === 0) {
            i = Math.min(i, this.times.length - 1)
            return this.timesV[i]
        } else {
            i = Math.min(i, this.complexTime.length)
            return utils.time2num_float(this.complexTime[i - 1].time)
        }
    }

    getStart(i) { // i use normal number, start from 1
        console.log(i)
        if (this.type === 0) {
            i = Math.min(i, this.times.length - 1)
            return this.times[i]
        } else {
            i = Math.min(i, this.complexTime.length)
            return this.complexTime[i - 1].time
        }
    }

    getName(i) {
        if (this.type === 0) {
            return String(i)
        } else {
            i = Math.min(i, this.complexName.length)
            return this.complexName[i - 1]
        }
    }

    getBlockLength() {
        if (this.type === 0) {
            return this.times.length - 1
        } else {
            return this.complexTime.length
        }
    }

    getMainBlockLength() {
        let num = 0;
        for (let i=1; i<this.length+this.type; i++) {
            if (this.isMainBlock(i)) num++;
        }
        return num
    }

    isMainBlock(i) {
        return this.getLastV(i) > 0.3333
    }

    buildBlocks(height, st) {
        let blocks = []
        for (let i=1; i<this.length+this.type; i++) {
            blocks.push({
                top: (this.getStartV(i) - st) * height,
                height: this.getLastV(i) * height
            })
        }
        return blocks
    }

    getNormalLast() {
        if (this.type === 0) {
            return this.timesV[0]
        } else {
            if (this.normalLast == null) {
                let l = this.countLast()
                this.normalLast = l / this.length
            }
            return this.normalLast
        }
    }

    findBlock(moment) {
        let block = 0, len = this.getBlockLength() + 1
        for (block = 1; block < len; block++) {
            if (moment < this.getStartV(block)) break
        }
        return block
    }

    findBlockInBlock(moment) {
        let s = 0
        let block = 0, len = this.getBlockLength() + 1
        for (block = 1; block < len; block++) {
            if (moment < s) break
            s += this.getLastV(block) * 2
        }
        return block
    }

    buildTimeString() {
        let s = [['', '']]
        for (let i=1; i<this.length+this.type; i++) {
            s.push([
                this.getStart(i),
                utils.num2time_float(this.getStartV(i) + this.getLastV(i))
            ])
        }
        return s
    }

    countLastInBlock() {
        return ((this.countLast() * 12) | 0)
    }

    countLast() {
        let l = 0
        for (let i=1; i<this.length+this.type; i++) {
            l += this.getLastV(i);
        }
        return l
    }

    countBlock(s) {
        let l = 0
        for (let i=1; i<this.length+this.type && i<s; i++) {
            l += this.getLastV(i);
        }
        return Math.round(l * 12)
    }

    countBlockAtEnd(e) {
        let l = 0
        for (let i=1; i<this.length+this.type && i<=e; i++) {
            l += this.getLastV(i);
        }
        return Math.round(l * 12)
    }

    countEnd() {
        this.end = this.getStartV(this.length - 1) + this.getLastV(this.length - 1)
    }

    findStart(str) {
        for (let i = 1; i < this.length+this.type; i++) {
            if (this.getStart(i) === str) return i;
        }
        return -1;
    }

    toSave() {
        if (this.type === 0) {
            return {
                times: this.times.slice(1),
                last: this.times[0]
            }
        } else {
            return {
                times: this.complexTime,
                names: this.complexName
            }
        }
    }

    remove(i) {
        if (this.type === 0) {
            this.times.splice(i, 1)
            this.timesV.splice(i, 1)
            this.countEnd()
            this.length--
        } else {
            this.complexTime.splice(i, 1)
            this.complexName.splice(i, 1)
            this.countEnd()
            this.length--
        }
    }

    add(time, last) {
        if (this.type === 0) {
            this.times.push(time)
            this.timesV.push(utils.time2num_float(time))
            this.countEnd()
            this.length ++
            return this.length
        } else {
            this.complexName.push(String(this.complexName.length + 1))
            this.complexTime.push({
                time: time,
                last: last
            })
            this.countEnd()
            this.length ++
            return this.length
        }
    }

    changeLast(time, i) {
        if (this.type === 0) {
            this.times[0] = time
            this.timesV[0] = utils.time2num_float(time)
            this.countEnd()
        } else {
            this.complexTime[i - 1].last = time
            this.countEnd()
        }
    }

    change(time, i) {
        if (this.type === 0) {
            this.times[i] = time
            this.times = [this.times[0], ...this.times.slice(1).sort((t1, t2) => {
                return utils.time2num_float(t1) - utils.time2num_float(t2)
            })]
            this.timesV = buildTimesV(this.times)
            this.countEnd()
        } else {
            this.complexTime[i - 1].time = time
            this.complexTime.sort((t1, t2) => {
                return utils.time2num_float(t1.time) - utils.time2num_float(t2.time)
            })
            this.countEnd()
        }
    }

    convertToComplex() {
        let tt = this.clone()
        tt.complexTime = []
        tt.complexName = []
        tt.type = 1
        tt.times.slice(1).forEach((t, i) => {
            tt.complexName.push(String(i + 1))
            tt.complexTime.push({
                time: t,
                last: this.times[0]
            })
        })
        tt.length = tt.complexName.length
        return tt;
    }

    static toBlock(l) {
        return ((l * 12) | 0)
    }
}