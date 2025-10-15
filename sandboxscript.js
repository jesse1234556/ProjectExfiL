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

// Focus input when anywhere is clicked or a keypress is detected,
// but ignore if Ctrl or Alt is held
body.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.altKey) {
        terminalInput.focus();
    }
});

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
  return Object.keys(node.children).join('  ') || '';
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
    mv: {
        description: 'Move or rename a file/directory',
        execute: (args) => {
            if (args.length < 2) {
                printToTerminal('mv: missing file operand');
                return;
            }

            const srcPath = resolve(args[0], env.cwd);
            const destPath = resolve(args[1], env.cwd);

            // Get source node and parent
            const srcParts = srcPath.split('/').filter(Boolean);
            const srcName = srcParts.pop();
            const srcParentPath = '/' + srcParts.join('/');
            const srcParent = getNode(srcParentPath);

            if (!srcParent || !srcParent.children[srcName]) {
                printToTerminal(`mv: cannot stat '${srcPath}': No such file or directory`);
                return;
            }

            const destParts = destPath.split('/').filter(Boolean);
            const destName = destParts.pop();
            const destParentPath = '/' + destParts.join('/');
            let destParent = getNode(destParentPath);

            if (!destParent) {
                printToTerminal(`mv: cannot move to '${destPath}': No such directory`);
                return;
            }

            if (!destParent.children) destParent.children = {};

            let finalDestName = destName;
            let finalDestParent = destParent;

            // If destination exists and is a directory, move inside it
            if (destParent.children[destName] && destParent.children[destName].type === 'dir') {
                finalDestParent = destParent.children[destName];
                finalDestName = srcName;
            }

            // Check if destination file already exists
            if (finalDestParent.children[finalDestName]) {
                printToTerminal(`mv: cannot move to '${destPath}': File exists`);
                return;
            }

            // Move the node
            finalDestParent.children[finalDestName] = srcParent.children[srcName];
            delete srcParent.children[srcName];

            printToTerminal(`Moved '${srcPath}' to '${destPath}'`);
        }
    },

    pwd: {
    description: 'Print the current working directory',
    execute: () => {
        printToTerminal(env.cwd);
              }
         },
         whoami: {
    description: 'Display current active user',
    execute: () => {
        printToTerminal(env.user);
              }
         },
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
    execute: (args) => {
        if (args.length === 0) {
            printToTerminal('mkdir: missing operand');
            return;
        }

        const path = args[0];
        const fullPath = resolve(path, env.cwd);
        const parts = fullPath.split('/').filter(Boolean);

        let node = fs['/']; // start at root
        try {
            for (const part of parts) {
                if (!node.children) node.children = {};

                // If a file exists where we want a directory
                if (node.children[part] && node.children[part].type !== 'dir') {
                    throw new Error(`mkdir: cannot create directory '${fullPath}': File exists`);
                }

                // Create directory if it doesn't exist
                if (!node.children[part]) {
                    node.children[part] = { type: 'dir', children: {} };
                }

                node = node.children[part]; // descend into directory
            }

            printToTerminal(`Directory created: ${fullPath}`);
        } catch (err) {
            printToTerminal(err.message);
              }
          }
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
   },
   touch: {
    description: 'Create a new empty file',
    execute: (args) => {
        if (args.length === 0) {
            printToTerminal('touch: missing file operand');
            return;
        }

        const path = args[0];
        const fullPath = resolve(path, env.cwd);
        const parts = fullPath.split('/').filter(Boolean);
        const fileName = parts.pop(); // last part is the file

        // Get the parent directory
        const parentPath = '/' + parts.join('/');
        const parentNode = getNode(parentPath);

        if (!parentNode) {
            printToTerminal(`touch: cannot create file '${fullPath}': No such directory`);
            return;
        }

        if (!parentNode.children) parentNode.children = {};

        if (parentNode.children[fileName]) {
            if (parentNode.children[fileName].type === 'dir') {
                printToTerminal(`touch: cannot create file '${fullPath}': Is a directory`);
                return;
            } else {
                printToTerminal(`File already exists: ${fullPath}`);
                return;
            }
        }

        // Create the new file
        parentNode.children[fileName] = { type: 'file', content: '' };
        printToTerminal(`File created: ${fullPath}`);
          }
      },
      date: {
    description: 'Print the current date and time',
    execute: () => {
        const now = new Date();
        printToTerminal(now.toString());
        }
    },
   cp: {
    description: 'Copy a file or directory',
    execute: (args) => {
        if (args.length < 2) {
            printToTerminal('cp: missing file operand');
            return;
        }

        // Handle flags
        let recursive = false;
        if (args[0].startsWith('-')) {
            const flags = args.shift();
            if (flags.includes('r')) recursive = true;
            else {
                printToTerminal(`cp: invalid option '${flags}'`);
                return;
            }
        }

        const srcPath = resolve(args[0], env.cwd);
        const destPath = resolve(args[1], env.cwd);

        // Get source node and parent
        const srcParts = srcPath.split('/').filter(Boolean);
        const srcName = srcParts.pop();
        const srcParentPath = '/' + srcParts.join('/');
        const srcParent = getNode(srcParentPath);

        if (!srcParent || !srcParent.children[srcName]) {
            printToTerminal(`cp: cannot stat '${srcPath}': No such file or directory`);
            return;
        }

        const srcNode = srcParent.children[srcName];

        // If source is a directory and not recursive, error
        if (srcNode.type === 'dir' && !recursive) {
            printToTerminal(`cp: -r not specified; omitting directory '${srcPath}'`);
            return;
        }

        // Resolve destination
        const destParts = destPath.split('/').filter(Boolean);
        const destName = destParts.pop();
        const destParentPath = '/' + destParts.join('/');
        let destParent = getNode(destParentPath);

        if (!destParent) {
            printToTerminal(`cp: cannot copy to '${destPath}': No such directory`);
            return;
        }

        if (!destParent.children) destParent.children = {};

        let finalDestName = destName;
        let finalDestParent = destParent;

        // If destination exists and is a directory, copy inside it
        if (destParent.children[destName] && destParent.children[destName].type === 'dir') {
            finalDestParent = destParent.children[destName];
            finalDestName = srcName;
        }

        // Recursive copy function
        const copyNode = (node) => {
            if (node.type === 'file') {
                return { type: 'file', content: node.content };
            } else if (node.type === 'dir') {
                const newDir = { type: 'dir', children: {} };
                for (const key in node.children) {
                    newDir.children[key] = copyNode(node.children[key]);
                }
                return newDir;
            }
        };

        // Check if destination already exists
        if (finalDestParent.children[finalDestName]) {
            printToTerminal(`cp: cannot copy to '${destPath}': File exists`);
            return;
        }

        // Perform copy
        finalDestParent.children[finalDestName] = copyNode(srcNode);
        printToTerminal(`Copied '${srcPath}' to '${destPath}'`);
    }
},

