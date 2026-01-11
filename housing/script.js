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

    const generatePDFResult = async () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const reportTitle = "Housing_Report_" + new Date().getTime();

            // 1. Header & Title
            doc.setFillColor(99, 102, 241); // Indigo theme
            doc.rect(0, 0, 210, 40, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255);
            doc.setFont("helvetica", "bold");
            doc.text("Housing Loan Report", 14, 25);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Generated on: " + new Date().toLocaleString('en-IN'), 14, 33);

            // 2. Data Extraction
            const cents = document.getElementById('land-area').value || "0";
            const costCent = document.getElementById('cost-per-cent').value || "0";
            const sqft = document.getElementById('built-up-area').value || "0";
            const costSqft = document.getElementById('cost-per-sqft').value || "0";
            const other = document.getElementById('other-expenses').value || "0";
            const netSalary = document.getElementById('net-salary').value || "0";
            const rent = document.getElementById('rent').value || "0";

            const emi = document.getElementById('monthly-emi').textContent || "0";
            const totalLoan = document.getElementById('total-principal-bottom').textContent || "0";
            const balAfterEmi = document.getElementById('balance-salary').value || "0";
            const balAfterRent = document.getElementById('balance-after-rent').value || "0";
            const excess = document.getElementById('final-balance').value || "0";

            // 3. Project Details Table
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text("Project & Loan Details", 14, 50);

            doc.autoTable({
                startY: 55,
                head: [['Description', 'Detail', 'Amount']],
                body: [
                    ['Plot Purchase', cents + ' Cents @ ' + costCent + '/Cent', '-'],
                    ['Construction', sqft + ' Sq.Ft @ ' + costSqft + '/Sq.Ft', '-'],
                    ['Other Expenses', '-', 'Rs. ' + other],
                    ['Total Estimated Loan', 'Plot + Build + Other', 'Rs. ' + totalLoan],
                    ['Proposed EMI', '30 Years @ 7.5%', 'Rs. ' + emi]
                ],
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241] },
                columnStyles: { 2: { halign: 'right' } }
            });

            // 4. Financial Feasibility Table
            doc.text("Financial Feasibility", 14, doc.lastAutoTable.finalY + 15);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                body: [
                    ['Current Net Salary', 'Rs. ' + netSalary],
                    ['Current Rent Payment', 'Rs. ' + rent],
                    ['Balance After EMI', 'Rs. ' + balAfterEmi],
                    ['Balance After Rent', 'Rs. ' + balAfterRent],
                    ['Excess/Buffer for Loan', 'Rs. ' + excess]
                ],
                theme: 'grid',
                styles: { fontSize: 11, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } }
            });

            // 5. Footer
            const finalY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("Email: sreee.sreejith@gmail.com", 14, finalY);

            // 6. Output Management
            const cap = window.Capacitor;
            const isNative = !!(cap && cap.Plugins && (cap.Plugins.Filesystem || cap.Plugins.Share));

            return { blob: doc.output('blob'), title: reportTitle };
        } catch (err) {
            console.error("Housing PDF Error:", err);
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
                title: 'Housing Loan Report',
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
                            title: 'Housing Loan Report',
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
});
