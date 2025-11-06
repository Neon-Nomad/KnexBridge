import chalk from 'chalk';

export class Logger {
  public verbose: boolean = false;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(chalk.blue('[i]'), message);
  }

  success(message: string): void {
    console.log(chalk.green('[ok]'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('[warn]'), message);
  }

  error(message: string): void {
    console.error(chalk.red('[error]'), message);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('[debug]'), message);
    }
  }

  step(message: string): void {
    console.log(chalk.cyan('[>]'), message);
  }

  table(data: Record<string, any>[]): void {
    console.table(data);
  }

  divider(): void {
    console.log(chalk.gray('-'.repeat(60)));
  }

  header(title: string): void {
    console.log();
    console.log(chalk.bold.cyan(`== ${title} ==`));
    this.divider();
  }

  metric(label: string, value: string | number): void {
    console.log(`   ${chalk.gray(label.padEnd(20))} ${chalk.white(value)}`);
  }
}

export const logger = new Logger();

