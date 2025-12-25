/**
 * @fileoverview Tracer - High-fidelity execution observability singleton.
 * Designed for Hexagonal Architecture to capture telemetry across Port/Adapter boundaries.
 * * Features:
 * - Atomic Writes: Uses fs/promises appendFile for thread-safe sequential logging.
 * - Session Correlation: Automatically generates a unique ID for every execution run.
 * - Non-Blocking: Logic is wrapped to ensure tracer failures never crash the main application.
 * - Higher-Order Tracing: Supports 'spans' for timing complex domain logic.
 * * @version 1.1.0
 * @author Gemini Thought Partner
 */

import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from '#logger';
import { EnvironmentService } from '../infrastructure/config/EnvironmentService.js';

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3};

/**
 * Tracer Class - Manages the lifecycle of execution traces.
 */
class Tracer {
    /**
     * @private
     */
    constructor() {
        /** @type {string|null} */
        this.projectRoot = null;
        /** @type {string|null} */
        this.traceFile = null;
        /** @type {boolean} */
        this.isInitialized = false;
        /** @type {string|null} */
        this.sessionID = null;
    }

    /**
     * Initializes the tracing engine and ensures the log directory exists.
     * @param {string} projectRoot - Absolute path provided by main.js.
     * @param {string} [namespace='plnexus'] - Prefix for the trace file name.
     * @returns {Promise<void>}
     */
    async initialize(projectRoot, namespace = 'plnexus') {
        if (this.isInitialized) return;

        try {
            this.projectRoot = projectRoot;
            // Generate a unique Session ID to correlate logs for a single execution
            this.sessionID = Math.random().toString(36).substring(2, 9).toUpperCase();
            
            const traceDir = join(this.projectRoot, 'logs', 'traces');
            
            // Ensure directory exists (Recursive creates parent logs/ if missing)
            await mkdir(traceDir, { recursive: true });

            // Rotate file by date to prevent massive single-file growth
            //const dateStr = new Date().toISOString().split('T')[0];
            // Change this line in initialize():
            const dateStr = new Date().toLocaleDateString('en-CA'); // Outputs YYYY-MM-DD in local time
            this.traceFile = join(traceDir, `${namespace}-${dateStr}.trace.log`);
            
            this.isInitialized = true;
            
            await this.record('SYSTEM', 'TRACER_READY', { 
                sid: this.sessionID,
                env: process.env.NODE_ENV || 'development',
                node: process.version
            });

        } catch (error) {
            // Fallback to standard logger if the tracer itself cannot access the disk
            logger.error(`[Tracer] Initialization Failure: ${error.message}`);
        }
    }

    /**
     * Records an architectural event with metadata.
     * @param {('CLI'|'DOMAIN'|'INFRA'|'SYSTEM')} layer - The architectural layer responsible.
     * @param {string} event - Short, uppercase descriptor (e.g., 'GEX_CALCULATION').
     * @param {Object} [data={}] - Key-value pairs of context (symbols, paths, etc.).
     * @returns {Promise<void>}
     */
    async record(layer, event, data = {}) {
        // 1. Basic initialization and global kill-switch for logging: ENABLE_TRACING in .env
        if (!this.isInitialized || !EnvironmentService.isTracingEnabled) return;

        // 2. SELF-CONTAINED LEVEL CHECK
        // Default to 'info' if no level is provided in metadata
        const requestLevel = data.level || 'info';
        const systemLevel = process.env.LOG_LEVEL || 'info';

        //If the request level is more verbose than the system allows, exit silently
        if (LOG_LEVELS[requestLevel] > LOG_LEVELS[systemLevel]) return;

        const entry = {
            ts: new Date().toISOString(),
            sid: this.sessionID,
            lyr: layer.toUpperCase(),
            evt: event.toUpperCase(),
            dat: data
        };

        try {
            // Write as a JSON-Line for easy parsing with tools like jq
            await appendFile(this.traceFile, JSON.stringify(entry) + '\n', 'utf8');
        } catch (error) {
            // Fail silently regarding the app flow to maintain "Pristine" business logic
            //console.error(`[Tracer Error]: ${error.message}`);
            logger.error(`[Tracer Error]: ${error.message}`);
        }
    }

    /**
     * Wraps a function execution to trace its start, end, and duration.
     * Ideal for monitoring performance-heavy market analysis.
     * * @template T
     * @param {string} layer - Architectural layer.
     * @param {string} label - Name of the operation.
     * @param {function(): Promise<T>|T} fn - The operation to execute.
     * @param {Object} [meta={}] - Additional context.
     * @returns {Promise<T>}
     */

     async traceSpan(layer, label, fn, meta = {}) {
	    //Tracing kill switch
            //If EnvironmentService checks .env and says false
            //callback is executed and exit immediately
            if (!EnvironmentService.isTracingEnabled) {
             return await fn();
	    }

        const startTime = Date.now();
        await this.record(layer, `${label}_START`, meta);
        
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            
            await this.record(layer, `${label}_COMPLETE`, { 
                ...meta, 
                durationMs: duration 
            });
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            await this.record(layer, `${label}_FAILED`, { 
                ...meta, 
                durationMs: duration,
                error: error.message 
            });
            throw error; // Re-throw to ensure the Domain/UseCase handles the failure
        }
    }
}

// Export as a Singleton to maintain a single session per execution
export const tracer = new Tracer();
