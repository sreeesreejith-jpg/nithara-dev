// Pay Revision Script v1.7
// Firebase Config for Nithara
const firebaseConfig = {
    apiKey: "AIzaSyB3D98SMCiI2eAKuz6T-yWOfU-7_PuN75U",
    authDomain: "nithara-e398a.firebaseapp.com",
    databaseURL: "https://nithara-e398a-default-rtdb.firebaseio.com",
    projectId: "nithara-e398a",
    storageBucket: "nithara-e398a.firebasestorage.app",
    messagingSenderId: "338187479543",
    appId: "1:338187479543:web:9554ac40e43c26b1cb70d2"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}
const database = (typeof firebase !== 'undefined') ? firebase.database() : null;

// --- SESSION & AUTO-SAVE LOGIC ---
let saveTimeout = null;

function getSessionId() {
    const sessionData = localStorage.getItem('pay_revision_session');
    const now = new Date().getTime();
    const expiry = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionData) {
        try {
            const { id, timestamp } = JSON.parse(sessionData);
            if (now - timestamp < expiry) {
                return id;
            }
        } catch (e) {
            console.error("Session parse error", e);
        }
    }

    // Create new session if none exists or expired
    if (!database) return null;
    const newId = database.ref('calculations').push().key;
    localStorage.setItem('pay_revision_session', JSON.stringify({ id: newId, timestamp: now }));
    return newId;
}

