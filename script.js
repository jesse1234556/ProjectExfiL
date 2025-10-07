const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const terminal = document.getElementById('terminal');
const body = document.body;

function printToTerminal(text) {
    const line = document.createElement('div');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

//focus input when anywhere is clicked or a keypress is detected
body.addEventListener('click', () => terminalInput.focus());
body.addEventListener('keydown', () => terminalInput.focus());

terminalInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const input = terminalInput.value;
        printToTerminal('> ' + input);
        // Simple command handling
        if (input.trim() === 'help') {
            printToTerminal('Available commands: help, echo, clear');
        } else if (input.startsWith('echo ')) {
            printToTerminal(input.slice(5));
        } else if (input.trim() === 'clear') {
            terminalOutput.innerHTML = '';
        } else if (input.trim() !== '') {
            printToTerminal('Unknown command: ' + input);
        }
        terminalInput.value = '';
    }
});



// Optional: Focus input on click
terminal.addEventListener('click', () => terminalInput.focus());

// Welcome message
printToTerminal('Welcome to the JS Terminal! Type "help" for commands.');
