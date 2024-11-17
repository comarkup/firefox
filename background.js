let activePopup = null;
let pendingMessages = new Map();

// Helper function to handle errors
function handleError(error) {
    console.error('[Background] Error:', error);
    return { error: error.message };
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
                    // Store the sender tab ID
                    activePopup = {
                        tabId: sender.tab.id,
                        frameId: null
                    };
                    resolve({ success: true });
                    break;

                case 'POPUP_LOADED':
                    if (activePopup) {
                        // Store the popup frame ID
                        activePopup.frameId = sender.frameId;
                        // Send initialization data back to the same frame
                        browser.tabs.sendMessage(
                            sender.tab.id,
                            {
                                type: 'INIT_POPUP',
                                tabId: activePopup.tabId
                            },
                            { frameId: sender.frameId }
                        ).catch(error => {
                            console.error('[Background] Error sending INIT_POPUP:', error);
                        });
                    }
                    resolve({ success: true });
                    break;

                case 'POPUP_READY':
                    if (activePopup && activePopup.tabId) {
                        // Notify content script that popup is ready
                        sendToContent(activePopup.tabId, { type: 'POPUP_READY' });
                    }
                    resolve({ success: true });
                    break;

                case 'RENDER_CODE':
                    if (activePopup && activePopup.frameId) {
                        // Forward render code message to popup frame
                        browser.tabs.sendMessage(
                            sender.tab.id,
                            message,
                            { frameId: activePopup.frameId }
                        ).catch(error => {
                            console.error('[Background] Error forwarding RENDER_CODE:', error);
                        });
                    }
                    resolve({ success: true });
                    break;

                case 'RENDER_COMPLETE':
                    if (activePopup && activePopup.tabId) {
                        sendToContent(activePopup.tabId, { type: 'RENDER_COMPLETE' });
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
