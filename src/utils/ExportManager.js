/**
 * ExportManager - Handles pattern export functionality
 *
 * Supports:
 * - JSON export (pattern data with full serialization)
 * - PNG export (canvas screenshot from Three.js renderer)
 * - PDF export (printable pattern with instructions and stitch chart)
 * - File download utilities with sanitized filenames
 *
 * Usage:
 *   const exportManager = new ExportManager(pattern, renderer);
 *
 *   // Download files
 *   exportManager.downloadJSON();
 *   await exportManager.downloadPNG();
 *   await exportManager.downloadPDF();
 *
 *   // Get raw data
 *   const json = exportManager.exportJSON();
 *   const pngDataUrl = await exportManager.exportPNG();
 *   const pdfBlob = await exportManager.exportPDF();
 *
 * Note: For production PDF generation with advanced features (images, custom fonts),
 * consider integrating the jspdf library. The current implementation creates
 * a basic PDF 1.4 document without external dependencies.
 */

import { EventBus, Events } from './EventBus.js';

/**
 * Standard crochet chart symbols for stitch types
 * Using distinct symbols to avoid confusion
 * Based on common crochet chart conventions with adaptations for text-based display
 */
const STITCH_SYMBOLS = {
    // Basic stitches - using distinct symbols
    CHAIN: 'o',
    SLIP_STITCH: '·',  // Middle dot
    SINGLE_CROCHET: 'x',
    HALF_DOUBLE_CROCHET: 'T',
    DOUBLE_CROCHET: '⊥',  // Perpendicular symbol (taller T)
    TRIPLE_CROCHET: '⊤',  // Inverted perpendicular (even taller)
    DOUBLE_TRIPLE_CROCHET: 'Y',

    // Increases and decreases
    INCREASE: 'V',
    DECREASE: 'Λ',  // Lambda/inverted V
    SC2TOG: 'Λ',
    DC2TOG: '⋀',  // Logical and

    // Foundation stitches
    MAGIC_RING: 'O',
    FOUNDATION_SINGLE_CROCHET: '⊗',  // Circled x
    FOUNDATION_DOUBLE_CROCHET: '⊕',  // Circled plus

    // Post stitches - using front/back indicators
    FRONT_POST_DOUBLE_CROCHET: '⫰',  // Front post indicator
    BACK_POST_DOUBLE_CROCHET: '⫯',  // Back post indicator
    FRONT_POST_TRIPLE_CROCHET: '⟊',  // Tall front post
    BACK_POST_TRIPLE_CROCHET: '⟋',  // Tall back post

    // Texture stitches
    BOBBLE: 'B',
    POPCORN: 'P',
    PUFF: 'U',
    CLUSTER: '⋏',  // Triple decrease symbol

    // Decorative stitches
    PICOT: '∗',  // Asterisk operator
    SHELL: '⌓',  // Shell-like shape
    V_STITCH: '⋁',  // Logical or (V shape)
    SPIKE: '↓'  // Downward arrow
};

/**
 * Default symbol for unknown stitch types
 */
const DEFAULT_SYMBOL = '?';

export class ExportManager {
    /**
     * Create an ExportManager
     * @param {Pattern} pattern - The pattern to export
     * @param {THREE.WebGLRenderer} renderer - Optional renderer for PNG export
     */
    constructor(pattern, renderer = null) {
        this.pattern = pattern;
        this.renderer = renderer;
    }

    /**
     * Export pattern as JSON string
     * @param {Object} options - Export options
     * @param {boolean} options.pretty - Format with indentation (default: true)
     * @returns {string} JSON string
     * @throws {Error} If pattern is not available or invalid
     */
    exportJSON(options = {}) {
        const { pretty = true } = options;

        EventBus.emit(Events.EXPORT_STARTED, { type: 'json' });

        try {
            if (!this.pattern) {
                throw new Error('Pattern not available');
            }

            const data = this.pattern.toJSON();
            const json = pretty
                ? JSON.stringify(data, null, 2)
                : JSON.stringify(data);

            EventBus.emit(Events.EXPORT_COMPLETED, { type: 'json', success: true });
            return json;
        } catch (error) {
            EventBus.emit(Events.EXPORT_ERROR, { type: 'json', error: error.message });
            throw error;
        }
    }

