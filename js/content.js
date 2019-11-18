const handleListenerMessage = (() => {
    // const fnList = [{cmd: 'syncConfig', fn: () => {}, _this: window}];
    const fnList = [];
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.cmd === 'console') {
            console.log(JSON.parse(request.value));
            return;
        }

        fnList.some(item => {
            if (request.cmd === item.cmd) {
                item.fn.call(item._this, request, sender, sendResponse);
                return true;
            }
            return false;
        });
    });

    return item => {
        if (fnList.includes(item)) {
            return;
        }
        fnList.push(item);
    };
})();

class RegisterTabId {
    constructor() {
        this.login();
    }
    login() {
        chrome.runtime.sendMessage({cmd: 'login'});
    }
    logout() {
        chrome.runtime.sendMessage({cmd: 'logout'});
    }
}

class Config {
    constructor() {
        this.listenerMessage();
        this.sendMessage();
    }
    sendMessage() {
        chrome.runtime.sendMessage({cmd: 'syncConfig'}, this.syncData.bind(this));
    }
    listenerMessage() {
        const cmd = 'syncConfig';
        const fn = (request, sender, sendResponse) => {
            if (request.cmd === 'syncConfig') {
                this.sendMessage.call(this);
            }
        };
        handleListenerMessage({cmd, fn, _this: this});
    }
    syncData(config) {
        Object.keys(config).map(key => {
            this[key] = config[key];
        });
    }
}

class Handle {
    constructor(config) {
        this.config = config;
        this.mdText = '';
        this.pathname = window.location.pathname;
        this.href = window.location.href;

        this.init();
    }
    async renderHtml(mdText) {
        const Authorization = this.config.token ? `token ${this.config.token}` : '';

        await fetch(
            'https://api.github.com/markdown',
            {
                method: 'POST',
                body: JSON.stringify({
                    mode: 'gfm',
                    context: 'github/gollum',
                    text: mdText 
                }),
                headers: {
                    Authorization
                }
            }
        )
        .then(response => {
            return response.text();
        })
        .then(htmlCode => {
            document.querySelector('#markdownBody').innerHTML = htmlCode;
        });
    }
    watchMd() {
        // 不使用github_md时，停止执行代码，并且恢复到md状态
        if (!this.config.enable) {
            window.location.reload();
        }

        new Promise((resolve, reject) => {
            // 获取当前md
            // 添加版本号，获取最新的数据
            fetch(`${this.href.split('#')[0]}?v=${+new Date()}`)
            .then(response => {
                return response.text();
            })
            .then(mdText => {
                resolve(mdText);
            });
        })
        .then(async (mdText) => {
            // 获取 storage 的md
            const storageMdText = sessionStorage[this.pathname] || '';

            // 比较 storage / md
            if (storageMdText !== mdText) {
                sessionStorage[this.pathname] = mdText;
                await this.renderHtml.call(this, mdText);
            }
            setTimeout(this.watchMd.bind(this), this.config.duration);
        })
        .catch(err => {
            console.error(err);
        });
    }
    initDom() {
        let mdDom = document.querySelector('body > pre');
        // md 为空的情况
        if (mdDom === null) {
            mdDom = document.createElement('pre');
            document.body.appendChild(mdDom);
        }

        this.mdText = mdDom.innerHTML;
        mdDom.outerHTML = '<main id="markdownBody" class="markdown-body"></main>';
    }
    watchEnable(resolve) {
        const timer = setInterval(() => {
            if (this.config.enable) {
                resolve();
                clearInterval(timer);
            }
        }, 500); 
    }
    init() {
        new Promise((resolve, reject) => {
            if (this.config.enable) {
                return resolve();
            }
            this.watchEnable.call(this, resolve);
        })
        .then(() => {
            // init dom
            this.initDom.call(this);

            // 无需监测本地文件变化，渲染出结果即可
            if (this.href.startsWith('file:///')) {
                this.renderHtml.call(this, this.mdText);
                return;
            }

            // 清空相应的sessionStorage
            sessionStorage[this.pathname] = '';

            // watch markdown 是否有变化，及时调整文档
            this.watchMd.call(this);
        })
        .catch(e => {
            console.error(e);
        });
    }
}

const registerTabId = new RegisterTabId();
const config = new Config(); 

window.onload = () => {
    new Handle(config);
};

window.onbeforeunload = () => {
    registerTabId.logout();
};

