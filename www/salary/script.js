document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');

    // Global variable to store stages for navigation
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
    const basicPay = document.getElementById('basic-pay');
    const dropdown = document.getElementById('custom-dropdown');

    // Store current value
    basicPay.dataset.lastValid = basicPay.value;

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
        basicPay.value = val;
        basicPay.dataset.lastValid = val;
        dropdown.classList.remove('show');
        calculate(); // Call calculation directly
    }

    function showDropdown() {
        renderDropdown("");
        dropdown.classList.add('show');

        const currentVal = parseInt(basicPay.value);
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
    basicPay.addEventListener('focus', function () {
        this.select();
        showDropdown();
    });

    basicPay.addEventListener('click', function () {
        this.select();
        showDropdown();
    });

    basicPay.addEventListener('input', function () {
        // Filter live
        renderDropdown(this.value);
        dropdown.classList.add('show');
        calculate();
    });

    basicPay.addEventListener('blur', function () {
        if (this.value.trim() === "") {
            this.value = this.dataset.lastValid || "";
            calculate();
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

    const daPerc = document.getElementById('da-perc');
    const daPendingPerc = document.getElementById('da-pending-perc');
    const hraPerc = document.getElementById('hra-perc');
    const otherEarnings = document.getElementById('other-earnings');

    // Earnings Calculated Displays
    const daVal = document.getElementById('da-val');
    const daPendingVal = document.getElementById('da-pending-val');
    const hraVal = document.getElementById('hra-val');

    // Deductions Inputs
    const gpfSub = document.getElementById('gpf-sub');
    const gis = document.getElementById('gis');
    const sli = document.getElementById('sli');
    const medisep = document.getElementById('medisep');
    const sliLoan = document.getElementById('sli-loan');
    const otherDeductions = document.getElementById('other-deductions');


    // Final Summary Displays
    const grossValDisplay = document.getElementById('gross-salary-val');
    const totalDeductDisplay = document.getElementById('total-deduction-val');
    const netValDisplay = document.getElementById('net-salary-val');

    const grossBottom = document.getElementById('gross-salary-bottom');
    const deductBottom = document.getElementById('total-deduction-bottom');
    const netBottom = document.getElementById('net-salary-bottom');

    function formatAmount(num) {
        return Math.round(num).toString();
    }

    function calculate() {
        const bp = parseFloat(basicPay.value) || 0;
        const daP = parseFloat(daPerc.value) || 0;
        const dapP = parseFloat(daPendingPerc.value) || 0;
        const hrP = parseFloat(hraPerc.value) || 0;
        const otherEarn = parseFloat(otherEarnings.value) || 0;

        // Calculate individual earnings
        const da = bp * (daP / 100);
        const dap = bp * (dapP / 100);
        const hra = bp * (hrP / 100);

        // Update earnings labels
        daVal.innerText = formatAmount(da);
        daPendingVal.innerText = formatAmount(dap);
        hraVal.innerText = formatAmount(hra);

        // Gross Salary
        const gross = bp + da + dap + hra + otherEarn;
        grossValDisplay.innerText = formatAmount(gross);

        // Deductions
        const d1 = parseFloat(gpfSub.value) || 0;
        const d2 = parseFloat(gis.value) || 0;
        const d3 = parseFloat(sli.value) || 0;
        const d4 = parseFloat(medisep.value) || 0;
        const d5 = parseFloat(sliLoan.value) || 0;
        const d6 = parseFloat(otherDeductions.value) || 0;


        const totalDeductions = d1 + d2 + d3 + d4 + d5 + d6;
        totalDeductDisplay.innerText = formatAmount(totalDeductions);

        // Net Salary
        const net = gross - totalDeductions;
        netValDisplay.innerText = formatAmount(net);

        // Update bottom summaries
        if (grossBottom) grossBottom.innerText = formatAmount(gross);
        if (deductBottom) deductBottom.innerText = formatAmount(totalDeductions);
        if (netBottom) netBottom.innerText = formatAmount(net);
    }

    // Add listeners to all inputs
    inputs.forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Initial calculation
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
        return "Salary_Report_" + new Date().getTime();
    };

    const cleanupAfterPDF = () => {
        document.body.classList.remove('pdf-mode');
    };

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

            const base64Data = dataUri.split(',')[1] || dataUri;

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
            });

            await Share.share({
                title: 'Salary Report',
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
                        title: 'Salary Calculation Report',
                        text: 'Sharing my monthly salary calculation report.'
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
