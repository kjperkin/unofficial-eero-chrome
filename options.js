const API_HOST = 'api-user.e2ro.com';
const API_ENDPOINT = `https://${API_HOST}/2.2`;
const KEY_TOKEN = 'token';

class Client {
    post(path, params) {
        const {data, headers = {}} = params;
        const url = `${API_ENDPOINT}/${path}`;
        return fetch(url, {
            body: JSON.stringify(params.data),
            cache: 'no-cache',
            credentials: 'include',
            headers: {
               ...headers, 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            method: 'POST',
            mode: 'cors',
            referrer: 'no-referrer'
        });
    }

    get(path, params) {
        const {data = {}, headers = {}} = params;

        const parts = [];
        for (let key in data) {
            const ekey = encodeURIComponent(key);
            const evalue = encodeURIComponent(data[value]);
            parts.push(`${ekey}=${evalue}`);
        }

        let prefix = '';
        if (parts.length > 0) {
            prefix = '?';
        }

        const query = `${prefix}${parts.join('&')}`;
        const url = `${API_ENDPOINT}/${path}${query}`;
        return fetch(url, {
            cache: 'no-cache',
            credentials: 'include',
            method: 'GET',
            headers: {
                ...headers,
                'Accept': 'application/json'
            },
            mode: 'cors',
            referrer: 'no-referrer'
        });
    }
}

function onError(err) {
    console.error(err);
}

const client = new Client();

function show(id) {
    const elts = document.getElementsByClassName('tab');
    const target = document.getElementById(id);
    for (let i = 0; i < elts.length; i++) {
        elts[i].style.display = 'none';
    }
    target.style.display = 'initial';
}

document.getElementById('login-submit').onclick = function() {
    const login = document.getElementById('identifier').value;
    console.debug(`Login: ${login}`);
    client.post('login', {
        data: {login}
    }).then(function(response) {
        console.debug(`${response.url}: [${response.status}] ${response.statusText}`);
        response.json().then(function (json) {
            if (response.ok) {
                const {data: {user_token: token}} = json;
                console.debug(`token: ${token}`);
                chrome.storage.local.set({[KEY_TOKEN]: token}, function () {
                    if (chrome.runtime.lastError) {
                        const msg = `Chrome Error: ${chrome.runtime.lastError}`;
                        onError(msg);
                    } else {
                        console.debug('Token stored successfully.');
                    }

                    show('verify');
                }); 
            } else {
                const {error = '', code} = data.meta;
                onError(`API Error: (${code}) ${error}`);
            }
        }, onError);
    });
}

document.getElementById('verify-submit').onclick = function () {
    const code = document.getElementById('code').value;
    chrome.storage.local.get(KEY_TOKEN, function (data) {
        const {token} = data;
        chrome.cookies.set({
            url: API_ENDPOINT,
            name: 's',
            value: token,
            domain: API_HOST,
            path: '/',
            secure: true,
            httpOnly: true
        }, function (cookie) {
            if (cookie) {
                console.debug(`Cookie Set: ${JSON.stringify(cookie)}`);
                client.post('login/verify', {
                    data: {code}
                }).then(function (response) {
                    console.debug(`${response.url}: [${response.status}] ${response.statusText}`);
                    response.json().then(function (json) {
                        if (response.ok) {
                            console.info("login/verify succeeded.");
                            console.debug(`login/verify response: ${JSON.stringify(json)}`);

                            window.location.reload();
                        }    
                    }, onError);                    
                });
            } else {
                onError(chrome.runtime.lastError);
            }
        });
    });
}

document.getElementById('reset').onclick = function () {
    chrome.storage.local.remove(KEY_TOKEN);
    window.location.reload();
}

chrome.storage.local.get('token', function(data) {
    const states = {};
    if (!chrome.runtime.lastError && data.token) {
        document.getElementById('token').innerText = data.token;
        show('token-info');
    } else {
        if (chrome.runtime.lastError) {
            onError(chrome.runtime.lastError);
        } else {
            console.info(`${KEY_TOKEN} is not set in local storage.`);
        }
        show('login');
    }
});
