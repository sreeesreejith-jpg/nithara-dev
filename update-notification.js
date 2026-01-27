
(function () {
    // 1. Inject CSS for the toast
    const style = document.createElement('style');
    style.innerHTML = `
        #update-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: #1e293b;
            color: #f8fafc;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            border: 1px solid #3b82f6;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.27), opacity 0.4s ease;
            opacity: 0;
            pointer-events: none;
            min-width: 300px;
        }

        #update-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            pointer-events: auto;
        }

        .toast-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
        }

        .toast-title {
            font-weight: 600;
            font-size: 0.95rem;
            color: #fff;
        }

        .toast-desc {
            font-size: 0.8rem;
            color: #94a3b8;
        }

        #reload-btn {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            transition: background-color 0.2s;
            white-space: nowrap;
        }

        #reload-btn:hover {
            background-color: #2563eb;
        }

        #dismiss-btn {
            background: none;
            border: none;
            color: #64748b;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
            display: flex;
            align-items: center;
        }

        #dismiss-btn:hover {
            color: #cbd5e1;
        }
    `;
    document.head.appendChild(style);

    // 2. Inject HTML for the toast
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.innerHTML = `
        <div class="toast-text">
            <span class="toast-title">Update Available</span>
            <span class="toast-desc">A new version is available.</span>
        </div>
        <button id="reload-btn">Update</button>
        <button id="dismiss-btn">&times;</button>
    `;
    document.body.appendChild(toast);

    // 3. Logic to handle SW updates
    const reloadBtn = document.getElementById('reload-btn');
    const dismissBtn = document.getElementById('dismiss-btn');
    let newWorker;

    function showToast() {
        toast.classList.add('show');
    }

    reloadBtn.addEventListener('click', () => {
        if (newWorker) {
            newWorker.postMessage({ action: 'skipWaiting' });
        }
        toast.classList.remove('show');
    });

    dismissBtn.addEventListener('click', () => {
        toast.classList.remove('show');
    });

    if ('serviceWorker' in navigator) {
        // Wait for registration
        navigator.serviceWorker.ready.then(reg => {
            // Check if there's already a waiting worker
            if (reg.waiting) {
                newWorker = reg.waiting;
                showToast();
            }

            // Listen for new updates
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    // When the new worker is installed and waiting
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast();
                    }
                });
            });
        });

        // Ensure page reloads when new SW takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });
    }
})();