    /**
     * Create a JSON blob for download
     * @returns {Blob}
     */
    createJSONBlob() {
        const json = this.exportJSON({ pretty: true });
        return new Blob([json], { type: 'application/json' });
    }

    /**
     * Export canvas as PNG data URL
     * @param {Object} options - Export options
     * @param {number} options.width - Output width (optional, must be positive)
     * @param {number} options.height - Output height (optional, must be positive)
     * @returns {Promise<string>} PNG data URL
     */
    async exportPNG(options = {}) {
        EventBus.emit(Events.EXPORT_STARTED, { type: 'png' });

        try {
            if (!this.renderer) {
                throw new Error('Renderer not available');
            }

            const canvas = this.renderer.domElement;
            const { width, height } = options;

            // Validate dimensions if provided
            if ((width !== undefined && (width <= 0 || !Number.isFinite(width))) ||
                (height !== undefined && (height <= 0 || !Number.isFinite(height)))) {
                throw new Error('Invalid dimensions: width and height must be positive numbers');
            }

            let dataUrl;
            if (width && height && (width !== canvas.width || height !== canvas.height)) {
                // Create a resized copy
                dataUrl = await this.resizeCanvas(canvas, width, height);
            } else {
                dataUrl = canvas.toDataURL('image/png');
            }

            EventBus.emit(Events.EXPORT_COMPLETED, { type: 'png', success: true });
            return dataUrl;
        } catch (error) {
            EventBus.emit(Events.EXPORT_ERROR, { type: 'png', error: error.message });
            throw error;
        }
    }

