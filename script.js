const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const terminal = document.getElementById('terminal');
const body = document.body;
const terminalPrompt = document.getElementById('terminal-prompt');

const env = {
    user: 'Guest',            // username
    hostname: 'ProjectExFiL',  // optional hostname
    cwd: '/home/user',       // current working directory
    home: '/home/user',      // home directory, for ~ expansion
    // you can add more later, e.g., PATH, aliases, etc.
};

const MAX_HISTORY = 50;

let cmdhistory = [];

function printToTerminal(text) {
    const line = document.createElement('div');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

//focus input when anywhere is clicked or a keypress is detected
body.addEventListener('click', () => terminalInput.focus());
body.addEventListener('keydown', () => terminalInput.focus());

const fs = {
    '/': {
        type: 'dir',
        children: {
            'home': {
                type: 'dir',
                children: {
                    'user': {
                        type: 'dir',
                        children: {
                            'notes.txt': {type: 'file', content: 'Helloo worldd!!'}
                        }
                    }
                }
            }
        }
    }     
}

//----start of simulated syscalls-----------------------------------------------------------------------------------------------------------------

function resolve(path, cwd = '/') {
  if (typeof path !== 'string') throw new Error('resolve: path must be a string');
  if (typeof cwd !== 'string') throw new Error('resolve: cwd must be a string');

  path = path.trim() || '.';
  cwd = cwd.trim() || '/';

  let start = path.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  const parts = path.split('/').filter(Boolean);

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') start.pop();
    else start.push(part);
  }

  return '/' + start.join('/');
}

