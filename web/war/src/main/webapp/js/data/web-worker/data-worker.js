var BASE_URL = '../../..',
    self = this,
    publicData = {};

setupConsole();
setupWebsocket();
setupRequireJs();

onmessage = function(event) {
    require([
        'underscore',
        'util/promise'
    ], function() {
        onMessageHandler(event);
    })
};

function setupConsole() {
    if (typeof console === 'undefined') {
        console = {
            log: log('log'),
            info: log('info'),
            debug: log('debug'),
            error: log('error'),
            warn: log('warn'),
        };
    }
    function log(type) {
        return function() {
            dispatchMain('brokenWorkerConsole', {
                logType: type,
                messages: Array.prototype.slice.call(arguments, 0)
            });
        }
    }
}

function setupWebsocket() {
    var supportedInWorker = !!(this.WebSocket || this.MozWebSocket);

    if (supportedInWorker) {
        self.window = self;
        importScripts('/libs/atmosphere/atmosphere.js')
        atmosphere.util.getAbsoluteURL = function() {
            return location.origin + '/messaging';
        }
        self.pushSocketMessage = function(message) {
            Promise.all([
                Promise.require('util/websocket'),
                new Promise(function(fulfill, reject) {
                    if (atmosphere.util.__socketOpened) {
                        fulfill(publicData.socket);
                    }
                    atmosphere.util.__socketPromiseFulfill = fulfill;
                    atmosphere.util.__socketPromiseReject = reject;
                })
            ]).done(function(results) {
                var pushDataToSocket = results[0],
                    socket = results[1];

                pushDataToSocket(socket, message);
            });
        }
    } else {
        dispatchMain('websocketNotSupportedInWorker');
        self.pushSocketMessage = function(message) {
            dispatchMain('websocketFromWorker', { message: message });
        }
    }
}

function setupRequireJs() {
    importScripts(BASE_URL + '/jsc/require.config.js');
    require.baseUrl = BASE_URL + '/jsc/';
    importScripts(BASE_URL + '/libs/requirejs/require.js');
}

function onMessageHandler(event) {
    var data = event.data;
    processMainMessage(data);
}

function processMainMessage(data) {
    if (data.type) {
        require(['data/web-worker/handlers/' + data.type], function(handler) {
            handler(data);
        });
    } else console.warn('Unhandled message to worker', event);
}

function dispatchMain(type, message) {
    if (!type) {
        throw new Error('dispatchMain requires type argument');
    }
    message = message || {};
    message.type = type;
    postMessage(message);
}

function ajaxPrefilter(xmlHttpRequest, method, url, parameters) {
    if (publicData) {
        var filters = [
                setWorkspaceHeader,
                setCsrfHeader
            ], invoke = function(f) {
                f();
            };

        filters.forEach(invoke);
    }

    function setWorkspaceHeader() {
        var hasWorkspaceParam = typeof (parameters && parameters.workspaceId) !== 'undefined';
        if (publicData.currentWorkspaceId && !hasWorkspaceParam) {
            xmlHttpRequest.setRequestHeader('Lumify-Workspace-Id', publicData.currentWorkspaceId);
        }
    }
    function setCsrfHeader() {
        var eligibleForProtection = !(/get/i).test(method),
            user = publicData.currentUser,
            token = user && user.csrfToken;

        if (eligibleForProtection && token) {
            xmlHttpRequest.setRequestHeader('Lumify-CSRF-Token', token);
        }
    }
}

function ajaxPostfilter(xmlHttpRequest, jsonResponse, method, url, parameters) {
    if (method === 'GET') {
        require(['data/web-worker/util/cache'], function(cache) {
            //var changes = cache.cacheAjaxResult(jsonResponse, url, workspaceId);
            // TODO: broadcast these
        });
    }
}
