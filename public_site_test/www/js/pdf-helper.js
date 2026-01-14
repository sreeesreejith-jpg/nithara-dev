window.PDFHelper = {
    /**
     * Share a PDF blob using Capacitor or Web Share API
     */
    share: async function (blob, fileName, title) {
        console.log('PDFHelper.share initiation', { fileName });
        const cap = window.Capacitor;
        const isNative = !!(cap && (cap.isNative || (cap.Plugins && cap.Plugins.Filesystem)));

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share) {
                console.log('Native sharing detected');

                // 1. Request/Check Permissions
                try {
                    const status = await cap.Plugins.Filesystem.checkPermissions();
                    if (status.publicStorage !== 'granted') {
                        await cap.Plugins.Filesystem.requestPermissions();
                    }
                } catch (pErr) {
                    console.warn('Permission check failed, continuing anyway', pErr);
                }

                // 2. Convert Blob to Base64
                const base64Data = await this._blobToBase64(blob);

                // 3. Save to Temporary Directory
                const fileResult = await cap.Plugins.Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: 'CACHE'
                });

                console.log('Native file saved for sharing:', fileResult.uri);

                // 4. Share
                await cap.Plugins.Share.share({
                    title: title || 'Report',
                    text: 'View my calculation report from Nithara Apps',
                    url: fileResult.uri,
                    files: [fileResult.uri]
                });

                return { success: true, method: 'native-share' };
            } else if (navigator.share) {
                console.log('Web Share API detected');
                const file = new File([blob], safeFileName, { type: 'application/pdf' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: title || 'Report'
                    });
                    return { success: true, method: 'web-share' };
                } else {
                    console.log('Web Share API - no file support, fallback to download');
                    return await this.download(blob, safeFileName);
                }
            } else {
                console.log('No sharing API available, using download');
                return await this.download(blob, safeFileName);
            }
        } catch (err) {
            console.error("PDFHelper Share Error details:", err);
            // Alert user if native share fails
            if (isNative && err.name !== 'AbortError') {
                alert("Share failed: " + (err.message || err.toString()) + "\n\nPlease try 'Download PDF' instead.");
            }
            if (err.name !== 'AbortError') {
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
        const isNative = !!(cap && (cap.isNative || (cap.Plugins && cap.Plugins.Filesystem)));

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative && cap.Plugins && cap.Plugins.Filesystem) {
                console.log('Native save initiated');

                // Check Permissions
                try {
                    const status = await cap.Plugins.Filesystem.checkPermissions();
                    if (status.publicStorage !== 'granted') {
                        await cap.Plugins.Filesystem.requestPermissions();
                    }
                } catch (pErr) {
                    console.log('Permission error', pErr);
                }

                const base64Data = await this._blobToBase64(blob);

                // Save to Documents (better for download)
                const fileResult = await cap.Plugins.Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: 'DOCUMENTS',
                    recursive: true
                });

                console.log('Native save success:', fileResult.uri);
                alert("✅ Report saved successfully!\n\nFile: " + safeFileName + "\nLocation: Your Downloads/Documents folder.");

                return { success: true, method: 'native-save', uri: fileResult.uri };
            } else {
                console.log('Standard browser download initiated');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = safeFileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 1000);

                return { success: true, method: 'browser-download' };
            }
        } catch (err) {
            console.error("PDFHelper Download Error details:", err);
            if (isNative) {
                alert("Download failed: " + (err.message || err.toString()));
                // Ultimate fallback for native
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
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
                const base64 = typeof result === 'string' ? result.split(',')[1] : '';
                resolve(base64);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(blob);
        });
    }
};
