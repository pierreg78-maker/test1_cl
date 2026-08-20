document.addEventListener('DOMContentLoaded', function () {

    /* ============================================================
       ÉTAT PARTAGÉ (rempli une fois le PDF choisi)
       ============================================================ */
    var sharedImages = [];   // dataURL PNG par page (haute résolution)
    var sharedDims = [];     // {w,h} en px réels par page
    var sharedWidth = 500;
    var sharedHeight = 700;

    /* ============================================================
       CHARGEMENT DU PDF (commun aux deux fonctionnalités)
       ============================================================ */
    var fileInput = document.getElementById('pdf-file-input');
    var loadingMessage = document.getElementById('loading-message');
    var generateBtn = document.getElementById('generate-flipbook-btn');
    var shapesBtn = document.getElementById('shapes-btn');

    fileInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            alert('Veuillez sélectionner un fichier PDF valide.');
            return;
        }

        loadingMessage.classList.remove('hidden');
        generateBtn.classList.add('hidden');
        shapesBtn.classList.add('hidden');
        document.getElementById('nav-container').classList.add('hidden');
        document.getElementById('flipbook-container').classList.add('hidden');

        var fileReader = new FileReader();
        fileReader.onload = async function () {
            var typedarray = new Uint8Array(this.result);
            try {
                var pdf = await pdfjsLib.getDocument(typedarray).promise;
                var images = [];
                var dims = [];
                var baseWidth = 800, baseHeight = 600;

                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var scale = 2.5;
                    var viewport = page.getViewport({ scale: scale });

                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    if (i === 1) { baseWidth = viewport.width; baseHeight = viewport.height; }

                    images.push(canvas.toDataURL('image/png'));
                    dims.push({ w: viewport.width, h: viewport.height });
                }

                sharedImages = images;
                sharedDims = dims;
                sharedWidth = Math.min(baseWidth, 500);
                sharedHeight = Math.min(baseHeight, 700);

                generateBtn.classList.remove('hidden');
                shapesBtn.classList.remove('hidden');

            } catch (error) {
                console.error('Erreur lors du traitement du PDF :', error);
                alert('Une erreur est survenue lors de la lecture du PDF.');
            } finally {
                loadingMessage.classList.add('hidden');
            }
        };
        fileReader.readAsArrayBuffer(file);
    });

    /* ============================================================
       FONCTIONNALITÉ 1 — GÉNÉRER LE FLIPBOOK (inchangé dans le fond)
       ============================================================ */
    var bookEl = document.getElementById('book');
    var navContainer = document.getElementById('nav-container');
    var flipbookContainer = document.getElementById('flipbook-container');
    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var downloadBtn = document.getElementById('download-btn');
    var pageIndicator = document.getElementById('page-indicator');

    var pageFlip = null;

    generateBtn.addEventListener('click', function () {
        if (!sharedImages.length) return;

        if (pageFlip) {
            pageFlip.destroy();
            bookEl.innerHTML = '';
        }

        pageFlip = createBook(bookEl, sharedImages, sharedWidth, sharedHeight, pageIndicator);

        flipbookContainer.classList.remove('hidden');
        navContainer.classList.remove('hidden');
    });

    prevBtn.addEventListener('click', function () { if (pageFlip) pageFlip.flipPrev(); });
    nextBtn.addEventListener('click', function () { if (pageFlip) pageFlip.flipNext(); });

    downloadBtn.addEventListener('click', function () {
        if (!sharedImages.length) return;
        exportFlipbook(sharedImages, sharedWidth, sharedHeight);
    });

    function createBook(container, images, width, height, indicator) {
        var flip = new St.PageFlip(container, {
            width: width, height: height, size: 'stretch',
            minWidth: 300, maxWidth: 1000, minHeight: 400, maxHeight: 1400,
            showCover: true, drawShadow: true, flippingTime: 700,
            maxShadowOpacity: 0.5, mobileScrollSupport: false
        });

        flip.loadFromImages(images);

        function updateIndicator() {
            var current = flip.getCurrentPageIndex() + 1;
            var total = flip.getPageCount();
            indicator.textContent = current + ' / ' + total;
        }

        flip.on('flip', updateIndicator);
        updateIndicator();

        return flip;
    }

    function exportFlipbook(images, width, height) {
        var libSource = document.getElementById('pageflip-lib').textContent;

        var styleBlock = "\n" +
            "body, html { margin:0; padding:0; width:100%; height:100%; background:#f0f0f0;\n" +
            "    display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; }\n" +
            "#flipbook-container { width:90vw; max-width:800px; height:85vh; max-height:850px;\n" +
            "    background:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center; }\n" +
            "#book { width:100%; height:100%; }\n" +
            "#nav-container { margin-top:20px; display:flex; align-items:center; gap:20px; }\n" +
            ".nav-btn { background:#007bff; color:#fff; border:none; width:50px; height:50px; border-radius:50%;\n" +
            "    font-size:20px; cursor:pointer; }\n" +
            ".nav-btn:hover { background:#0056b3; }\n" +
            "#page-indicator { font-weight:bold; min-width:60px; text-align:center; }\n";

        var appScript = "\n" +
            "const images = " + JSON.stringify(images) + ";\n" +
            "const container = document.getElementById('book');\n" +
            "const flip = new St.PageFlip(container, {\n" +
            "    width: " + width + ", height: " + height + ", size: 'stretch',\n" +
            "    minWidth: 300, maxWidth: 1000, minHeight: 400, maxHeight: 1400,\n" +
            "    showCover: true, drawShadow: true, flippingTime: 700,\n" +
            "    maxShadowOpacity: 0.5, mobileScrollSupport: false\n" +
            "});\n" +
            "flip.loadFromImages(images);\n" +
            "const indicator = document.getElementById('page-indicator');\n" +
            "function updateIndicator() {\n" +
            "    indicator.textContent = (flip.getCurrentPageIndex() + 1) + ' / ' + flip.getPageCount();\n" +
            "}\n" +
            "flip.on('flip', updateIndicator);\n" +
            "updateIndicator();\n" +
            "document.getElementById('prev-btn').addEventListener('click', () => flip.flipPrev());\n" +
            "document.getElementById('next-btn').addEventListener('click', () => flip.flipNext());\n";

        var html = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
            '<title>Mon Flipbook</title>\n<link rel="icon" href="data:,">\n' +
            '<style>' + styleBlock + '</style>\n' +
            '<script id="pageflip-lib">' + libSource + '<\/script>\n</head>\n<body>\n' +
            '<div id="flipbook-container"><div id="book"></div></div>\n' +
            '<div id="nav-container">\n' +
            '<button id="prev-btn" class="nav-btn" aria-label="Page précédente">&#10094;</button>\n' +
            '<span id="page-indicator">- / -</span>\n' +
            '<button id="next-btn" class="nav-btn" aria-label="Page suivante">&#10095;</button>\n' +
            '</div>\n' +
            '<script>' + appScript + '<\/script>\n</body>\n</html>';

        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'flipbook.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ============================================================
       FONCTIONNALITÉ 2 — AJOUTER DES FORMES / TEXTE (indépendant)
       ============================================================ */

    var SHAPES = [
        { n: 'Cercle', k: 'circle' }, { n: 'Carré', k: 'square' }, { n: 'Triangle', k: 'triangle' },
        { n: 'Hexagone', k: 'hexagon' }, { n: 'Étoile', k: 'star' }, { n: 'Flèche', k: 'arrow' }
    ];
    var SHAPE_C = ['#ffffff', '#000000', '#9aa0a6', '#f2c230', '#e63950', '#2ecc71', '#2980b9', '#8e44ad'];
    var SHAPE_PATHS = {
        circle: '<circle cx="50" cy="50" r="46"/>',
        square: '<rect x="6" y="6" width="88" height="88" rx="8"/>',
        triangle: '<polygon points="50,6 96,90 4,90"/>',
        hexagon: '<polygon points="27,6 73,6 96,50 73,94 27,94 4,50"/>',
        star: '<polygon points="50,4 61,37 96,37 68,58 79,92 50,71 21,92 32,58 4,37 39,37"/>',
        arrow: '<polygon points="4,66 4,42 60,42 60,20 96,54 60,88 60,66"/>'
    };
    var SHAPE_PTS = {
        square: [[6, 6], [94, 6], [94, 94], [6, 94]],
        triangle: [[50, 6], [96, 90], [4, 90]],
        hexagon: [[27, 6], [73, 6], [96, 50], [73, 94], [27, 94], [4, 50]],
        star: [[50, 4], [61, 37], [96, 37], [68, 58], [79, 92], [50, 71], [21, 92], [32, 58], [4, 37], [39, 37]],
        arrow: [[4, 66], [4, 42], [60, 42], [60, 20], [96, 54], [60, 88], [60, 66]]
    };

    var FONTS = [
        { n: 'Sans-serif', v: "'Poppins',sans-serif" },
        { n: 'Élégante', v: "'Playfair Display',serif" },
        { n: 'Manuscrite', v: "'Dancing Script',cursive" },
        { n: 'Fluide', v: "'Sacramento',cursive" },
        { n: 'Ronde', v: "'Quicksand',sans-serif" },
        { n: 'Amicale', v: "'Caveat',cursive" },
        { n: 'Affiche', v: "'Oswald',sans-serif" },
        { n: 'Grand titre', v: "'Bebas Neue',sans-serif" },
        { n: 'Classique', v: "Georgia,serif" },
        { n: 'Machine à écrire', v: "'Courier New',monospace" }
    ];
    var TX_C = ['#000000', '#ffffff', '#e63950', '#f2c230', '#2ecc71', '#2980b9', '#8e44ad', '#e67e22'];
    var SIZES = [{ n: 'Petit', v: 16 }, { n: 'Moyen', v: 26 }, { n: 'Grand', v: 40 }, { n: 'Très grand', v: 60 }];

    var seImages = [];
    var seDims = [];
    var sePageEls = [];      // tableau (par page) de tableaux d'éléments {type, ...}
    var seCurPage = 0;
    var seShColor = SHAPE_C[1];
    var seTxColor = TX_C[0];
    var seTxFont = FONTS[0].v;
    var seTxSize = SIZES[1].v;
    var seSelId = null;
    var seDrag = null;
    var seIdCounter = 0;
    var seEditId = null;

    var shapeEditor = document.getElementById('shape-editor');
    var seBack = document.getElementById('se-back');
    var seDownload = document.getElementById('se-download');
    var sePageImg = document.getElementById('se-page-img');
    var seLayer = document.getElementById('se-shapes-layer');
    var sePageWrap = document.getElementById('se-page-wrap');
    var sePageIndicator = document.getElementById('se-page-indicator');
    var sePrev = document.getElementById('se-prev');
    var seNext = document.getElementById('se-next');
    var seFbar = document.getElementById('se-fbar');
    var seLoadingMessage = document.getElementById('se-loading-message');
    var seEditModal = document.getElementById('se-edit-modal');
    var seEditInput = document.getElementById('se-edit-input');

    shapesBtn.addEventListener('click', function () {
        if (!sharedImages.length) return;
        seImages = sharedImages;
        seDims = sharedDims;
        sePageEls = seImages.map(function () { return []; });
        seCurPage = 0;
        openShapeEditor();
    });

    function openShapeEditor() {
        document.getElementById('upload-container').classList.add('hidden');
        flipbookContainer.classList.add('hidden');
        navContainer.classList.add('hidden');
        shapeEditor.classList.remove('hidden');
        buildShapePanel();
        buildTextPanel();
        showSePage(0);
    }

    function closeShapeEditor() {
        shapeEditor.classList.add('hidden');
        document.getElementById('upload-container').classList.remove('hidden');
        seDesel();
    }
    seBack.addEventListener('click', closeShapeEditor);

    /* --- Onglets Formes / Texte --- */
    var seTabs = document.querySelectorAll('.se-tab');
    for (var ti = 0; ti < seTabs.length; ti++) {
        seTabs[ti].addEventListener('click', function () {
            for (var tj = 0; tj < seTabs.length; tj++) seTabs[tj].classList.remove('on');
            this.classList.add('on');
            var t = this.getAttribute('data-t');
            document.getElementById('se-tc-sh').style.display = (t === 'sh') ? '' : 'none';
            document.getElementById('se-tc-tx').style.display = (t === 'tx') ? '' : 'none';
        });
    }

    /* --- Navigation pages --- */
    function showSePage(idx) {
        if (idx < 0 || idx >= seImages.length) return;
        seCurPage = idx;
        sePageImg.src = seImages[idx];
        sePageIndicator.textContent = (idx + 1) + ' / ' + seImages.length;
        sePrev.disabled = (idx === 0);
        seNext.disabled = (idx === seImages.length - 1);
        seDesel();
        // On attend que l'image ait pris sa taille avant de replacer les éléments
        if (sePageImg.complete) { renderSeLayer(); }
        else { sePageImg.onload = renderSeLayer; }
    }
    sePrev.addEventListener('click', function () { showSePage(seCurPage - 1); });
    seNext.addEventListener('click', function () { showSePage(seCurPage + 1); });

    window.addEventListener('resize', function () { renderSeLayer(); });

    /* --- Formes : construction du panneau --- */
    function shapeSVG(k, color, size) {
        return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" style="display:block;pointer-events:none"><g fill="' + color + '">' + SHAPE_PATHS[k] + '</g></svg>';
    }

    function buildShapePanel() {
        var grid = document.getElementById('se-shape-grid');
        var html = '';
        for (var i = 0; i < SHAPES.length; i++) {
            html += '<button class="se-shb" data-i="' + i + '" title="' + SHAPES[i].n + '">' + shapeSVG(SHAPES[i].k, seShColor, 28) + '</button>';
        }
        grid.innerHTML = html;
        var btns = grid.querySelectorAll('.se-shb');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', (function (idx) { return function () { addShape(idx); }; })(j));
        }

        var row = document.getElementById('se-shape-color-row');
        var h2 = '';
        for (var k = 0; k < SHAPE_C.length; k++) {
            var c = SHAPE_C[k];
            h2 += '<div class="se-cs' + (c === seShColor ? ' on' : '') + '" style="background:' + c + '" data-hex="' + c + '"></div>';
        }
        h2 += '<button class="se-cc" id="se-shape-custom-color">&#9998;</button>';
        row.innerHTML = h2;
        var swatches = row.querySelectorAll('.se-cs');
        for (var m = 0; m < swatches.length; m++) {
            swatches[m].addEventListener('click', function () { setShColor(this.getAttribute('data-hex')); });
        }
        document.getElementById('se-shape-custom-color').addEventListener('click', function () {
            document.getElementById('se-shape-color-picker').click();
        });
    }
    document.getElementById('se-shape-color-picker').addEventListener('input', function (e) { setShColor(e.target.value); });

    function setShColor(c) { seShColor = c; buildShapePanel(); }

    function addShape(i) {
        var s = SHAPES[i];
        var wrap = sePageWrap;
        var sizeFrac = 0.16;
        var sizePx = sizeFrac * wrap.offsetWidth;
        var el = {
            id: 's' + (seIdCounter++), type: 'shape', shape: s.k, clr: seShColor,
            xFrac: ((wrap.offsetWidth - sizePx) / 2) / wrap.offsetWidth,
            yFrac: ((wrap.offsetHeight - sizePx) / 2) / wrap.offsetHeight,
            sc: 1, rot: 0, sizeFrac: sizeFrac
        };
        sePageEls[seCurPage].push(el);
        mkDom(el);
        seSel(el.id);
    }

    /* --- Texte : construction du panneau --- */
    function buildTextPanel() {
        var list = document.getElementById('se-font-list');
        var h = '';
        for (var i = 0; i < FONTS.length; i++) {
            h += '<button class="se-fontb' + (FONTS[i].v === seTxFont ? ' on' : '') + '" data-i="' + i + '" style="font-family:' + FONTS[i].v + '">' + FONTS[i].n + '</button>';
        }
        list.innerHTML = h;
        var fbtns = list.querySelectorAll('.se-fontb');
        for (var j = 0; j < fbtns.length; j++) {
            fbtns[j].addEventListener('click', (function (idx) { return function () { seTxFont = FONTS[idx].v; buildTextPanel(); }; })(j));
        }

        var szRow = document.getElementById('se-size-row');
        var h3 = '';
        for (var k = 0; k < SIZES.length; k++) {
            h3 += '<button class="se-szb' + (SIZES[k].v === seTxSize ? ' on' : '') + '" data-i="' + k + '">' + SIZES[k].n + '</button>';
        }
        szRow.innerHTML = h3;
        var sbtns = szRow.querySelectorAll('.se-szb');
        for (var m = 0; m < sbtns.length; m++) {
            sbtns[m].addEventListener('click', (function (idx) { return function () { seTxSize = SIZES[idx].v; buildTextPanel(); }; })(m));
        }

        var crow = document.getElementById('se-text-color-row');
        var h2 = '';
        for (var n = 0; n < TX_C.length; n++) {
            var c = TX_C[n];
            h2 += '<div class="se-cs' + (c === seTxColor ? ' on' : '') + '" style="background:' + c + '" data-hex="' + c + '"></div>';
        }
        h2 += '<button class="se-cc" id="se-text-custom-color">&#9998;</button>';
        crow.innerHTML = h2;
        var swatches = crow.querySelectorAll('.se-cs');
        for (var p = 0; p < swatches.length; p++) {
            swatches[p].addEventListener('click', function () { seTxColor = this.getAttribute('data-hex'); buildTextPanel(); });
        }
        document.getElementById('se-text-custom-color').addEventListener('click', function () {
            document.getElementById('se-text-color-picker').click();
        });
    }
    document.getElementById('se-text-color-picker').addEventListener('input', function (e) { seTxColor = e.target.value; buildTextPanel(); });

    document.getElementById('se-add-tx-btn').addEventListener('click', function () {
        var input = document.getElementById('se-tx-input');
        var txt = input.value.trim();
        if (!txt) { alert('Écrivez un texte d\'abord.'); return; }
        addText(txt);
        input.value = '';
    });

    function addText(txt) {
        var wrap = sePageWrap;
        var fsFrac = seTxSize / wrap.offsetWidth;
        var el = {
            id: 's' + (seIdCounter++), type: 'text', text: txt, clr: seTxColor, font: seTxFont,
            fsFrac: fsFrac, xFrac: 0.28, yFrac: 0.44, sc: 1, rot: 0
        };
        sePageEls[seCurPage].push(el);
        mkDom(el);
        seSel(el.id);
    }

    /* --- Rendu des éléments sur la page courante --- */
    function renderSeLayer() {
        seLayer.innerHTML = '';
        var arr = sePageEls[seCurPage];
        if (!arr) return;
        for (var i = 0; i < arr.length; i++) mkDom(arr[i]);
    }

    function mkDom(el) {
        var wrap = sePageWrap;
        var div = document.createElement('div');
        div.className = 'se-el';
        div.id = 'sd-' + el.id;
        div.setAttribute('data-id', el.id);
        div.style.left = (el.xFrac * wrap.offsetWidth) + 'px';
        div.style.top = (el.yFrac * wrap.offsetHeight) + 'px';
        div.style.transform = 'rotate(' + el.rot + 'deg) scale(' + el.sc + ')';

        if (el.type === 'shape') {
            var sizePx = el.sizeFrac * wrap.offsetWidth;
            div.innerHTML = shapeSVG(el.shape, el.clr, sizePx);
            div.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,.35))';
        } else {
            var span = document.createElement('span');
            span.className = 'se-text-inner';
            span.style.color = el.clr;
            span.style.fontFamily = el.font;
            span.style.fontSize = (el.fsFrac * wrap.offsetWidth) + 'px';
            span.textContent = el.text;
            div.appendChild(span);
        }

        div.addEventListener('mousedown', function (e) { seStartDrag(e, el.id); });
        div.addEventListener('touchstart', function (e) { seStartDrag(e, el.id); }, { passive: false });
        div.addEventListener('dblclick', function () { if (el.type === 'text') openSeEdit(el.id); });

        var lastTap = 0;
        div.addEventListener('touchend', function () {
            var now = Date.now();
            if (el.type === 'text' && now - lastTap < 400 && (!seDrag || !seDrag.moved)) { openSeEdit(el.id); }
            lastTap = now;
        });

        seLayer.appendChild(div);
    }

    function seFindEl(id) {
        var arr = sePageEls[seCurPage];
        for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
        return null;
    }

    /* --- Sélection --- */
    function seSel(id) {
        seSelId = id;
        var doms = seLayer.querySelectorAll('.se-el');
        for (var i = 0; i < doms.length; i++) doms[i].classList.toggle('sel', doms[i].getAttribute('data-id') === id);
        seFbar.classList.add('show');
    }
    function seDesel() {
        seSelId = null;
        var doms = seLayer.querySelectorAll('.se-el');
        for (var i = 0; i < doms.length; i++) doms[i].classList.remove('sel');
        seFbar.classList.remove('show');
    }
    seLayer.addEventListener('click', function (e) { if (e.target === this) seDesel(); });

    /* --- Glisser-déposer --- */
    function seStartDrag(e, id) {
        e.preventDefault(); e.stopPropagation();
        seSel(id);
        var el = seFindEl(id); if (!el) return;
        var cx, cy;
        if (e.touches && e.touches.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        var wrap = sePageWrap;
        seDrag = {
            id: id, sx: cx, sy: cy,
            ox: el.xFrac * wrap.offsetWidth, oy: el.yFrac * wrap.offsetHeight,
            moved: false
        };
    }
    function seOnMove(e) {
        if (!seDrag) return;
        e.preventDefault();
        var cx, cy;
        if (e.touches && e.touches.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        var dx = cx - seDrag.sx, dy = cy - seDrag.sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) seDrag.moved = true;
        var el = seFindEl(seDrag.id); if (!el) return;
        var wrap = sePageWrap;
        var nx = Math.max(-40, Math.min(wrap.offsetWidth - 10, seDrag.ox + dx));
        var ny = Math.max(-40, Math.min(wrap.offsetHeight - 10, seDrag.oy + dy));
        el.xFrac = nx / wrap.offsetWidth;
        el.yFrac = ny / wrap.offsetHeight;
        var dom = document.getElementById('sd-' + el.id);
        if (dom) { dom.style.left = nx + 'px'; dom.style.top = ny + 'px'; }
    }
    function seOnUp() { seDrag = null; }
    document.addEventListener('mousemove', seOnMove);
    document.addEventListener('mouseup', seOnUp);
    document.addEventListener('touchmove', seOnMove, { passive: false });
    document.addEventListener('touchend', seOnUp);
    document.addEventListener('touchcancel', seOnUp);

    /* --- Barre flottante : agrandir / réduire / tourner / supprimer --- */
    document.getElementById('se-scale-up').addEventListener('click', function () { seScale(1.2); });
    document.getElementById('se-scale-down').addEventListener('click', function () { seScale(0.83); });
    document.getElementById('se-rotate').addEventListener('click', function () { seRotate(15); });
    document.getElementById('se-delete').addEventListener('click', function () { seDeleteSelected(); });

    function seScale(f) {
        var el = seFindEl(seSelId); if (!el) return;
        el.sc = Math.max(0.3, Math.min(4, el.sc * f));
        var dom = document.getElementById('sd-' + el.id);
        if (dom) dom.style.transform = 'rotate(' + el.rot + 'deg) scale(' + el.sc + ')';
    }
    function seRotate(d) {
        var el = seFindEl(seSelId); if (!el) return;
        el.rot = (el.rot + d) % 360;
        var dom = document.getElementById('sd-' + el.id);
        if (dom) dom.style.transform = 'rotate(' + el.rot + 'deg) scale(' + el.sc + ')';
    }
    function seDeleteSelected() {
        if (!seSelId) return;
        var dom = document.getElementById('sd-' + seSelId);
        if (dom) dom.remove();
        sePageEls[seCurPage] = sePageEls[seCurPage].filter(function (e) { return e.id !== seSelId; });
        seDesel();
    }

    document.addEventListener('keydown', function (e) {
        if (shapeEditor.classList.contains('hidden')) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && seSelId && document.activeElement.tagName !== 'INPUT') {
            seDeleteSelected(); e.preventDefault();
        }
        if (e.key === 'Escape') { seDesel(); closeSeEdit(); }
    });

    /* --- Édition du contenu d'un texte (double-tap / double-clic) --- */
    function openSeEdit(id) {
        var el = seFindEl(id); if (!el) return;
        seEditId = id;
        seEditInput.value = el.text || '';
        seEditModal.classList.add('show');
        setTimeout(function () { seEditInput.focus(); seEditInput.select(); }, 100);
    }
    function closeSeEdit() { seEditModal.classList.remove('show'); seEditId = null; }
    function confirmSeEdit() {
        var el = seFindEl(seEditId); if (!el) { closeSeEdit(); return; }
        el.text = seEditInput.value;
        var dom = document.getElementById('sd-' + el.id);
        if (dom) { var sp = dom.querySelector('.se-text-inner'); if (sp) sp.textContent = el.text; }
        closeSeEdit();
    }
    document.getElementById('se-edit-ok').addEventListener('click', confirmSeEdit);
    document.getElementById('se-edit-cancel').addEventListener('click', closeSeEdit);
    seEditInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmSeEdit(); });
    seEditModal.addEventListener('click', function (e) { if (e.target === this) closeSeEdit(); });

    /* ============================================================
       EXPORT — fusionne formes + texte dans chaque page et génère un PDF
       ============================================================ */
    function drawShapeOnCtx(ctx, k, color, size) {
        var s = size / 100;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (k === 'circle') {
            ctx.arc(0, 0, 46 * s, 0, Math.PI * 2);
        } else {
            var pts = SHAPE_PTS[k];
            for (var i = 0; i < pts.length; i++) {
                var px = (pts[i][0] - 50) * s, py = (pts[i][1] - 50) * s;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.fill();
    }

    function bakePageCanvas(idx) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                var dims = seDims[idx];
                var canvas = document.createElement('canvas');
                canvas.width = dims.w; canvas.height = dims.h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, dims.w, dims.h);

                var arr = sePageEls[idx];
                for (var i = 0; i < arr.length; i++) {
                    var el = arr[i];
                    ctx.save();
                    if (el.type === 'shape') {
                        var sizePx = el.sizeFrac * dims.w;
                        var cx = el.xFrac * dims.w + sizePx / 2;
                        var cy = el.yFrac * dims.h + sizePx / 2;
                        ctx.translate(cx, cy);
                        ctx.rotate(el.rot * Math.PI / 180);
                        ctx.scale(el.sc, el.sc);
                        drawShapeOnCtx(ctx, el.shape, el.clr, sizePx);
                    } else {
                        var fsPx = el.fsFrac * dims.w;
                        ctx.font = fsPx + 'px ' + el.font;
                        var m = ctx.measureText(el.text);
                        var tw = m.width, th = fsPx * 1.15;
                        var tcx = el.xFrac * dims.w + tw / 2;
                        var tcy = el.yFrac * dims.h + th / 2;
                        ctx.translate(tcx, tcy);
                        ctx.rotate(el.rot * Math.PI / 180);
                        ctx.scale(el.sc, el.sc);
                        ctx.fillStyle = el.clr;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(el.text, 0, 0);
                    }
                    ctx.restore();
                }
                resolve(canvas);
            };
            img.src = seImages[idx];
        });
    }

    seDownload.addEventListener('click', async function () {
        if (!seImages.length) return;
        seDownload.disabled = true;
        seDownload.textContent = 'Génération...';
        try {
            if (document.fonts && document.fonts.ready) { await document.fonts.ready; }

            var jsPDFCtor = window.jspdf.jsPDF;
            var first = seDims[0];
            var pdf = new jsPDFCtor({
                orientation: first.w > first.h ? 'l' : 'p',
                unit: 'px', format: [first.w, first.h]
            });

            for (var i = 0; i < seImages.length; i++) {
                var canvas = await bakePageCanvas(i);
                var dims = seDims[i];
                if (i > 0) pdf.addPage([dims.w, dims.h], dims.w > dims.h ? 'l' : 'p');
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, dims.w, dims.h);
            }
            pdf.save('document-annote.pdf');
        } catch (err) {
            console.error(err);
            alert('Une erreur est survenue lors de la génération du PDF.');
        } finally {
            seDownload.disabled = false;
            seDownload.textContent = 'Télécharger le PDF';
        }
    });

});
