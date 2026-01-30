import { SchemaConstants, isDangerousKey } from './Constants.js';
import { StitchType } from '../core/StitchTypes.js';

/**
 * PatternSchema - Validates pattern JSON data before loading
 *
 * Provides validation to:
 * - Prevent loading malformed data
 * - Ensure version compatibility
 * - Validate stitch types and graph structure
 * - Enforce reasonable limits on pattern size
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the data is valid
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Check an object for dangerous keys that could lead to prototype pollution
 * @param {Object} obj - The object to check
 * @param {string} path - The current path for error messages
 * @returns {string[]} - Array of error messages for any dangerous keys found
 */
function checkForDangerousKeys(obj, path = '') {
    const errors = [];

    if (!obj || typeof obj !== 'object') {
        return errors;
    }

    for (const key of Object.keys(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (isDangerousKey(key)) {
            errors.push(`Dangerous key detected: "${currentPath}" - potential prototype pollution attempt`);
        }

        // Recursively check nested objects (but not arrays to avoid performance issues)
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            errors.push(...checkForDangerousKeys(obj[key], currentPath));
        }
    }

    return errors;
}

/**
 * Validate pattern JSON data
 * @param {Object} data - The pattern data to validate
 * @returns {ValidationResult} - Validation result
 */
export function validatePatternData(data) {
    const errors = [];
    const warnings = [];

    // Check if data is an object (and not an array or null)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Pattern data must be an object');
        return { valid: false, errors, warnings };
    }

    // Security check: detect prototype pollution attempts
    const dangerousKeyErrors = checkForDangerousKeys(data);
    if (dangerousKeyErrors.length > 0) {
        errors.push(...dangerousKeyErrors);
        return { valid: false, errors, warnings };
    }

    // Validate version
    if (data.version !== undefined) {
        if (typeof data.version !== 'number') {
            errors.push('Version must be a number');
        } else if (!SchemaConstants.SUPPORTED_VERSIONS.includes(data.version)) {
            errors.push(`Unsupported pattern version: ${data.version}. Supported versions: ${SchemaConstants.SUPPORTED_VERSIONS.join(', ')}`);
        }
    } else {
        warnings.push('No version specified, assuming version 1');
    }

    // Validate metadata
    if (data.metadata !== undefined) {
        const metaResult = validateMetadata(data.metadata);
        errors.push(...metaResult.errors);
        warnings.push(...metaResult.warnings);
    }

    // Validate mode
    if (data.mode !== undefined) {
        if (typeof data.mode !== 'string') {
            errors.push('Mode must be a string');
        } else if (!['flat', 'round'].includes(data.mode)) {
            errors.push(`Invalid mode: ${data.mode}. Must be 'flat' or 'round'`);
        }
    }

    // Validate currentRow
    if (data.currentRow !== undefined) {
        if (typeof data.currentRow !== 'number' || !Number.isInteger(data.currentRow)) {
            errors.push('currentRow must be an integer');
        } else if (data.currentRow < 0) {
            errors.push('currentRow cannot be negative');
        }
    }

    // Validate currentColor
    if (data.currentColor !== undefined) {
        if (typeof data.currentColor !== 'number') {
            errors.push('currentColor must be a number (hex color)');
        } else if (data.currentColor < 0 || data.currentColor > 0xFFFFFF) {
            errors.push('currentColor must be a valid hex color (0x000000 - 0xFFFFFF)');
        }
    }

    // Validate graph
    if (data.graph !== undefined) {
        const graphResult = validateGraph(data.graph);
        errors.push(...graphResult.errors);
        warnings.push(...graphResult.warnings);
    } else {
        warnings.push('No graph data present, pattern will be empty');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate metadata object
 * @param {Object} metadata - The metadata to validate
 * @returns {ValidationResult} - Validation result
 */
function validateMetadata(metadata) {
    const errors = [];
    const warnings = [];

    if (typeof metadata !== 'object') {
        errors.push('Metadata must be an object');
        return { errors, warnings };
    }

    // Validate name
    if (metadata.name !== undefined) {
        if (typeof metadata.name !== 'string') {
            errors.push('Metadata name must be a string');
        } else if (metadata.name.length > SchemaConstants.MAX_METADATA_NAME_LENGTH) {
            errors.push(`Metadata name exceeds maximum length of ${SchemaConstants.MAX_METADATA_NAME_LENGTH}`);
        }
    }

    // Validate author
    if (metadata.author !== undefined && typeof metadata.author !== 'string') {
        errors.push('Metadata author must be a string');
    }

    // Validate notes
    if (metadata.notes !== undefined) {
        if (typeof metadata.notes !== 'string') {
            errors.push('Metadata notes must be a string');
        } else if (metadata.notes.length > SchemaConstants.MAX_METADATA_NOTES_LENGTH) {
            warnings.push(`Metadata notes exceed ${SchemaConstants.MAX_METADATA_NOTES_LENGTH} characters, may be truncated`);
        }
    }

    // Validate timestamps
    if (metadata.createdAt !== undefined && typeof metadata.createdAt !== 'number') {
        warnings.push('Metadata createdAt should be a timestamp number');
    }

    if (metadata.modifiedAt !== undefined && typeof metadata.modifiedAt !== 'number') {
        warnings.push('Metadata modifiedAt should be a timestamp number');
    }

    return { errors, warnings };
}

/**
 * Validate graph object
 * @param {Object} graph - The graph data to validate
 * @returns {ValidationResult} - Validation result
 */
function validateGraph(graph) {
    const errors = [];
    const warnings = [];

    if (typeof graph !== 'object') {
        errors.push('Graph must be an object');
        return { errors, warnings };
    }

    // Validate nodes array
    if (graph.nodes !== undefined) {
        if (!Array.isArray(graph.nodes)) {
            errors.push('Graph nodes must be an array');
        } else {
            // Check pattern size limit
            if (graph.nodes.length > SchemaConstants.MAX_PATTERN_SIZE) {
                errors.push(`Pattern exceeds maximum size of ${SchemaConstants.MAX_PATTERN_SIZE} stitches`);
            }

            // Validate each node
            const nodeIds = new Set();
            graph.nodes.forEach((node, index) => {
                const nodeResult = validateNode(node, index, nodeIds);
                errors.push(...nodeResult.errors);
                warnings.push(...nodeResult.warnings);
            });
        }
    }

    return { errors, warnings };
}

/**
 * Validate a single node
 * @param {Object} node - The node to validate
 * @param {number} index - The node index in the array
 * @param {Set} nodeIds - Set of seen node IDs for duplicate detection
 * @returns {ValidationResult} - Validation result
 */
function validateNode(node, index, nodeIds) {
    const errors = [];
    const warnings = [];

    if (typeof node !== 'object') {
        errors.push(`Node at index ${index} must be an object`);
        return { errors, warnings };
    }

    // Security check: detect prototype pollution attempts in nodes
    const dangerousKeyErrors = checkForDangerousKeys(node, `graph.nodes[${index}]`);
    if (dangerousKeyErrors.length > 0) {
        errors.push(...dangerousKeyErrors);
        return { errors, warnings };
    }

    // Validate ID
    if (node.id === undefined) {
        errors.push(`Node at index ${index} is missing required 'id' field`);
    } else if (typeof node.id !== 'string') {
        errors.push(`Node at index ${index} has invalid id type (must be string)`);
    } else if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id found: ${node.id}`);
    } else {
        nodeIds.add(node.id);
    }

    // Validate type
    if (node.type === undefined) {
        errors.push(`Node at index ${index} is missing required 'type' field`);
    } else if (typeof node.type !== 'string') {
        errors.push(`Node at index ${index} has invalid type (must be string)`);
    } else {
        // Check if it's a valid stitch type
        const validTypes = Object.values(StitchType);
        if (!validTypes.includes(node.type)) {
            warnings.push(`Node at index ${index} has unknown stitch type: ${node.type}`);
        }
    }

    // Validate row and column
    if (node.row !== undefined) {
        if (typeof node.row !== 'number' || !Number.isInteger(node.row)) {
            errors.push(`Node at index ${index} has invalid row (must be integer)`);
        } else if (node.row < 0) {
            errors.push(`Node at index ${index} has negative row`);
        }
    }

    if (node.column !== undefined) {
        if (typeof node.column !== 'number' || !Number.isInteger(node.column)) {
            errors.push(`Node at index ${index} has invalid column (must be integer)`);
        } else if (node.column < 0) {
            errors.push(`Node at index ${index} has negative column`);
        }
    }

    // Validate position
    if (node.position !== undefined) {
        if (typeof node.position !== 'object') {
            errors.push(`Node at index ${index} has invalid position (must be object)`);
        } else {
            ['x', 'y', 'z'].forEach(coord => {
                if (node.position[coord] !== undefined && typeof node.position[coord] !== 'number') {
                    errors.push(`Node at index ${index} has invalid position.${coord} (must be number)`);
                }
            });
        }
    }

    // Validate connections
    if (node.connections !== undefined) {
        if (typeof node.connections !== 'object') {
            errors.push(`Node at index ${index} has invalid connections (must be object)`);
        } else {
            // Validate connection arrays
            ['above', 'below'].forEach(dir => {
                if (node.connections[dir] !== undefined && !Array.isArray(node.connections[dir])) {
                    errors.push(`Node at index ${index} has invalid connections.${dir} (must be array)`);
                }
            });

            // Validate left/right connections (should be string IDs or null)
            ['left', 'right'].forEach(dir => {
                const val = node.connections[dir];
                if (val !== undefined && val !== null && typeof val !== 'string') {
                    errors.push(`Node at index ${index} has invalid connections.${dir} (must be string ID or null)`);
                }
            });
        }
    }

    // Validate color
    if (node.color !== undefined) {
        if (typeof node.color !== 'number') {
            errors.push(`Node at index ${index} has invalid color (must be number)`);
        }
    }

    return { errors, warnings };
}

/**
 * Format validation result as a user-friendly message
 * @param {ValidationResult} result - The validation result
 * @returns {string} - Formatted message
 */
export function formatValidationResult(result) {
    const lines = [];

    if (result.errors.length > 0) {
        lines.push('Errors:');
        result.errors.forEach(err => lines.push(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push('Warnings:');
        result.warnings.forEach(warn => lines.push(`  - ${warn}`));
    }

    return lines.join('\n');
}
