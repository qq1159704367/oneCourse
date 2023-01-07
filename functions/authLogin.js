export const onRequest = async ({ request, next, env }) => {
    try {
        const param = await request.json()
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', param.code)
        params.append('client_id', '107571549')
        params.append('client_secret', '5c0d2fa94e2e202342501927bb020129c86fdab5d68a44afbbb24995003c19c8')
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