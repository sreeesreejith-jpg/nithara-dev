document.addEventListener('DOMContentLoaded', () => {
    const loanData = JSON.parse(localStorage.getItem('emiData'));
    const tableBody = document.getElementById('table-body');
    const summaryText = document.getElementById('loan-summary-text');
    const btnMonthly = document.getElementById('btn-monthly');
    const btnYearly = document.getElementById('btn-yearly');

    if (!loanData || !loanData.principal || !loanData.rate || !loanData.tenure) {
        tableBody.innerHTML = '<tr><td colspan="4" class="status-message">Please calculate EMI first.</td></tr>';
        return;
    }

    const { principal, rate, tenure, emi } = loanData;
    summaryText.textContent = `Breakdown for Principal ${principal.toLocaleString()} at ${rate}% for ${tenure} Years`;

    let currentView = 'monthly';

    function calculateAmortization() {
        tableBody.innerHTML = '';
        const r = rate / 12 / 100;
        let balance = principal;

        const schedule = [];
        const totalMonths = Math.ceil(tenure * 12);

        for (let i = 1; i <= totalMonths; i++) {
            const interest = balance * r;
            let principalPaid = emi - interest;

            if (i === totalMonths || balance < principalPaid) {
                principalPaid = balance;
            }

            balance -= principalPaid;
            if (balance < 0) balance = 0;

            schedule.push({
                no: i,
                interest: interest,
                principal: principalPaid,
                balance: balance
            });
        }

        if (currentView === 'monthly') {
            renderSchedule(schedule);
        } else {
            renderYearly(schedule);
        }
    }

    function renderSchedule(schedule) {
        schedule.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.no}</td>
                <td>${formatNum(item.interest)}</td>
                <td>${formatNum(item.principal)}</td>
                <td>${formatNum(item.balance)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function renderYearly(schedule) {
        let yearlyInterest = 0;
        let yearlyPrincipal = 0;
        let year = 1;

        schedule.forEach((item, index) => {
            yearlyInterest += item.interest;
            yearlyPrincipal += item.principal;

            if ((index + 1) % 12 === 0 || (index + 1) === schedule.length) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>Year ${year}</td>
                    <td>${formatNum(yearlyInterest)}</td>
                    <td>${formatNum(yearlyPrincipal)}</td>
                    <td>${formatNum(item.balance)}</td>
                `;
                tableBody.appendChild(row);

                yearlyInterest = 0;
                yearlyPrincipal = 0;
                year++;
            }
        });
    }

    function formatNum(val) {
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    btnMonthly.addEventListener('click', () => {
        currentView = 'monthly';
        btnMonthly.classList.add('active');
        btnYearly.classList.remove('active');
        calculateAmortization();
    });

    btnYearly.addEventListener('click', () => {
        currentView = 'yearly';
        btnYearly.classList.add('active');
        btnMonthly.classList.remove('active');
        calculateAmortization();
    });

    calculateAmortization();

    // PDF & Sharing Logic
    const prepareForPDF = () => {
        const printDate = document.getElementById('printDate');
        if (printDate) {
            printDate.textContent = "Generated on: " + new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        document.body.classList.add('pdf-mode');
        return "Amortization_Report_" + new Date().getTime();
    };

    const cleanupAfterPDF = () => {
        document.body.classList.remove('pdf-mode');
    };

    const generatePDFResult = async () => {
        const reportTitle = prepareForPDF();
        const element = document.querySelector('.container');
        const opt = {
            margin: [10, 5],
            filename: `${reportTitle}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
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
                title: 'Amortization Report',
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
                alert("PDF Generation failed.");
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
                        title: 'EMI Amortization Report',
                        text: 'Sharing my EMI amortization report.'
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
});
