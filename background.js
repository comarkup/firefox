let activePopup = null;
let pendingMessages = new Map();

// Helper function to handle errors
function handleError(error) {
    console.error('[Background] Error:', error);
    return { error: error.message };
}

// Helper function to send message to popup
async function sendToPopup(message) {
    if (!activePopup) {
        console.warn('[Background] No active popup to send message to');
        return;
    }

    try {
        return await browser.runtime.sendMessage(message);
    } catch (error) {
        console.error('[Background] Error sending message to popup:', error);
        // If we get an error sending to the popup, assume it's closed
        activePopup = null;
    }
}

// Helper function to send message to content script
async function sendToContent(tabId, message) {
    if (!tabId) {
        console.warn('[Background] No tab ID provided for content message');
        return;
    }

    try {
        return await browser.tabs.sendMessage(tabId, message);
    } catch (error) {
        console.error('[Background] Error sending message to content:', error);
    }
}

// Message handler
browser.runtime.onMessage.addListener((message, sender) => {
    console.log('[Background] Received message:', message, 'from:', sender);

    return new Promise((resolve) => {
        try {
            switch (message.type) {
                case 'OPEN_POPUP':
                    activePopup = {
                        tabId: sender.tab.id,
                        resolve
                    };
                    // Store the resolve function to handle popup ready later
                    pendingMessages.set('POPUP_READY', resolve);
                    break;

                case 'POPUP_LOADED':
                    if (activePopup && activePopup.tabId) {
                        // Send initialization data to popup
                        sendToPopup({
                            type: 'INIT_POPUP',
                            tabId: activePopup.tabId
                        });
                    }
                    resolve({ success: true });
                    break;

                case 'POPUP_READY':
                    const pendingResolve = pendingMessages.get('POPUP_READY');
                    if (pendingResolve) {
                        pendingResolve({ success: true });
                        pendingMessages.delete('POPUP_READY');
                    }
                    // Notify content script that popup is ready
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, { type: 'POPUP_READY' });
                    }
                    resolve({ success: true });
                    break;

                case 'RENDER_COMPLETE':
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, { 
                            type: 'RENDER_COMPLETE'
                        });
                    }
                    resolve({ success: true });
                    break;

                case 'RENDER_ERROR':
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, {
                            type: 'RENDER_ERROR',
                            error: message.error
                        });
                    }
                    resolve({ success: true });
                    break;

                case 'POPUP_CLOSED':
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, { type: 'POPUP_CLOSED' });
                        activePopup = null;
                        pendingMessages.clear();
                    }
                    resolve({ success: true });
                    break;

                case 'CLOSE_POPUP':
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, { type: 'POPUP_CLOSED' });
                        activePopup = null;
                        pendingMessages.clear();
                    }
                    resolve({ success: true });
                    break;

                default:
                    console.warn('[Background] Unknown message type:', message.type);
                    resolve({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('[Background] Error handling message:', error);
            resolve({ error: error.message });
        }
    });
});

// Clean up when extension is unloaded
browser.runtime.onSuspend.addListener(() => {
    if (activePopup && activePopup.tabId) {
        sendToContent(activePopup.tabId, { type: 'POPUP_CLOSED' });
    }
    activePopup = null;
    pendingMessages.clear();
});
