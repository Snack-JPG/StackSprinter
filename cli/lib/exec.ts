import { spawn, SpawnOptions } from 'child_process';
import { log, LogLevel, logCommand, redactSecrets } from './log.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execCommand(
  command: string,
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    retries?: number;
    silent?: boolean;
  }
): Promise<string> {
  const result = await execCommandWithResult(command, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
  }
  
  return result.stdout;
}

export async function execCommandWithResult(
  command: string,
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    retries?: number;
    silent?: boolean;
  }
): Promise<ExecResult> {
  const {
    cwd = process.cwd(),
    env = {},
    timeout = 300000, // 5 minutes default
    retries = 0,
    silent = false
  } = options || {};

  if (!silent) {
    logCommand(command);
  }

  const attempt = async (): Promise<ExecResult> => {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const spawnOptions: SpawnOptions = {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe']
      };

      const child = spawn(cmd, args, spawnOptions);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        const result: ExecResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        };
        
        if (!silent && result.stderr && result.exitCode !== 0) {
          log(`Command stderr: ${redactSecrets(result.stderr)}`, LogLevel.DEBUG);
        }
        
        resolve(result);
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  };

  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < retries) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, LogLevel.WARN);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function execCommandStreaming(
  command: string,
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void,
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  }
): Promise<number> {
  const { cwd = process.cwd(), env = {} } = options || {};
  
  logCommand(command);
  
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      if (onStdout) {
        onStdout(text);
      } else {
        process.stdout.write(text);
      }
    });
    
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      if (onStderr) {
        onStderr(text);
      } else {
        process.stderr.write(text);
      }
    });
    
    child.on('close', (code) => {
      resolve(code || 0);
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

export function isCommandAvailable(command: string): Promise<boolean> {
  return execCommand(`which ${command}`, { silent: true })
    .then(() => true)
    .catch(() => false);
}