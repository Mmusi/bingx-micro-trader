// utils/logger.js — Colourised console logger

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const COLORS = {
  DEBUG: '\x1b[36m',   // cyan
  INFO:  '\x1b[32m',   // green
  WARN:  '\x1b[33m',   // yellow
  ERROR: '\x1b[31m',   // red
  RESET: '\x1b[0m',
  DIM:   '\x1b[2m',
};

const currentLevel = LEVELS.INFO;

function log(level, ...args) {
  if (LEVELS[level] < currentLevel) return;
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const color = COLORS[level] || '';
  console.log(
    `${COLORS.DIM}[${ts}]${COLORS.RESET} ${color}[${level.padEnd(5)}]${COLORS.RESET}`,
    ...args
  );
}

module.exports = {
  debug: (...a) => log('DEBUG', ...a),
  info:  (...a) => log('INFO',  ...a),
  warn:  (...a) => log('WARN',  ...a),
  error: (...a) => log('ERROR', ...a),
};
