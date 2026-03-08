// ==UserScript==
// @name         Vectorizer.AI SVG Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Intercepts vector data on vectorizer.ai and allows downloading as auto-cropped SVG (with noise filtering)
// @author       Antigravity
// @match        https://vectorizer.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Vectorizer Extractor] Initializing monkey-patches with noise filtering...');

    window.__capturedPaths = [];

    // --- Monkey-patch Path2D ---
    const OrigPath2D = window.Path2D;
    window.Path2D = function(...args) {
        const p = new OrigPath2D(...args);
        p.__commands = [];

        if (args[0] && typeof args[0] === 'string') {
            p.__commands.push({ type: 'svgPath', d: args[0] });
        }

        const origMoveTo = p.moveTo.bind(p);
        p.moveTo = function(x, y) { this.__commands.push({ type: 'M', x, y }); return origMoveTo(x, y); };

        const origLineTo = p.lineTo.bind(p);
        p.lineTo = function(x, y) { this.__commands.push({ type: 'L', x, y }); return origLineTo(x, y); };

        const origBezier = p.bezierCurveTo.bind(p);
        p.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
            this.__commands.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x, y });
            return origBezier(cp1x, cp1y, cp2x, cp2y, x, y);
        };

        const origQuad = p.quadraticCurveTo.bind(p);
        p.quadraticCurveTo = function(cpx, cpy, x, y) {
            this.__commands.push({ type: 'Q', cpx, cpy, x, y });
            return origQuad(cpx, cpy, x, y);
        };

        const origClose = p.closePath.bind(p);
        p.closePath = function() { this.__commands.push({ type: 'Z' }); return origClose(); };

        return p;
    };
    window.Path2D.prototype = OrigPath2D.prototype;

    // --- Monkey-patch Canvas Context ---
    const origFill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function(...args) {
        const path = (args[0] && args[0].__commands) ? args[0] : null;
        const isMainCanvas = this.canvas && (this.canvas.id === 'App-ImageView-RightCanvas' || !this.canvas.id);

        if (isMainCanvas) {
            if (path && path.__commands && path.__commands.length > 0) {
                 window.__capturedPaths.push({
                    fillStyle: this.fillStyle,
                    commands: [...path.__commands]
                });
            } else if (this.__commands && this.__commands.length > 0) {
                 window.__capturedPaths.push({
                    fillStyle: this.fillStyle,
                    commands: [...this.__commands]
                });
            }
        }
        return origFill.apply(this, args);
    };

    const ctxMethods = ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath'];
    ctxMethods.forEach(method => {
        const orig = CanvasRenderingContext2D.prototype[method];
        CanvasRenderingContext2D.prototype[method] = function(...args) {
            if (!this.__commands) this.__commands = [];
            const type = method === 'closePath' ? 'Z' :
                         (method === 'bezierCurveTo' ? 'C' :
                         (method === 'quadraticCurveTo' ? 'Q' :
                         (method === 'moveTo' ? 'M' : 'L')));

            if (type === 'M' || type === 'L') this.__commands.push({ type, x: args[0], y: args[1] });
            else if (type === 'C') this.__commands.push({ type, cp1x: args[0], cp1y: args[1], cp2x: args[2], cp2y: args[3], x: args[4], y: args[5] });
            else if (type === 'Q') this.__commands.push({ type, cpx: args[0], cpy: args[1], x: args[2], y: args[3] });
            else if (type === 'Z') this.__commands.push({ type });

            return orig.apply(this, args);
        };
    });

    const origBeginPath = CanvasRenderingContext2D.prototype.beginPath;
    CanvasRenderingContext2D.prototype.beginPath = function() {
        this.__commands = [];
        return origBeginPath.apply(this, arguments);
    };

    // --- Bounding Box Calculation ---
    function getPathBounds(commands) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasPoints = false;

        commands.forEach(cmd => {
             const points = [];
             if (cmd.x !== undefined) points.push({x: cmd.x, y: cmd.y});
             if (cmd.cpx !== undefined) points.push({x: cmd.cpx, y: cmd.cpy});
             if (cmd.cp1x !== undefined) points.push({x: cmd.cp1x, y: cmd.cp1y});
             if (cmd.cp2x !== undefined) points.push({x: cmd.cp2x, y: cmd.cp2y});

             points.forEach(pt => {
                 hasPoints = true;
                 if (pt.x < minX) minX = pt.x;
                 if (pt.x > maxX) maxX = pt.x;
                 if (pt.y < minY) minY = pt.y;
                 if (pt.y > maxY) maxY = pt.y;
             });
        });

        if (!hasPoints) return null;
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }

    function calculateGlobalBoundingBox(paths) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let validPathCount = 0;

        paths.forEach(p => {
             const bounds = getPathBounds(p.commands);
             if (!bounds) return;

             // FILTER: Ignore tiny noise paths (e.g. single points or sub-pixel artifacts)
             // If a path is less than 1x1 pixel, we assume it's noise
             if (bounds.width < 1 && bounds.height < 1) {
                 console.log('[Vectorizer Extractor] Ignoring noise path:', bounds);
                 return;
             }

             if (bounds.minX < minX) minX = bounds.minX;
             if (bounds.maxX > maxX) maxX = bounds.maxX;
             if (bounds.minY < minY) minY = bounds.minY;
             if (bounds.maxY > maxY) maxY = bounds.maxY;
             validPathCount++;
        });

        if (validPathCount === 0) return null;
        return { minX, minY, maxX, maxY };
    }


    // --- UI Helper ---
    function addDownloadButton() {
        const btn = document.createElement('button');
        btn.innerText = 'Extract SVG';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = 99999;
        btn.style.padding = '10px 20px';
        btn.style.background = '#4CAF50';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.borderRadius = '5px';
        btn.onclick = generateAndDownloadSVG;
        document.body.appendChild(btn);
    }

    function generateAndDownloadSVG() {
        const paths = window.__capturedPaths;
        if (!paths || paths.length === 0) {
            alert('No paths captured! Try zooming in/out to trigger a redraw.');
            return;
        }

        // 1. Calculate Dimensions & ViewBox FIRST (to filter content)
        const bbox = calculateGlobalBoundingBox(paths);
        
        // 2. Generate Content
        let svgContent = '';
        const uniquePaths = new Set();

        paths.forEach(p => {
            // Apply the same filter logic so we don't even write the noise paths
            const bounds = getPathBounds(p.commands);
            if (bounds && bounds.width < 1 && bounds.height < 1) return;

            let d = '';
            p.commands.forEach(cmd => {
                switch (cmd.type) {
                    case 'M': d += `M${cmd.x},${cmd.y} `; break;
                    case 'L': d += `L${cmd.x},${cmd.y} `; break;
                    case 'C': d += `C${cmd.cp1x},${cmd.cp1y} ${cmd.cp2x},${cmd.cp2y} ${cmd.x},${cmd.y} `; break;
                    case 'Q': d += `Q${cmd.cpx},${cmd.cpy} ${cmd.x},${cmd.y} `; break;
                    case 'Z': d += 'Z '; break;
                    case 'svgPath': d += cmd.d + ' '; break;
                }
            });
            d = d.trim();
            const key = d + p.fillStyle;

            if (d.length > 0 && !uniquePaths.has(key)) {
                svgContent += `  <path d="${d}" fill="${p.fillStyle}" />\n`;
                uniquePaths.add(key);
            }
        });

        let viewBox = '';
        let width = 2400;
        let height = 3072;

        if (bbox) {
            const padding = 20;
            const x = Math.floor(bbox.minX - padding);
            const y = Math.floor(bbox.minY - padding);
            const w = Math.ceil(bbox.maxX - bbox.minX + (padding * 2));
            const h = Math.ceil(bbox.maxY - bbox.minY + (padding * 2));
            viewBox = `${x} ${y} ${w} ${h}`;
            width = w;
            height = h;
            console.log(`[Vectorizer Extractor] Auto-cropped to: ${viewBox}`);
        } else {
            const canvas = document.getElementById('App-ImageView-RightCanvas');
            width = canvas ? canvas.width : 2400;
            height = canvas ? canvas.height : 3072;
            viewBox = `0 0 ${width} ${height}`;
        }

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
${svgContent}</svg>`;

        const blob = new Blob([svg], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vectorizer_extracted_cropped.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.addEventListener('load', addDownloadButton);

})();