function debouncedSave(data) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const sessionId = getSessionId();
        if (sessionId && database) {
            data.timestamp = new Date().toISOString();
            database.ref('calculations/' + sessionId).set(data)
                .catch(err => console.error("Auto-save Fail:", err));
        }
    }, 1500); // 1.5s debounce
}
// ---------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const inputs = [
        'basic-pay-in',
        'fitment-perc',
        'bal-da-perc',
        'hra-perc',
        'years-service',
        'increment-month',
        'grade-check',
        'grade-month',
        'grade-year',
        'others-val',
        'reportName',
        'penNumber',
        'schoolName'
    ];

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculate);
            el.addEventListener('change', calculate);
            // Auto-select text on click/focus to easily see datalist
            el.addEventListener('click', function () {
                if (typeof this.select === 'function') {
                    this.select();
                }
            });
        }
    });

    const weightageCheck = document.getElementById('weightage-check');
    const weightageContainer = document.getElementById('weightage-container');
    const weightageResultRow = document.getElementById('res-weightage-row');

    if (weightageCheck && weightageContainer) {
        weightageCheck.addEventListener('change', () => {
            if (weightageCheck.checked) {
                weightageContainer.style.display = 'flex'; // Proper layout for input container (column)
                if (weightageResultRow) weightageResultRow.style.display = 'grid'; // Strict Grid for result row
            } else {
                weightageContainer.style.display = 'none';
                if (weightageResultRow) weightageResultRow.style.display = 'none';
            }
            calculate();
        });
    }

    const gradeCheck = document.getElementById('grade-check');
    const gradeDetailsContainer = document.getElementById('grade-details-container');

    if (gradeCheck && gradeDetailsContainer) {
        gradeCheck.addEventListener('change', () => {
            gradeDetailsContainer.style.display = gradeCheck.checked ? 'flex' : 'none';
            calculate();
        });
    }

    // Increment Month Conditional Display Logic
    const incrementMonthInput = document.getElementById('increment-month');
    const incrementMonthDisplay = document.getElementById('increment-month-display');
    const incrementMonthDropdown = document.getElementById('increment-month-dropdown');

    // Grade Month Logic
    const gradeMonthInput = document.getElementById('grade-month');
    const gradeMonthDisplay = document.getElementById('grade-month-display');
    const gradeMonthDropdown = document.getElementById('grade-month-dropdown');

    const revisedBpContainer = document.getElementById('revised-bp-container');
    const presentBpContainer = document.getElementById('present-bp-container');
    const presentSalaryContainer = document.getElementById('present-salary-container');

    function toggleConditionalSections() {
        const isIncrementSelected = incrementMonthInput && incrementMonthInput.value !== "";

        if (revisedBpContainer) {
            revisedBpContainer.style.display = isIncrementSelected ? 'flex' : 'none';
        }
        if (presentBpContainer) {
            presentBpContainer.style.display = isIncrementSelected ? 'flex' : 'none';
        }
        if (presentSalaryContainer) {
            presentSalaryContainer.style.display = isIncrementSelected ? 'flex' : 'none';
        }
    }

    // Generic Month Dropdown Logic with Search
    function setupMonthDropdown(inputEl, displayEl, dropdownEl) {
        function renderMonths(filterText = "") {
            dropdownEl.innerHTML = "";
            let hasMatches = false;
            monthNames.forEach((month, index) => {
                if (filterText && !month.toLowerCase().startsWith(filterText.toLowerCase())) return;
                hasMatches = true;

                const li = document.createElement('li');
                li.textContent = month;
                li.dataset.value = index; // Store 0-11 index

                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectMonth(index, month);
                });

                dropdownEl.appendChild(li);
            });

            if (!hasMatches) {
                dropdownEl.classList.remove('show');
            } else {
                dropdownEl.classList.add('show');
            }
        }

        function selectMonth(index, name) {
            inputEl.value = index;
            displayEl.value = name;
            displayEl.dataset.lastValid = name;
            inputEl.dataset.lastValid = index;
            dropdownEl.classList.remove('show');
            toggleConditionalSections(); // Update visibility if needed
            calculate();
        }

        function showDropdown() {
            renderMonths(displayEl.value === "Select" ? "" : displayEl.value);
            const currentVal = inputEl.value;
            if (currentVal !== "") {
                const items = Array.from(dropdownEl.querySelectorAll('li'));
                const match = items.find(li => li.dataset.value == currentVal);
                if (match) {
                    match.scrollIntoView({ block: 'center' });
                    items.forEach(li => li.classList.remove('active'));
                    match.classList.add('active');
                }
            }
        }

        displayEl.addEventListener('click', function () {
            this.select();
            showDropdown();
        });
        displayEl.addEventListener('focus', function () {
            this.select();
            showDropdown();
        });
        displayEl.addEventListener('input', function () {
            renderMonths(this.value);
        });
        displayEl.addEventListener('blur', () => {
            setTimeout(() => {
                if (!dropdownEl.classList.contains('show')) {
                    if (inputEl.value === "") {
                        displayEl.value = "";
                    } else {
                        // Restore last valid name if current text doesn't match a month
                        const currentText = displayEl.value.toLowerCase();
                        const matchIndex = monthNames.findIndex(m => m.toLowerCase() === currentText);
                        if (matchIndex === -1) {
                            displayEl.value = monthNames[inputEl.value] || "";
                        }
                    }
                }
                dropdownEl.classList.remove('show');
            }, 150);
        });

        dropdownEl.addEventListener('scroll', () => {
            if (dropdownEl.classList.contains('show')) {
                syncSelectionOnScroll(dropdownEl, displayEl, inputEl, true);
            }
        });
    }

    // Generic Year Dropdown Logic with Search
    function setupYearDropdown(inputEl, displayEl, dropdownEl) {
        const yearList = ["2024", "2025", "2026"];

        function renderYears(filterText = "") {
            dropdownEl.innerHTML = "";
            let hasMatches = false;
            yearList.forEach((year) => {
                if (filterText && !year.startsWith(filterText)) return;
                hasMatches = true;

                const li = document.createElement('li');
                li.textContent = year;

                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectYear(year);
                });

                dropdownEl.appendChild(li);
            });

            if (!hasMatches) {
                dropdownEl.classList.remove('show');
            } else {
                dropdownEl.classList.add('show');
            }
        }

        function selectYear(year) {
            inputEl.value = year;
            displayEl.value = year;
            displayEl.dataset.lastValid = year;
            inputEl.dataset.lastValid = year;
            dropdownEl.classList.remove('show');
            calculate();
        }

        function showDropdown() {
            renderYears(displayEl.value === "Select" ? "" : displayEl.value);
            const currentVal = inputEl.value;
            if (currentVal !== "") {
                const items = Array.from(dropdownEl.querySelectorAll('li'));
                const match = items.find(li => li.textContent == currentVal);
                if (match) {
                    match.scrollIntoView({ block: 'center' });
                    items.forEach(li => li.classList.remove('active'));
                    match.classList.add('active');
                }
            }
        }

        displayEl.addEventListener('click', function () {
            this.select();
            showDropdown();
        });
        displayEl.addEventListener('focus', function () {
            this.select();
            showDropdown();
        });
        displayEl.addEventListener('input', function () {
            renderYears(this.value);
        });
        displayEl.addEventListener('blur', () => {
            setTimeout(() => {
                if (!dropdownEl.classList.contains('show')) {
                    if (inputEl.value === "") {
                        displayEl.value = "";
                    } else {
                        const currentText = displayEl.value;
                        if (!yearList.includes(currentText)) {
                            displayEl.value = inputEl.value;
                        }
                    }
                }
                dropdownEl.classList.remove('show');
            }, 150);
        });

        dropdownEl.addEventListener('scroll', () => {
            if (dropdownEl.classList.contains('show')) {
                syncSelectionOnScroll(dropdownEl, displayEl, inputEl, false);
            }
        });
    }

    if (incrementMonthInput && incrementMonthDisplay && incrementMonthDropdown) {
        setupMonthDropdown(incrementMonthInput, incrementMonthDisplay, incrementMonthDropdown);
    }

    if (gradeMonthInput && gradeMonthDisplay && gradeMonthDropdown) {
        setupMonthDropdown(gradeMonthInput, gradeMonthDisplay, gradeMonthDropdown);
    }

    const gradeYearInput = document.getElementById('grade-year');
    const gradeYearDisplay = document.getElementById('grade-year-display');
    const gradeYearDropdown = document.getElementById('grade-year-dropdown');

    if (gradeYearInput && gradeYearDisplay && gradeYearDropdown) {
        setupYearDropdown(gradeYearInput, gradeYearDisplay, gradeYearDropdown);
    }

    // Overload syncSelectionOnScroll to handle Month dropdowns (value vs text)
    // We'll modify the existing one below or create a new one. Let's modify the existing one to be more flexible.


    // Initialize conditional sections on page load
    toggleConditionalSections();

    // Initialize dynamic date labels
    function initializeDateLabels() {
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;

        // Update "Present BP" label to show "Revised BP on Jan 2026" format
        const presentBpLabel = document.getElementById('present-bp-label');
        if (presentBpLabel) {
            presentBpLabel.textContent = `Revised BP on ${currentMonthYear}`;
        }

        // Update Gross Salary label
        const grossLabel = document.getElementById('label-gross-new');
        if (grossLabel) {
            grossLabel.textContent = `Gross Salary (${currentMonthYear})`;
        }
    }

    initializeDateLabels();

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

    // --- Fitment Dropdown logic ---
    const fitmentInput = document.getElementById('fitment-perc');
    const fitmentDropdown = document.getElementById('fitment-dropdown');
    const fitmentList = [4, 5, 6, 7, 8, 9, 10];

    function renderFitmentDropdown() {
        fitmentDropdown.innerHTML = "";
        fitmentList.forEach(val => {
            const li = document.createElement('li');
            li.textContent = val;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                fitmentInput.value = val;
                fitmentDropdown.classList.remove('show');
                calculate();
            });
            li.addEventListener('mouseenter', () => {
                fitmentInput.value = val;
                calculate();
            });
            fitmentDropdown.appendChild(li);
        });
    }

    function showFitmentDropdown() {
        renderFitmentDropdown();
        fitmentDropdown.classList.add('show');
        const currentVal = fitmentInput.value;
        const items = Array.from(fitmentDropdown.querySelectorAll('li'));
        const match = items.find(li => li.textContent == currentVal);
        if (match) {
            match.scrollIntoView({ block: 'center' });
            items.forEach(li => li.classList.remove('active'));
            match.classList.add('active');
        }
    }

    fitmentInput.addEventListener('focus', showFitmentDropdown);
    fitmentInput.addEventListener('click', showFitmentDropdown);
    fitmentInput.addEventListener('blur', () => {
        setTimeout(() => fitmentDropdown.classList.remove('show'), 150);
    });
    fitmentDropdown.addEventListener('scroll', () => {
        if (fitmentDropdown.classList.contains('show')) {
            syncSelectionOnScroll(fitmentDropdown, fitmentInput);
        }
    });

    // --- HRA Dropdown logic ---
    const hraInput = document.getElementById('hra-perc');
    const hraDropdown = document.getElementById('hra-dropdown');
    const hraList = [4, 6, 8, 10];

    function renderHRADropdown() {
        hraDropdown.innerHTML = "";
        hraList.forEach(val => {
            const li = document.createElement('li');
            li.textContent = val;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                hraInput.value = val;
                hraDropdown.classList.remove('show');
                calculate();
            });
            li.addEventListener('mouseenter', () => {
                hraInput.value = val;
                calculate();
            });
            hraDropdown.appendChild(li);
        });
    }

    function showHRADropdown() {
        renderHRADropdown();
        hraDropdown.classList.add('show');
        const currentVal = hraInput.value;
        const items = Array.from(hraDropdown.querySelectorAll('li'));
        const match = items.find(li => li.textContent == currentVal);
        if (match) {
            match.scrollIntoView({ block: 'center' });
            items.forEach(li => li.classList.remove('active'));
            match.classList.add('active');
        }
    }

    hraInput.addEventListener('focus', showHRADropdown);
    hraInput.addEventListener('click', showHRADropdown);
    hraInput.addEventListener('blur', () => {
        setTimeout(() => hraDropdown.classList.remove('show'), 150);
    });
    hraDropdown.addEventListener('scroll', () => {
        if (hraDropdown.classList.contains('show')) {
            syncSelectionOnScroll(hraDropdown, hraInput);
        }
    });

    // Manual entry listener for HRA
    hraInput.addEventListener('input', calculate);

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

    // Helper to sync selection based on scroll position (Mobile friendly)
    // updated signature: syncSelectionOnScroll(dropdownEl, displayEl, hiddenInputEl = null, isMonth = false)
    function syncSelectionOnScroll(dropdownEl, displayEl, hiddenInputEl = null, isMonth = false) {
        const items = dropdownEl.querySelectorAll('li');
        if (items.length === 0) return;

        const dropdownRect = dropdownEl.getBoundingClientRect();
        const centerY = dropdownRect.top + dropdownRect.height / 2;

        let closestItem = null;
        let minDistance = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenterY = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(centerY - itemCenterY);

            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem && !closestItem.classList.contains('active')) {
            items.forEach(li => li.classList.remove('active'));
            closestItem.classList.add('active');

            displayEl.value = closestItem.textContent;
            displayEl.dataset.lastValid = closestItem.textContent;

            if (hiddenInputEl) {
                hiddenInputEl.value = isMonth ? closestItem.dataset.value : closestItem.textContent;
                hiddenInputEl.dataset.lastValid = hiddenInputEl.value;
            }

            if (isMonth) {
                toggleConditionalSections();
            }
            calculate();
        }
    }

    // Add scroll listeners for live updates on mobile
    dropdown.addEventListener('scroll', () => {
        if (dropdown.classList.contains('show')) {
            syncSelectionOnScroll(dropdown, basicPayInput);
        }
    });

    yearsDropdown.addEventListener('scroll', () => {
        if (yearsDropdown.classList.contains('show')) {
            syncSelectionOnScroll(yearsDropdown, yearsInput);
        }
    });

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
        // Inputs
        const bp = parseFloat(document.getElementById('basic-pay-in').value) || 0;
        const fitmentPerc = parseFloat(document.getElementById('fitment-perc').value) || 0;
        const isWeightageEnabled = document.getElementById('weightage-check')?.checked;
        const yearsService = Math.floor(parseFloat(document.getElementById('years-service').value) || 0);

        const incMonthVal = document.getElementById('increment-month').value;
        const incMonth = incMonthVal !== "" ? parseInt(incMonthVal) : null;

        // Validation: Ensure BP and Increment Month are selected
        if (!bp || incMonth === null) {
            return;
        }

        const hasGrade = document.getElementById('grade-check')?.checked;
        const gradeMonth = parseInt(document.getElementById('grade-month').value);
        const gradeYear = parseInt(document.getElementById('grade-year').value);

        // --- DYNAMIC PROGRESSION CALCULATION (TIMELINE) ---
        const startDate = new Date(2024, 6, 1); // July 1, 2024

        // Progression goes up to the present month (User prefers Jan 2026 as benchmark)
        let today = new Date();
        const jan2026 = new Date(2026, 0, 1);
        if (!today || today < jan2026) {
            today = jan2026;
        }


        let events = [];
        let incrementsCount = 0;
        let checkDate = new Date(startDate);

        // 1. Identify all events between 07/2024 and Benchmark Date
        while (checkDate <= today) {
            // Check for Annual Increment
            if (incMonth !== null && checkDate.getMonth() === incMonth && checkDate.getTime() !== startDate.getTime()) {
                incrementsCount++;
                events.push({
                    type: 'increment',
                    date: new Date(checkDate),
                    label: `Annual Increment (${monthShortNames[checkDate.getMonth()]} ${checkDate.getFullYear()})`,
                    steps: 1
                });
            }
            // Check for Grade (Must be AFTER July 2024)
            const gradeThreshold = new Date(2024, 7, 1); // August 1, 2024
            if (hasGrade && checkDate.getMonth() === gradeMonth && checkDate.getFullYear() === gradeYear) {
                if (checkDate >= gradeThreshold) {
                    events.push({
                        type: 'grade',
                        date: new Date(checkDate),
                        label: `If got Grade after 1/7/24 (${monthShortNames[checkDate.getMonth()]} ${checkDate.getFullYear()})`,
                        steps: 2
                    });
                }
            }
            checkDate.setMonth(checkDate.getMonth() + 1);
        }

        // Sort events by date (Stable sort: Increment always before Grade on same date)
        events.sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return a.date - b.date;
            }
            if (a.type === 'increment' && b.type === 'grade') return -1;
            if (a.type === 'grade' && b.type === 'increment') return 1;
            return 0;
        });
        // --------------------------------------------------

        // Static Percentages
        const daMergedPerc = 31;
        const balDaPerc = parseFloat(document.getElementById('bal-da-perc').value) || 0;
        const hraNewPerc = parseFloat(document.getElementById('hra-perc').value) || 0;

        // 1. GENERATE DYNAMIC MASTER SCALE
        // This calculates the revised BP for EVERY stage in the old scale
        const revisedScale = payStagesList.map(stage => {
            const mDaVal = Math.round(stage * (daMergedPerc / 100));
            const mFitmentVal = Math.round(stage * (fitmentPerc / 100));

            let mWeightagePerc = 0;
            let mWeightageVal = 0;
            if (isWeightageEnabled) {
                mWeightagePerc = Math.min(yearsService * 0.5, 15);
                mWeightageVal = Math.round(stage * (mWeightagePerc / 100));
            }

            const mActualTotal = stage + mDaVal + mFitmentVal + mWeightageVal;
            return Math.ceil(mActualTotal / 100) * 100;
        });

        // 2. NO LONGER CALCULATING BEFORE REVISION GROSS

        // 3. AFTER REVISION FIXATION (July 2024)
        const baseIndex = payStagesList.indexOf(bp);
        let bpFixed = 0;
        let daMergedVal = 0;
        let fitmentVal = 0;
        let weightageVal = 0;
        let weightagePerc = 0;
        let actualTotal = 0;

        if (baseIndex !== -1) {
            bpFixed = revisedScale[baseIndex];

            // For breakdown display
            daMergedVal = Math.round(bp * (daMergedPerc / 100));
            fitmentVal = Math.round(bp * (fitmentPerc / 100));
            if (isWeightageEnabled) {
                weightagePerc = Math.min(yearsService * 0.5, 15);
                weightageVal = Math.round(bp * (weightagePerc / 100));
            }
            actualTotal = bp + daMergedVal + fitmentVal + weightageVal;
        }

        // 4. POST-FIXATION PROGRESSION (Timeline Building)
        const timelineDiv = document.getElementById('timeline-steps');
        const timelineContainer = document.getElementById('progression-timeline');
        timelineDiv.innerHTML = '';

        let bpCurrent = bpFixed;
        let currentIndex = baseIndex;
        let timelineHTML = '';

        if (baseIndex !== -1) {
            timelineHTML += `
                    <div class="timeline-item">
                        <span class="label">Revised BP On 01/07/2024</span>
                        <span class="value">Rs. ${bpFixed}</span>
                    </div>
                `;

            events.forEach(event => {
                currentIndex += event.steps;
                currentIndex = Math.min(currentIndex, revisedScale.length - 1);
                const stepPay = revisedScale[currentIndex];

                // Labels as requested by user
                const month = monthShortNames[event.date.getMonth()];
                const year = event.date.getFullYear();
                let localizedLabel = "";

                if (event.type === 'increment') {
                    localizedLabel = `Increment on ${month} ${year}`;
                } else {
                    localizedLabel = `Grade on ${month} ${year}`;
                }

                timelineHTML += `
                    <div class="timeline-item">
                        <span class="label">${localizedLabel}</span>
                        <span class="value">Rs. ${stepPay}</span>
                    </div>
                `;
            });
            bpCurrent = revisedScale[currentIndex];
        }

        if (timelineHTML && bp > 0 && incMonth !== null) {
            timelineDiv.innerHTML = timelineHTML;
            timelineContainer.style.display = 'flex';
        } else {
            timelineContainer.style.display = 'none';
        }

        // 5. CURRENT MONETARY CALCS (Jan 2026)
        // Note: DA and HRA are now calculated on bpCurrent (the pay as of Jan 2026)
        const balDaVal = Math.round(bpCurrent * (balDaPerc / 100));
        const hraNewVal = Math.round(bpCurrent * (hraNewPerc / 100));
        const othersVal = parseFloat(document.getElementById('others-val').value) || 0;
        const grossNew = bpCurrent + balDaVal + hraNewVal + othersVal;

        // Update After UI
        // res-bp-new and breakdown are hidden in HTML but kept for logic if needed
        const bpNewEl = document.getElementById('res-bp-new');
        if (bpNewEl) bpNewEl.textContent = bp;

        const daMergedEl = document.getElementById('res-da-merged');
        if (daMergedEl) daMergedEl.textContent = daMergedVal;

        const fitmentEl = document.getElementById('res-fitment');
        if (fitmentEl) fitmentEl.textContent = fitmentVal;

        // Dynamic Label for Fitment
        const fitmentLabelEl = document.getElementById('label-res-fitment');
        if (fitmentLabelEl) fitmentLabelEl.textContent = `Fitment Amount (${fitmentPerc}%)`;

        const weightageRow = document.getElementById('res-weightage-row');
        if (weightageRow) weightageRow.style.display = isWeightageEnabled ? 'grid' : 'none';

        const weightageEl = document.getElementById('res-weightage');
        if (weightageEl) weightageEl.textContent = weightageVal;

        // Dynamic Label for Weightage
        const weightageLabelEl = document.getElementById('label-res-weightage');
        if (weightageLabelEl) weightageLabelEl.textContent = `Service Weightage (${weightagePerc}%)`;

        const actualTotalEl = document.getElementById('res-actual-total');
        if (actualTotalEl) actualTotalEl.textContent = actualTotal;

        // Update After UI
        const benchmarkMonth = monthShortNames[today.getMonth()];
        const benchmarkYear = today.getFullYear();
        const shortYear = benchmarkYear.toString().slice(-2);

        const bpLabel = document.getElementById('label-bp-current');
        if (bpLabel) bpLabel.textContent = `Revised BP on ${benchmarkMonth} ${shortYear}`;

        const grossLabel = document.getElementById('label-gross-new');
        if (grossLabel) grossLabel.textContent = `Gross Salary (${benchmarkMonth} ${benchmarkYear})`;

        document.getElementById('res-bp-fixed').textContent = bpFixed;
        document.getElementById('res-bp-current').textContent = bpCurrent;
        document.getElementById('res-bal-da').textContent = balDaVal;
        document.getElementById('res-hra-new').textContent = hraNewVal;
        document.getElementById('res-others').textContent = othersVal;
        document.getElementById('res-gross-new').textContent = grossNew;

        // --- ARREAR CALCULATION (MONTH-BY-MONTH) ---
        let totalArrear = 0;
        let arrearHTML = '';
        let monthLoop = new Date(startDate); // July 1, 2024
        let currentOldBP = bp;
        let currentNewBP = bpFixed;
        let currentOldIndex = baseIndex;
        let currentNewIndex = baseIndex;

        while (monthLoop <= today) {
            const year = monthLoop.getFullYear();
            const month = monthLoop.getMonth(); // 0-11

            // 1. Process Increments & Grades (Apply after the start month)
            if (monthLoop.getTime() !== startDate.getTime()) {
                // Annual Increment
                if (incMonth !== null && month === incMonth) {
                    currentOldIndex++;
                    currentNewIndex++;
                    currentOldIndex = Math.min(currentOldIndex, payStagesList.length - 1);
                    currentNewIndex = Math.min(currentNewIndex, revisedScale.length - 1);
                    currentOldBP = payStagesList[currentOldIndex];
                    currentNewBP = revisedScale[currentNewIndex];
                }
                // Grade
                if (hasGrade && year === gradeYear && month === gradeMonth) {
                    currentOldIndex += 2;
                    currentNewIndex += 2;
                    currentOldIndex = Math.min(currentOldIndex, payStagesList.length - 1);
                    currentNewIndex = Math.min(currentNewIndex, revisedScale.length - 1);
                    currentOldBP = payStagesList[currentOldIndex];
                    currentNewBP = revisedScale[currentNewIndex];
                }
            }

            // 2. Get DA Rates for this month
            let daOld = 0;
            if (year === 2024) {
                if (month >= 6 && month <= 8) daOld = 9; // Jul-Sep
                else if (month >= 9) daOld = 12; // Oct-Dec
            } else if (year === 2025) {
                if (month <= 2) daOld = 12; // Jan-Mar
                else if (month >= 3 && month <= 6) daOld = 15; // Apr-Jul
                else if (month >= 7 && month <= 8) daOld = 18; // Aug-Sep
                else daOld = 22; // Oct onwards
            } else {
                daOld = 22; // 2026 onwards
            }

            let daRev = 0;
            if (year === 2024) daRev = 0; // Jul-Dec
            else if (year === 2025) {
                if (month <= 5) daRev = 2; // Jan-Jun
                else daRev = 4; // Jul-Dec
            } else {
                daRev = 4; // UPDATED: Jan 2026 onwards is 4% (same as Dec 2025)
            }

            // 3. Calculate Monthly Totals
            const oldDAVal = Math.round(currentOldBP * (daOld / 100));
            const oldHRAVal = Math.round(currentOldBP * (hraNewPerc / 100));
            const oldGross = currentOldBP + oldDAVal + oldHRAVal + othersVal;

            const newDAVal = Math.round(currentNewBP * (daRev / 100));
            // AS REQUESTED: HRA of revised salary is same as that we calculated from pre-revised salary
            const newHRAVal = oldHRAVal;
            const newGross = currentNewBP + newDAVal + newHRAVal + othersVal;

            const monthlyArrear = newGross - oldGross;
            totalArrear += monthlyArrear;

            arrearHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 8px 5px; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.05);">${monthShortNames[month]} ${year}</td>
                    
                    <td style="padding: 8px 5px; text-align: right; color: #3b82f6;">${currentNewBP}</td>
                    <td style="padding: 8px 5px; text-align: right; color: #3b82f6;">${daRev}%</td>
                    <td style="padding: 8px 5px; text-align: right; color: #3b82f6;">${newDAVal}</td>
                    <td style="padding: 8px 5px; text-align: right; color: #3b82f6;">${newHRAVal}</td>
                    <td style="padding: 8px 5px; text-align: right; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.1); color: #fff;">${newGross}</td>
                    
                    <td style="padding: 8px 5px; text-align: right; color: #94a3b8;">${currentOldBP}</td>
                    <td style="padding: 8px 5px; text-align: right; color: #94a3b8;">${daOld}%</td>
                    <td style="padding: 8px 5px; text-align: right; color: #94a3b8;">${oldDAVal}</td>
                    <td style="padding: 8px 5px; text-align: right; color: #94a3b8;">${oldHRAVal}</td>
                    <td style="padding: 8px 5px; text-align: right; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.1);">${oldGross}</td>
                    
                    <td style="padding: 8px 5px; text-align: right; font-weight: 800; color: ${monthlyArrear >= 0 ? '#10b981' : '#ef4444'};">
                        ${monthlyArrear.toLocaleString()}
                    </td>
                </tr>
            `;

            monthLoop.setMonth(monthLoop.getMonth() + 1);
        }

        // 4. Update UI
        const arrearTbody = document.getElementById('arrear-tbody');
        const arrearContainer = document.getElementById('arrear-container');
        const totalArrearHeader = document.getElementById('total-arrear-header');

        if (arrearTbody && arrearContainer && totalArrearHeader) {
            arrearTbody.innerHTML = arrearHTML;
            const formattedTotal = `₹${totalArrear.toLocaleString()}`;
            totalArrearHeader.textContent = formattedTotal;
            arrearContainer.style.display = 'flex';
            arrearContainer.style.flexDirection = 'column';

            // Update Summary Card
            const summaryArrear = document.getElementById('header-total-arrear');
            const summaryArrearCont = document.getElementById('arrear-summary-container');
            if (summaryArrear && summaryArrearCont) {
                summaryArrear.textContent = formattedTotal;
                summaryArrearCont.style.display = totalArrear > 0 ? 'flex' : 'none';
            }
        }

        // Summary Card BP
        document.getElementById('gross-new-val').textContent = grossNew;
        document.getElementById('revised-bp-val').textContent = bp > 0 ? bpFixed : '';
        const headerPresentBp = document.getElementById('header-present-bp');
        if (headerPresentBp) headerPresentBp.textContent = bp > 0 ? bpCurrent : '';

        // --- AUTO-SAVE TRIGGER ---
        if (bp > 0 && incMonth !== null) {
            const data = {
                action: "AutoUpdate",
                oldBP: bp,
                revisedBP: bpFixed,
                presentBP: bpCurrent,
                grossSalary: grossNew,
                totalArrear: totalArrear,
                fitment: fitmentPerc,
                isWeightage: isWeightageEnabled || false,
                serviceYears: yearsService,
                hasGrade: hasGrade || false,
                incMonth: incMonth,
                gradeMonth: gradeMonth || "",
                gradeYear: gradeYear || "",
                balDA: balDaPerc,
                hra: hraNewPerc,
                others: othersVal,
                pen: document.getElementById('penNumber')?.value || "",
                school: document.getElementById('schoolName')?.value || "",
                employeeName: document.getElementById('reportName')?.value || "Anonymous"
            };
            debouncedSave(data);
        }
    }

    // Initial calculation
    calculate();

    // PDF & Sharing Logic

    const cleanupAfterPDF = () => {
        document.body.classList.remove('pdf-mode');
    };

    const generatePDFResult = async () => {
        try {
            // Flexible detection for jsPDF in different environments
            const jsPDFLib = window.jsPDF || (window.jspdf ? window.jspdf.jsPDF : null);
            if (!jsPDFLib) {
                console.error("PDF Library (jsPDF) not found on window");
                throw new Error("PDF Library not loaded");
            }

            const doc = new jsPDFLib();
            const reportTitle = "PayRevision_Report_" + new Date().getTime();
            const localMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // 1. Header & Title
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setFontSize(22);
            doc.setTextColor(255);
            doc.setFont("helvetica", "bold");
            doc.text("Pay Revision Report", 14, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const name = document.getElementById('reportName')?.value?.trim() || "";
            const pen = document.getElementById('penNumber')?.value?.trim() || "";
            const school = document.getElementById('schoolName')?.value?.trim() || "";

            let headerY = 28;
            if (name) { doc.text(`Employee: ${name}`, 14, headerY); headerY += 5; }
            if (pen) { doc.text(`PEN Number: ${pen}`, 14, headerY); headerY += 5; }
            if (school) { doc.text(`School/Office: ${school}`, 14, headerY); headerY += 5; }

            // 2. Data Extraction
            const bpInitial = document.getElementById('basic-pay-in')?.value || "0";
            const fixedBp = document.getElementById('res-bp-fixed')?.textContent || "0";
            const currentBp = document.getElementById('res-bp-current')?.textContent || "0";
            const newGross = document.getElementById('res-gross-new')?.textContent || "0";

            const now = new Date();
            const curMonthLabel = localMonths[now.getMonth()] || "Month";
            const currentMonthYear = curMonthLabel + " " + now.getFullYear();

            // 3. Main Summary Table (3 Stages)
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text("Pay Summary Breakdown", 14, 50);

            doc.autoTable({
                startY: 55,
                head: [['Stage', 'Effective Date', 'Basic Pay', 'Gross Salary']],
                body: [
                    ['PreRevised BP', '01/07/2024', 'Rs. ' + bpInitial, '-'],
                    ['Revised Basic Pay', '01/07/2024', 'Rs. ' + fixedBp, '-'],
                    ['Present Basic Pay', currentMonthYear, 'Rs. ' + currentBp, 'Rs. ' + newGross]
                ],
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], halign: 'left' },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'left' },
                    2: { halign: 'right' },
                    3: { halign: 'right' }
                },
                didParseCell: function (data) {
                    if (data.section === 'head' && (data.column.index === 2 || data.column.index === 3)) {
                        data.cell.styles.halign = 'right';
                    }
                }
            });

            // 4. Detailed Pay Fixation (01/07/2024)
            let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 120;
            doc.text("Pay Fixation Details (01/07/2024)", 14, currentY);

            const daMerged = document.getElementById('res-da-merged')?.textContent || "0";
            const fitmentP = document.getElementById('fitment-perc')?.value || "0";
            const fitmentV = document.getElementById('res-fitment')?.textContent || "0";
            const yearsService = document.getElementById('years-service')?.value || "0";
            const weightageV = document.getElementById('res-weightage')?.textContent || "0";
            const actualTotal = document.getElementById('res-actual-total')?.textContent || "0";

            const isWeightageChecked = document.getElementById('weightage-check')?.checked;

            const fixationRows = [
                ['PreRevised BP', '-', 'Rs. ' + bpInitial],
                ['DA Merged', '31 %', 'Rs. ' + daMerged],
                ['Fitment Benefit', fitmentP + ' %', 'Rs. ' + fitmentV]
            ];

            if (isWeightageChecked) {
                fixationRows.push(['Service Weightage (if allowed)', yearsService + ' Yrs', 'Rs. ' + weightageV]);
            }

            fixationRows.push(
                ['Actual Total', 'Sum', 'Rs. ' + actualTotal],
                ['Fixed Basic Pay', 'Round Next 100', 'Rs. ' + fixedBp]
            );

            doc.autoTable({
                startY: currentY + 5,
                head: [['Fixation Component', 'Info', 'Amount']],
                body: fixationRows,
                theme: 'grid',
                headStyles: { fillColor: [75, 85, 99] },
                columnStyles: { 2: { halign: 'right' } }
            });

            // 5. Timeline Summary (Moved Up)
            const timelineSteps = document.querySelectorAll('#timeline-steps > div');
            if (timelineSteps && timelineSteps.length > 0) {
                let timelineY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 240;

                // Check if we need a new page
                const estimatedHeight = (timelineSteps.length * 8) + 30;
                if (timelineY + estimatedHeight > 285) {
                    doc.addPage();
                    timelineY = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(59, 130, 246); // Primary Color
                doc.setFont("Outfit", "bold");
                doc.text("Detailed Pay Progression Timeline", 14, timelineY);

                let timelineRows = [];
                timelineSteps.forEach(step => {
                    const spans = step.querySelectorAll('span');
                    if (spans.length >= 2) {
                        let fullLabel = spans[0].textContent.replace('• ', '').trim();
                        let eventType = fullLabel;
                        let dateText = "-";

                        // Split "Event on Date" into two columns
                        if (fullLabel.toLowerCase().includes(" on ")) {
                            const parts = fullLabel.split(/ on /i);
                            eventType = parts[0].trim();
                            dateText = parts[1].trim();
                        }

                        const valText = spans[1].textContent.trim() || "";
                        timelineRows.push([eventType, dateText, valText]);
                    }
                });

                doc.autoTable({
                    startY: timelineY + 5,
                    head: [['Progression Event', 'Date / Period', 'Revised Pay Stage']],
                    body: timelineRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [59, 130, 246],
                        halign: 'center',
                        fontSize: 10
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { halign: 'center', cellWidth: 50 },
                        2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 }
                    },
                    styles: {
                        fontSize: 9,
                        cellPadding: 4,
                        valign: 'middle'
                    }
                });
            }

            // 6. Present Salary Breakdown (Dynamic Date) (Moved Down)
            currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200;

            // Check for page break before this section too, just in case
            if (currentY + 60 > 285) {
                doc.addPage();
                currentY = 20;
            }

            doc.text(`Present Salary Details (${currentMonthYear})`, 14, currentY);

            const balDaP = document.getElementById('bal-da-perc')?.value || "0";
            const balDaV = document.getElementById('res-bal-da')?.textContent || "0";
            const hraP = document.getElementById('hra-perc')?.value || "0";
            const hraV = document.getElementById('res-hra-new')?.textContent || "0";
            const othersV = document.getElementById('res-others')?.textContent || "0";

            doc.autoTable({
                startY: currentY + 5,
                head: [['Current Component', 'Rate/Info', 'Amount']],
                body: [
                    ['Current Basic Pay', 'From Progression', 'Rs. ' + currentBp],
                    ['Dearness Allowance (DA)', balDaP + '%', 'Rs. ' + balDaV],
                    ['House Rent Allowance (HRA)', hraP + '%', 'Rs. ' + hraV],
                    ['Others', '-', 'Rs. ' + othersV],
                    ['Total Monthly Gross', currentMonthYear, 'Rs. ' + newGross]
                ],
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
                columnStyles: { 2: { halign: 'right' } },
                didParseCell: function (data) {
                    if (data.section === 'head' && data.column.index === 2) {
                        data.cell.styles.halign = 'right';
                    }
                }
            });

            // 7. Arrear Statement Table
            const arrearRows = [];
            const rows = document.querySelectorAll('#arrear-tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 11) {
                    const rowData = [];
                    cells.forEach(c => rowData.push(c.textContent.trim()));
                    arrearRows.push(rowData);
                }
            });

            if (arrearRows.length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(59, 130, 246);
                doc.text("Arrear Statement (Jul 2024 - Present)", 14, 20);

                const totalArrearText = document.getElementById('total-arrear-header')?.textContent || "₹0";
                doc.autoTable({
                    startY: 25,
                    head: [['Month', 'New BP', 'DA%', 'DA', 'HRA', 'NewTotal', 'Old BP', 'DA%', 'DA', 'HRA', 'OldTotal', 'Arrear']],
                    body: arrearRows,
                    foot: [[{ content: 'arrear', colSpan: 11, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalArrearText, styles: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] } }]],
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
                    footStyles: { fillColor: [240, 253, 244], fontSize: 8 },
                    styles: { fontSize: 7, cellPadding: 2 },
                    columnStyles: {
                        0: { halign: 'left', cellWidth: 20 },
                        11: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244] }
                    }
                });
            }

            // 8. Footer
            if (doc.lastAutoTable) {
                let finalY = doc.lastAutoTable.finalY + 15;
                if (finalY > 275) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.setFont("Outfit", "normal");
                const disclaimer = "* NOTE: Calculations are approximate and for informational purposes only.";
                doc.text(disclaimer, 14, finalY);

                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text("Email: sreee.sreejith@gmail.com", 14, finalY + 8);
            }

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
            triggerCloudSave("Download");
        } catch (err) {
            console.error("PayRevision PDF Generation Error:", err);
            alert("Error generating PDF: " + (err.message || "Please check your inputs."));
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
            triggerCloudSave("Share");
        } catch (err) {
            console.error("PayRevision Share Error:", err);
            const errMsg = err.message || err.toString();
            if (err.name !== 'AbortError' && !errMsg.includes('AbortError')) {
                alert("Sharing failed: " + errMsg + "\n\nPlease try 'Download PDF' instead.");
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

    // FUNCTION TO SAVE DATA TO CLOUD
    function saveCalculationToCloud(data) {
        if (!database) return;

        // Add a timestamp
        data.timestamp = new Date().toISOString();
        data.employeeName = document.getElementById('reportName')?.value || "Anonymous";

        // Save to 'calculations' folder in Nithara Firebase
        database.ref('calculations').push(data)
            .catch(err => console.error("Cloud Save Fail:", err));
    }

    // Expose for calculate function
    window.saveToCloud = saveCalculationToCloud;

    // Helper to trigger save from buttons
    function triggerCloudSave(actionType) {
        const bp = parseFloat(document.getElementById('basic-pay-in').value) || 0;
        const incMonthVal = document.getElementById('increment-month').value;
        const incMonth = incMonthVal !== "" ? parseInt(incMonthVal) : null;

        if (bp > 0 && incMonth !== null) {
            const data = {
                action: actionType,
                oldBP: bp,
                revisedBP: document.getElementById('res-bp-fixed').textContent,
                presentBP: document.getElementById('res-bp-current').textContent,
                grossSalary: document.getElementById('res-gross-new').textContent,
                fitment: document.getElementById('fitment-perc').value,
                isWeightage: document.getElementById('weightage-check')?.checked || false,
                serviceYears: document.getElementById('years-service').value,
                hasGrade: document.getElementById('grade-check')?.checked || false,
                incMonth: incMonth,
                gradeMonth: document.getElementById('grade-month').value,
                gradeYear: document.getElementById('grade-year').value,
                balDA: document.getElementById('bal-da-perc').value,
                hra: document.getElementById('hra-perc').value,
                others: document.getElementById('others-val').value,
                pen: document.getElementById('penNumber')?.value || "",
                school: document.getElementById('schoolName')?.value || "",
                employeeName: document.getElementById('reportName')?.value || "Anonymous"
            };
            debouncedSave(data);
        }
    }
});
