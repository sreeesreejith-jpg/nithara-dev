const fields = {
    principal: document.getElementById('principal'),
    rate: document.getElementById('rate'),
    tenure: document.getElementById('tenure'),
    emi: document.getElementById('emi')
};

const wrappers = {
    principal: fields.principal.parentElement,
    rate: fields.rate.parentElement,
    tenure: fields.tenure.parentElement,
    emi: fields.emi.parentElement
};

const groups = {
    principal: fields.principal.closest('.input-group'),
    rate: fields.rate.closest('.input-group'),
    tenure: fields.tenure.closest('.input-group'),
    emi: fields.emi.closest('.input-group')
};

const statusMsg = document.getElementById('status-message');
const summaryCard = document.getElementById('summary-card');
const totalInterestEl = document.getElementById('total-interest');
const totalPaymentEl = document.getElementById('total-payment');
const interestPercentEl = document.getElementById('interest-percent');
const donutSegment = document.querySelector('.donut-segment');

// Track user interactions: which fields were manually edited?
// We keep a list of the last 3 edited fields.
let activeInputs = []; // Array of strings (keys of fields)

function updateActiveInputs(id) {
    // Remove if exists
    activeInputs = activeInputs.filter(item => item !== id);
    // Add to end
    activeInputs.push(id);

    // If we have 4, remove the oldest one (index 0)
    if (activeInputs.length > 3) {
        activeInputs.shift();
    }
}

function handleInput(e) {
    const id = e.target.id;

    // If empty value, remove from activeInputs if it was there
    if (e.target.value === '') {
        activeInputs = activeInputs.filter(item => item !== id);
        resetStyles();
        statusMsg.textContent = 'Enter 3 values to compute the missing one.';
        return;
    }

    updateActiveInputs(id);
    calculate();
}

Object.values(fields).forEach(field => {
    field.addEventListener('input', handleInput);
});

// Clear inputs on load
window.addEventListener('load', () => {
    Object.values(fields).forEach(field => field.value = '');
    activeInputs = [];
    resetStyles();
    statusMsg.textContent = 'Enter 3 values to compute the missing one.';
});

function calculate() {
    // We need exactly 3 active inputs to calculate the 4th
    if (activeInputs.length < 3) {
        resetStyles();
        return;
    }

    const allKeys = Object.keys(fields);
    const targetKey = allKeys.find(key => !activeInputs.includes(key));

    if (!targetKey) return; // Should not happen if logic is correct

    // Get values
    const P = parseFloat(fields.principal.value);
    const R = parseFloat(fields.rate.value);
    const T = parseFloat(fields.tenure.value);
    const E = parseFloat(fields.emi.value);

    let result = null;

    try {
        switch (targetKey) {
            case 'emi':
                if (validate(P, R, T)) result = calcEMI(P, R, T);
                break;
            case 'principal':
                if (validate(E, R, T)) result = calcPrincipal(E, R, T);
                break;
            case 'tenure':
                if (validate(P, R, E)) result = calcTenure(P, R, E);
                break;
            case 'rate':
                if (validate(P, T, E)) result = calcRate(P, T, E);
                break;
        }
    } catch (err) {
        console.error(err);
        result = null;
    }

    // Update UI
    resetStyles();

    if (result !== null && result !== Infinity && !isNaN(result) && result > 0) {
        // Set value
        fields[targetKey].value = formatValue(targetKey, result);

        // Highlight
        wrappers[targetKey].classList.add('computed');
        groups[targetKey].classList.add('is-computed');
        statusMsg.textContent = `Calculated ${targetKey.charAt(0).toUpperCase() + targetKey.slice(1)} dynamically.`;

        // Update Summary
        updateSummary(
            parseFloat(fields.principal.value),
            parseFloat(fields.rate.value),
            parseFloat(fields.tenure.value),
            parseFloat(fields.emi.value)
        );

        // Save for amortization
        localStorage.setItem('emiData', JSON.stringify({
            principal: parseFloat(fields.principal.value),
            rate: parseFloat(fields.rate.value),
            tenure: parseFloat(fields.tenure.value),
            emi: parseFloat(fields.emi.value)
        }));
    } else {
        statusMsg.textContent = 'Invalid combination of values.';
        summaryCard.classList.remove('visible');
    }
}

