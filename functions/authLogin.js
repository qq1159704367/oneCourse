export const onRequest = async ({ request, next, env }) => {
    try {
        const param = await request.json()
        const params = new URLSearchParams();
        params.append('client_id', '104588881')
        params.append('client_secret', 'e226e17d22244939cfecafd70de25c1387435c890b7a9a9ce5d2cbd4f35e055f')
        if (param.type == 0) {
            params.append('grant_type', 'authorization_code');
            params.append('code', param.code)
            params.append('redirect_uri', 'https://www.onecourse.top/CourseView/LoginCheck')
        } else {
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', param.code)
        }
        return await fetch('https://oauth-login.cloud.huawei.com/oauth2/v3/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
            method: 'post'
        })
    } catch (e) {
        return new Response(e, {
            headers: {
            'Content-Type': 'text/plain'
        }})
    }
};