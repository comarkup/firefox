let activePopup = null;

browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'OPEN_POPUP') {
        return new Promise((resolve) => {
            activePopup = {
                tabId: sender.tab.id,
                resolve
            };
        });
    }
});
