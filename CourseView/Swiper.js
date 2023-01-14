export class SwiperManager {
    #cSize = 3
    #buffer = []
    #buildData = function (idx) { }
    current = [0, 0]
    dataBlock = []
    #cacheBlock = []
    error = true

    constructor(config) {
        if(config.cacheSize == undefined) this.error = true
        else this.error = false
        this.#cSize = config.cacheSize
        this.#buildData = config.buildData
        this.#buffer = config.buffer
        this.#cacheBlock = []
        this.dataBlock = []
    }

    init(idx) {
        let front = (this.#cSize / 2) | 0
        for (let i = 0; i < this.#cSize; i++) {
            let block = Math.max(1, idx - front + i)
            this.#buffer[this.#correct(i-front)] = this.#buildBlockData(block)
            this.dataBlock[this.#correct(i-front)] = block
        }
        this.current[0] = idx
        this.current[1] = 0
    }

    printCurrent() {
        let str = ''
        for (let i = 0; i < this.#cSize; i++) {
            let block = this.dataBlock[i]
            if (i === this.current[1]) str += '[' + block + '] '
            else str += block + ' '
        }
        console.log(str)
    }

    #correct = function (n) {
        n %= this.#cSize
        if (n < 0) n += this.#cSize
        return n
    }

    #buildBlockData = function (idx, flush) {
        if (flush == undefined) flush = false
        if (!flush && this.#cacheBlock[idx] !== undefined) return this.#cacheBlock[idx]
        else return this.#buildData(idx)
    }

    scrollLeft() {
        this.current[0] = Math.max(1, this.current[0] - 1)
        let n = this.current[1] - 1
        n = this.#correct(n)
        this.current[1] = n

        let block = Math.max(1, this.current[0] - 1)
        let nn = this.#correct(n - 1)
        let res = false
        let half = (this.#cSize / 2) | 0

        if (this.dataBlock[nn] !== block) {
            for (let i = 0; i < half; i++) {
                nn = this.#correct(nn - i)
                this.#buffer[nn] = this.#buildBlockData(Math.max(1, block - i))
                this.dataBlock[nn] = Math.max(1, block - i)
            }
            res = true
        }
        if (block == 0) {
            let block = this.current[0] + 1
            let nn = this.#correct(n + 1)
            if (this.dataBlock[nn] !== block) {
                for (let i = 0; i < half; i++) {
                    nn = this.#correct(nn + i)
                    this.#buffer[nn] = this.#buildBlockData(block + i)
                    this.dataBlock[nn] = block + i
                }
                res = true
            }
        }
        return res
    }

    scrollRight() {
        this.current[0] = Math.max(0, this.current[0] + 1)
        let n = this.current[1] + 1
        n = this.#correct(n)
        this.current[1] = n
        let half = (this.#cSize / 2) | 0

        let block = this.current[0] + 1
        let nn = this.#correct(n + 1)
        if (this.dataBlock[nn] !== block) {
            for (let i = 0; i < half; i++) {
                nn = this.#correct(nn + i)
                this.#buffer[nn] = this.#buildBlockData(block + i)
                this.dataBlock[nn] = block + i
            }
            return true
        }
        return false
    }

    scrollTo(idx, flush) {
        let half = (this.#cSize / 2) | 0
        let n = this.current[1]
        let block = idx

        let nn = n - 1;
        let nb = block - 1;
        for (let i = 0; i < half; i++) {
            nn = this.#correct(nn - i)
            this.#buffer[nn] = this.#buildBlockData(Math.max(1, nb - i), flush)
            this.dataBlock[nn] = Math.max(1, nb - i)
        }
        nn = n + 1;
        nb = block + 1;
        for (let i = 0; i < half; i++) {
            nn = this.#correct(nn + i)
            this.#buffer[nn] = this.#buildBlockData(nb + i, flush)
            this.dataBlock[nn] = nb + i
        }
        this.#buffer[n] = this.#buildBlockData(idx, flush)
        this.dataBlock[n] = idx
        this.current[0] = idx
    }

    setBuffer(buffer) {
        this.#buffer = buffer
    }

    refresh(flush) {
        this.scrollTo(this.current[0], flush)
    }

    getCacheSize() {
        return this.#cSize
    }
}