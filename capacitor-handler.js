(function () {
    /**
     * Capacitor Hardware Back Button Handler
     * Refined for robust navigation and app exit.
     */
    function setupBackButton() {
        // Safe access to the Capacitor App plugin
        const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;

        // If the plugin isn't ready yet, retry after a short delay
        if (!App) {
            setTimeout(setupBackButton, 200);
            return;
        }

        // Remove existing listeners to avoid duplicates
        if (App.removeAllListeners) {
            App.removeAllListeners();
        }

        // Add custom listener
        App.addListener('backButton', function (data) {
            const path = window.location.pathname;

            // Define sub-app directories (folder names)
            const subApps = [
                'salary',
                'emi',
                'pay-revision',
                'dcrg',
                'housing',
                'sip',
                'calculator'
            ];

            // Check if we are currently in a sub-app
            // look for '/salary/' explicitly to avoid partial matches
            const isSubPage = subApps.some(folder => path.includes('/' + folder + '/'));

            if (isSubPage) {
                // CASE 1: In a Sub-App -> Navigate BACK to Home
                // Use 'replace' to modify history, effectively stepping back up
                window.location.replace('../index.html');

            } else {
                // CASE 2: At Home (or unknown root) -> EXIT App
                // Try Capacitor exit method first
                try {
                    App.exitApp();
                } catch (e) {
                    console.error("App.exitApp failed:", e);
                }

                // Fallback for older WebView interfaces or if Capacitor fails
                if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp();
                } else if (navigator.device && navigator.device.exitApp) {
                    navigator.device.exitApp();
                }
            }
        });
    }

    // Initialize
    if (document.readyState === 'complete') {
        setupBackButton();
    } else {
        window.addEventListener('load', setupBackButton);
    }
})();
