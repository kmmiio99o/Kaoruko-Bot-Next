export class Logger {
  static log(message: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
      debug: '\x1b[35m',   // Magenta
      reset: '\x1b[0m'     // Reset
    };

    const typeColors = {
      info: '\x1b[44m',    // Blue background
      warn: '\x1b[43m',    // Yellow background
      error: '\x1b[41m',   // Red background
      success: '\x1b[42m', // Green background
      debug: '\x1b[45m',   // Magenta background
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${typeColors[type]}[${type.toUpperCase()}]${typeColors.reset} ${message}${colors.reset}`);
  }

  static info(message: string) {
    this.log(message, 'info');
  }

  static warn(message: string) {
    this.log(message, 'warn');
  }

  static error(message: string) {
    this.log(message, 'error');
  }

  static success(message: string) {
    this.log(message, 'success');
  }

  static debug(message: string) {
    this.log(message, 'debug');
  }

  // Enhanced logging with context
  static logWithContext(context: string, message: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      success: '\x1b[32m',
      debug: '\x1b[35m',
      reset: '\x1b[0m'
    };

    const typeColors = {
      info: '\x1b[44m',
      warn: '\x1b[43m',
      error: '\x1b[41m',
      success: '\x1b[42m',
      debug: '\x1b[45m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${typeColors[type]}[${type.toUpperCase()}]${typeColors.reset} [${context}] ${message}${colors.reset}`);
  }
}
