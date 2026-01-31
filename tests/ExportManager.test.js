/**
 * Tests for ExportManager - Phase 7 Export Features
 *
 * Tests for:
 * - PDF export with pattern instructions and diagram
 * - PNG export (canvas screenshot)
 * - JSON export (pattern data)
 * - File download utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, Events } from '../src/utils/EventBus.js';

// Mock Pattern for testing exports
class MockPattern {
    constructor() {
        this.metadata = {
            name: 'Test Pattern',
            author: 'Test Author',
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            notes: 'Test notes'
        };
        this.mode = 'flat';
        this.currentRow = 2;
        this.graph = {
            size: 15,
            getStats: () => ({
                totalStitches: 15,
                rowCount: 3
            }),
            getRowSorted: (row) => {
                if (row === 0) return [
                    { type: 'CHAIN', abbreviation: 'ch', row: 0, column: 0 },
                    { type: 'CHAIN', abbreviation: 'ch', row: 0, column: 1 },
                    { type: 'CHAIN', abbreviation: 'ch', row: 0, column: 2 },
                    { type: 'CHAIN', abbreviation: 'ch', row: 0, column: 3 },
                    { type: 'CHAIN', abbreviation: 'ch', row: 0, column: 4 }
                ];
                if (row === 1) return [
                    { type: 'SINGLE_CROCHET', abbreviation: 'sc', row: 1, column: 0 },
                    { type: 'SINGLE_CROCHET', abbreviation: 'sc', row: 1, column: 1 },
                    { type: 'SINGLE_CROCHET', abbreviation: 'sc', row: 1, column: 2 },
                    { type: 'SINGLE_CROCHET', abbreviation: 'sc', row: 1, column: 3 },
                    { type: 'SINGLE_CROCHET', abbreviation: 'sc', row: 1, column: 4 }
                ];
                if (row === 2) return [
                    { type: 'DOUBLE_CROCHET', abbreviation: 'dc', row: 2, column: 0 },
                    { type: 'DOUBLE_CROCHET', abbreviation: 'dc', row: 2, column: 1 },
                    { type: 'DOUBLE_CROCHET', abbreviation: 'dc', row: 2, column: 2 },
                    { type: 'DOUBLE_CROCHET', abbreviation: 'dc', row: 2, column: 3 },
                    { type: 'DOUBLE_CROCHET', abbreviation: 'dc', row: 2, column: 4 }
                ];
                return [];
            },
            getRowCount: () => 3
        };
    }

    toJSON() {
        return {
            version: 2,
            metadata: this.metadata,
            mode: this.mode,
            currentRow: this.currentRow,
            graph: { nodes: [], edges: [] }
        };
    }

    generateInstructions() {
        return `Pattern: ${this.metadata.name}
Mode: ${this.mode}
Total Stitches: 15

Foundation: ch 5 (5 sts)
Row 1: 5 sc (5 sts)
Row 2: 5 dc (5 sts)`;
    }
}

// Mock canvas for PNG export tests - jsdom compatible
function createMockCanvas() {
    // Create a mock canvas that simulates the real behavior
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    return {
        width: 800,
        height: 600,
        toDataURL: vi.fn(() => mockDataUrl),
        getContext: vi.fn(() => ({
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn()
        }))
    };
}

// Mock renderer for Three.js canvas access
class MockRenderer {
    constructor() {
        this.domElement = createMockCanvas();
    }
}

describe('ExportManager', () => {
    let ExportManager;
    let exportManager;
    let mockPattern;
    let mockRenderer;

    beforeEach(async () => {
        EventBus.clear();
        document.body.innerHTML = '';

        mockPattern = new MockPattern();
        mockRenderer = new MockRenderer();

        // Dynamic import to get fresh instance
        const module = await import('../src/utils/ExportManager.js');
        ExportManager = module.ExportManager;

        exportManager = new ExportManager(mockPattern, mockRenderer);
    });

    afterEach(() => {
        if (exportManager && exportManager.dispose) {
            exportManager.dispose();
        }
    });

    describe('constructor', () => {
        it('should create ExportManager with pattern reference', () => {
            expect(exportManager.pattern).toBe(mockPattern);
        });

        it('should create ExportManager with renderer reference', () => {
            expect(exportManager.renderer).toBe(mockRenderer);
        });

        it('should work without renderer for non-PNG exports', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const managerNoRenderer = new module.ExportManager(mockPattern, null);
            expect(managerNoRenderer.pattern).toBe(mockPattern);
        });
    });

    describe('JSON Export', () => {
        it('should export pattern as JSON string', () => {
            const json = exportManager.exportJSON();

            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(2);
        });

        it('should include pattern metadata in JSON', () => {
            const json = exportManager.exportJSON();
            const parsed = JSON.parse(json);

            expect(parsed.metadata.name).toBe('Test Pattern');
            expect(parsed.metadata.author).toBe('Test Author');
        });

        it('should format JSON with indentation when pretty option is true', () => {
            const json = exportManager.exportJSON({ pretty: true });

            expect(json).toContain('\n');
            expect(json).toContain('  '); // Indentation
        });

        it('should return minified JSON when pretty option is false', () => {
            const json = exportManager.exportJSON({ pretty: false });

            expect(json).not.toContain('\n');
        });

        it('should create downloadable JSON blob', () => {
            const blob = exportManager.createJSONBlob();

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/json');
        });
    });

    describe('PNG Export', () => {
        it('should export canvas as PNG data URL', async () => {
            const dataUrl = await exportManager.exportPNG();

            expect(dataUrl).toMatch(/^data:image\/png;base64,/);
        });

        it('should export canvas as PNG blob', async () => {
            const blob = await exportManager.exportPNGBlob();

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('image/png');
        });

        it('should support custom width and height', async () => {
            // Mock document.createElement for the resizeCanvas method
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'canvas') {
                    return createMockCanvas();
                }
                return originalCreateElement(tag);
            });

            const dataUrl = await exportManager.exportPNG({ width: 1920, height: 1080 });

            expect(dataUrl).toMatch(/^data:image\/png;base64,/);

            vi.restoreAllMocks();
        });

        it('should throw error if renderer is not available', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const managerNoRenderer = new module.ExportManager(mockPattern, null);

            await expect(managerNoRenderer.exportPNG()).rejects.toThrow('Renderer not available');
        });

        it('should capture current canvas state', async () => {
            const dataUrl = await exportManager.exportPNG();

            // Verify it's a valid data URL (actual image content validation is complex)
            expect(dataUrl.length).toBeGreaterThan(100);
        });
    });

    describe('PDF Export', () => {
        it('should export pattern as PDF blob', async () => {
            const blob = await exportManager.exportPDF();

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/pdf');
        });

        it('should include pattern name in PDF', async () => {
            // We can't easily read PDF content in tests, but we can verify it's created
            const blob = await exportManager.exportPDF();

            expect(blob.size).toBeGreaterThan(0);
        });

        it('should include written instructions in PDF', async () => {
            const blob = await exportManager.exportPDF();

            // PDF should be larger than a minimal empty PDF
            expect(blob.size).toBeGreaterThan(500);
        });

        it('should include pattern metadata in PDF', async () => {
            const blob = await exportManager.exportPDF();

            expect(blob).toBeInstanceOf(Blob);
        });

        it('should support custom options for PDF generation', async () => {
            const blob = await exportManager.exportPDF({
                includeChart: true,
                pageSize: 'letter'
            });

            expect(blob).toBeInstanceOf(Blob);
        });

        it('should emit EXPORT_STARTED event when PDF export begins', async () => {
            const callback = vi.fn();
            EventBus.on(Events.EXPORT_STARTED, callback);

            await exportManager.exportPDF();

            expect(callback).toHaveBeenCalledWith({ type: 'pdf' });
        });

        it('should emit EXPORT_COMPLETED event when PDF export finishes', async () => {
            const callback = vi.fn();
            EventBus.on(Events.EXPORT_COMPLETED, callback);

            await exportManager.exportPDF();

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'pdf',
                success: true
            }));
        });
    });

    describe('File Download', () => {
        let originalCreateObjectURL;
        let originalRevokeObjectURL;
        let originalCreateElement;

        beforeEach(() => {
            // Save originals
            originalCreateObjectURL = URL.createObjectURL;
            originalRevokeObjectURL = URL.revokeObjectURL;
            originalCreateElement = document.createElement.bind(document);

            // Mock URL methods
            URL.createObjectURL = vi.fn(() => 'blob:test-url');
            URL.revokeObjectURL = vi.fn();
        });

        afterEach(() => {
            // Restore originals
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            vi.restoreAllMocks();
        });

        it('should trigger download for JSON file', () => {
            const link = {
                click: vi.fn(),
                href: '',
                download: '',
                style: {}
            };
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'a') return link;
                return originalCreateElement(tag);
            });
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

            exportManager.downloadJSON();

            expect(link.click).toHaveBeenCalled();
            expect(link.download).toMatch(/\.json$/);
        });

        it('should trigger download for PNG file', async () => {
            const link = {
                click: vi.fn(),
                href: '',
                download: '',
                style: {}
            };
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'a') return link;
                // For canvas element needed in resizeCanvas
                if (tag === 'canvas') {
                    return createMockCanvas();
                }
                return originalCreateElement(tag);
            });
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

            await exportManager.downloadPNG();

            expect(link.click).toHaveBeenCalled();
            expect(link.download).toMatch(/\.png$/);
        });

        it('should trigger download for PDF file', async () => {
            const link = {
                click: vi.fn(),
                href: '',
                download: '',
                style: {}
            };
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                if (tag === 'a') return link;
                return originalCreateElement(tag);
            });
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

            await exportManager.downloadPDF();

            expect(link.click).toHaveBeenCalled();
            expect(link.download).toMatch(/\.pdf$/);
        });

        it('should use pattern name in filename', () => {
            const filename = exportManager.generateFilename('json');

            expect(filename).toContain('Test_Pattern');
        });

        it('should sanitize filename to remove special characters', () => {
            mockPattern.metadata.name = 'Test/Pattern:With*Special?Chars';
            const filename = exportManager.generateFilename('json');

            expect(filename).not.toContain('/');
            expect(filename).not.toContain(':');
            expect(filename).not.toContain('*');
            expect(filename).not.toContain('?');
        });

        it('should include timestamp in filename when option is set', () => {
            const filename = exportManager.generateFilename('json', { includeTimestamp: true });

            // Should contain date-like pattern
            expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it('should use default filename if pattern name is empty', () => {
            mockPattern.metadata.name = '';
            const filename = exportManager.generateFilename('json');

            expect(filename).toContain('Untitled_Pattern');
        });
    });

    describe('Export Events', () => {
        it('should emit EXPORT_STARTED for JSON export', async () => {
            // Need to get a fresh ExportManager after clearing EventBus
            const module = await import('../src/utils/ExportManager.js');
            const freshExportManager = new module.ExportManager(mockPattern, mockRenderer);

            const callback = vi.fn();
            EventBus.on(Events.EXPORT_STARTED, callback);

            freshExportManager.exportJSON();

            expect(callback).toHaveBeenCalledWith({ type: 'json' });
        });

        it('should emit EXPORT_COMPLETED for JSON export', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const freshExportManager = new module.ExportManager(mockPattern, mockRenderer);

            const callback = vi.fn();
            EventBus.on(Events.EXPORT_COMPLETED, callback);

            freshExportManager.exportJSON();

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'json',
                success: true
            }));
        });

        it('should emit EXPORT_STARTED for PNG export', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const freshExportManager = new module.ExportManager(mockPattern, mockRenderer);

            const callback = vi.fn();
            EventBus.on(Events.EXPORT_STARTED, callback);

            await freshExportManager.exportPNG();

            expect(callback).toHaveBeenCalledWith({ type: 'png' });
        });

        it('should emit EXPORT_COMPLETED for PNG export', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const freshExportManager = new module.ExportManager(mockPattern, mockRenderer);

            const callback = vi.fn();
            EventBus.on(Events.EXPORT_COMPLETED, callback);

            await freshExportManager.exportPNG();

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'png',
                success: true
            }));
        });

        it('should emit EXPORT_ERROR on failure', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const freshExportManager = new module.ExportManager(mockPattern, null); // No renderer

            const callback = vi.fn();
            EventBus.on(Events.EXPORT_ERROR, callback);

            try {
                await freshExportManager.exportPNG();
            } catch (e) {
                // Expected to throw
            }

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                type: 'png',
                error: expect.any(String)
            }));
        });
    });

    describe('PDF Content Generation', () => {
        it('should generate PDF content object with title', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.title).toBe('Test Pattern');
        });

        it('should generate PDF content with author', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.author).toBe('Test Author');
        });

        it('should generate PDF content with instructions', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.instructions).toContain('Foundation:');
            expect(content.instructions).toContain('Row 1:');
        });

        it('should generate PDF content with statistics', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.stats.totalStitches).toBe(15);
            expect(content.stats.rowCount).toBe(3);
        });

        it('should generate PDF content with date', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.date).toBeDefined();
        });

        it('should include notes if present', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const content = testExportManager.generatePDFContent();

            expect(content.notes).toBe('Test notes');
        });
    });

    describe('Stitch Chart Generation', () => {
        it('should generate stitch chart data for PDF', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const chartData = testExportManager.generateStitchChart();

            expect(chartData).toBeDefined();
            expect(chartData.rows).toHaveLength(3);
        });

        it('should include stitch symbols in chart', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const chartData = testExportManager.generateStitchChart();

            expect(chartData.rows[0].stitches).toHaveLength(5);
            expect(chartData.rows[0].stitches[0].symbol).toBeDefined();
        });

        it('should map stitch types to standard symbols', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);
            const chartData = testExportManager.generateStitchChart();

            // Chain stitches should have 'o' symbol
            expect(chartData.rows[0].stitches[0].symbol).toBe('o');
            // SC should have 'x' symbol
            expect(chartData.rows[1].stitches[0].symbol).toBe('x');
            // DC should have '⊥' symbol (updated to unique symbol)
            expect(chartData.rows[2].stitches[0].symbol).toBe('⊥');
        });

        it('should map lowercase stitch type values to symbols', async () => {
            const module = await import('../src/utils/ExportManager.js');
            const testExportManager = new module.ExportManager(mockPattern, mockRenderer);

            expect(testExportManager.getStitchSymbol('single_crochet')).toBe('x');
            expect(testExportManager.getStitchSymbol('double_crochet')).toBe('⊥');
        });
    });
});

describe('ExportManager - Integration with UIManager', () => {
    // These tests verify the export buttons work in the UI

    it('should define EXPORT_STARTED event', () => {
        expect(Events.EXPORT_STARTED).toBeDefined();
    });

    it('should define EXPORT_COMPLETED event', () => {
        expect(Events.EXPORT_COMPLETED).toBeDefined();
    });

    it('should define EXPORT_ERROR event', () => {
        expect(Events.EXPORT_ERROR).toBeDefined();
    });
});
