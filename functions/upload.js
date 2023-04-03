function getKey() {
    const keyArray = new Uint8Array([226, 217, 164, 101, 207, 244, 15, 227, 156, 160, 10, 30, 40, 236, 177, 7])
    return crypto.subtle.importKey("raw", keyArray, "AES-GCM", true, [
        "encrypt",
        "decrypt",
    ]);
}

async function decrypt(key, str) {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(atob(str).split(',').map(v => parseInt(v)))))
}

const iv = new Uint8Array([212, 0, 218, 48, 230, 115, 127, 192, 236, 255, 165, 157])

const randomString = function (len) {
    const set = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
    const max = set.length;
    let res = ''
    for (let i = 0; i < len; i++) {
        res += set[(Math.random() * max) | 0];
    }
    return res;
}

export const onRequest = async ({ request, next, env }) => {
    try {
        if (request.method == 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://ffffffds.gitee.io',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })
        }

        const key = await getKey()

        const param = await request.json()
        try {
            let boundary = randomString(10)
            let sendData = `--${boundary}\r\nContent-Type:application/json\r\n\r\n${JSON.stringify(param.option)}\r\n--${boundary}\r\nContent-Type:application/octet-stream\r\n\r\n${param.base64Data}\r\n--${boundary}--`
            let response = await fetch(`https://driveapis.cloud.huawei.com.cn/upload/drive/v1/files/${param.id}?uploadType=multipart`, {
                headers: {
                    'Content-Type': 'multipart/related;boundary=' + boundary,
                    'Authorization': 'Bearer ' + await decrypt(key, param.token)
                },
                method: 'put',
                body: sendData
            })
            return response
        } catch (e) {
            return new Response(e, {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': 'https://ffffffds.gitee.io',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })
        }
    } catch (e) {
        return new Response(e, {
            status: 400,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': 'https://ffffffds.gitee.io',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        })
    }
};