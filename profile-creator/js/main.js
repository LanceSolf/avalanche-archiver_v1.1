
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ProfileRenderer('profile-canvas');

    // State
    const state = {
        meta: {
            location: '',
            date: new Date().toISOString().split('T')[0],
            elevation: '',
            aspect: '',
            observer: '',
            airTemp: ''
        },
        layers: [
            { id: 1, thickness: 20, hardness: 'F', grainForm: '+', temp: -5.0 },
            { id: 2, thickness: 35, hardness: '1F', grainForm: 'o', temp: -3.5 },
            { id: 3, thickness: 40, hardness: 'P', grainForm: '•', temp: -1.5 }
        ],
        tests: []
    };

    // DOM Elements
    const layersList = document.getElementById('layers-list');
    const testsList = document.getElementById('tests-list');
    const addLayerBtn = document.getElementById('add-layer-btn');
    const addLayerBtnBottom = document.getElementById('add-layer-btn-bottom');
    const addTestBtn = document.getElementById('add-test-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Inputs
    const locationInput = document.getElementById('meta-location');
    const dateInput = document.getElementById('meta-date');
    const elevInput = document.getElementById('meta-elevation');
    const aspInput = document.getElementById('meta-aspect');
    const observerInput = document.getElementById('meta-observer');
    const airTempInput = document.getElementById('meta-air-temp');

    // Init Inputs
    dateInput.value = state.meta.date;

    // Listeners
    locationInput.addEventListener('input', (e) => { state.meta.location = e.target.value; update(); });
    dateInput.addEventListener('input', (e) => { state.meta.date = e.target.value; update(); });
    elevInput.addEventListener('input', (e) => { state.meta.elevation = e.target.value; update(); });
    aspInput.addEventListener('input', (e) => { state.meta.aspect = e.target.value; update(); });
    observerInput.addEventListener('input', (e) => { state.meta.observer = e.target.value; update(); });
    airTempInput.addEventListener('input', (e) => { state.meta.airTemp = e.target.value; update(); });

    if (addLayerBtn) addLayerBtn.addEventListener('click', addLayer);
    if (addLayerBtnBottom) addLayerBtnBottom.addEventListener('click', addLayer);

    if (addTestBtn) addTestBtn.addEventListener('click', addTest);

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `snow-profile-${state.meta.date || 'draft'}.png`;
            link.href = document.getElementById('profile-canvas').toDataURL();
            link.click();
        });
    }

    // Helper functions
    function update() {
        renderer.render(state);
    }

    function renderLayersList() {
        layersList.innerHTML = '';
        state.layers.forEach((layer, index) => {
            const el = document.createElement('div');
            el.className = 'layer-item';

            // Buttons disabled logic
            const isFirst = index === 0;
            const isLast = index === state.layers.length - 1;

            el.innerHTML = `
                <div class="layer-header">
                    <span>Layer ${index + 1}</span>
                    <div class="move-buttons">
                        <button class="btn-move move-up" data-index="${index}" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button class="btn-move move-down" data-index="${index}" ${isLast ? 'disabled' : ''}>▼</button>
                    </div>
                    <span class="remove-layer" data-index="${index}">&times;</span>
                </div>
                <div class="layer-controls">
                    <div>
                        <label style="font-size:0.7rem; display:block;">Thickness (cm)</label>
                        <input type="number" class="layer-thickness" data-index="${index}" value="${layer.thickness}">
                    </div>
                    <div>
                        <label style="font-size:0.7rem; display:block;">Hardness</label>
                        <select class="layer-hardness" data-index="${index}">
                            ${['F', '4F', '1F', 'P', 'K', 'I'].map(h => `<option value="${h}" ${h === layer.hardness ? 'selected' : ''}>${h}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.7rem; display:block;">Temp (°C)</label>
                        <input type="number" step="0.1" class="layer-temp" data-index="${index}" value="${layer.temp !== undefined ? layer.temp : ''}">
                    </div>
                    <div>
                        <label style="font-size:0.7rem; display:block;">Grain Form</label>
                        <select class="layer-grain" data-index="${index}">
                            <option value="" ${layer.grainForm === '' ? 'selected' : ''}>-</option>
                            <option value="+" ${layer.grainForm === '+' ? 'selected' : ''}>+ (New Snow)</option>
                            <option value="/" ${layer.grainForm === '/' ? 'selected' : ''}>/ (Decomposed)</option>
                            <option value="•" ${layer.grainForm === '•' ? 'selected' : ''}>• (Rounded)</option>
                            <option value="□" ${layer.grainForm === '□' ? 'selected' : ''}>□ (Faceted)</option>
                            <option value="^" ${layer.grainForm === '^' ? 'selected' : ''}>^ (Depth Hoar)</option>
                            <option value="V" ${layer.grainForm === 'V' ? 'selected' : ''}>V (Surface Hoar)</option>
                            <option value="⬤" ${layer.grainForm === '⬤' ? 'selected' : ''}>⬤ (Melt-Freeze)</option>
                            <option value="🗙" ${layer.grainForm === '🗙' ? 'selected' : ''}>🗙 (Ice)</option>
                            <option value="●" ${layer.grainForm === '●' ? 'selected' : ''}>● (Graupel)</option>
                        </select>
                    </div>
                </div>
            `;
            layersList.appendChild(el);
        });

        // Add listeners to new elements
        document.querySelectorAll('.layer-thickness').forEach(i => i.addEventListener('input', updateLayer));
        document.querySelectorAll('.layer-hardness').forEach(i => i.addEventListener('change', updateLayer));
        document.querySelectorAll('.layer-temp').forEach(i => i.addEventListener('input', updateLayer));
        document.querySelectorAll('.layer-grain').forEach(i => i.addEventListener('change', updateLayer));
        document.querySelectorAll('.remove-layer').forEach(i => i.addEventListener('click', removeLayer));

        document.querySelectorAll('.move-up').forEach(i => i.addEventListener('click', moveLayerUp));
        document.querySelectorAll('.move-down').forEach(i => i.addEventListener('click', moveLayerDown));
    }

    function renderTestsList() {
        if (!testsList) return;
        testsList.innerHTML = '';
        state.tests.forEach((test, index) => {
            const el = document.createElement('div');
            el.className = 'test-item';

            el.innerHTML = `
                 <div class="layer-header">
                    <span>Test ${index + 1}</span>
                    <span class="remove-test" data-index="${index}">&times;</span>
                </div>
                <div class="layer-controls" style="grid-template-columns: 1fr 1fr 2fr;">
                    <div>
                        <label style="font-size:0.7rem; display:block;">Result</label>
                        <input type="text" class="test-result" data-index="${index}" value="${test.result}" placeholder="CT 12">
                    </div>
                    <div>
                        <label style="font-size:0.7rem; display:block;">Depth (cm)</label>
                        <input type="number" class="test-depth" data-index="${index}" value="${test.depth}" placeholder="0">
                    </div>
                    <div>
                        <label style="font-size:0.7rem; display:block;">Description</label>
                        <input type="text" class="test-desc" data-index="${index}" value="${test.desc}" placeholder="RP">
                    </div>
                </div>
            `;
            testsList.appendChild(el);
        });

        document.querySelectorAll('.test-result').forEach(i => i.addEventListener('input', updateTest));
        document.querySelectorAll('.test-depth').forEach(i => i.addEventListener('input', updateTest));
        document.querySelectorAll('.test-desc').forEach(i => i.addEventListener('input', updateTest));
        document.querySelectorAll('.remove-test').forEach(i => i.addEventListener('click', removeTest));
    }

    function moveLayerUp(e) {
        const idx = parseInt(e.target.dataset.index);
        if (idx > 0) {
            const temp = state.layers[idx];
            state.layers[idx] = state.layers[idx - 1];
            state.layers[idx - 1] = temp;
            renderLayersList();
            update();
        }
    }

    function moveLayerDown(e) {
        const idx = parseInt(e.target.dataset.index);
        if (idx < state.layers.length - 1) {
            const temp = state.layers[idx];
            state.layers[idx] = state.layers[idx + 1];
            state.layers[idx + 1] = temp;
            renderLayersList();
            update();
        }
    }

    function updateLayer(e) {
        const idx = parseInt(e.target.dataset.index);
        let field = '';
        if (e.target.classList.contains('layer-thickness')) field = 'thickness';
        else if (e.target.classList.contains('layer-hardness')) field = 'hardness';
        else if (e.target.classList.contains('layer-temp')) field = 'temp';
        else field = 'grainForm';

        state.layers[idx][field] = e.target.value;
        update();
    }

    function removeLayer(e) {
        const idx = parseInt(e.target.dataset.index);
        state.layers.splice(idx, 1);
        renderLayersList();
        update();
    }

    function addLayer() {
        state.layers.push({ id: Date.now(), thickness: 20, hardness: 'F', grainForm: '', temp: -1.0 });
        renderLayersList();
        update();
    }

    function addTest() {
        state.tests.push({ id: Date.now(), result: '', depth: 0, desc: '' });
        renderTestsList();
        update();
    }

    function updateTest(e) {
        const idx = parseInt(e.target.dataset.index);
        let field = '';
        if (e.target.classList.contains('test-result')) field = 'result';
        else if (e.target.classList.contains('test-depth')) field = 'depth';
        else if (e.target.classList.contains('test-desc')) field = 'desc';

        state.tests[idx][field] = e.target.value;
        update();
    }

    function removeTest(e) {
        const idx = parseInt(e.target.dataset.index);
        state.tests.splice(idx, 1);
        renderTestsList();
        update();
    }

    // Initialize
    renderLayersList();
    renderTestsList();
    update();
});
