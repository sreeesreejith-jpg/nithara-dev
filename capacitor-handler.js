(function () {
    /**
     * Capacitor Hardware Back Button Handler
     * Robust approach used by most mobile web apps.
     */
    function setupBackButton() {
        const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;

        if (!App) {
            setTimeout(setupBackButton, 200);
            return;
        }

        if (App.removeAllListeners) {
            App.removeAllListeners();
        }

        function forceExit() {
            try {
                if (App && App.exitApp) {
                    App.exitApp();
                }
            } catch (e) { }
            try {
                if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp();
                }
            } catch (e) { }
            window.close();
            setTimeout(() => {
                window.location.href = "about:blank";
            }, 300);
        }

        App.addListener('backButton', function () {
            const path = window.location.pathname;

            // List of sub-app identifiers
            const subApps = ['/salary/', '/pay-revision/', '/dcrg/', '/emi/', '/sip/', '/housing/', '/calculator/'];
            const isSubApp = subApps.some(app => path.includes(app));

            if (!isSubApp) {
                // CASE 1: At Portal/Home -> EXIT
                forceExit();
            } else {
                // CASE 2: Inside a sub-app -> GO BACK
                // If there's history, use it. If not (app opened here), go to Portal.
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '../index.html';
                }
            }
        });
    }

    if (document.readyState === 'complete') {
        setupBackButton();
    } else {
        window.addEventListener('load', setupBackButton);
    }
})();
