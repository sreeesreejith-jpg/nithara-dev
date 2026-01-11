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
let activeInputs = [];

function updateActiveInputs(id) {
    activeInputs = activeInputs.filter(item => item !== id);
    activeInputs.push(id);
    if (activeInputs.length > 3) {
        activeInputs.shift();
    }
}

function handleInput(e) {
    const id = e.target.id;
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

window.addEventListener('load', () => {
    Object.values(fields).forEach(field => field.value = '');
    activeInputs = [];
    resetStyles();
    statusMsg.textContent = 'Enter 3 values to compute the missing one.';
});

function calculate() {
    if (activeInputs.length < 3) {
        resetStyles();
        return;
    }

    const allKeys = Object.keys(fields);
    const targetKey = allKeys.find(key => !activeInputs.includes(key));
    if (!targetKey) return;

    const P = parseFloat(fields.principal.value);
    const R = parseFloat(fields.rate.value);
    const T = parseFloat(fields.tenure.value);
    const E = parseFloat(fields.emi.value);

    let result = null;

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

    resetStyles();

    if (result !== null && result !== Infinity && !isNaN(result) && result > 0) {
        fields[targetKey].value = formatValue(targetKey, result);
        wrappers[targetKey].classList.add('computed');
        groups[targetKey].classList.add('is-computed');
        statusMsg.textContent = `Calculated ${targetKey.charAt(0).toUpperCase() + targetKey.slice(1)} dynamically.`;

        updateSummary(
            parseFloat(fields.principal.value),
            parseFloat(fields.rate.value),
            parseFloat(fields.tenure.value),
            parseFloat(fields.emi.value)
        );

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

function formatAmount(val) { return val.toFixed(2); }
function validate(...args) { return args.every(v => !isNaN(v) && v >= 0); }
function formatValue(key, val) {
    if (key === 'tenure') return Math.round(val * 100) / 100;
    if (key === 'rate') return Math.round(val * 1000) / 1000;
    return Math.round(val * 100) / 100;
}
function resetStyles() {
    Object.values(wrappers).forEach(w => w.classList.remove('computed'));
    Object.values(groups).forEach(g => g.classList.remove('is-computed'));
    summaryCard.classList.remove('visible');
}

function calcEMI(P, R, T) {
    const r = R / 12 / 100;
    const n = T * 12;
    if (r === 0) return P / n;
    return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}
function calcPrincipal(E, R, T) {
    const r = R / 12 / 100;
    const n = T * 12;
    if (r === 0) return E * n;
    return E * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}
function calcTenure(P, R, E) {
    const r = R / 12 / 100;
    if (r === 0) return P / E / 12;
    const X = E / (E - (P * r));
    if (X <= 0 || isNaN(X)) return null;
    return (Math.log(X) / Math.log(1 + r)) / 12;
}
function calcRate(P, T, E) {
    const n = T * 12;
    let low = 0.0000001, high = 0.2;
    if (E * n < P) return null;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const calcE = (P * mid * Math.pow(1 + mid, n)) / (Math.pow(1 + mid, n) - 1);
        if (calcE > E) high = mid; else low = mid;
    }
    return (low + high) / 2 * 12 * 100;
}

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

const cleanupAfterPDF = () => { document.body.classList.remove('pdf-mode'); };

const generatePDFResult = async () => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const reportTitle = "EMI_Report_" + new Date().getTime();

        // 1. Header with styling
        doc.setFillColor(63, 81, 181); // Indigo color
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("EMI Calculation Report", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Generated on: " + new Date().toLocaleString('en-IN'), 14, 33);

        // 2. Data extraction
        const P = fields.principal.value || "0";
        const R = fields.rate.value || "0";
        const T = fields.tenure.value || "0";
        const E = fields.emi.value || "0";
        const totalI = totalInterestEl.textContent || "0";
        const totalP = totalPaymentEl.textContent || "0";

        // 3. Table generation
        doc.autoTable({
            startY: 50,
            head: [['Description', 'Value']],
            body: [
                ['Principal Amount', 'Rs. ' + P],
                ['Interest Rate', R + ' %'],
                ['Tenure', T + ' Years'],
                ['Monthly EMI', 'Rs. ' + E],
                ['Total Interest', 'Rs. ' + totalI],
                ['Total Payment', 'Rs. ' + totalP]
            ],
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181], fontSize: 13 },
            styles: { fontSize: 12, cellPadding: 6 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
                1: { halign: 'right' }
            }
        });

        // 4. Footer
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Email: sreee.sreejith@gmail.com", 14, finalY);
        doc.text("* This is a computer-generated report based on standard EMI formulas.", 14, finalY + 7);

        // 5. Native Share Check
        const cap = window.Capacitor;
        const isNative = !!(cap && cap.Plugins && (cap.Plugins.Filesystem || cap.Plugins.Share));

        if (isNative) {
            return { dataUri: doc.output('datauristring'), title: reportTitle, isNative: true };
        } else {
            return { blob: doc.output('blob'), title: reportTitle, isNative: false };
        }
    } catch (err) {
        console.error("Professional PDF Error:", err);
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
        // Clean filename for Android
        const cleanFilename = filename.replace(/[^a-z0-9.]/gi, '_');

        const fileResult = await Filesystem.writeFile({
            path: cleanFilename,
            data: base64Data,
            directory: 'CACHE'
        });

        await Share.share({
            title: 'EMI Report',
            text: 'Sharing my EMI calculation report.',
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
                await navigator.share({ files: [file], title: 'EMI Calculation Report', text: 'Sharing report.' });
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