// 2️⃣ Traverse the FS object to get the node at a path
function getNode(path) {
  const parts = path.split('/').filter(Boolean);
  let node = fs['/'];
  for (const part of parts) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

// 3️⃣ List directory contents
function ls(path = '/', cwd = '/') {
  const fullPath = resolve(path, cwd);
  const node = getNode(fullPath);
  if (!node) return `ls: cannot access '${path}': No such file or directory`;
  if (node.type !== 'dir') return fullPath; // if it's a file, just return its path
  return Object.keys(node.children).join('  ') || '(empty)';
}

// 4️⃣ Change directory
function cd(path = '/', cwd = '/') {
  const fullPath = resolve(path, cwd);
  const node = getNode(fullPath);
  if (!node || node.type !== 'dir') {
    return { error: `cd: ${path}: No such directory`, cwd };
  }
  return { cwd: fullPath };
}


function readFile(path, cwd = '/') {
  const fullPath = resolve(path, cwd);
  const node = getNode(fullPath);

  if (!node) {
    return { error: `cat: ${path}: No such file or directory` };
  }
  if (node.type !== 'file') {
    return { error: `cat: ${path}: Is a directory` };
  }

  // In the future, you can check permissions here
  return { content: node.content || '' };
}
//-----end of simulated syscalls-----------------------------------------------------------------------------------------------------------------------


const commands = {
    echo: {
        description: 'Echo text back to terminal',
        execute: (args) => printToTerminal(args.join(' '))
    },
    clear: {
        description: 'Clear terminal output',
        execute: () => terminalOutput.innerHTML = ''
    },
   man: {
      description: 'Lists description of command',
      execute: (args) => {
          const cmd = args[0];
          if (!cmd || !commands[cmd]) {
              printToTerminal(`man: ${cmd || 'missing command'} not found`);
              return;
          }

          // Print the description
          printToTerminal(commands[cmd].description);

          // Print the usage separately
          if (usage[cmd]) {
              printToTerminal(`Usage: ${usage[cmd]}`);
          }
      }
     }
,
    mkdir: {
      description: 'Create a new directory',
      execute: () => alert("Placeholder"),
    },
    cd: {
        description: 'Change the current directory',
        execute: (args) => {
            if (args.length === 0) args[0] = '/'; // default to root if no path
            const result = cd(args[0], env.cwd);   // use env.cwd
            if (result.error) printToTerminal(result.error);
            else {
                env.cwd = result.cwd;             // update env.cwd
                printToTerminal(`Directory changed to ${env.cwd}`);
                terminalPrompt.textContent = `${env.user}@${env.hostname}:${env.cwd}> `;
            }
        }
    },
    ls: {
        description: 'List directory contents',
        execute: (args) => {
            const path = args[0] || '.';
            const output = ls(path, env.cwd);     // use env.cwd
            printToTerminal(output);
        }
    },
    cat: {
  description: 'Display file contents',
  execute: (args) => {
    if (args.length === 0) {
      printToTerminal('cat: missing file operand');
      return;
    }

    for (const path of args) {
      const result = readFile(path, env.cwd);
      if (result.error) {
        printToTerminal(result.error);
      } else {
        printToTerminal(result.content);
      }
       }
     }
   },
   history: {
      description: 'Display last 50 commands ran',
      execute: () => {
        // Show the last 50 commands (or fewer if less exist)
        const start = Math.max(cmdhistory.length - 50, 0);
        const recentCommands = cmdhistory.slice(start);

        if (recentCommands.length === 0) {
            printToTerminal('No commands in history.');
            return;
        }

        // Print each command with its number
        recentCommands.forEach((cmd, index) => {
            printToTerminal(`${start + index + 1}: ${cmd}`);
        });

      }
   }
};

const usage = {
  help: 'help',
  echo: 'echo <text>',
  clear: 'clear',
  man: 'man <command>',
  mkdir: 'mkdir <directory>',
  cd: 'cd <directory>',
  ls: 'ls [directory]',
  cat: 'cat <file> [file...]'
};



const listOfKeys = Object.keys(commands).join(", ")



commands.help = {
    description: 'Show available commands', 
    execute: () => printToTerminal('Avaliable commands: help, ' + listOfKeys)
}
let historyIndex = null; // tracks current position in history

terminalInput.addEventListener('keydown', function(e) {
   if (e.key === 'ArrowUp') {
        if (cmdhistory.length === 0) return; // nothing in history

        if (historyIndex === null) {
            historyIndex = cmdhistory.length - 1; // start from last command
        } else if (historyIndex > 0) {
            historyIndex--;
        }

        terminalInput.textContent = cmdhistory[historyIndex];
        placeCaretAtEnd(terminalInput); // helper to move cursor to end
        e.preventDefault(); // prevent cursor moving to start
    }

    if (e.key === 'ArrowDown') {
        if (historyIndex === null) return; // not browsing history

        if (historyIndex < cmdhistory.length - 1) {
            historyIndex++;
            terminalInput.textContent = cmdhistory[historyIndex];
        } else {
            historyIndex = null; // back to fresh input
            terminalInput.textContent = '';
        }
        placeCaretAtEnd(terminalInput);
        e.preventDefault();
    }

if (e.key === 'Enter') {
    e.preventDefault(); 
    const input = terminalInput.textContent.trim(); // trim spaces

    if (input === '') return; // ignore empty commands

    printToTerminal(`${env.user}@${env.hostname}:${env.cwd}> ${input}`);

    const [cmd, ...args] = input.split(' ');

    if (commands[cmd]) {
        commands[cmd].execute(args);
    } else {
        printToTerminal('Unknown command: ' + input);
    }

    cmdhistory.push(input);  // save only non-empty commands
    historyIndex = null;     // reset history pointer

      cmdhistory.push(input);

      // Trim history if it exceeds the max
      if (cmdhistory.length > MAX_HISTORY) {
          cmdhistory.shift(); // remove the oldest command
      }
          
    terminalInput.textContent = '';
    terminalPrompt.textContent = `${env.user}@${env.hostname}:${env.cwd}> `;
}

});

function placeCaretAtEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
}

// Optional: Focus input on click
terminal.addEventListener('click', () => terminalInput.focus());

// Welcome message
printToTerminal('Welcome to the JS Terminal! Type "help" for commands.');
terminalPrompt.textContent = `${env.user}@${env.hostname}:${env.cwd}> `;