function updateSummary(P, R, T, E) {
    if (!P || !T || !E) {
        summaryCard.classList.remove('visible');
        return;
    }

    const totalPayment = E * T * 12;
    const totalInterest = totalPayment - P;

    if (totalInterest < 0) {
        summaryCard.classList.remove('visible');
        return;
    }

    totalInterestEl.textContent = formatAmount(totalInterest);
    totalPaymentEl.textContent = formatAmount(totalPayment);

    const interestPercent = (totalInterest / totalPayment) * 100;
    interestPercentEl.textContent = `${Math.round(interestPercent)}%`;
    donutSegment.style.background = `conic-gradient(var(--accent-2) 0% ${interestPercent}%, transparent ${interestPercent}% 100%)`;

    summaryCard.classList.add('visible');
}

function formatAmount(val) {
    return val.toFixed(2); // No commas
}

function validate(...args) {
    return args.every(v => !isNaN(v) && v >= 0);
}

function formatValue(key, val) {
    if (key === 'tenure') return Math.round(val * 100) / 100; // 2 decimals for years
    if (key === 'rate') return Math.round(val * 1000) / 1000; // 3 decimals for rate
    return Math.round(val * 100) / 100; // 2 decimals for currency
}

function resetStyles() {
    Object.values(wrappers).forEach(w => w.classList.remove('computed'));
    Object.values(groups).forEach(g => g.classList.remove('is-computed'));
    summaryCard.classList.remove('visible');
}

// Formulas
function calcEMI(P, R, T) {
    const r = R / 12 / 100;
    const n = T * 12;
    if (r === 0) return P / n;
    const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return emi;
}

function calcPrincipal(E, R, T) {
    const r = R / 12 / 100;
    const n = T * 12;
    if (r === 0) return E * n;
    const p = E * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
    return p;
}

function calcTenure(P, R, E) {
    const r = R / 12 / 100;
    if (r === 0) return P / E / 12;
    const numerator = E;
    const denominator = E - (P * r);
    if (denominator <= 0) return null;
    const X = numerator / denominator;
    const n = Math.log(X) / Math.log(1 + r);
    return n / 12;
}

function calcRate(P, T, E) {
    const n = T * 12;
    let low = 0.0000001;
    let high = 0.2;
    if (E * n < P) return null;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const calcE = (P * mid * Math.pow(1 + mid, n)) / (Math.pow(1 + mid, n) - 1);
        if (calcE > E) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return (low + high) / 2 * 12 * 100;
}

// PDF & Sharing Logic
const prepareForPDF = () => {
    const printDate = document.getElementById('printDate');
    if (printDate) {
        printDate.textContent = "Generated on: " + new Date().toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
    document.body.classList.add('pdf-mode');
    return "EMI_Report_" + new Date().getTime();
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
        // Check if running in Capacitor Native Environment
        const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isCapacitor) {
            // Generate Base64 for Capacitor
            const pdfDataUri = await html2pdf().set(opt).from(element).outputPdf('datauristring');
            cleanupAfterPDF();
            return { dataUri: pdfDataUri, title: reportTitle, isNative: true };
        } else {
            // Generate Blob for Browser
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            cleanupAfterPDF();
            return { blob: pdfBlob, title: reportTitle, isNative: false };
        }
    } catch (err) {
        cleanupAfterPDF();
        throw err;
    }
};

const handleNativeSave = async (dataUri, filename) => {
    try {
        const { Filesystem } = window.Capacitor.Plugins;
        const { Share } = window.Capacitor.Plugins;
        const base64Data = dataUri.split(',')[1];

        const fileResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'CACHE'
        });

        await Share.share({
            title: 'EMI Report',
            text: 'Here is your report',
            url: fileResult.uri,
            dialogTitle: 'Save or Share PDF'
        });

    } catch (e) {
        console.error('Native save failed', e);
        alert('Error saving PDF: ' + e.message);
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
                    title: 'EMI Calculation Report',
                    text: 'Sharing my EMI calculation report.'
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
