window.PDFHelper = {
    /**
     * Share a PDF blob using Capacitor or Web Share API
     */
    share: async function (blob, fileName, title) {
        console.log('PDFHelper.share initiation', { fileName, size: blob.size });
        // REMOVED DEBUG ALERT to reduce noise, assuming logic fix works.

        const cap = window.Capacitor;
        // Strict Native Check: Must have Filesystem AND Share plugins
        const isNative = !!(cap && cap.isNative && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share);

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative) {
                console.log('Native sharing detected');

                // 1. Permission Check (Best Effort)
                try {
                    const status = await cap.Plugins.Filesystem.checkPermissions();
                    if (status.publicStorage !== 'granted') {
                        await cap.Plugins.Filesystem.requestPermissions();
                    }
                } catch (pErr) {
                    console.warn('Permission check failed, continuing', pErr);
                }

                // 2. Write to Cache (Required for Sharing)
                const base64Data = await this._blobToBase64(blob);
                const fileResult = await cap.Plugins.Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: 'CACHE' // Sharing usually requires CACHE or EXTERNAL_CACHE
                });

                console.log('Native file saved for share:', fileResult.uri);

                // 3. Share the File URI
                await cap.Plugins.Share.share({
                    title: title || 'Report',
                    text: 'View my calculation report',
                    url: fileResult.uri,
                    dialogTitle: 'Share PDF'
                });

                return { success: true, method: 'native-share' };

            } else {
                // WEB FALLBACK: Do not use navigator.share for files on mobile (flaky support)
                // Direct download is safer and more consistent.
                console.log('Web environment: using download fallback');
                return await this.download(blob, safeFileName);
            }
        } catch (err) {
            console.error("PDFHelper Share Error:", err);
            if (err.name !== 'AbortError') {
                alert("Share failed (" + err.message + "). Attempting to save file instead...");
                return await this.download(blob, safeFileName);
            }
            throw err;
        }
    },

    /**
     * Download/Save a PDF blob - enhanced for native support
     */
    download: async function (blob, fileName) {
        console.log('PDFHelper.download initiation', { fileName });

        const cap = window.Capacitor;
        const isNative = !!(cap && cap.isNative && cap.Plugins && cap.Plugins.Filesystem);

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative) {
                console.log('Native save initiated');
                const base64Data = await this._blobToBase64(blob);

                // Save to DOCUMENTS for permanent access
                const fileResult = await cap.Plugins.Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: 'DOCUMENTS',
                    recursive: true
                });

                console.log('Native save success:', fileResult.uri);
                alert("✅ Saved to Documents!\n\nFile: " + safeFileName);

                return { success: true, method: 'native-save', uri: fileResult.uri };

            } else {
                console.log('Browser download initiated (Opening in new tab)');

                const url = URL.createObjectURL(blob);

                // Attempt 1: Open directly (Best for Mobile Chrome)
                const newWindow = window.open(url, '_blank');

                if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                    // Popup blocked? Fallback to Anchor click
                    console.warn('Popup blocked, falling back to anchor click');
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = safeFileName;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => document.body.removeChild(link), 100);
                } else {
                    // Success - user sees PDF
                }

                return { success: true, method: 'browser-open' };
            }
        } catch (err) {
            console.error("PDFHelper Download Error:", err);

            // Ultimate Fallback: Open in New Tab
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            alert("Auto-download failed. Opening PDF in new tab...");

            throw err;
        }
    },

    /**
     * Internal: Convert Blob to Base64
     */
    _blobToBase64: function (blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (!result || typeof result !== 'string') {
                    return reject(new Error("FileReader result is empty"));
                }
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(blob);
        });
    }
};
