document.addEventListener('DOMContentLoaded', () => {
    const inputs = [
        'basic-pay-in',
        'da-pend-perc',
        'hra-old-perc',
        'fitment-perc',
        'bal-da-perc',
        'hra-perc',
        'years-service'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', calculate);
        // Auto-select text on click/focus to easily see datalist
        el.addEventListener('click', function () {
            this.select();
        });
    });

    const weightageCheck = document.getElementById('weightage-check');
    const weightageContainer = document.getElementById('weightage-container');
    const weightageResultRow = document.getElementById('res-weightage-row');

    if (weightageCheck && weightageContainer) {
        weightageCheck.addEventListener('change', () => {
            if (weightageCheck.checked) {
                weightageContainer.style.display = ''; // Reverts to CSS (grid)
                if (weightageResultRow) weightageResultRow.style.display = '';
            } else {
                weightageContainer.style.display = 'none';
                if (weightageResultRow) weightageResultRow.style.display = 'none';
            }
            calculate();
        });
    }

    // Global variable to store stages for navigation
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

    // --- Custom Dropdown Logic ---
    const basicPayInput = document.getElementById('basic-pay-in');
    const dropdown = document.getElementById('custom-dropdown');

    const yearsInput = document.getElementById('years-service');
    const yearsDropdown = document.getElementById('years-dropdown');
    const yearsList = Array.from({ length: 41 }, (_, i) => i); // 0 to 40

    // Store current value for reference
    basicPayInput.dataset.lastValid = basicPayInput.value;
    yearsInput.dataset.lastValid = yearsInput.value;

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
            // Dynamic update on hover
            li.addEventListener('mouseenter', () => {
                basicPayInput.value = stage;
                calculate();
            });
            dropdown.appendChild(li);
        });
    }

    function renderYearsDropdown(filterText = "") {
        yearsDropdown.innerHTML = "";
        const filtered = filterText
            ? yearsList.filter(year => year.toString().startsWith(filterText))
            : yearsList;

        if (filtered.length === 0) {
            yearsDropdown.classList.remove('show');
            return;
        }

        filtered.forEach(year => {
            const li = document.createElement('li');
            li.textContent = year;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectYearValue(year);
            });
            // Dynamic update on hover
            li.addEventListener('mouseenter', () => {
                yearsInput.value = year;
                calculate();
            });
            yearsDropdown.appendChild(li);
        });
    }

    function selectValue(val) {
        basicPayInput.value = val;
        basicPayInput.dataset.lastValid = val;
        dropdown.classList.remove('show');
        calculate();
    }

    function selectYearValue(val) {
        yearsInput.value = val;
        yearsInput.dataset.lastValid = val;
        yearsDropdown.classList.remove('show');
        calculate();
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

    function showYearsDropdown() {
        renderYearsDropdown("");
        yearsDropdown.classList.add('show');
        const currentVal = yearsInput.value;
        if (currentVal !== "") {
            const items = Array.from(yearsDropdown.querySelectorAll('li'));
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

    function hideYearsDropdown() {
        setTimeout(() => {
            yearsDropdown.classList.remove('show');
        }, 150);
    }

    // Input Listeners for Basic Pay
    basicPayInput.addEventListener('focus', function () {
        this.select();
        showDropdown();
    });
    basicPayInput.addEventListener('click', function () {
        this.select();
        showDropdown();
    });
    basicPayInput.addEventListener('input', function () {
        calculate();
        renderDropdown(this.value);
        dropdown.classList.add('show');
    });
    basicPayInput.addEventListener('blur', function () {
        if (this.value.trim() === "") {
            this.value = this.dataset.lastValid || "";
            calculate();
        }
        hideDropdown();
    });

    // Input Listeners for Years
    yearsInput.addEventListener('focus', function () {
        this.select();
        showYearsDropdown();
    });
    yearsInput.addEventListener('click', function () {
        this.select();
        showYearsDropdown();
    });
    yearsInput.addEventListener('input', function () {
        calculate();
        renderYearsDropdown(this.value);
        yearsDropdown.classList.add('show');
    });
    yearsInput.addEventListener('blur', function () {
        if (this.value.trim() === "") {
            // If empty, we can leave it empty or set to 0. User said "prefilled with non".
            // Let's keep it empty if they cleared it.
            calculate();
        }
        hideYearsDropdown();
    });

    // Fetch external data if available
    fetch('../data/pay_stages.json')
        .then(response => response.json())
        .then(data => {
            if (data.payStages) {
                payStagesList = data.payStages;
            }
        })
        .catch(err => console.log('Using embedded pay stages'));


    function calculate() {
        const bp = parseFloat(document.getElementById('basic-pay-in').value) || 0;

        // Before Revision Percentages
        const daOldPerc = 22; // Fixed
        const daPendPerc = parseFloat(document.getElementById('da-pend-perc').value) || 0;
        const hraOldPerc = parseFloat(document.getElementById('hra-old-perc').value) || 0;

        // After Revision Percentages
        const daMergedPerc = 31; // Fixed
        const fitmentPerc = parseFloat(document.getElementById('fitment-perc').value) || 0;
        const balDaPerc = parseFloat(document.getElementById('bal-da-perc').value) || 0;
        const hraNewPerc = parseFloat(document.getElementById('hra-perc').value) || 0;

        // Before Revision Calculations
        const daOldVal = Math.round(bp * (daOldPerc / 100));
        const daPendVal = Math.round(bp * (daPendPerc / 100));
        const hraOldVal = Math.round(bp * (hraOldPerc / 100));
        const grossOld = bp + daOldVal + daPendVal + hraOldVal;

        // Update Before UI
        document.getElementById('res-bp-old').textContent = bp;
        document.getElementById('res-da-old').textContent = daOldVal;
        document.getElementById('res-da-pend').textContent = daPendVal;
        document.getElementById('res-hra-old').textContent = hraOldVal;
        document.getElementById('res-gross-old').textContent = grossOld;
        document.getElementById('gross-old-val').textContent = grossOld;

        // After Revision Calculations
        const daMergedVal = Math.round(bp * (daMergedPerc / 100));
        const fitmentVal = Math.round(bp * (fitmentPerc / 100));

        // Service Weightage: 0.5% per year of service, Max 15%
        // Only if checked
        const isWeightageEnabled = document.getElementById('weightage-check')?.checked;
        let weightageVal = 0;
        let weightagePerc = 0;

        if (isWeightageEnabled) {
            const yearsService = Math.floor(parseFloat(document.getElementById('years-service').value) || 0);
            weightagePerc = yearsService * 0.5;
            if (weightagePerc > 15) weightagePerc = 15; // Cap at 15%
            weightageVal = Math.round(bp * (weightagePerc / 100));
        }

        const actualTotal = bp + daMergedVal + fitmentVal + weightageVal;

        // BP Fixed At: Rounded to next multiple of 100
        const bpFixed = Math.ceil(actualTotal / 100) * 100;

        // Updated: Bal DA and HRA are calculated on BP Fixed At
        const balDaVal = Math.round(bpFixed * (balDaPerc / 100));
        const hraNewVal = Math.round(bpFixed * (hraNewPerc / 100));
        const grossNew = bpFixed + balDaVal + hraNewVal;

        const growth = grossNew - grossOld;
        const growthPerc = grossOld > 0 ? ((growth / grossOld) * 100).toFixed(1) : 0;

        // Update After UI
        document.getElementById('res-bp-new').textContent = bp;
        document.getElementById('res-da-merged').textContent = daMergedVal;
        document.getElementById('res-fitment').textContent = fitmentVal;
        if (isWeightageEnabled) {
            document.querySelector('#res-weightage-row .label').textContent = `Service Weightage (${weightagePerc.toFixed(1)}%)`;
        }
        document.getElementById('res-weightage').textContent = weightageVal;
        document.getElementById('res-actual-total').textContent = actualTotal;
        document.getElementById('res-bp-fixed').textContent = bpFixed;
        document.getElementById('res-bal-da').textContent = balDaVal;
        document.getElementById('res-hra-new').textContent = hraNewVal;
        document.getElementById('res-gross-new').textContent = grossNew;

        // Update Before UI (already done earlier but ensuring consistency)
        document.getElementById('res-gross-old').textContent = grossOld;

        // Summary Card
        document.getElementById('gross-new-val').textContent = grossNew;
        document.getElementById('gross-old-val').textContent = grossOld;
        document.getElementById('growth-val').textContent = `${growth} (${growthPerc}%)`;
        document.getElementById('revised-bp-val').textContent = bpFixed;
    }

    // Initial calculation
    calculate();

    // PDF & Sharing Logic

    const cleanupAfterPDF = () => {
        document.body.classList.remove('pdf-mode');
    };

    const generatePDFResult = async () => {
        try {
            const jsPDFLib = window.jsPDF || (window.jspdf ? window.jspdf.jsPDF : null);
            if (!jsPDFLib) throw new Error("PDF Library not loaded");
            const doc = new jsPDFLib();
            const reportTitle = "PayRevision_Report_" + new Date().getTime();

            // 1. Header & Title
            doc.setFillColor(59, 130, 246); // Blue theme
            doc.rect(0, 0, 210, 40, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255);
            doc.setFont("helvetica", "bold");
            doc.text("Pay Revision Report", 14, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const name = document.getElementById('reportName')?.value;
            const pen = document.getElementById('penNumber')?.value;
            const school = document.getElementById('schoolName')?.value;

            let headerY = 28;
            if (name) { doc.text(`Employee: ${name}`, 14, headerY); headerY += 5; }
            if (pen) { doc.text(`PEN Number: ${pen}`, 14, headerY); headerY += 5; }
            if (school) { doc.text(`School/Office: ${school}`, 14, headerY); headerY += 5; }


            // 2. Data Extraction
            const bp = document.getElementById('basic-pay-in').value || "0";
            const oldGross = document.getElementById('gross-old-val').textContent || "0";
            const newGross = document.getElementById('gross-new-val').textContent || "0";
            const growth = document.getElementById('growth-val').textContent || "0";
            const revisedBp = document.getElementById('res-bp-fixed').textContent || "0";

            // 3. Comparison Table
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text("Salary Comparison", 14, 50);

            doc.autoTable({
                startY: 55,
                head: [['Component', 'Before Revision', 'After Revision']],
                body: [
                    ['Basic Pay', 'Rs. ' + bp, 'Rs. ' + revisedBp],
                    ['Monthly Gross Salary', 'Rs. ' + oldGross, 'Rs. ' + newGross],
                    ['Salary Growth', '-', growth]
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], halign: 'left' },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'right' },
                    2: { halign: 'right' }
                },
                didParseCell: function (data) {
                    if (data.section === 'head' && data.column.index > 0) {
                        data.cell.styles.halign = 'right';
                    }
                }
            });

            // 4. Detailed Pay Fixation
            doc.text("Detailed Pay Fixation", 14, doc.lastAutoTable.finalY + 15);

            const daMerged = document.getElementById('res-da-merged').textContent || "0";
            const fitmentP = document.getElementById('fitment-perc').value || "0";
            const fitmentV = document.getElementById('res-fitment').textContent || "0";
            const yearsService = document.getElementById('years-service').value || "0";
            const weightageV = document.getElementById('res-weightage').textContent || "0";
            const actualTotal = document.getElementById('res-actual-total').textContent || "0";
            const balDaP = document.getElementById('bal-da-perc').value || "0";
            const balDaV = document.getElementById('res-bal-da').textContent || "0";
            const hraP = document.getElementById('hra-perc').value || "0";
            const hraV = document.getElementById('res-hra-new').textContent || "0";


            const isWeightageChecked = document.getElementById('weightage-check')?.checked;

            const fixationRows = [
                ['Base Basic Pay', '-', 'Rs. ' + bp],
                ['DA Merged', '31 %', 'Rs. ' + daMerged],
                ['Fitment Benefit', fitmentP + ' %', 'Rs. ' + fitmentV]
            ];

            if (isWeightageChecked) {
                fixationRows.push(['Service Weightage', yearsService + ' Yrs', 'Rs. ' + weightageV]);
            }

            fixationRows.push(
                ['Total Calculation', 'Sum', 'Rs. ' + actualTotal],
                ['BP Fixed At', 'Round Next 100', 'Rs. ' + revisedBp],
                ['Balance DA', balDaP + ' %', 'Rs. ' + balDaV],
                ['HRA', hraP + ' %', 'Rs. ' + hraV],
                ['Gross Salary', '-', 'Rs. ' + newGross]
            );

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Fixation Step', 'Info', 'Amount']],
                body: fixationRows,
                theme: 'grid',
                headStyles: { fillColor: [75, 85, 99] },
                columnStyles: { 2: { halign: 'right' } }
            });

            // 5. Before Revision Details
            doc.text("Before Revision Details", 14, doc.lastAutoTable.finalY + 15);
            const daOld = document.getElementById('res-da-old').textContent || "0";
            const daPendP = document.getElementById('da-pend-perc').value || "0";
            const daPendV = document.getElementById('res-da-pend').textContent || "0";
            const hraOldP = document.getElementById('hra-old-perc').value || "0";
            const hraOldV = document.getElementById('res-hra-old').textContent || "0";

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Component', 'Info', 'Amount']],
                body: [
                    ['Basic Pay', '-', 'Rs. ' + bp],
                    ['Dearness Allowance (DA)', '22%', 'Rs. ' + daOld],
                    ['DA Pending', daPendP + '%', 'Rs. ' + daPendV],
                    ['House Rent Allowance (HRA)', hraOldP + '%', 'Rs. ' + hraOldV],
                    ['Gross Salary', '-', 'Rs. ' + oldGross]
                ],
                theme: 'grid',
                headStyles: { fillColor: [100, 116, 139] },
                columnStyles: { 2: { halign: 'right' } }
            });

            // 5. Footer
            const finalY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("Email: sreee.sreejith@gmail.com", 14, finalY);

            // 6. Output Check
            const cap = window.Capacitor;
            const isNative = !!(cap && cap.Plugins && (cap.Plugins.Filesystem || cap.Plugins.Share));

            return { blob: doc.output('blob'), title: reportTitle };
        } catch (err) {
            console.error("PayRevision PDF Error:", err);
            throw err;
        }
    };

    const downloadPDF = async () => {
        const btn = document.getElementById('downloadBtn');
        const originalText = btn?.innerHTML || "Download";
        if (btn) {
            btn.innerHTML = "<span>⏳</span> Saving...";
            btn.disabled = true;
        }

        try {
            const result = await generatePDFResult();
            await window.PDFHelper.download(result.blob, `${result.title}.pdf`);
        } catch (err) {
            alert("Error generating PDF for download.");
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    };

    const sharePDF = async () => {
        const btn = document.getElementById('shareBtn');
        const originalText = btn?.innerHTML || "Share";
        if (btn) {
            btn.innerHTML = "<span>⏳</span> Sharing...";
            btn.disabled = true;
        }

        try {
            const result = await generatePDFResult();
            await window.PDFHelper.share(result.blob, `${result.title}.pdf`, 'Pay Revision Report');
        } catch (err) {
            console.error("Share error:", err);
            if (err.name !== 'AbortError' && !err.toString().includes('AbortError')) {
                alert("Sharing failed. Try 'Download PDF' instead.");
            }
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    };

    const dBtn = document.getElementById('downloadBtn');
    if (dBtn) dBtn.addEventListener('click', downloadPDF);

    const sBtn = document.getElementById('shareBtn');
    if (sBtn) sBtn.addEventListener('click', sharePDF);

    // Removing printBtn listener as requested to avoid confusion
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.style.display = 'none'; // Hide it entirely
    }
});
