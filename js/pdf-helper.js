window.PDFHelper = {
    /**
     * Share a PDF blob using Capacitor or Web Share API
     */
    share: async function (blob, fileName, title) {
        console.log('PDFHelper.share initiation', { fileName, size: blob.size });

        const cap = window.Capacitor;
        const isNative = !!(cap && (cap.isNative || (cap.getPlatform && cap.getPlatform() !== 'web')) && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share);

        // Debug help:
        if (!cap && /android/i.test(navigator.userAgent)) {
            console.warn("Capacitor bridge not detected in Android environment");
            // alert("DEBUG: Capacitor Bridge Missing! PDF functions may fail.");
        }

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative) {
                console.log('Native sharing detected');

                // 1. Permission Check
                try {
                    if (cap.Plugins.Filesystem.checkPermissions) {
                        const status = await cap.Plugins.Filesystem.checkPermissions();
                        if (status.publicStorage !== 'granted' && status.storage !== 'granted') {
                            await cap.Plugins.Filesystem.requestPermissions();
                        }
                    }
                } catch (pErr) {
                    console.warn('Permission check failed', pErr);
                }

                // 2. Write to Cache (Required for Sharing)
                const base64Data = await this._blobToBase64(blob);
                const fileResult = await cap.Plugins.Filesystem.writeFile({
                    path: safeFileName,
                    data: base64Data,
                    directory: 'CACHE'
                });

                console.log('Native file saved for share:', fileResult.uri);

                // 3. Share the File URI
                await cap.Plugins.Share.share({
                    title: title || 'Report',
                    text: 'View my calculation report',
                    files: [fileResult.uri], // Capacitor 5+ prefers files array
                    dialogTitle: 'Share PDF'
                });

                return { success: true, method: 'native-share' };

            } else if (navigator.share) {
                console.log('Web Share API detected');
                const file = new File([blob], safeFileName, { type: 'application/pdf' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: title || 'Report',
                        text: 'PDF Report'
                    });
                    return { success: true, method: 'web-share' };
                } else {
                    console.warn('navigator.share available but file sharing NOT supported. Falling back.');
                    return await this.download(blob, safeFileName);
                }
            } else {
                console.log('No sharing API available, falling back to download');
                return await this.download(blob, safeFileName);
            }
        } catch (err) {
            console.error("PDFHelper Share Error:", err);
            if (err.name !== 'AbortError' && !err.toString().includes('AbortError')) {
                alert("Share failed (" + (err.message || 'Error') + "). Attempting download instead...");
                return await this.download(blob, safeFileName);
            }
            throw err;
        }
    },

    /**
     * Download/Save a PDF blob
     */
    download: async function (blob, fileName) {
        console.log('PDFHelper.download initiation', { fileName });

        const cap = window.Capacitor;
        const isNative = !!(cap && (cap.isNative || (cap.getPlatform && cap.getPlatform() !== 'web')) && cap.Plugins && cap.Plugins.Filesystem);

        // Debug help:
        if (!cap && /android/i.test(navigator.userAgent)) {
            console.warn("Capacitor bridge not detected in Android environment");
        }

        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        const safeFileName = fileName.replace(/[^a-z0-9.]/gi, '_');

        try {
            if (isNative) {
                console.log('Native save initiated');
                const base64Data = await this._blobToBase64(blob);

                // Attempt to save to DOCUMENTS
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
                console.log('Browser download initiated');
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const url = URL.createObjectURL(blob);

                if (isMobile) {
                    // On mobile, direct redirection is often more reliable than a link click
                    window.location.href = url;
                    console.log('Mobile browser: Redirected to PDF blob URL');
                    return { success: true, method: 'browser-mobile-open' };
                } else {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = safeFileName;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();

                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 5000); // Increased timeout for stability

                    return { success: true, method: 'browser-download' };
                }
            }
        } catch (err) {
            console.error("PDFHelper Download Error:", err);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            alert("Auto-download failed. Opening PDF in new tab if possible...");
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

