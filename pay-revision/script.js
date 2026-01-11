document.addEventListener('DOMContentLoaded', () => {
    const inputs = [
        'basic-pay-in',
        'da-pend-perc',
        'hra-old-perc',
        'fitment-perc',
        'bal-da-perc',
        'hra-perc'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', calculate);
        // Auto-select text on click/focus to easily see datalist
        el.addEventListener('click', function () {
            this.select();
        });
    });

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

    // Store current value to dataset for reference
    basicPayInput.dataset.lastValid = basicPayInput.value;

    function renderDropdown(filterText = "") {
        dropdown.innerHTML = "";

        // Filter logic: If empty, show all. If text, show matches.
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
                // Use mousedown to prevent blur from firing before click
                e.preventDefault();
                selectValue(stage);
            });
            dropdown.appendChild(li);
        });
    }

    function selectValue(val) {
        basicPayInput.value = val;
        basicPayInput.dataset.lastValid = val; // Update ghost ref
        dropdown.classList.remove('show');
        calculate(); // Trigger calc
    }

    function showDropdown() {
        renderDropdown(""); // Show all initially or filter based on current val? 
        dropdown.classList.add('show');

        // Auto-scroll to current value if exists
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
        // If typing manual value
        calculate();
        // Filter the list live
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
        const actualTotal = bp + daMergedVal + fitmentVal;

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
        document.getElementById('res-actual-total').textContent = actualTotal;
        document.getElementById('res-bp-fixed').textContent = bpFixed;
        document.getElementById('res-bal-da').textContent = balDaVal;
        document.getElementById('res-hra-new').textContent = hraNewVal;
        document.getElementById('res-gross-new').textContent = grossNew;

        // Summary Cards
        document.getElementById('gross-new-val').textContent = grossNew;
        document.getElementById('gross-old-val').textContent = grossOld;
        document.getElementById('growth-val').textContent = `${growth} (${growthPerc}%)`;
        document.getElementById('revised-bp-val').textContent = bpFixed;
    }

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
        return "PayRevision_Report_" + new Date().getTime();
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
            const cap = window.Capacitor;
            // Use a more direct check for Plugins availability
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

            // Fallback for Web/Desktop
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
            const Plugins = window.Capacitor?.Plugins;

            // Debug: Check if Plugins object exists
            if (!Plugins) {
                alert("DEBUG: window.Capacitor.Plugins is UNDEFINED. Bridge failed.");
                throw new Error("Capacitor Bridge not found.");
            }

            const Filesystem = Plugins.Filesystem;
            const Share = Plugins.Share;

            if (!Filesystem) {
                alert("DEBUG: Filesystem plugin not found in Plugins object.");
                throw new Error("Filesystem plugin missing.");
            }
            if (!Share) {
                alert("DEBUG: Share plugin not found in Plugins object.");
                throw new Error("Share plugin missing.");
            }

            // Strip prefix for Filesystem write
            const base64Data = dataUri.split(',')[1] || dataUri;

            // Write to Cache Directory
            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
            });

            // Share the file
            await Share.share({
                title: 'Pay Revision Report',
                text: 'Here is your Pay Revision Report',
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
                const result = await generatePDFBlob();

                if (result.isNative) {
                    await handleNativeSave(result.dataUri, `${result.title}.pdf`);
                } else {
                    // Browser Fallback
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
                const result = await generatePDFBlob();

                if (result.isNative) {
                    await handleNativeSave(result.dataUri, `${result.title}.pdf`);
                } else if (navigator.share) {
                    const file = new File([result.blob], `${result.title}.pdf`, { type: 'application/pdf' });
                    await navigator.share({
                        files: [file],
                        title: 'Pay Revision Report',
                        text: 'Sharing my pay revision calculation report.'
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
