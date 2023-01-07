export const onRequest = async ({ request, next, env }) => {
    try {
        const param = await request.json()
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', param.code)
        params.append('client_id', '107571405')
        params.append('client_secret', '31ffa915289d6da3751ee4a4273d5713674e742b4e5108574deee0647770f6ed')
        params.append('redirect_uri', 'https://www.onecourse.top/CourseView')
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