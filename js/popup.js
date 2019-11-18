// backgroundPage
const backgroundPage = chrome.extension.getBackgroundPage();
const config = backgroundPage.config;
const setConfigValue = config.setValue;

// dom
const enableBtn = document.querySelector('#enable');
const tokenInput = document.querySelector('#token');

// init view
enableBtn.checked = config.enable;
tokenInput.value = config.token;

// add action
enableBtn.onchange = e => {
    const checked = e.target.checked;
    setConfigValue.call(config, 'enable', checked);
};

tokenInput.onchange = e => {
    const value = e.target.value.trim();
    setConfigValue.call(config, 'token', value);
};

