define([], function() {
    'use strict';
    return function(message) {
        if (typeof atmosphere !== 'undefined') {
            publicData.socket = atmosphere.subscribe(_.extend(message.configuration, {
                onOpen: function() {
                    if (atmosphere.util.__socketPromiseFulfill) {
                        atmosphere.util.__socketPromiseFulfill(publicData.socket);
                    } {
                        atmosphere.util.__socketOpened = true;
                    }
                },
                onError: function() {
                    // TODO: show overlay
                },
                onClose: function() {
                    atmosphere.util.__socketOpened = false;
                },
                onMessage: function(response) {
                    processMainMessage({
                        type: 'websocketMessage',
                        responseBody: response.responseBody
                    });
                }
            }));
        }
    };
})
