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

const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.addEventListener('click', () => {
        const originalText = printBtn.innerHTML;
        printBtn.innerHTML = "<span>⏳</span> Generating...";
        printBtn.disabled = true;

        const reportTitle = prepareForPDF();
        const element = document.querySelector('.container');
        const opt = {
            margin: [10, 5],
            filename: `${reportTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            cleanupAfterPDF();
            printBtn.innerHTML = originalText;
            printBtn.disabled = false;
        }).catch(err => {
            console.error(err);
            window.print();
            cleanupAfterPDF();
            printBtn.innerHTML = originalText;
            printBtn.disabled = false;
        });
    });
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = "<span>⏳</span> Preparing...";
        shareBtn.disabled = true;

        try {
            const reportTitle = prepareForPDF();
            const element = document.querySelector('.container');
            const opt = {
                margin: [10, 5],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            cleanupAfterPDF();

            const fileName = `${reportTitle}.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'SIP Calculation Report',
                    text: 'Sharing my SIP calculation report.'
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfBlob);
                link.download = fileName;
                link.click();
                alert("Sharing not supported. PDF downloaded instead.");
            }
        } catch (err) {
            console.error(err);
            alert("Sharing failed.");
            cleanupAfterPDF();
        } finally {
            shareBtn.innerHTML = originalText;
            shareBtn.disabled = false;
        }
    });
}
