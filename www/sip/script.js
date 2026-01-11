const fields = {
    investment: document.getElementById('investment'),
    rate: document.getElementById('rate'),
    years: document.getElementById('years')
};

const display = {
    card: document.getElementById('result-card'),
    total: document.getElementById('total-value'),
    invested: document.getElementById('invested-amount'),
    returns: document.getElementById('est-returns')
};

// Clear inputs on load
window.addEventListener('load', () => {
    Object.values(fields).forEach(f => f.value = '');
    display.card.classList.remove('visible');
});

function formatAmount(num) {
    return Math.round(num).toString();
}

function calculate() {
    const P = parseFloat(fields.investment.value);
    const R = parseFloat(fields.rate.value);
    const Y = parseFloat(fields.years.value);

    if (!P || !R || !Y || P <= 0 || R <= 0 || Y <= 0) {
        display.card.classList.remove('visible');
        return;
    }

    // Monthly Rate
    const i = R / 12 / 100;
    // Total Months
    const n = Y * 12;

    // SIP Formula: P * [ (1+i)^n - 1 ] / i * (1+i)
    const totalValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const investedAmount = P * n;
    const estReturns = totalValue - investedAmount;

    // Update UI
    display.total.textContent = formatAmount(totalValue);
    display.invested.textContent = formatAmount(investedAmount);
    display.returns.textContent = formatAmount(estReturns);

    display.card.classList.add('visible');
}

Object.values(fields).forEach(field => {
    field.addEventListener('input', calculate);
});

// PDF & Sharing Logic
const prepareForPDF = () => {
    const printDate = document.getElementById('printDate');
    if (printDate) {
        printDate.textContent = "Generated on: " + new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
    document.body.classList.add('pdf-mode');
    return "SIP_Report_" + new Date().getTime();
};

const cleanupAfterPDF = () => {
    document.body.classList.remove('pdf-mode');
};

const generatePDFResult = async () => {
    // Reset scroll to top before capture
    window.scrollTo(0, 0);

    const reportTitle = prepareForPDF();
    const element = document.querySelector('.container');

    // Optimize for A4
    const opt = {
        margin: 10,
        filename: `${reportTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const cap = window.Capacitor;
        const hasNativePlugins = !!(cap && cap.Plugins && (cap.Plugins.Filesystem || cap.Plugins.Share));

        if (hasNativePlugins) {
            const Filesystem = cap.Plugins.Filesystem;
            const Share = cap.Plugins.Share;

            if (Filesystem && Share) {
                const pdfDataUri = await html2pdf().set(opt).from(element).output('datauristring');
                cleanupAfterPDF();
                return { dataUri: pdfDataUri, title: reportTitle, isNative: true };
            }
        }

        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        cleanupAfterPDF();
        return { blob: pdfBlob, title: reportTitle, isNative: false };
    } catch (err) {
        cleanupAfterPDF();
        throw err;
    }
};

const handleNativeSave = async (dataUri, filename) => {
    try {
        const cap = window.Capacitor || window.capacitor;
        const Plugins = cap?.Plugins;

        if (!Plugins) throw new Error("Capacitor Plugins not found.");

        const Filesystem = Plugins.Filesystem;
        const Share = Plugins.Share;

        if (!Filesystem) throw new Error("Filesystem plugin missing.");
        if (!Share) throw new Error("Share plugin missing.");

        const base64Data = dataUri.split(',')[1] || dataUri;

        const fileResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'CACHE'
        });

        await Share.share({
            title: 'SIP Report',
            text: 'Here is your report',
            url: fileResult.uri,
            dialogTitle: 'Save or Share PDF'
        });

    } catch (e) {
        console.error('Native save failed', e);
        alert('APK Error: ' + e.message);
    }
};

const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.addEventListener('click', async () => {
        const originalText = printBtn.innerHTML;
        printBtn.innerHTML = "<span>⏳</span> Generating...";
        printBtn.disabled = true;

        try {
            const result = await generatePDFResult();
            if (result.isNative) {
                await handleNativeSave(result.dataUri, `${result.title}.pdf`);
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(result.blob);
                link.download = `${result.title}.pdf`;
                link.click();
            }
        } catch (err) {
            console.error(err);
            alert("PDF Generation failed. Try standard print.");
            window.print();
        } finally {
            printBtn.innerHTML = originalText;
            printBtn.disabled = false;
        }
    });
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = "<span>⏳</span> Preparing...";
        shareBtn.disabled = true;

        try {
            const result = await generatePDFResult();
            if (result.isNative) {
                await handleNativeSave(result.dataUri, `${result.title}.pdf`);
            } else if (navigator.share) {
                const file = new File([result.blob], `${result.title}.pdf`, { type: 'application/pdf' });
                await navigator.share({
                    files: [file],
                    title: 'SIP Calculation Report',
                    text: 'Sharing my SIP calculation report.'
                });
            } else {
                alert("Sharing not supported on this browser.");
            }
        } catch (err) {
            console.error(err);
            alert("Sharing failed.");
        } finally {
            shareBtn.innerHTML = originalText;
            shareBtn.disabled = false;
        }
    });
}
