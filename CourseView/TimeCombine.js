
export class TimeCombine{
    constructor(combine) {
        this.combine = combine
    }
    combine = []

    fixTimeCombine(blockLen) {
        if (this.combine.length === 0) {
            let t = []
            for(let i=1;i<blockLen;i++){
                t.push([i])
            }
            this.combine = t
        } else {
            let n = 0
            let t = JSON.parse(JSON.stringify(this.combine))
            for (let i = 0;i < t.length; i++) {
                for(let j=0;j<t[i].length; j++){
                    if(t[i][j] >= blockLen) {
                        t[i].splice(j)
                        break
                    }
                    if(t[i][j] != n + 1){
                        if(j != 0){
                            t[i] = [...t[i].slice(0, j), n + 1, ...t[i].slice(j)]
                        }else{
                            t = [...t.slice(0, i), [n + 1], ...t.slice(i)]
                            i ++
                            j --;
                        }
                    }
                    n ++;
                }
            }
            for(let i=0;i<t.length;i++){
                if(t[i].length == 0){
                    t.splice(i, 1)
                    i--
                }
            }
            for(let i=n+1;i<blockLen;i++){
                t.push([i])
            }
            this.combine = t
        }
    }

    static defaultTimeCombine() {
        return new TimeCombine([])
    }

    unlock(bIdx, idx) {
        if(idx == 0) return this.combine;
        let block = this.combine[bIdx]
        let t1 = block.slice(0, idx)
        let t2 = block.slice(idx)
        this.combine[bIdx] = t1
        this.combine = [...this.combine.slice(0, bIdx + 1), t2, ...this.combine.slice(bIdx + 1)]
        return this.combine;
    }

    lock(bIdx) {
        if(bIdx != 0){
            this.combine[bIdx-1] = this.combine[bIdx-1].concat(this.combine[bIdx])
            this.combine.splice(bIdx, 1)
        }
        return this.combine
    }
}