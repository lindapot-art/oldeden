// Logger.js — Simple file logger for server events and errors
import fs from 'node:fs';
import path from 'node:path';

const LOG_PATH = path.resolve(process.cwd(), 'logs', 'server.log');

export function logEvent(type, msg, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    type,
    msg,
    ...meta
  };
  fs.appendFile(LOG_PATH, JSON.stringify(entry) + '\n', err => {
    if (err) console.error('[Logger] Failed to write log:', err);
  });
}
