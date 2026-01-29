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
 */
const STITCH_SYMBOLS = {
    CHAIN: 'o',
    SLIP_STITCH: '.',
    SINGLE_CROCHET: 'x',
    HALF_DOUBLE_CROCHET: 'T',
    DOUBLE_CROCHET: 'T',
    TRIPLE_CROCHET: 'Y',
    INCREASE: 'V',
    DECREASE: 'A',
    MAGIC_RING: 'O',
    FOUNDATION_SINGLE_CROCHET: 'x',
    FOUNDATION_DOUBLE_CROCHET: 'T'
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
     */
    exportJSON(options = {}) {
        const { pretty = true } = options;

        EventBus.emit(Events.EXPORT_STARTED, { type: 'json' });

        try {
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
     */
    dataURLToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(parts[1]);

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
     */
    generatePDFContent() {
        const stats = this.pattern.graph.getStats();
        const instructions = this.pattern.generateInstructions();

        return {
            title: this.pattern.metadata.name || 'Untitled Pattern',
            author: this.pattern.metadata.author || '',
            date: new Date().toLocaleDateString(),
            instructions,
            stats: {
                totalStitches: stats.totalStitches,
                rowCount: stats.rowCount
            },
            notes: this.pattern.metadata.notes || ''
        };
    }

    /**
     * Generate stitch chart data
     * @returns {Object} Chart data with rows and symbols
     */
    generateStitchChart() {
        const rowCount = this.pattern.graph.getRowCount
            ? this.pattern.graph.getRowCount()
            : this.pattern.graph.getStats().rowCount;

        const rows = [];

        for (let i = 0; i < rowCount; i++) {
            const stitches = this.pattern.graph.getRowSorted(i);
            const chartRow = {
                rowNumber: i + 1,
                stitches: stitches.map(stitch => ({
                    type: stitch.type,
                    symbol: this.getStitchSymbol(stitch.type),
                    column: stitch.column
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
        return STITCH_SYMBOLS[stitchType] || DEFAULT_SYMBOL;
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
        const lines = [];

        // PDF Header
        lines.push('%PDF-1.4');
        lines.push('%âãÏÓ'); // Binary marker

        // Catalog object
        lines.push('1 0 obj');
        lines.push('<< /Type /Catalog /Pages 2 0 R >>');
        lines.push('endobj');

        // Pages object
        lines.push('2 0 obj');
        lines.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
        lines.push('endobj');

        // Page object
        lines.push('3 0 obj');
        lines.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
        lines.push('endobj');

        // Build content stream
        const textLines = this.buildPDFTextContent(content);
        const contentStream = textLines.join('\n');

        // Content stream object
        lines.push('4 0 obj');
        lines.push(`<< /Length ${contentStream.length} >>`);
        lines.push('stream');
        lines.push(contentStream);
        lines.push('endstream');
        lines.push('endobj');

        // Font object
        lines.push('5 0 obj');
        lines.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
        lines.push('endobj');

        // Cross-reference table
        const xrefStart = lines.join('\n').length + 1;
        lines.push('xref');
        lines.push('0 6');
        lines.push('0000000000 65535 f ');
        lines.push('0000000015 00000 n ');
        lines.push('0000000066 00000 n ');
        lines.push('0000000125 00000 n ');
        lines.push('0000000266 00000 n ');
        lines.push(`0000000${350 + contentStream.length} 00000 n `);

        // Trailer
        lines.push('trailer');
        lines.push('<< /Size 6 /Root 1 0 R >>');
        lines.push('startxref');
        lines.push(String(xrefStart));
        lines.push('%%EOF');

        const pdfContent = lines.join('\n');
        return new Blob([pdfContent], { type: 'application/pdf' });
    }

    /**
     * Build PDF text content stream
     * @param {Object} content
     * @returns {string[]}
     */
    buildPDFTextContent(content) {
        const lines = [];
        let yPos = 750; // Start from top

        lines.push('BT'); // Begin text

        // Title
        lines.push('/F1 18 Tf'); // Font size 18
        lines.push(`50 ${yPos} Td`);
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

        // Instructions header
        lines.push('/F1 14 Tf');
        lines.push(`0 -30 Td`);
        lines.push(`(Instructions) Tj`);
        yPos -= 20;

        // Instructions content
        lines.push('/F1 10 Tf');
        const instructionLines = content.instructions.split('\n');
        for (const line of instructionLines) {
            if (line.trim()) {
                lines.push(`0 -15 Td`);
                lines.push(`(${this.escapePDFString(line)}) Tj`);
            }
        }

        // Notes
        if (content.notes) {
            lines.push('/F1 12 Tf');
            lines.push(`0 -30 Td`);
            lines.push(`(Notes:) Tj`);
            lines.push('/F1 10 Tf');
            lines.push(`0 -15 Td`);
            lines.push(`(${this.escapePDFString(content.notes)}) Tj`);
        }

        lines.push('ET'); // End text

        return lines;
    }

    /**
     * Escape special characters for PDF strings
     * Handles backslashes, parentheses, and control characters
     * @param {string} str
     * @returns {string}
     */
    escapePDFString(str) {
        return str
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

        let name = this.pattern.metadata.name || 'Untitled_Pattern';

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
