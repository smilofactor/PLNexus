/**
 * @file EnvironmentService.js
 * @description Central orchestrator for environment hydration and provider validation.
 * Ensures the application root is resolved and configuration contracts are enforced.
 */

import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';

// 1. Resolve Absolute Project Root
// This ensures the service finds the .env regardless of the execution context.
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Paths based on the 'Directory Tree of Truth':
// Moves up from infrastructure/config/ to the project root.
const ROOT_DIR = join(__dirname, '../../');
const ENV_PATH = join(ROOT_DIR, '.env');

/**
 * EnvironmentService
 * Role: The Quartermaster. Hydrates the shell and verifies service readiness.
 */
export class EnvironmentService {

    //Setting Tracing to off explicitly
    static #config = {
        enableTracing: false 
    };
    
    /**
     * Resolves the .env file and populates process.env.
     * Should be called as the first step in the Composition Root (main.js).
     */
    static hydrate() {
        const result = dotenv.config({ path: ENV_PATH });

        if (result.error) {
            // In Docker/Production, .env might be absent in favor of shell variables.
            // We log this as info rather than error to avoid false alarms.
	    this.#config.enableTracing = false;
            logger.info(`[Environment] No .env file found at ${ENV_PATH}. Proceeding with system shell variables.`);

        } else {
	    //Explicitly checking for true to maintain default-off for Tracer
            //this.#config.enableTracing = process.env.ENABLE_TRACING === 'true';
            this.#config.enableTracing = String(process.env.ENABLE_TRACING).toLowerCase() === 'true';
            logger.info(`[Environment] Successfully hydrated environment variables from: ${ENV_PATH}`);
        }
	//Narrative confirmation of final state
        logger.info('[Environment] Tracing Status: ${this.#config.enableTracing}');
        //this.#config.enableTracing = String(process.env.ENABLE_TRACING).toLowerCase() === 'true';
    }

    /**
     * This allows the Tracer to safely check the toggle.
     */
    static get isTracingEnabled() {
        return this.#config.enableTracing;
    }

    /**
     * Dynamic Validator Factory.
     * Offloads the check to provider-specific contracts (e.g., FinnhubConfig.js).
     * * @param {string} provider - The PascalCase name of the provider (e.g., 'Finnhub', 'Schwab').
     * @returns {Promise<Object>} The validated, immutable configuration object.
     * @throws {Error} If the validator file is missing or the contract is violated.
     */
    static async getProviderConfig(provider) {
        try {
            // Dynamically import the specific validator contract.
            // This prevents loading unused validators (e.g., doesn't load Schwab logic during a Finnhub run).
            const validatorPath = `./validators/${provider}Config.js`;
            const module = await import(validatorPath);
            
            // Extract the exported validator (e.g., FinnhubConfig)
            const validator = module[`${provider}Config`];

            if (!validator || typeof validator.validate !== 'function') {
                throw new Error(`Validator for ${provider} does not implement the .validate() contract.`);
            }

            // Execute the specific validation logic
            return validator.validate();

        } catch (err) {
            // Catching both Import errors (file missing) and Validation errors (key missing)
            logger.error(`[Environment] Configuration lifecycle failure for provider: ${provider}`, {
                error: err.message,
                hint: "Check if the validator file exists in infrastructure/config/validators/"
            });
            throw err;
        }
    }
}
