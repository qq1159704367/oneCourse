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

async function encrypt(key, str) {
    return btoa(new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        new TextEncoder().encode(str)
    )));
}

const iv = new Uint8Array([212, 0, 218, 48, 230, 115, 127, 192, 236, 255, 165, 157])

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
        const params = new URLSearchParams();
        params.append('client_id', param.isApp ? '104588881' : '104777563')
        params.append('client_secret', param.isApp ? 'e226e17d22244939cfecafd70de25c1387435c890b7a9a9ce5d2cbd4f35e055f' : '18dc96a33f6612e52bc97bfb48b9b774fb251445077be61f82c8ecde42f2a783')
        if (param.type == 0) {
            params.append('grant_type', 'authorization_code');
            params.append('code', param.code)
            params.append('redirect_uri', 'https://ffffffds.gitee.io/htmlcourse/LoginCheck')
        } else {
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', await decrypt(key, param.code))
        }
        try {
            let response = await fetch('https://oauth-login.cloud.huawei.com/oauth2/v3/token', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params,
                method: 'post'
            })
            if (response.status == 200) {
                let body = await response.json()
                if (body['refresh_token']) {
                    body['refresh_token'] = await encrypt(key, body['refresh_token'])
                }
                if (body['access_token']) {
                    body['access_token'] = await encrypt(key, body['access_token'])
                }
                delete body['expires_in']
                delete body['id_token']
                delete body['scope']
                delete body['token_type']
                return new Response(JSON.stringify(body), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://ffffffds.gitee.io',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                })
            } else {
                return response
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