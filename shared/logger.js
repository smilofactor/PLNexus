/**
 * shared/logger.js
 * Professional Observability Layer
 * * This module provides structured logging to enable root-cause analysis.
 * It distinguishes between human-readable console output and machine-parsable JSON.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import winston from 'winston';
import 'winston-daily-rotate-file'; // Ensures log files don't consume all disk space

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Since logger.js is in /shared go up one level to reach root
const PROJECT_ROOT = join(__dirname, '..');
const LOG_DIR = join(PROJECT_ROOT, 'logs');


const { combine, timestamp, json, colorize, printf, errors } = winston.format;


// Custom format for the CLI (Human Readable)
const cliFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (stack) msg += `\nStack: ${stack}`; // Include stack traces if available
    if (Object.keys(metadata).length > 0 && level.includes('debug')) {
        msg += ` | Meta: ${JSON.stringify(metadata)}`;
    }
    return msg;
});

/**
 * The Production Logger Configuration
 */
export const logger = winston.createLogger({
    // In production, default to 'info'. Use 'debug' in dev for deep tracing.
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }), // Automatically capture and format error stacks
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        json() // Force JSON for all file transports for easier troubleshooting
    ),
    defaultMeta: { service: 'plnexus-discovery' },
    transports: [
        // 1. CONSOLE: Optimized for the developer's terminal
        new winston.transports.Console({
            format: combine(
                colorize(),
                cliFormat
            )
        }),

        // 2. ERROR LOGS: Dedicated file for critical troubleshooting
        new winston.transports.DailyRotateFile({
	    dirname: LOG_DIR,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d', // Retain 30 days of error history
            zippedArchive: true
        }),

        // 3. COMBINED LOGS: Every event for full request tracing
        new winston.transports.DailyRotateFile({
	    dirname: LOG_DIR,
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',   // Rotate if file exceeds 20MB
            maxFiles: '14d',   // Retain 14 days of full history
            zippedArchive: true
        })
    ],
    // Ensure the logger doesn't exit on handled errors
    exitOnError: false
});

/**
 * PRO-TIP: We export a helper to generate a unique Trace ID
 * for tracking a single request across multiple adapters.
 */
export const getTraceId = () => Math.random().toString(36).substring(2, 15);
