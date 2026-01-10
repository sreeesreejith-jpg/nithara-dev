document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const landAreaInput = document.getElementById('land-area');
    const costPerCentInput = document.getElementById('cost-per-cent');
    const builtUpAreaInput = document.getElementById('built-up-area');
    const costPerSqftInput = document.getElementById('cost-per-sqft');
    const otherExpensesInput = document.getElementById('other-expenses');
    const netSalaryInput = document.getElementById('net-salary');
    const rentInput = document.getElementById('rent');

    // Display Elements
    const monthlyEmiDisplay = document.getElementById('monthly-emi');
    const totalPrincipalBottom = document.getElementById('total-principal-bottom');
    const balanceSalaryDisplay = document.getElementById('balance-salary');
    const balanceAfterRentDisplay = document.getElementById('balance-after-rent');
    const finalBalanceDisplay = document.getElementById('final-balance');

    // Constants
    const PLOT_CHARGE_PERCENT = 0.12;
    const LOAN_TENURE_YEARS = 30;
    const ANNUAL_INTEREST_RATE = 7.5;

    let currentEmi = 0;

    function formatAmount(num) {
        return Math.round(num).toString();
    }

    function parseAmount(str) {
        if (!str) return 0;
        return parseFloat(str.replace(/,/g, '')) || 0;
    }

    function calculate() {
        const landArea = parseFloat(landAreaInput.value) || 0;
        const costPerCent = parseFloat(costPerCentInput.value) || 0;
        const builtUpArea = parseFloat(builtUpAreaInput.value) || 0;
        const costPerSqft = parseFloat(costPerSqftInput.value) || 0;
        const otherExpenses = parseFloat(otherExpensesInput.value) || 0;

        // Plot Calculations
        const plotBaseCost = landArea * costPerCent;
        const netPlotCost = plotBaseCost * 1.12;

        // Construction Calculations
        const constructionCost = builtUpArea * costPerSqft;

        // Loan Calculations
        const principal = netPlotCost + constructionCost + otherExpenses;

        const monthlyRate = ANNUAL_INTEREST_RATE / 12 / 100;
        const totalMonths = LOAN_TENURE_YEARS * 12;

        let emi = 0;
        if (principal > 0) {
            emi = principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }

        currentEmi = emi;

        // Update UI
        monthlyEmiDisplay.textContent = formatAmount(emi);
        totalPrincipalBottom.textContent = formatAmount(principal);

        updateBalances();
    }

    function updateBalances() {
        const netSalary = parseAmount(netSalaryInput.value);
        const rent = parseAmount(rentInput.value);

        // Balance Salary (Net - EMI)
        const balanceEmi = netSalary - currentEmi;
        balanceSalaryDisplay.value = formatAmount(balanceEmi);

        // Balance After Rent (Net - Rent)
        const balanceRent = netSalary - rent;
        balanceAfterRentDisplay.value = formatAmount(balanceRent);

        // Final Balance (Balance After Rent - Balance After EMI)
        const finalBalance = balanceRent - balanceEmi;
        finalBalanceDisplay.value = formatAmount(finalBalance);
    }

    // Event Listeners
    [landAreaInput, costPerCentInput, builtUpAreaInput, costPerSqftInput, otherExpensesInput].forEach(input => {
        input.addEventListener('input', calculate);
    });

    [netSalaryInput, rentInput].forEach(input => {
        input.addEventListener('input', updateBalances);
    });

    // Improve selection UX
    const setupImprovedUX = (input) => {
        let tempValue = "";
        const clearInput = () => {
            tempValue = input.value;
            input.value = "";
        };
        input.addEventListener('focus', clearInput);
        input.addEventListener('click', clearInput);
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.value = tempValue;
            }
            updateBalances();
        });
    };

    setupImprovedUX(netSalaryInput);
    setupImprovedUX(rentInput);

    // Initial Calculation
    calculate();

    // PDF & Sharing Logic
    const prepareForPDF = () => {
        const printDate = document.getElementById('printDate');
        if (printDate) {
            printDate.textContent = "Generated on: " + new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        document.body.classList.add('pdf-mode');
        return "Housing_Report_" + new Date().getTime();
    };

    const cleanupAfterPDF = () => {
        document.body.classList.remove('pdf-mode');
    };

    const generatePDFBlob = async () => {
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
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            cleanupAfterPDF();
            return { blob: pdfBlob, title: reportTitle };
        } catch (err) {
            cleanupAfterPDF();
            throw err;
        }
    };

    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', async () => {
            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = "<span>⏳</span> Generating...";
            printBtn.disabled = true;

            try {
                const { blob, title } = await generatePDFBlob();
                if (window.NitharaApp) {
                    await window.NitharaApp.handlePDF(blob, `${title}.pdf`, 'Housing Loan Report');
                } else {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${title}.pdf`;
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
                const { blob, title } = await generatePDFBlob();
                if (window.NitharaApp) {
                    await window.NitharaApp.handlePDF(blob, `${title}.pdf`, 'Housing Loan Report');
                } else if (navigator.share) {
                    const file = new File([blob], `${title}.pdf`, { type: 'application/pdf' });
                    await navigator.share({
                        files: [file],
                        title: 'Housing Loan Calculation Report',
                        text: 'Sharing my housing loan calculation report.'
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