mainmenu: {
    description: "Return to Main Menu",
    execute: (args) => {
        console.log('args:', args); // already shows ['-f']
        const flag = args[0];
        if (flag === "-f") {
            printToTerminal("Redirecting to index.html...");
             window.location.href = 'index.html';
        } else {
            printToTerminal("Are you sure? Run 'mainmenu -f' to confirm.");
        }
    }
},


grep: {
    description: 'Search for a pattern in files or directories',
    execute: (args) => {
        if (args.length < 2) {
            printToTerminal('grep: missing operand');
            printToTerminal('Usage: grep [-r] <pattern> <file|dir> ...');
            return;
        }

        let recursive = false;

        // Handle flags
        while (args[0].startsWith('-')) {
            const flags = args.shift();
            if (flags.includes('r')) recursive = true;
            else {
                printToTerminal(`grep: invalid option '${flags}'`);
                return;
            }
        }

        if (args.length < 2) {
            printToTerminal('grep: missing operand after flags');
            return;
        }

        const pattern = args[0];
        const targets = args.slice(1);

        // Recursive search function for files
        const searchNode = (node, currentPath) => {
            const results = [];

            if (node.type === 'file') {
                const lines = (node.content || '').split('\n');
                lines.forEach(line => {
                    if (line.includes(pattern)) {
                        results.push(`${currentPath}: ${line}`);
                    }
                });
            } else if (node.type === 'dir' && recursive) {
                for (const key in node.children) {
                    results.push(...searchNode(node.children[key], currentPath + '/' + key));
                }
            }

            return results;
        };

        // Iterate over all targets
        let allResults = [];
        targets.forEach(target => {
            const fullPath = resolve(target, env.cwd);
            const node = getNode(fullPath);
            if (!node) {
                printToTerminal(`grep: ${target}: No such file or directory`);
                return;
            }
            allResults.push(...searchNode(node, fullPath === '/' ? '' : fullPath));
        });

        // Print results
        if (allResults.length === 0) {
            printToTerminal(''); // no matches
        } else {
            allResults.forEach(line => printToTerminal(line));
        }
    }
},

