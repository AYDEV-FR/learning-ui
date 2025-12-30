// Training UI Application

const API_BASE = '/api';

// State
let scenario = null;
let steps = [];
let currentStep = 1;
let totalSteps = 0;

// Terminal tabs state
let terminals = [];
let activeTerminalId = null;
let terminalCounter = 0;

// Iframe tabs state (vscode, desktop)
let iframeTabs = [];
let activeIframeId = null;

// DOM Elements
const scenarioTitle = document.getElementById('scenario-title');
const scenarioDescription = document.getElementById('scenario-description');
const currentStepEl = document.getElementById('current-step');
const totalStepsEl = document.getElementById('total-steps');
const instructionsContent = document.getElementById('instructions-content');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnCheck = document.getElementById('btn-check');
const checkResult = document.getElementById('check-result');
const progressOverlay = document.getElementById('progress-overlay');
const terminalTabs = document.getElementById('terminal-tabs');
const terminalsWrapper = document.getElementById('terminals-wrapper');
const btnAddTab = document.getElementById('btn-add-tab');
const resizeHandle = document.getElementById('resize-handle');
const instructionsPanel = document.querySelector('.instructions-panel');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        // Load scenario, steps, and tabs config in parallel
        const [scenarioData, stepsData, tabsResponse] = await Promise.all([
            fetchAPI('/scenario'),
            fetchAPI('/steps'),
            fetchAPI('/tabs').catch(() => ({ tabs: [], terminalEnabled: true }))
        ]);

        scenario = scenarioData;
        steps = stepsData;
        totalSteps = steps.length;

        // Parse tabs response (handle both old array format and new object format)
        const tabs = Array.isArray(tabsResponse) ? tabsResponse : (tabsResponse.tabs || []);
        const terminalEnabled = Array.isArray(tabsResponse) ? true : (tabsResponse.terminalEnabled !== false);

        // Create iframe tabs first (editor, custom tabs)
        for (const tab of tabs) {
            createIframeTab(tab);
        }

        // Create first terminal tab (if enabled)
        if (terminalEnabled) {
            createTerminalTab();
        } else {
            // Hide the add terminal button if terminal is disabled
            btnAddTab.style.display = 'none';
            // If there are iframe tabs, activate the first one
            if (iframeTabs.length > 0) {
                switchToIframeTab(iframeTabs[0].id);
            }
        }

        // Update UI
        scenarioTitle.textContent = scenario.name;
        scenarioDescription.textContent = scenario.description;
        totalStepsEl.textContent = totalSteps;

        // Load first step
        await loadStep(1);

        // Setup event listeners
        setupEventListeners();
        setupResizeHandle();
    } catch (error) {
        console.error('Failed to initialize:', error);
        instructionsContent.innerHTML = `
            <div class="error-message">
                <h2>Failed to load scenario</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Icon SVGs for tabs
const TAB_ICONS = {
    code: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
    terminal: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16m-7 14v-2h5v2h-5m-3.42-4L5.57 9H8.4l3.3 3.3c.39.39.39 1.03 0 1.42L8.42 17H5.59l4-4z"/></svg>',
    book: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
    chart: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>',
    globe: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    database: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zm6 12c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V13zm0-4c0 .5-2.13 2-6 2s-6-1.5-6-2V6.77C7.61 7.55 9.72 8 12 8s4.39-.45 6-1.23V9z"/></svg>',
    settings: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    desktop: '<svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/></svg>'
};

// Iframe Tab Management (Editor, Custom Tabs)
function createIframeTab(config) {
    const id = `iframe-${config.id}`;

    // Create tab element
    const tab = document.createElement('div');
    tab.className = 'terminal-tab iframe-tab';
    tab.dataset.id = id;
    tab.dataset.type = 'iframe';

    // Icon based on config (default to globe)
    const iconSvg = TAB_ICONS[config.icon] || TAB_ICONS.globe;

    tab.innerHTML = `
        <span class="terminal-tab-status connected"></span>
        ${iconSvg}
        <span class="terminal-tab-title">${config.name}</span>
    `;

    // Tab click handler
    tab.addEventListener('click', () => {
        switchToIframeTab(id);
    });

    // Insert before the "+" button
    terminalTabs.insertBefore(tab, btnAddTab);

    // Create iframe instance container
    const instance = document.createElement('div');
    instance.className = 'terminal-instance iframe-instance';
    instance.dataset.id = id;
    instance.innerHTML = `<iframe src="${config.url}" class="iframe-container" allow="clipboard-read; clipboard-write"></iframe>`;
    terminalsWrapper.appendChild(instance);

    // Store iframe tab state
    const iframeState = {
        id,
        config,
        tab,
        instance
    };

    iframeTabs.push(iframeState);

    return iframeState;
}

function switchToIframeTab(id) {
    // Deactivate all terminal tabs and instances
    terminals.forEach(t => {
        t.tab.classList.remove('active');
        t.instance.classList.remove('active');
    });

    // Deactivate all iframe tabs and instances
    iframeTabs.forEach(t => {
        t.tab.classList.remove('active');
        t.instance.classList.remove('active');
    });

    // Activate selected iframe tab
    const iframeTab = iframeTabs.find(t => t.id === id);
    if (iframeTab) {
        iframeTab.tab.classList.add('active');
        iframeTab.instance.classList.add('active');
        activeIframeId = id;
        activeTerminalId = null;
    }
}

// Terminal Tab Management
function createTerminalTab() {
    terminalCounter++;
    const id = `term-${terminalCounter}`;

    // Create tab element
    const tab = document.createElement('div');
    tab.className = 'terminal-tab';
    tab.dataset.id = id;
    tab.innerHTML = `
        <span class="terminal-tab-status connecting"></span>
        <span class="terminal-tab-title">Terminal ${terminalCounter}</span>
        <span class="terminal-tab-close" title="Close terminal">&times;</span>
    `;

    // Tab click handler
    tab.addEventListener('click', (e) => {
        if (e.target.classList.contains('terminal-tab-close')) return;
        if (e.target.classList.contains('terminal-tab-title-input')) return;
        switchToTerminal(id);
    });

    // Double-click to rename
    tab.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('terminal-tab-close')) return;
        if (e.target.classList.contains('terminal-tab-title-input')) return;
        e.preventDefault();
        startRenameTab(id);
    });

    // Close button handler
    tab.querySelector('.terminal-tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTerminal(id);
    });

    // Insert before the "+" button
    terminalTabs.insertBefore(tab, btnAddTab);

    // Create terminal instance container
    const instance = document.createElement('div');
    instance.className = 'terminal-instance';
    instance.dataset.id = id;
    instance.innerHTML = '<div class="terminal-container"></div>';
    terminalsWrapper.appendChild(instance);

    // Initialize xterm
    const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        theme: {
            background: '#1a1b26',
            foreground: '#c0caf5',
            cursor: '#c0caf5',
            cursorAccent: '#1a1b26',
            selection: 'rgba(122, 162, 247, 0.3)',
            black: '#414868',
            red: '#f7768e',
            green: '#9ece6a',
            yellow: '#e0af68',
            blue: '#7aa2f7',
            magenta: '#bb9af7',
            cyan: '#7dcfff',
            white: '#c0caf5',
            brightBlack: '#414868',
            brightRed: '#f7768e',
            brightGreen: '#9ece6a',
            brightYellow: '#e0af68',
            brightBlue: '#7aa2f7',
            brightMagenta: '#bb9af7',
            brightCyan: '#7dcfff',
            brightWhite: '#c0caf5'
        }
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon.WebLinksAddon());

    const container = instance.querySelector('.terminal-container');
    term.open(container);

    // Store terminal state
    const terminalState = {
        id,
        term,
        fitAddon,
        ws: null,
        tab,
        instance,
        container
    };

    terminals.push(terminalState);

    // Connect WebSocket
    connectTerminalWebSocket(terminalState);

    // Handle terminal input
    term.onData(data => {
        if (terminalState.ws && terminalState.ws.readyState === WebSocket.OPEN) {
            terminalState.ws.send(data);
        }
    });

    // Switch to new terminal
    switchToTerminal(id);

    return terminalState;
}

function connectTerminalWebSocket(terminalState) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;

    updateTabStatus(terminalState.id, 'connecting');

    const ws = new WebSocket(wsUrl);
    terminalState.ws = ws;

    ws.onopen = () => {
        updateTabStatus(terminalState.id, 'connected');
        if (activeTerminalId === terminalState.id) {
            terminalState.term.focus();
        }
    };

    ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
            event.data.text().then(text => terminalState.term.write(text));
        } else {
            terminalState.term.write(event.data);
        }
    };

    ws.onclose = () => {
        updateTabStatus(terminalState.id, 'disconnected');
        // Check if terminal still exists before reconnecting
        if (terminals.find(t => t.id === terminalState.id)) {
            terminalState.term.write('\r\n\x1b[31mConnection closed. Reconnecting...\x1b[0m\r\n');
            setTimeout(() => {
                if (terminals.find(t => t.id === terminalState.id)) {
                    connectTerminalWebSocket(terminalState);
                }
            }, 2000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateTabStatus(terminalState.id, 'error');
    };
}

function updateTabStatus(id, status) {
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
        const statusEl = terminal.tab.querySelector('.terminal-tab-status');
        statusEl.className = `terminal-tab-status ${status}`;
    }
}

function switchToTerminal(id) {
    // Deactivate all terminal tabs and instances
    terminals.forEach(t => {
        t.tab.classList.remove('active');
        t.instance.classList.remove('active');
    });

    // Deactivate all iframe tabs and instances
    iframeTabs.forEach(t => {
        t.tab.classList.remove('active');
        t.instance.classList.remove('active');
    });

    // Activate selected terminal
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
        terminal.tab.classList.add('active');
        terminal.instance.classList.add('active');
        activeTerminalId = id;
        activeIframeId = null;

        // Fit and focus (only if not editing a tab name)
        setTimeout(() => {
            terminal.fitAddon.fit();
            if (!document.querySelector('.terminal-tab-title-input')) {
                terminal.term.focus();
            }
        }, 10);
    }
}

function startRenameTab(id) {
    const terminal = terminals.find(t => t.id === id);
    if (!terminal) return;

    const titleEl = terminal.tab.querySelector('.terminal-tab-title');

    // Check if already editing
    if (terminal.tab.querySelector('.terminal-tab-title-input')) return;

    const currentName = titleEl.textContent;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'terminal-tab-title-input';
    input.value = currentName;

    // Replace title with input
    titleEl.style.display = 'none';
    titleEl.parentNode.insertBefore(input, titleEl);
    input.focus();
    input.select();

    let finished = false;

    // Handle finish rename
    const finishRename = (save) => {
        if (finished) return;
        finished = true;

        if (save && input.value.trim()) {
            titleEl.textContent = input.value.trim();
        }
        input.remove();
        titleEl.style.display = '';
    };

    // Events
    input.addEventListener('blur', () => finishRename(true));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishRename(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finishRename(false);
        }
        e.stopPropagation();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
}

function closeTerminal(id) {
    // Don't close if it's the last terminal
    if (terminals.length <= 1) {
        return;
    }

    const index = terminals.findIndex(t => t.id === id);
    if (index === -1) return;

    const terminal = terminals[index];

    // Close WebSocket
    if (terminal.ws) {
        terminal.ws.close();
    }

    // Dispose terminal
    terminal.term.dispose();

    // Remove DOM elements
    terminal.tab.remove();
    terminal.instance.remove();

    // Remove from array
    terminals.splice(index, 1);

    // Switch to another terminal if this was active
    if (activeTerminalId === id && terminals.length > 0) {
        const newIndex = Math.min(index, terminals.length - 1);
        switchToTerminal(terminals[newIndex].id);
    }
}

function setupEventListeners() {
    btnPrev.addEventListener('click', () => navigateStep(-1));
    btnNext.addEventListener('click', () => navigateStep(1));
    btnCheck.addEventListener('click', checkCurrentStep);
    btnAddTab.addEventListener('click', createTerminalTab);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Check if terminal is focused
        const isTerminalFocused = terminals.some(t =>
            t.container.contains(document.activeElement)
        );

        // Ctrl+Shift+T: New terminal
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            createTerminalTab();
            return;
        }

        // Ctrl+Shift+W: Close terminal
        if (e.ctrlKey && e.shiftKey && e.key === 'W') {
            e.preventDefault();
            if (activeTerminalId) {
                closeTerminal(activeTerminalId);
            }
            return;
        }

        // Ctrl+Tab / Ctrl+Shift+Tab: Switch terminals
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault();
            const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
            let newIndex;
            if (e.shiftKey) {
                newIndex = currentIndex > 0 ? currentIndex - 1 : terminals.length - 1;
            } else {
                newIndex = currentIndex < terminals.length - 1 ? currentIndex + 1 : 0;
            }
            switchToTerminal(terminals[newIndex].id);
            return;
        }

        // Don't handle navigation keys if terminal is focused
        if (isTerminalFocused) {
            return;
        }

        if (e.key === 'ArrowLeft' && !btnPrev.disabled) {
            navigateStep(-1);
        } else if (e.key === 'ArrowRight' && !btnNext.disabled) {
            navigateStep(1);
        } else if (e.key === 'Enter' && e.ctrlKey && btnCheck.style.display !== 'none') {
            checkCurrentStep();
        }
    });

    // Handle resize
    window.addEventListener('resize', () => {
        terminals.forEach(t => {
            if (t.instance.classList.contains('active')) {
                t.fitAddon.fit();
            }
        });
    });
}

function setupResizeHandle() {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = instructionsPanel.offsetWidth;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const delta = e.clientX - startX;
        const newWidth = startWidth + delta;
        const containerWidth = document.querySelector('.container').offsetWidth;
        const percentage = (newWidth / containerWidth) * 100;

        if (percentage >= 20 && percentage <= 50) {
            instructionsPanel.style.width = `${percentage}%`;
            // Fit active terminal
            const activeTerminal = terminals.find(t => t.id === activeTerminalId);
            if (activeTerminal) {
                activeTerminal.fitAddon.fit();
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            // Fit active terminal
            const activeTerminal = terminals.find(t => t.id === activeTerminalId);
            if (activeTerminal) {
                activeTerminal.fitAddon.fit();
            }
        }
    });
}

async function fetchAPI(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

async function loadStep(stepNumber) {
    try {
        const step = await fetchAPI(`/steps/${stepNumber}`);
        currentStep = stepNumber;

        // Update step indicator
        currentStepEl.textContent = currentStep;

        // Render markdown content
        const html = marked.parse(step.content);
        instructionsContent.innerHTML = html;

        // Highlight code blocks and add action buttons
        instructionsContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            addCodeActions(block.parentElement);
        });

        // Update navigation buttons
        updateNavigationButtons(step.hasCheck);

        // Clear previous check result
        hideCheckResult();

        // Scroll to top
        instructionsContent.scrollTop = 0;
    } catch (error) {
        console.error('Failed to load step:', error);
        instructionsContent.innerHTML = `
            <div class="error-message">
                <h2>Failed to load step</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function addCodeActions(preElement) {
    const code = preElement.querySelector('code');
    if (!code) return;

    // Check if it's a bash/shell code block
    const isBash = code.classList.contains('language-bash') ||
                   code.classList.contains('language-shell') ||
                   code.classList.contains('language-sh') ||
                   !code.className.includes('language-');

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'code-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn copy';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => copyCode(code, copyBtn));
    actionsDiv.appendChild(copyBtn);

    // Run button (only for bash/shell)
    if (isBash) {
        const runBtn = document.createElement('button');
        runBtn.className = 'code-action-btn run';
        runBtn.textContent = 'Run';
        runBtn.addEventListener('click', () => runCode(code));
        actionsDiv.appendChild(runBtn);
    }

    preElement.appendChild(actionsDiv);
}

