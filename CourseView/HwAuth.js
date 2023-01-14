const AppClientId = '104588881'
const ServiceClientId = '104588881'

var LoginCallback = null
const checkAccessTokenAndStorage = function(token, callback) {
    $.ajax({
        url: 'https://driveapis.cloud.huawei.com.cn/drive/v1/about?fields=*',
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + token
        },
        success(data, status) {
            if (status == 'success') {
                let all = data.storageQuota.userCapacity
                let used = data.storageQuota.usedSpace
                if (all - used > 5 * 1024 * 1024) {
                    callback({ code: 0 })
                } else {
                    callback({ code: 1, error: '云空间内存不足' })
                }
            } else {
                callback({ code: 1, error: '登录过期' })
            }
        }
    })
}

const getAccessToken = function (isApp, callback) {
    let refresh_token = $.cookie(isApp ? 'RefreshToken' : 'RefreshTokenService')
    if (refresh_token == undefined) {
        LoginCallback = callback
        let loginUrl = 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize?' +
            'response_type=code&access_type=offline&state=state_parameter_passthrough_value' +
            '&client_id=' + (isApp ? AppClientId : ServiceClientId) +
            '&redirect_uri=' + 'https://www.onecourse.top/CourseView/LoginCheck' +
            '&scope=' + 'https://www.huawei.com/auth/drive.appdata';
        window.open(loginUrl)
    } else {
        $.ajax({
            url: 'https://www.onecourse.top/authLogin',
            contentType: 'application/json',
            data: JSON.stringify({
                type: 1,
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

const checkCloud = function(isApp, callback) {
    let token = $.cookie(isApp ? 'AuthToken' : 'AuthTokenService')
    if (token != undefined) {
        checkAccessTokenAndStorage(token, (res) => {
            if (res.code == 0) {
                callback({ code: 0 })
            } else if (res.error === '登录过期') {
                getAccessToken(isApp, (data) => {
                    if (data.code === 0) {
                        $.cookie(isApp ? 'AuthToken' : 'AuthTokenService', data.access_token, { expires: new Date(new Date().getTime() + 60 * 60 * 1000) })
                        $.cookie(isApp ? 'RefreshToken' : 'RefreshTokenService', data.refresh_token, { expires: 180 })
                        checkAccessTokenAndStorage(token, (res) => {
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
                $.cookie(isApp ? 'AuthToken' : 'AuthTokenService', data.access_token, { expires: new Date(new Date().getTime() + 60 * 60 * 1000) })
                $.cookie(isApp ? 'RefreshToken' : 'RefreshTokenService', data.refresh_token, { expires: 180 })
                checkAccessTokenAndStorage(token, (res) => {
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