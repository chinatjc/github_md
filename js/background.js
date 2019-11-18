const handleListenerMessage = (() => {
    // const fnList = [{cmd: 'syncConfig', fn: () => {}, _this: window}];
    const fnList = [];
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        this.tabIdList = [];
        this.login();
        this.logout();
    }
    login() {
        const cmd = 'login';
        const fn = (request, sender, sendResponse) => {
            const tabId = sender.tab.id;
            if (!this.tabIdList.includes(tabId)) {
                this.tabIdList.push(tabId);
            }
        };
        handleListenerMessage({cmd, fn, _this: this});
    }
    logout() {
        const cmd = 'logout';
        const fn = (request, sender, sendResponse) => {
            const tabId = sender.tab.id;
            if (this.tabIdList.includes(tabId)) {
                this.tabIdList = this.tabIdList.filter(id => id !== tabId);
            }
        };
        handleListenerMessage({cmd, fn, _this: this});
    }
}

class Config {
    constructor({registerTabId: {}} = {}) {
        this.registerTabId = registerTabId;

        this.enable = true;
        this.token = '';
        this.duration = 500;

        this.initValue();
        this.listenerMessage();
    }
    setValue(key, value) {
        if (this[key] === value) {
            return;
        }
        this[key] = value;
        chrome.storage.sync.set({[key]: value});
        this.sendMessage.call(this);
    }
    initValue() {
        // init storage -> background
        Object.keys(this).map(key => {
            chrome.storage.sync.get(key, obj => {
                this.setValue.call(this, key, obj[key] === undefined ? config[key] : obj[key]);
            });
        });
    }
    listenerMessage() {
        const cmd = 'syncConfig';
        const fn = (request, sender, sendResponse) => {
            sendResponse(this); 
        };
        handleListenerMessage({cmd, fn, _this: this});
    }
    sendMessage() {
        this.registerTabId.tabIdList.map(tabId => {
            chrome.tabs.sendMessage(tabId, {cmd: 'syncConfig'});
        });
    }
}

const registerTabId = new RegisterTabId();
var config = new Config({registerTabId});