    /**
     * Resize canvas and return data URL
     * @param {HTMLCanvasElement} sourceCanvas
     * @param {number} width
     * @param {number} height
     * @returns {Promise<string>}
     */
    async resizeCanvas(sourceCanvas, width, height) {
        return new Promise((resolve, reject) => {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get 2D context for canvas resize'));
                    return;
                }
                ctx.drawImage(sourceCanvas, 0, 0, width, height);
                resolve(tempCanvas.toDataURL('image/png'));
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Export canvas as PNG blob
     * @param {Object} options - Export options
     * @returns {Promise<Blob>}
     */
    async exportPNGBlob(options = {}) {
        const dataUrl = await this.exportPNG(options);
        return this.dataURLToBlob(dataUrl);
    }

    /**
     * Convert data URL to Blob
     * Uses efficient Uint8Array.from() instead of manual loop
     * @param {string} dataUrl
     * @returns {Blob}
     * @throws {Error} If dataUrl is malformed
     */
    dataURLToBlob(dataUrl) {
        if (!dataUrl || typeof dataUrl !== 'string') {
            throw new Error('Invalid data URL: expected a string');
        }

        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            throw new Error('Invalid data URL format: missing data section');
        }

        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';

        let bstr;
        try {
            bstr = atob(parts[1]);
        } catch (e) {
            throw new Error('Invalid data URL: failed to decode base64 data');
        }

        // More efficient than manual loop
        const u8arr = Uint8Array.from(bstr, char => char.charCodeAt(0));

        return new Blob([u8arr], { type: mime });
    }

    /**
     * Export pattern as PDF blob
     * @param {Object} options - Export options
     * @param {boolean} options.includeChart - Include stitch chart (default: true)
     * @param {string} options.pageSize - Page size: 'a4' or 'letter' (default: 'a4')
     * @returns {Promise<Blob>}
     */
    async exportPDF(options = {}) {
        EventBus.emit(Events.EXPORT_STARTED, { type: 'pdf' });

        try {
            const content = this.generatePDFContent();
            const pdfBlob = this.createPDFBlob(content, options);

            EventBus.emit(Events.EXPORT_COMPLETED, { type: 'pdf', success: true });
            return pdfBlob;
        } catch (error) {
            EventBus.emit(Events.EXPORT_ERROR, { type: 'pdf', error: error.message });
            throw error;
        }
    }

    /**
     * Generate PDF content object
     * @returns {Object} Content for PDF generation
     * @throws {Error} If pattern is not available
     */
    generatePDFContent() {
        if (!this.pattern) {
            throw new Error('Pattern not available');
        }

        const stats = this.pattern.graph?.getStats() || { totalStitches: 0, rowCount: 0 };
        const instructions = this.pattern.generateInstructions?.() || '';
        const metadata = this.pattern.metadata || {};

        return {
            title: metadata.name || 'Untitled Pattern',
            author: metadata.author || '',
            date: new Date().toLocaleDateString(),
            instructions,
            stats: {
                totalStitches: stats.totalStitches || 0,
                rowCount: stats.rowCount || 0
            },
            notes: metadata.notes || ''
        };
    }

    /**
     * Generate stitch chart data
     * @returns {Object} Chart data with rows and symbols
     * @throws {Error} If pattern or graph is not available
     */
    generateStitchChart() {
        if (!this.pattern || !this.pattern.graph) {
            throw new Error('Pattern or graph not available');
        }

        const graph = this.pattern.graph;
        const rowCount = typeof graph.getRowCount === 'function'
            ? graph.getRowCount()
            : (graph.getStats?.()?.rowCount || 0);

        const rows = [];

        for (let i = 0; i < rowCount; i++) {
            const stitches = graph.getRowSorted?.(i) || [];
            const chartRow = {
                rowNumber: i + 1,
                stitches: stitches.map(stitch => ({
                    type: stitch?.type || 'UNKNOWN',
                    symbol: this.getStitchSymbol(stitch?.type),
                    column: stitch?.column ?? i
                }))
            };
            rows.push(chartRow);
        }

        return { rows };
    }

    /**
     * Get standard chart symbol for a stitch type
     * @param {string} stitchType
     * @returns {string}
     */
    getStitchSymbol(stitchType) {
        if (!stitchType) {
            return DEFAULT_SYMBOL;
        }

        const rawKey = String(stitchType);
        const normalizedKey = rawKey.toUpperCase();

        return STITCH_SYMBOLS[rawKey] ||
            STITCH_SYMBOLS[normalizedKey] ||
            DEFAULT_SYMBOL;
    }

    /**
     * Create a PDF blob from content
     * This is a simplified PDF generator. For production, use jspdf library.
     * @param {Object} content
     * @param {Object} options
     * @returns {Blob}
     */
    createPDFBlob(content, options = {}) {
        // Simple PDF structure (PDF 1.4 compliant)
        // This creates a basic text-based PDF without external libraries
        // Track byte offsets for xref table
        const objects = [];
        const offsets = [];
        let currentOffset = 0;

        // Helper to add object and track offset
        const addObject = (objContent) => {
            offsets.push(currentOffset);
            objects.push(objContent);
            currentOffset += objContent.length + 1; // +1 for newline
        };

        // PDF Header
        const header = '%PDF-1.4\n%âãÏÓ';
        currentOffset = header.length + 1;

        // Object 1: Catalog
        addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

        // Object 2: Pages
        addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

        // Object 3: Page
        addObject('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj');

        // Build content stream
        const textLines = this.buildPDFTextContent(content);
        const contentStream = textLines.join('\n');

        // Object 4: Content stream
        addObject(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`);

        // Object 5: Font
        addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

        // Build the PDF content
        const bodyContent = objects.join('\n');
        const xrefStart = header.length + 1 + bodyContent.length + 1;

        // Format offsets with leading zeros (10 digits)
        const formatOffset = (offset) => String(offset).padStart(10, '0');

        // Build xref table
        const xrefLines = [
            'xref',
            '0 6',
            '0000000000 65535 f ',
            `${formatOffset(offsets[0])} 00000 n `,
            `${formatOffset(offsets[1])} 00000 n `,
            `${formatOffset(offsets[2])} 00000 n `,
            `${formatOffset(offsets[3])} 00000 n `,
            `${formatOffset(offsets[4])} 00000 n `
        ];

        // Trailer
        const trailerLines = [
            'trailer',
            '<< /Size 6 /Root 1 0 R >>',
            'startxref',
            String(xrefStart),
            '%%EOF'
        ];

        const pdfContent = [header, bodyContent, ...xrefLines, ...trailerLines].join('\n');
        return new Blob([pdfContent], { type: 'application/pdf' });
    }

    /**
     * Build PDF text content stream with pagination support
     * @param {Object} content
     * @returns {string[]}
     */
    buildPDFTextContent(content) {
        const lines = [];
        const PAGE_HEIGHT = 792;  // Letter size height
        const TOP_MARGIN = 750;
        const BOTTOM_MARGIN = 50;
        const LINE_HEIGHT = 15;

        let yPos = TOP_MARGIN;
        let currentPage = 1;

        // Helper to check if we need a new page
        const checkPageBreak = (neededSpace = LINE_HEIGHT) => {
            if (yPos - neededSpace < BOTTOM_MARGIN) {
                // Add page number before ending
                lines.push(`0 -${yPos - 30} Td`);
                lines.push(`(Page ${currentPage}) Tj`);
                lines.push('ET'); // End text for this page
                lines.push('%%PAGE_BREAK%%'); // Marker for page break
                lines.push('BT'); // Begin text for new page
                lines.push(`50 ${TOP_MARGIN} Td`);
                yPos = TOP_MARGIN;
                currentPage++;
                return true;
            }
            return false;
        };

        lines.push('BT'); // Begin text
        lines.push(`50 ${yPos} Td`);

        // Title
        lines.push('/F1 18 Tf'); // Font size 18
        lines.push(`(${this.escapePDFString(content.title)}) Tj`);
        yPos -= 30;

        // Author
        if (content.author) {
            lines.push('/F1 12 Tf');
            lines.push(`0 -30 Td`);
            lines.push(`(By: ${this.escapePDFString(content.author)}) Tj`);
            yPos -= 20;
        }

        // Date
        lines.push('/F1 10 Tf');
        lines.push(`0 -20 Td`);
        lines.push(`(Date: ${this.escapePDFString(content.date)}) Tj`);
        yPos -= 30;

        // Statistics
        lines.push('/F1 10 Tf');
        lines.push(`0 -30 Td`);
        lines.push(`(Total Stitches: ${content.stats.totalStitches}  |  Rows: ${content.stats.rowCount}) Tj`);
        yPos -= 30;

        // Stitch Legend
        checkPageBreak(100);
        lines.push('/F1 14 Tf');
        lines.push(`0 -30 Td`);
        lines.push(`(Stitch Symbol Legend) Tj`);
        yPos -= 30;

        lines.push('/F1 9 Tf');
        const legendItems = this.getStitchLegend();
        for (const item of legendItems) {
            checkPageBreak();
            lines.push(`0 -${LINE_HEIGHT} Td`);
            lines.push(`(${this.escapePDFString(item)}) Tj`);
            yPos -= LINE_HEIGHT;
        }

        // Instructions header
        checkPageBreak(50);
        lines.push('/F1 14 Tf');
        lines.push(`0 -30 Td`);
        lines.push(`(Instructions) Tj`);
        yPos -= 30;

        // Instructions content
        lines.push('/F1 10 Tf');
        const instructionLines = content.instructions.split('\n');
        for (const line of instructionLines) {
            if (line.trim()) {
                checkPageBreak();
                lines.push(`0 -${LINE_HEIGHT} Td`);
                lines.push(`(${this.escapePDFString(line)}) Tj`);
                yPos -= LINE_HEIGHT;
            }
        }

        // Notes
        if (content.notes) {
            checkPageBreak(50);
            lines.push('/F1 12 Tf');
            lines.push(`0 -30 Td`);
            lines.push(`(Notes:) Tj`);
            yPos -= 30;

            lines.push('/F1 10 Tf');
            const noteLines = content.notes.split('\n');
            for (const noteLine of noteLines) {
                if (noteLine.trim()) {
                    checkPageBreak();
                    lines.push(`0 -${LINE_HEIGHT} Td`);
                    lines.push(`(${this.escapePDFString(noteLine)}) Tj`);
                    yPos -= LINE_HEIGHT;
                }
            }
        }

        // Final page number
        lines.push(`0 -${yPos - 30} Td`);
        lines.push(`(Page ${currentPage}) Tj`);

        lines.push('ET'); // End text

        return lines;
    }

    /**
     * Get stitch legend for PDF export
     * @returns {string[]} Array of legend entries
     */
    getStitchLegend() {
        return [
            'o = Chain (ch)',
            '· = Slip Stitch (sl st)',
            'x = Single Crochet (sc)',
            'T = Half Double Crochet (hdc)',
            '⊥ = Double Crochet (dc)',
            '⊤ = Triple Crochet (tr)',
            'V = Increase (inc)',
            'Λ = Decrease (dec)',
            'O = Magic Ring (mr)',
            'B = Bobble (bob)',
            'P = Popcorn (pc)',
            'U = Puff Stitch (puff)',
            '↓ = Spike Stitch (spike)',
            '⌓ = Shell',
            '⋁ = V-Stitch (v-st)'
        ];
    }

    /**
     * Escape special characters for PDF strings
     * Handles backslashes, parentheses, and control characters
     * @param {string} str - String to escape (will convert non-strings to string)
     * @returns {string} Escaped string safe for PDF
     */
    escapePDFString(str) {
        // Handle null, undefined, or non-string input
        if (str === null || str === undefined) {
            return '';
        }

        // Convert to string if needed
        const safeStr = String(str);

        // Limit string length to prevent PDF issues
        const maxLength = 10000;
        const truncated = safeStr.length > maxLength
            ? safeStr.substring(0, maxLength) + '...'
            : safeStr;

        return truncated
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t');
    }

    /**
     * Generate a safe filename from pattern name
     * @param {string} extension - File extension (json, png, pdf)
     * @param {Object} options
     * @param {boolean} options.includeTimestamp - Add timestamp to filename
     * @returns {string}
     */
    generateFilename(extension, options = {}) {
        const { includeTimestamp = false } = options;

        // Safely access pattern metadata
        let name = this.pattern?.metadata?.name || 'Untitled_Pattern';

        // Sanitize filename - remove special characters
        name = name
            .replace(/[\/\\:*?"<>|]/g, '')
            .replace(/\s+/g, '_')
            .trim();

        if (!name) {
            name = 'Untitled_Pattern';
        }

        if (includeTimestamp) {
            const date = new Date();
            const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
            name = `${name}_${timestamp}`;
        }

        return `${name}.${extension}`;
    }

    /**
     * Trigger file download
     * @param {Blob} blob
     * @param {string} filename
     */
    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Download pattern as JSON file
     * @param {Object} options
     */
    downloadJSON(options = {}) {
        const blob = this.createJSONBlob();
        const filename = this.generateFilename('json', options);
        this.triggerDownload(blob, filename);
    }

    /**
     * Download canvas as PNG file
     * @param {Object} options
     */
    async downloadPNG(options = {}) {
        const blob = await this.exportPNGBlob(options);
        const filename = this.generateFilename('png', options);
        this.triggerDownload(blob, filename);
    }

    /**
     * Download pattern as PDF file
     * @param {Object} options
     */
    async downloadPDF(options = {}) {
        const blob = await this.exportPDF(options);
        const filename = this.generateFilename('pdf', options);
        this.triggerDownload(blob, filename);
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        this.pattern = null;
        this.renderer = null;
    }
}
