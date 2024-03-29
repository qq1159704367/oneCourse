const AppClientId = '104588881'
const ServiceClientId = '104777563'

var LoginCallback = null
var windowCheckTimer = null

const base64Encode = function (str) {
    var s = CryptoJS.enc.Utf8.parse(str);
    return CryptoJS.enc.Base64.stringify(s)
}
const base64Decode = function (str) {
    var s = CryptoJS.enc.Base64.parse(str);
    return s.toString(CryptoJS.enc.Utf8);
}

const checkAccessTokenAndStorage = function (token, checkStorage, callback) {
    $.ajax({
        url: 'https://www.onecourse.top/about',
        method: 'post',
        contentType: 'application/json',
        data: JSON.stringify({
            token
        }),
        success(data, status) {
            if (status == 'success') {
                let all = data.storageQuota.userCapacity
                let used = data.storageQuota.usedSpace
                if (!checkStorage || all - used > 5 * 1024 * 1024) {
                    callback({ code: 0 })
                } else {
                    callback({ code: 1, error: '云空间内存不足' })
                }
            } else {
                callback({ code: 1, error: '登录过期' })
            }
        },
        error() {
            callback({ code: 1, error: '登录过期' })
        }
    })
}

const getAccessToken = function (isApp, callback) {
    let refresh_token = window.localStorage.getItem(isApp ? 'RefreshToken' : 'RefreshTokenService')
    if (refresh_token == undefined) {
        LoginCallback = (obj) => {
            LoginCallback = null
            callback(obj)
        }
        let loginUrl = 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize?' +
            'response_type=code&access_type=offline&state=state_parameter_passthrough_value' +
            '&client_id=' + (isApp ? AppClientId : ServiceClientId) +
            '&redirect_uri=' + 'https://ffffffds.gitee.io/htmlcourse/LoginCheck' +
            '&scope=' + 'https://www.huawei.com/auth/drive.appdata';
        let w = window.open(loginUrl)
        windowCheckTimer = setInterval(() => {
            if (w.closed) {
                clearInterval(windowCheckTimer)
                windowCheckTimer = null
                if (LoginCallback != null) {
                    alert('用户取消登录')
                }
             }
        })
    } else {
        $.ajax({
            url: 'https://www.onecourse.top/authLogin',
            contentType: 'application/json',
            data: JSON.stringify({
                type: 1,
                isApp: isApp,
                code: refresh_token
            }),
            method: 'post',
            success(data, status, _) {
                if (status == 'success') {
                    callback({
                        code: 0,
                        access_token: data.access_token,
                        refresh_token: refresh_token
                    })
                } else {
                    $.removeCookie(isApp ? 'RefreshToken' : 'RefreshTokenService')
                    getAccessToken(isApp, callback)
                }
            },
            error() {
                $.removeCookie(isApp ? 'RefreshToken' : 'RefreshTokenService')
                getAccessToken(isApp, callback)
            }
        })
    }
}

const checkCloud = function (isApp, callback, checkStorage=true) {
    let token = window.localStorage.getItem(isApp ? 'AuthToken' : 'AuthTokenService')
    if (token != undefined) {
        checkAccessTokenAndStorage(token, checkStorage, (res) => {
            if (res.code == 0) {
                callback({ code: 0 })
            } else if (res.error === '登录过期') {
                getAccessToken(isApp, (data) => {
                    if (data.code === 0) {
                        window.localStorage.setItem(isApp ? 'AuthToken' : 'AuthTokenService', data.access_token)
                        window.localStorage.setItem(isApp ? 'RefreshToken' : 'RefreshTokenService', data.refresh_token)
                        checkAccessTokenAndStorage(data.access_token, checkStorage, (res) => {
                            if (res.code == 0) {
                                callback({ code: 0 })
                            } else {
                                callback({ code: 1, error: '登录异常' })
                            }
                        })
                    } else {
                        callback({ code: 1, error: '登录异常' })
                    }
                })
            }
        })
    } else {
        getAccessToken(isApp, (data) => {
            if (data.code === 0) {
                window.localStorage.setItem(isApp ? 'AuthToken' : 'AuthTokenService', data.access_token)
                window.localStorage.setItem(isApp ? 'RefreshToken' : 'RefreshTokenService', data.refresh_token)
                checkAccessTokenAndStorage(data.access_token, checkStorage, (res) => {
                    if (res.code == 0) {
                        callback({ code: 0 })
                    } else {
                        callback({ code: 1, error: '登录异常' })
                    }
                })
            } else {
                callback({ code: 1, error: '登录异常' })
            }
        })
    }
}

