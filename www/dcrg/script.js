/**
 * Kerala Pension & DCRG Calculator Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Input elements
    const basicPayInput = document.getElementById('basicPay');
    const daPercentageInput = document.getElementById('daPercentage');
    const serviceYearsInput = document.getElementById('serviceYears');
    const retirementAgeInput = document.getElementById('retirementAge');
    const avgEmolumentsInput = document.getElementById('avgEmoluments');

    // Display elements
    const pensionAmountDisplay = document.getElementById('pensionAmount');
    const drAmountDisplay = document.getElementById('drAmount');

    // Global variable to store stages
    // Global variable to store stages
    let payStagesList = [
        23000, 23700, 24400, 25100, 25800, 26500, 27200, 27900, 28700, 29500,
        30300, 31100, 32000, 32900, 33800, 34700, 35600, 36500, 37400, 38300,
        39300, 40300, 41300, 42300, 43400, 44500, 45600, 46700, 47800, 49000,
        50200, 51400, 52600, 53900, 55200, 56500, 57900, 59300, 60700, 62200,
        63700, 65200, 66800, 68400, 70000, 71800, 73600, 75400, 77200, 79000,
        81000, 83000, 85000, 87000, 89000, 91200, 93400, 95600, 97800, 100300,
        102800, 105300, 107800, 110300, 112800, 115300, 118100, 120900, 123700,
        126500, 129300, 132100, 134900, 137700, 140500, 143600, 146700, 149800,
        153200, 156600, 160000, 163400, 166800
    ];

    // Global variable to store commutation factors
    let commutationFactors = {
        "17": 19.2, "18": 19.11, "19": 19.01, "20": 18.91,
        "21": 18.81, "22": 18.7, "23": 18.59, "24": 18.47, "25": 18.34,
        "26": 18.21, "27": 18.07, "28": 17.93, "29": 17.78, "30": 17.62,
        "31": 17.46, "32": 17.29, "33": 17.11, "34": 16.92, "35": 16.72,
        "36": 16.52, "37": 16.31, "38": 16.09, "39": 15.87, "40": 15.64,
        "41": 15.4, "42": 15.15, "43": 14.9, "44": 14.64, "45": 14.37,
        "46": 14.1, "47": 13.82, "48": 13.54, "49": 13.25, "50": 12.95,
        "51": 12.66, "52": 12.35, "53": 12.05, "54": 11.73, "55": 11.42,
        "56": 11.1, "57": 10.78, "58": 10.46, "59": 10.13, "60": 9.81,
        "61": 9.48, "62": 9.15, "63": 8.82, "64": 8.5, "65": 8.17,
        "66": 7.85, "67": 7.53, "68": 7.22, "69": 6.91, "70": 6.6,
        "71": 6.3, "72": 6.01, "73": 5.72, "74": 5.44, "75": 5.17,
        "76": 4.9, "77": 4.65, "78": 4.4, "79": 4.17, "80": 3.94,
        "81": 3.72, "82": 3.52, "83": 3.32, "84": 3.13
    };

    // --- Custom Dropdown Logic ---
    const dropdown = document.getElementById('custom-dropdown');

    // Store current value
    basicPayInput.dataset.lastValid = basicPayInput.value;

    function renderDropdown(filterText = "") {
        dropdown.innerHTML = "";
        const filtered = filterText
            ? payStagesList.filter(stage => stage.toString().startsWith(filterText))
            : payStagesList;

        if (filtered.length === 0) {
            dropdown.classList.remove('show');
            return;
        }

        filtered.forEach(stage => {
            const li = document.createElement('li');
            li.textContent = stage;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectValue(stage);
            });
            dropdown.appendChild(li);
        });
    }

    function selectValue(val) {
        basicPayInput.value = val;
        basicPayInput.dataset.lastValid = val;
        dropdown.classList.remove('show');
        calculateAll(); // Call calculation directly
    }

    function showDropdown() {
        renderDropdown("");
        dropdown.classList.add('show');

        const currentVal = parseInt(basicPayInput.value);
        if (currentVal) {
            const items = Array.from(dropdown.querySelectorAll('li'));
            const match = items.find(li => li.textContent == currentVal);
            if (match) {
                match.scrollIntoView({ block: 'center' });
                match.classList.add('active');
            }
        }
    }

    function hideDropdown() {
        setTimeout(() => {
            dropdown.classList.remove('show');
        }, 150);
    }

    // Input Listeners
    basicPayInput.addEventListener('focus', function () {
        this.select();
        showDropdown();
    });

    basicPayInput.addEventListener('click', function () {
        this.select();
        showDropdown();
    });

    basicPayInput.addEventListener('input', function () {
        // Filter live
        renderDropdown(this.value);
        dropdown.classList.add('show');
        calculateAll();
    });

    basicPayInput.addEventListener('blur', function () {
        if (this.value.trim() === "") {
            this.value = this.dataset.lastValid || "";
            calculateAll();
        }
        hideDropdown();
    });

    // Fetch external data (optional)
    fetch('../data/pay_stages.json')
        .then(response => response.json())
        .then(data => {
            if (data.payStages) {
                payStagesList = data.payStages;
            }
        })
        .catch(err => console.log('Using embedded pay stages'));

    // Commutation factors are now embedded above. Fetch removed to support local usage.

    const totalMonthlyPensionDisplay = document.getElementById('totalMonthlyPension');
    const commutationAmountDisplay = document.getElementById('commutationAmount');
    const balancePensionDisplay = document.getElementById('balancePension');
    const dcrgAmountDisplay = document.getElementById('dcrgAmount');
    const totalBenefitsDisplay = document.getElementById('totalBenefits');
    const netMonthlyPensionDisplay = document.getElementById('netMonthlyPension');
    const pensionFactorVal = document.getElementById('pensionFactorVal');
    const dcrgFactorVal = document.getElementById('dcrgFactorVal');

    // Dashboard elements
    const totalBenefitsHeader = document.getElementById('totalBenefitsHeader');
    const commuteHeader = document.getElementById('commuteHeader');
    const dcrgHeader = document.getElementById('dcrgHeader');
    const balanceHeader = document.getElementById('balanceHeader');

    // Details elements 
    const calcLastPay = document.getElementById('calcLastPay');
    const calcQS = document.getElementById('calcQS');
    const calcAvgEmoluments = document.getElementById('calcAvgEmoluments');
    const calcBasicPension = document.getElementById('calcBasicPension');
    const calcCommutation = document.getElementById('calcCommutation');
    const calcReducedPension = document.getElementById('calcReducedPension');
    const calcDcrg = document.getElementById('calcDcrg');
    const dispCommFactor = document.getElementById('dispCommFactor');

    // Step Elements
    const stepDcrg = document.getElementById('stepDcrg');
    const stepCommutation = document.getElementById('stepCommutation');
    const stepPension = document.getElementById('stepPension');
    const stepReduced = document.getElementById('stepReduced');

    const inputs = [basicPayInput, daPercentageInput, serviceYearsInput, retirementAgeInput, avgEmolumentsInput];

    /**
     * Format number without commas
     */
    const formatAmount = (num) => {
        return Math.round(num).toString();
    };

    /**
     * Main calculation function
     */
    const calculateAll = (source) => {
        const bp = parseFloat(basicPayInput.value) || 0;
        const da = parseFloat(daPercentageInput.value) || 0;
        let years = parseFloat(serviceYearsInput.value) || 0;

        // Validation & Constraints
        if (years > 33) years = 33; // Max DCRG service is 33
        // Note: Rules say min 10, but we process whatever is there for instant feedback

        // 1. Last Pay (for DCRG)
        const lastPay = bp + (bp * da / 100);

        // 2. Average Emoluments (for Pension)
        let avgEmoluments;
        if (source === 'ae') {
            // If user manually edited AE, use that value
            avgEmoluments = parseFloat(avgEmolumentsInput.value) || 0;
        } else {
            // Default calculation (Basic Pay ONLY for Pension)
            avgEmoluments = bp;
            avgEmolumentsInput.value = Math.round(avgEmoluments);
        }

        // 3. Pension Calculation
        // Rules: Max 30 years counts for full pension
        let pensionQS = (years > 30) ? 30 : years;
        let pensionFactor = pensionQS / 30;
        if (pensionFactor > 1.0) pensionFactor = 1.0;

        let pension = (avgEmoluments / 2) * pensionFactor;

        // Apply Service Pension Limits
        if (pension < 11500 && pension > 0) pension = 11500;
        if (pension > 83400) pension = 83400;

        // 4. Pension Commutation
        // Formula: 40% of Basic Pension * Factor * 12
        const age = parseInt(retirementAgeInput.value);
        const commFactor = (age && commutationFactors[age]) ? commutationFactors[age] : 0;

        const commutablePension = pension * 0.40;
        const commutationAmount = commutablePension * commFactor * 12;

        const balancePension = pension - commutablePension; // Reduced pension is 60%

        // 6. DCRG Calculation
        // Formula: (Last Pay) * (Qualifying Service / 2)
        // Rule: Max 33 years
        let dcrgQS = (years > 33) ? 33 : years;
        let dcrg = lastPay * (dcrgQS / 2);

        if (dcrg > 1700000) dcrg = 1700000;

        // 7. Total Benefits
        const totalLumpSum = commutationAmount + dcrg;

        // Update Dashboard
        const displayValue = (val) => (val > 0) ? formatAmount(val) : "0";

        if (totalBenefitsHeader) totalBenefitsHeader.textContent = displayValue(totalLumpSum);
        if (commuteHeader) commuteHeader.textContent = displayValue(commutationAmount);
        if (dcrgHeader) dcrgHeader.textContent = displayValue(dcrg);
        if (balanceHeader) balanceHeader.textContent = displayValue(balancePension);

        // Update Details List
        if (calcLastPay) calcLastPay.textContent = formatAmount(lastPay);
        if (calcQS) calcQS.textContent = years;
        if (calcAvgEmoluments) calcAvgEmoluments.textContent = formatAmount(avgEmoluments);
        if (calcBasicPension) calcBasicPension.textContent = formatAmount(pension);
        if (calcCommutation) calcCommutation.textContent = formatAmount(commutationAmount);
        if (calcReducedPension) calcReducedPension.textContent = formatAmount(balancePension);
        if (calcDcrg) calcDcrg.textContent = formatAmount(dcrg);
        if (dispCommFactor) dispCommFactor.textContent = commFactor.toFixed(2);

        // Update Steps with Actual Values
        if (stepDcrg) stepDcrg.textContent = `${formatAmount(lastPay)} × ${dcrgQS / 2}`;
        if (stepCommutation) stepCommutation.textContent = `${formatAmount(commutablePension)} × ${commFactor} × 12`;
        if (stepPension) stepPension.textContent = `(${formatAmount(avgEmoluments)} / 2) × ${pensionFactor.toFixed(2)}`;
        if (stepReduced) stepReduced.textContent = `${formatAmount(pension)} × 60%`;

        // Visibility Condition: Show sections only if Basic Pay and Service Years are valid
        const detailsSection = document.getElementById('details-section');
        const benefitsSection = document.getElementById('benefits-section');

        if (detailsSection && benefitsSection) {
            if (bp > 0 && years > 0) {
                detailsSection.classList.remove('hidden');
                benefitsSection.classList.remove('hidden');
            } else {
                detailsSection.classList.add('hidden');
                benefitsSection.classList.add('hidden');
            }
        }
    };

    // Function to prepare document for PDF/Print
    const prepareForPDF = () => {
        const nameInput = document.getElementById('reportName');
        const printName = document.getElementById('printEmployeeName');
        const printDate = document.getElementById('printDate');
        const reportTitle = nameInput && nameInput.value ? `DCRG_Report_${nameInput.value.replace(/\s+/g, '_')}` : 'Pension_DCRG_Report';

        if (printName) {
            printName.textContent = nameInput && nameInput.value ? `Employee: ${nameInput.value}` : '';
        }
        if (printDate) {
            printDate.textContent = new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        const checkService = document.getElementById('checkService');
        const checkDetails = document.getElementById('checkDetails');
        const checkSummary = document.getElementById('checkSummary');

        if (checkService && !checkService.checked) document.body.classList.add('hide-service');
        if (checkDetails && !checkDetails.checked) document.body.classList.add('hide-details');
        if (checkSummary && !checkSummary.checked) document.body.classList.add('hide-summary');

        document.body.classList.add('pdf-mode');
        return reportTitle;
    };

    const cleanupAfterPDF = () => {
        document.body.classList.remove('hide-service', 'hide-details', 'hide-summary', 'pdf-mode');
    };

    // Print / PDF logic
    // Print / PDF logic
    const generatePDFResult = async () => {
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

            // Strip prefix for Filesystem write if present
            const base64Data = dataUri.split(',')[1] || dataUri;

            // Write to Cache Directory
            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
            });

            // Share the file
            await Share.share({
                title: 'Pension & DCRG Report',
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
            printBtn.innerHTML = "<span>⏳</span> Generating PDF...";
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
                console.error("PDF generation failed:", err);
                alert("Generation failed. Trying standard print.");
                window.print();
            } finally {
                printBtn.innerHTML = originalText;
                printBtn.disabled = false;
            }
        });
    }

    // Share logic
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
                        title: 'Pension & DCRG Report',
                        text: 'Sharing my Pension & DCRG calculation report.'
                    });
                } else {
                    alert("Sharing not supported on this browser.");
                }
            } catch (err) {
                console.error("Sharing failed:", err);
                alert("Sharing failed.");
            } finally {
                shareBtn.innerHTML = originalText;
                shareBtn.disabled = false;
            }
        });
    }

    // Attach listeners
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const source = (input.id === 'avgEmoluments') ? 'ae' : 'other';
            calculateAll(source);
        });
    });

    // Initial calculation
    calculateAll();
});