rm: {
    description: 'Remove a file or directory',
    execute: (args) => {
        if (args.length === 0) {
            printToTerminal('rm: missing operand');
            return;
        }

        // Handle flags
        let recursive = false;
        if (args[0].startsWith('-')) {
            const flags = args.shift();
            if (flags.includes('r')) recursive = true;
            else {
                printToTerminal(`rm: invalid option '${flags}'`);
                return;
            }
        }

        const path = resolve(args[0], env.cwd);

        // Prevent deleting the current working directory or its parents
        if (env.cwd === path || env.cwd.startsWith(path + '/')) {
            printToTerminal(`rm: cannot remove '${path}': current directory or parent directory`);
            return;
        }

        // Get node and parent
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parentNode = getNode(parentPath);

        if (!parentNode || !parentNode.children[name]) {
            printToTerminal(`rm: cannot remove '${path}': No such file or directory`);
            return;
        }

        const node = parentNode.children[name];

        // Handle directories
        if (node.type === 'dir') {
            if (!recursive) {
                printToTerminal(`rm: cannot remove '${path}': Is a directory`);
                return;
            }
        }

        // Recursive delete function
        const deleteNode = (n) => {
            if (n.type === 'dir') {
                for (const key in n.children) {
                    deleteNode(n.children[key]);
                }
            }
            // Node will be removed by parent after recursion
        };

        if (node.type === 'dir') deleteNode(node);

        // Delete from parent
        delete parentNode.children[name];
        printToTerminal(`Removed '${path}'`);
    }
},

};

const usage = {
  mainmenu: "mainmenu [-f]",
  grep: 'grep [-r] <pattern> <file|dir> ...',
  rm: 'rm [-r] <file>',
  cp: 'cp [-r] <source> <destination>',
  date: 'date',
  whoami: 'whoami',
  mv: 'mv <source> <destination>',
  pwd: 'pwd',
  help: 'help',
  echo: 'echo <text>',
  clear: 'clear',
  man: 'man <command>',
  mkdir: 'mkdir <directory>',
  cd: 'cd <directory>',
  ls: 'ls [directory]',
  cat: 'cat <file> [file...]',
  history: 'history',
  touch: 'touch <file>',
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

  
    historyIndex = null;     // reset history pointer

    if (input.trim() !== '' && input !== cmdhistory[cmdhistory.length - 1]) {
    cmdhistory.push(input);
}


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

// Welcome message
printToTerminal('Welcome to the JS Terminal! Type "help" for commands.');
terminalPrompt.textContent = `${env.user}@${env.hostname}:${env.cwd}> `;