const randomString = function (len) {
    const set = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    const max = set.length;
    let res = ''
    for (let i = 0; i < len; i++) {
        res += set[(Math.random() * max) | 0];
    }
    return res;
}

const Hw_uploadToCloud = function (isApp, items, callback) {
    let token = isApp ? window.localStorage.getItem('AuthToken') : window.localStorage.getItem('AuthTokenService')
    let promises = []
    Hw_getFilesFromCloud(isApp, 'Course', (cloudCourses) => {
        let nameToId = {}
        cloudCourses.forEach(item => {
            nameToId[item.fileName.split('-')[1]] = item.id
        })
        items.forEach(item => {
            if (!item.checked) return;
            promises.push(new Promise(resolve => {
                if (item.data) {
                    let o = {
                        fileName: 'Course-' + item.name,
                        contentExtras: {
                            thumbnail: {
                                content: '5aSH5Lu95pWw5o2u',
                                mimeType: 'text/plain'
                            }
                        },
                        parentFolder: ["applicationData"]
                    }
                    $.ajax({
                        url: 'https://www.onecourse.top/upload',
                        contentType: 'application/json',
                        method: 'post',
                        data: JSON.stringify({
                            token,
                            id: nameToId[item.name] ? nameToId[item.name] : '',
                            base64Data: base64Encode(decode(item.data)),
                            option: o
                        }),
                        success(data, status) {
                            resolve(status == 'success' ? 1 : 0)
                        },
                        error() {
                            resolve(0)
                        }
                    })
                } else {
                    resolve(0)
                }
            }))
        })
        Promise.all(promises).then((vals) => {
            let all = vals.length
            let some = 0
            vals.every(v => {
                some += v
            })
            console.log(`${some} / ${all}`)
            callback(some == all)
        })
    })
}

const Hw_getFilesFromCloud = function (isApp, prefix, callback) {
    let token = isApp ? window.localStorage.getItem('AuthToken') : window.localStorage.getItem('AuthTokenService')
    $.ajax({
        url: 'https://www.onecourse.top/files',
        contentType: 'application/json',
        method: 'post',
        data: JSON.stringify({
            token
        }),
        success(data, status) {
            if (status == 'success') {
                console.log(JSON.stringify(data))
                let files = data.files
                let courses = []
                files.forEach(file => {
                    if (file.fileName.split('-')[0] === prefix) {
                        courses.push(file)
                    }
                })
                callback(courses)
            } else {
                console.error('list error')
                alert('获取云空间文件错误，请重试')
            }
        },
        error() {
            alert('登录过期，请重试')
        }
    })
}

const Hw_loadFile = function (isApp, link, callback) {
    let token = isApp ? window.localStorage.getItem('AuthToken') : window.localStorage.getItem('AuthTokenService')
    $.ajax({
        url: 'https://www.onecourse.top/download',
        contentType: 'application/json',
        method: 'post',
        data: JSON.stringify({
            token,
            id: link
        }),
        success(data, status) {
            callback({
                code: status == 'success' ? 0 : 1,
                data: data
            })
        },
        error() {
            callback({
                code: 1,
            })
        }
    })
}

const Hw_loadFromCloud = function (isApp, items, storage, callback) {
    let promises = []
    items.forEach(item => {
        if (!item.checked) return;
        promises.push(new Promise(resolve => {
            Hw_loadFile(isApp, item.id, ({ code, data }) => {
                if (code == 0) {
                    let encodeCourse = btoa(pako.gzip(encodeURIComponent(base64Decode(data)), { to: 'string' }))
                    storage.set(item.name, encodeCourse)
                }
                resolve()
            })
        }))
    })
    Promise.all(promises).then(() => {
        callback()
    })
}