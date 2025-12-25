/**
 * @fileoverview AdapterFactory - A manifest-driven Dependency Injection engine.
 * * This factory acts as a Hexagonal "Composer." It is responsible for:
 * 1. Resolving adapter implementations from the central manifest.
 * 2. Dynamically importing ES Modules at runtime to minimize memory footprint.
 * 3. Injecting infrastructure-level configuration into the Domain-facing adapters.
 *
 * @version 1.1.0
 * @author Gemini Thought Partner
 */

import { readFile } from 'fs/promises';
import { join, isAbsolute } from 'path';
import { logger } from '#logger'; // ESM alias established in project baseline 

/**
 * Factory class for orchestrating the lifecycle of Driven Adapters.
 */
export class AdapterFactory {
    /**
     * Initializes the factory with a stable project root.
     * @param {string} projectRoot - The absolute path to the project root directory.
     * @throws {Error} If projectRoot is undefined or null.
     */
    constructor(projectRoot) {
        if (!projectRoot) {
            throw new Error("[AdapterFactory] Initialization failed: projectRoot is required for path resolution.");
        }
        
        this.root = projectRoot;
        // Resolved path to the adapter registry
        this.manifestPath = join(this.root, 'config', 'adapters.manifest.json');
    }

    /**
     * Dynamically loads and instantiates an adapter based on a specific execution mode.
     * * @param {string} mode - The mode identifier (e.g., '1' for Live, '2' for Mock).
     * @param {Object} envService - The EnvironmentService for credential/config hydration.
     * @returns {Promise<Object>} A fully instantiated Adapter class.
     * @throws {Error} If the manifest is missing, the mode is undefined, or the module fails to load.
     */
    async loadAdapter(mode, envService) {
        try {
            // 1. Retrieve the latest manifest state
            const manifest = await this._getManifest();
            
            // 2. Validate requested execution mode
            const adapterDef = manifest.adapters[mode];
            if (!adapterDef) {
                const available = Object.keys(manifest.adapters).join(', ');
                throw new Error(`Execution mode "${mode}" is not defined in manifest. Available: [${available}]`);
            }

            // 3. Resolve Module Path
            // Ensures support for both relative (to root) and absolute paths
            const rawPath = adapterDef.path;
            const modulePath = isAbsolute(rawPath) ? rawPath : join(this.root, rawPath);

            logger.debug(`[AdapterFactory] Resolving dependency: ${adapterDef.className}`, { path: rawPath });

            // 4. Dynamic ESM Import
            // We use dynamic imports to keep the main execution thread lean
            const module = await import(modulePath);
            const AdapterClass = module[adapterDef.className];

            if (!AdapterClass) {
                throw new Error(`Export "${adapterDef.className}" not found in module at ${rawPath}`);
            }

            // 5. Context-Aware Dependency Injection
            if (adapterDef.requiresConfig) {
                const providerKey = adapterDef.configKey;
                const config = await envService.getProviderConfig(providerKey);
                
                logger.info(`[AdapterFactory] Injecting configuration for ${adapterDef.className} (${providerKey})`);
                return new AdapterClass(config);
            }

            logger.info(`[AdapterFactory] Initializing ${adapterDef.className} (Standard)`);
            return new AdapterClass();

        } catch (error) {
            // Wrap error with specific context for the Tracer/Logger
            const failureContext = `[AdapterFactory] Load failure for mode ${mode}: ${error.message}`;
            logger.error(failureContext, { stack: error.stack });
            throw new Error(failureContext);
        }
    }

    /**
     * Internal helper to securely read and parse the manifest.
     * @private
     * @returns {Promise<Object>} Parsed JSON manifest.
     */
    async _getManifest() {
        try {
            const data = await readFile(this.manifestPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Manifest missing at: ${this.manifestPath}. Please check your config/ directory.`);
            }
            throw new Error(`Malformed manifest: ${error.message}`);
        }
    }
}
