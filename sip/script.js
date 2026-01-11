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
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const reportTitle = "SIP_Report_" + new Date().getTime();

        // 1. Header & Title 
        doc.setFillColor(16, 185, 129); // Green theme
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(22);
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.text("SIP Investment Report", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Generated on: " + new Date().toLocaleString('en-IN'), 14, 33);

        // 2. Data Extraction
        const mon = fields.investment.value || "0";
        const rat = fields.rate.value || "0";
        const yrs = fields.years.value || "0";
        const mat = display.total.textContent || "0";
        const inv = display.invested.textContent || "0";
        const ret = display.returns.textContent || "0";

        // 3. Table generation
        doc.autoTable({
            startY: 50,
            head: [['Investment Parameter', 'Detail']],
            body: [
                ['Monthly Investment', 'Rs. ' + mon],
                ['Expected Return Rate', rat + ' %'],
                ['Time Period', yrs + ' Years'],
                ['Total Invested Amount', 'Rs. ' + inv],
                ['Estimated Returns (Wealth Gain)', 'Rs. ' + ret],
                ['Net Maturity Value', 'Rs. ' + mat]
            ],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontSize: 13 },
            styles: { fontSize: 12, cellPadding: 6 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' }
            }
        });

        // 4. Footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Email: sreee.sreejith@gmail.com", 14, finalY);
        doc.text("* Note: Mutual fund investments are subject to market risks.", 14, finalY + 7);

        // 5. Output Check
        const cap = window.Capacitor;
        const isNative = !!(cap && cap.Plugins && (cap.Plugins.Filesystem || cap.Plugins.Share));

        if (isNative) {
            return { dataUri: doc.output('datauristring'), title: reportTitle, isNative: true };
        } else {
            return { blob: doc.output('blob'), title: reportTitle, isNative: false };
        }
    } catch (err) {
        console.error("SIP PDF Error:", err);
        throw err;
    }
};

const handleNativeSave = async (dataUri, filename) => {
    try {
        const cap = window.Capacitor;
        const Filesystem = cap?.Plugins?.Filesystem;
        const Share = cap?.Plugins?.Share;

        if (!Filesystem || !Share) {
            throw new Error("Android native bridge not ready.");
        }

        const base64Data = dataUri.split(',')[1] || dataUri;
        // Sanitize filename for Android OS
        const cleanFilename = filename.replace(/[^a-z0-9.]/gi, '_');

        const fileResult = await Filesystem.writeFile({
            path: cleanFilename,
            data: base64Data,
            directory: 'CACHE'
        });

        await Share.share({
            title: 'SIP Report',
            text: 'Sharing my SIP calculation report.',
            url: fileResult.uri,
            dialogTitle: 'Share PDF'
        });

    } catch (e) {
        console.error('Native share failed', e);
        alert('Share Failed: ' + e.message);
    }
};

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = "<span>⏳</span> Preparing PDF...";
        shareBtn.disabled = true;

        try {
            const result = await generatePDFResult();
            if (result.isNative) {
                await handleNativeSave(result.dataUri, `${result.title}.pdf`);
            } else if (navigator.share) {
                const file = new File([result.blob], `${result.title}.pdf`, { type: 'application/pdf' });
                await navigator.share({
                    files: [file],
                    title: 'SIP Report',
                    text: 'Sharing my SIP calculation report.'
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(result.blob);
                link.download = `${result.title}.pdf`;
                link.click();
            }
        } catch (err) {
            console.error(err);
            alert("Sharing failed. Try again.");
        } finally {
            shareBtn.innerHTML = originalText;
            shareBtn.disabled = false;
        }
    });
}

const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.style.display = 'none';
}
