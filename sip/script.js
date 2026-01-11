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

        return { blob: doc.output('blob'), title: reportTitle };
    } catch (err) {
        console.error("SIP PDF Error:", err);
        throw err;
    }
};

const handleNativeShare = async (blob, filename) => {
    try {
        const cap = window.Capacitor;
        const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_');

        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const fileResult = await cap.Plugins.Filesystem.writeFile({
            path: safeFilename,
            data: base64Data,
            directory: 'CACHE'
        });

        await cap.Plugins.Share.share({
            title: 'SIP Report',
            url: fileResult.uri
        });
    } catch (e) {
        console.error('Native share failed', e);
        throw e;
    }
};

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = "<span>⏳</span> Generating...";
        shareBtn.disabled = true;

        try {
            const result = await generatePDFResult();
            const fileName = `${result.title}.pdf`;
            const cap = window.Capacitor;
            const isNative = !!(cap && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share);

            if (isNative) {
                await handleNativeShare(result.blob, fileName);
            } else {
                const file = new File([result.blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'SIP Report',
                    });
                } else {
                    const url = URL.createObjectURL(result.blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Please try again.");
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
