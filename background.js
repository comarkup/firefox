let activePopup = null;

// Helper function to handle errors
function handleError(error) {
    console.error('[Background] Error:', error);
    return { error: error.message };
}

// Helper function to send message to content script
async function sendToContent(tabId, message) {
    if (!tabId) {
        console.warn('[Background] No tab ID provided for content message');
        return { error: 'No tab ID provided' };
    }

    try {
        return await browser.tabs.sendMessage(tabId, message);
    } catch (error) {
        console.error('[Background] Error sending message to content:', error);
        return { error: error.message };
    }
}

// Message handler
browser.runtime.onMessage.addListener((message, sender) => {
    console.log('[Background] Received message:', message, 'from:', sender);

    // Return a promise that resolves with the appropriate response
    return Promise.resolve((async () => {
        try {
            switch (message.type) {
                case 'OPEN_POPUP':
                    // Store the sender tab ID
                    activePopup = {
                        tabId: sender.tab.id,
                        frameId: null
                    };
                    return { success: true };

                case 'POPUP_LOADED':
                    if (activePopup) {
                        // Store the popup frame ID
                        activePopup.frameId = sender.frameId;
                        try {
                            // Send initialization data back to the same frame
                            await browser.tabs.sendMessage(
                                sender.tab.id,
                                {
                                    type: 'INIT_POPUP',
                                    tabId: activePopup.tabId
                                },
                                { frameId: sender.frameId }
                            );
                            return { success: true };
                        } catch (error) {
                            console.error('[Background] Error sending INIT_POPUP:', error);
                            return handleError(error);
                        }
                    }
                    return { error: 'No active popup' };

                case 'POPUP_READY':
                    if (activePopup && activePopup.tabId) {
                        // Notify content script that popup is ready
                        const response = await sendToContent(activePopup.tabId, { type: 'POPUP_READY' });
                        return response || { success: true };
                    }
                    return { error: 'No active popup' };

                case 'RENDER_CODE':
                    if (activePopup && activePopup.frameId) {
                        try {
                            // Forward render code message to popup frame
                            await browser.tabs.sendMessage(
                                sender.tab.id,
                                message,
                                { frameId: activePopup.frameId }
                            );
                            return { success: true };
                        } catch (error) {
                            console.error('[Background] Error forwarding RENDER_CODE:', error);
                            return handleError(error);
                        }
                    }
                    return { error: 'No active popup frame' };

                case 'RENDER_COMPLETE':
                    if (activePopup && activePopup.tabId) {
                        const response = await sendToContent(activePopup.tabId, { type: 'RENDER_COMPLETE' });
                        return response || { success: true };
                    }
                    return { error: 'No active popup' };

                case 'RENDER_ERROR':
                    if (activePopup && activePopup.tabId) {
                        const response = await sendToContent(activePopup.tabId, {
                            type: 'RENDER_ERROR',
                            error: message.error
                        });
                        return response || { success: true };
                    }
                    return { error: 'No active popup' };

                case 'POPUP_CLOSED':
                    if (activePopup && activePopup.tabId) {
                        const response = await sendToContent(activePopup.tabId, { type: 'POPUP_CLOSED' });
                        activePopup = null;
                        return response || { success: true };
                    }
                    activePopup = null;
                    return { success: true };

                default:
                    return { error: 'Unknown message type' };
            }
        } catch (error) {
            console.error('[Background] Error handling message:', error);
            return handleError(error);
        }
    })());
});

// Clean up when extension is unloaded
browser.runtime.onSuspend.addListener(async () => {
    if (activePopup && activePopup.tabId) {
        await sendToContent(activePopup.tabId, { type: 'POPUP_CLOSED' });
    }
    activePopup = null;
});