function copyCode(codeElement, button) {
    const text = codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 1500);
    });
}

function runCode(codeElement) {
    const activeTerminal = terminals.find(t => t.id === activeTerminalId);
    if (!activeTerminal || !activeTerminal.ws || activeTerminal.ws.readyState !== WebSocket.OPEN) {
        return;
    }

    const text = codeElement.textContent.trim();
    // Send the command to the terminal
    activeTerminal.ws.send(text + '\n');
    // Focus the terminal
    activeTerminal.term.focus();
}

function updateNavigationButtons(hasCheck) {
    btnPrev.disabled = currentStep <= 1;
    btnNext.disabled = currentStep >= totalSteps;
    btnCheck.style.display = hasCheck ? 'flex' : 'none';
}

function navigateStep(delta) {
    const newStep = currentStep + delta;
    if (newStep >= 1 && newStep <= totalSteps) {
        loadStep(newStep);
    }
}

async function checkCurrentStep() {
    try {
        showProgress();

        const result = await fetch(`${API_BASE}/steps/${currentStep}/check`, {
            method: 'POST'
        }).then(r => r.json());

        hideProgress();
        showCheckResult(result);
    } catch (error) {
        hideProgress();
        showCheckResult({
            success: false,
            message: `Check failed: ${error.message}`
        });
    }
}

function showCheckResult(result) {
    checkResult.textContent = result.message;
    checkResult.className = `check-result ${result.success ? 'success' : 'error'}`;
    checkResult.style.display = 'block';
}

function hideCheckResult() {
    checkResult.style.display = 'none';
}

function showProgress() {
    progressOverlay.style.display = 'flex';
    btnCheck.disabled = true;
}

function hideProgress() {
    progressOverlay.style.display = 'none';
    btnCheck.disabled = false;
}
