/* app2.js — Mapa Único de Parcelas - VERSIÓN MEJORADA */
let mapSinglePart2 = null;
let currentParcelsPart2 = [];
let currentCirclesPart2 = [];
let currentTextsPart2 = [];
let circleSizeFactorPart2 = 1; // Valor inicial más pequeño

// Variables para el control de texto
let isDraggingTextPart2 = false;
let isResizingTextPart2 = false;
let dragStartXPart2, dragStartYPart2;
let initialTextXPart2, initialTextYPart2;
let resizeStartWidthPart2, resizeStartHeightPart2;
let currentTextElementPart2 = null;
let currentTextIndexPart2 = 0;
let textElementsDataPart2 = Array(10).fill(null).map(() => ({
    text: '',
    color: '#000000',
    bgColor: '#ffffff',
    opacity: 80,
    fontSize: 14,
    bold: false,
    element: null
}));

// Función de inicialización
function initMapPart2() {
    console.log('🔄 Iniciando MAPA 2...');
    
    if (mapSinglePart2) {
        console.log('✅ Mapa ya existe');
        mapSinglePart2.invalidateSize();
        return;
    }
    
    // SOLUCIÓN: Configuración mejorada para mapa estable (igual que en Mapa 1)
    const mapOptions = {
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        transform3DLimit: 1,
        preferCanvas: true
    };
    
    // Crear el mapa sin controles de zoom
    mapSinglePart2 = L.map('map-single', mapOptions).setView([40.0, -4.0], 6);
    
    // Añadir barra de escala al Mapa Único
    L.control.scale({
        imperial: false,
        metric: true,
        position: 'bottomright'
    }).addTo(mapSinglePart2);
    
    // Añadir capa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapSinglePart2);
    
    console.log('✅ Mapa 2 creado exitosamente');
    
    // Asegurar que el contenedor tenga dimensiones antes de inicializar
    setTimeout(() => {
        mapSinglePart2.invalidateSize();
    }, 100);
    
    // Configurar controles
    setupControlsPart2();
    setupTextControlsPart2();
    
    // Forzar redimensionado final
    setTimeout(() => {
        mapSinglePart2.invalidateSize(true);
    }, 500);
}

// Configurar controles principales
function setupControlsPart2() {
    console.log('⚙️ Configurando controles MAPA 2...');
    
    // Botón de búsqueda
    const processBtn = document.getElementById('btn-process-ref-part2');
    if (processBtn) {
        processBtn.addEventListener('click', processReferencesPart2);
    }
    
    // Enter en input
    const refInput = document.getElementById('refInput-part2');
    if (refInput) {
        refInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') processReferencesPart2();
        });
    }
    
    // Control de zoom
    const zoomSlider = document.getElementById('zoom-slider-part2');
    const zoomValue = document.getElementById('zoomValue');
    if (zoomSlider && zoomValue) {
        zoomSlider.addEventListener('input', (e) => {
            const zoom = parseInt(e.target.value);
            mapSinglePart2.setZoom(zoom);
            zoomValue.textContent = zoom;
        });
        
        mapSinglePart2.on('zoomend', () => {
            zoomSlider.value = mapSinglePart2.getZoom();
            zoomValue.textContent = mapSinglePart2.getZoom();
        });
        
        zoomSlider.value = mapSinglePart2.getZoom();
        zoomValue.textContent = mapSinglePart2.getZoom();
    }
    
    // Estilo del mapa
    const mapStyle = document.getElementById('mapStyle');
    if (mapStyle) {
        mapStyle.addEventListener('change', (e) => {
            changeBaseLayerPart2(e.target.value);
        });
    }
    
    // Control de círculo (con rango más pequeño)
    const circleToggle = document.getElementById('circleToggle-part2');
    const circleSize = document.getElementById('circleSize-part2');
    
    if (circleToggle) {
        circleToggle.addEventListener('change', function() {
            if (currentParcelsPart2.length > 0 && this.value === 'si') {
                currentParcelsPart2.forEach(parcel => {
                    addCircleAroundParcelPart2(parcel.toGeoJSON());
                });
            } else {
                currentCirclesPart2.forEach(circle => mapSinglePart2.removeLayer(circle));
                currentCirclesPart2 = [];
            }
        });
    }
    
    if (circleSize) {
        // Establecer valor inicial más pequeño
        circleSize.value = circleSizeFactorPart2;
        circleSize.addEventListener('input', function() {
            circleSizeFactorPart2 = parseInt(this.value);
            if (currentParcelsPart2.length > 0 && circleToggle.value === 'si') {
                updateCirclesPart2();
            }
        });
    }
    
    // Control de grosor de borde
    const borderWidth = document.getElementById('borderWidth');
    const borderWidthValue = document.getElementById('borderWidthValue');
    if (borderWidth && borderWidthValue) {
        borderWidth.addEventListener('input', function() {
            borderWidthValue.textContent = this.value + 'px';
            currentParcelsPart2.forEach(parcel => {
                parcel.setStyle({
                    weight: parseInt(this.value)
                });
            });
        });
    }
    
    // Añadir event listener para el botón de exportación
    const exportBtn = document.getElementById('btn-export-image');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMapToImagePart2);
    }
}

// Configurar controles de texto
function setupTextControlsPart2() {
    console.log('⚙️ Configurando controles de texto...');
    
    // Selector de texto activo
    const textSelector = document.getElementById('textSelector');
    if (textSelector) {
        textSelector.addEventListener('change', function() {
            currentTextIndexPart2 = parseInt(this.value) - 1;
            loadTextSettingsPart2(currentTextIndexPart2);
        });
    }
    
    // Botón añadir texto
    const addTextBtn = document.getElementById('btn-add-text');
    if (addTextBtn) {
        addTextBtn.addEventListener('click', addTextToMapPart2);
    }
    
    // Controles de texto
    const textInput = document.getElementById('textInput');
    const textColor = document.getElementById('textColor');
    const textBgColor = document.getElementById('textBgColor');
    const textOpacity = document.getElementById('textOpacity');
    const textFontSize = document.getElementById('textFontSize');
    const textBold = document.getElementById('textBold');
    
    if (textInput) textInput.addEventListener('input', updateTextSettingsPart2);
    if (textColor) textColor.addEventListener('input', updateTextSettingsPart2);
    if (textBgColor) textBgColor.addEventListener('input', updateTextSettingsPart2);
    if (textOpacity) textOpacity.addEventListener('input', updateTextSettingsPart2);
    if (textFontSize) textFontSize.addEventListener('input', updateTextSettingsPart2);
    if (textBold) textBold.addEventListener('change', updateTextSettingsPart2);
}

// Cargar configuración de texto
function loadTextSettingsPart2(index) {
    const textData = textElementsDataPart2[index];
    if (!textData) return;
    
    document.getElementById('textInput').value = textData.text;
    document.getElementById('textColor').value = textData.color;
    document.getElementById('textBgColor').value = textData.bgColor;
    document.getElementById('textOpacity').value = textData.opacity;
    document.getElementById('textFontSize').value = textData.fontSize;
    document.getElementById('textBold').checked = textData.bold;
    document.getElementById('textOpacityValue').textContent = textData.opacity + '%';
    document.getElementById('textFontSizeValue').textContent = textData.fontSize + 'px';
    
    // Actualizar texto en el mapa si existe
    if (textData.element) {
        updateTextElementPart2(textData.element, textData);
    }
}

// Actualizar configuración de texto
function updateTextSettingsPart2() {
    const textData = textElementsDataPart2[currentTextIndexPart2];
    if (!textData) return;
    
    textData.text = document.getElementById('textInput').value;
    textData.color = document.getElementById('textColor').value;
    textData.bgColor = document.getElementById('textBgColor').value;
    textData.opacity = parseInt(document.getElementById('textOpacity').value);
    textData.fontSize = parseInt(document.getElementById('textFontSize').value);
    textData.bold = document.getElementById('textBold').checked;
    
    document.getElementById('textOpacityValue').textContent = textData.opacity + '%';
    document.getElementById('textFontSizeValue').textContent = textData.fontSize + 'px';
    
    // Actualizar texto en el mapa si existe
    if (textData.element) {
        updateTextElementPart2(textData.element, textData);
    }
}

// Actualizar elemento de texto en el mapa
function updateTextElementPart2(element, textData) {
    element.textContent = textData.text;
    element.style.color = textData.color;
    element.style.backgroundColor = textData.bgColor;
    element.style.opacity = textData.opacity / 100;
    element.style.fontSize = textData.fontSize + 'px';
    element.style.fontWeight = textData.bold ? 'bold' : 'normal';
}

// Añadir texto al mapa
function addTextToMapPart2() {
    const textData = textElementsDataPart2[currentTextIndexPart2];
    if (!textData || !textData.text) {
        alert('Por favor, introduce un texto y configura las características');
        return;
    }
    
    const mapContainer = document.getElementById('map-single');
    
    // Si ya existe un elemento, removerlo
    if (textData.element) {
        mapContainer.removeChild(textData.element);
    }
    
    const textElement = document.createElement('div');
    textElement.className = 'custom-text';
    textElement.textContent = textData.text;
    textElement.style.color = textData.color;
    textElement.style.backgroundColor = textData.bgColor;
    textElement.style.opacity = textData.opacity / 100;
    textElement.style.fontSize = textData.fontSize + 'px';
    textElement.style.fontWeight = textData.bold ? 'bold' : 'normal';
    textElement.style.position = 'absolute';
    textElement.style.top = '50px';
    textElement.style.left = '50px';
    textElement.style.zIndex = '1000';
    textElement.style.cursor = 'move';
    textElement.style.padding = '8px 12px';
    textElement.style.borderRadius = '4px';
    textElement.style.maxWidth = '200px';
    textElement.style.wordWrap = 'break-word';
    textElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    textElement.style.userSelect = 'none';
    
    // Añadir botón de cerrar (dentro del texto)
    const closeBtn = document.createElement('div');
    closeBtn.className = 'text-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Eliminar texto';
    textElement.appendChild(closeBtn);
    
    // Evento para eliminar texto
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        mapContainer.removeChild(textElement);
        textData.element = null;
        currentTextsPart2 = currentTextsPart2.filter(el => el !== textElement);
    });
    
    // Sistema de arrastre mejorado
    textElement.addEventListener('mousedown', startTextDragPart2);
    textElement.addEventListener('touchstart', startTextDragTouchPart2, { passive: false });
    
    mapContainer.appendChild(textElement);
    textData.element = textElement;
    currentTextsPart2.push(textElement);
    
    console.log(`✅ Texto ${currentTextIndexPart2 + 1} añadido al mapa`);
}

// Sistema de arrastre mejorado para mouse
function startTextDragPart2(e) {
    if (e.target.classList.contains('text-close-btn')) {
        return;
    }
    
    isDraggingTextPart2 = true;
    currentTextElementPart2 = e.currentTarget;
    dragStartXPart2 = e.clientX;
    dragStartYPart2 = e.clientY;
    
    const rect = currentTextElementPart2.getBoundingClientRect();
    initialTextXPart2 = rect.left;
    initialTextYPart2 = rect.top;
    
    currentTextElementPart2.style.cursor = 'grabbing';
    e.preventDefault();
}

// Sistema de arrastre para touch
function startTextDragTouchPart2(e) {
    if (e.target.classList.contains('text-close-btn')) {
        return;
    }
    
    isDraggingTextPart2 = true;
    currentTextElementPart2 = e.currentTarget;
    const touch = e.touches[0];
    dragStartXPart2 = touch.clientX;
    dragStartYPart2 = touch.clientY;
    
    const rect = currentTextElementPart2.getBoundingClientRect();
    initialTextXPart2 = rect.left;
    initialTextYPart2 = rect.top;
    
    e.preventDefault();
}

// Manejar eventos de mouse mejorados
document.addEventListener('mousemove', function(e) {
    if (isDraggingTextPart2 && currentTextElementPart2) {
        const deltaX = e.clientX - dragStartXPart2;
        const deltaY = e.clientY - dragStartYPart2;
        
        const newX = initialTextXPart2 + deltaX;
        const newY = initialTextYPart2 + deltaY;
        
        // Limitar al área del mapa
        const mapRect = document.getElementById('map-single').getBoundingClientRect();
        const maxX = mapRect.width - currentTextElementPart2.offsetWidth;
        const maxY = mapRect.height - currentTextElementPart2.offsetHeight;
        
        currentTextElementPart2.style.left = Math.max(0, Math.min(maxX, newX)) + 'px';
        currentTextElementPart2.style.top = Math.max(0, Math.min(maxY, newY)) + 'px';
    }
});

// Manejar eventos de touch
document.addEventListener('touchmove', function(e) {
    if (isDraggingTextPart2 && currentTextElementPart2 && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStartXPart2;
        const deltaY = touch.clientY - dragStartYPart2;
        
        const newX = initialTextXPart2 + deltaX;
        const newY = initialTextYPart2 + deltaY;
        
        const mapRect = document.getElementById('map-single').getBoundingClientRect();
        const maxX = mapRect.width - currentTextElementPart2.offsetWidth;
        const maxY = mapRect.height - currentTextElementPart2.offsetHeight;
        
        currentTextElementPart2.style.left = Math.max(0, Math.min(maxX, newX)) + 'px';
        currentTextElementPart2.style.top = Math.max(0, Math.min(maxY, newY)) + 'px';
        
        e.preventDefault();
    }
});

document.addEventListener('mouseup', stopTextInteractionPart2);
document.addEventListener('touchend', stopTextInteractionPart2);

function stopTextInteractionPart2() {
    if (isDraggingTextPart2) {
        isDraggingTextPart2 = false;
        if (currentTextElementPart2) {
            currentTextElementPart2.style.cursor = 'move';
        }
        currentTextElementPart2 = null;
    }
}

// Exportar mapa a imagen MEJORADO - CAPTURA TODO (SOLUCIÓN APLICADA)
function exportMapToImagePart2() {
    const mapContainer = document.getElementById('map-single');
    
    // Mostrar loading
    const loading = document.createElement('div');
    loading.style.position = 'fixed';
    loading.style.top = '50%';
    loading.style.left = '50%';
    loading.style.transform = 'translate(-50%, -50%)';
    loading.style.background = 'rgba(0,0,0,0.8)';
    loading.style.color = 'white';
    loading.style.padding = '20px';
    loading.style.borderRadius = '5px';
    loading.style.zIndex = '9999';
    loading.innerHTML = 'Generando imagen del Mapa Único...';
    document.body.appendChild(loading);
    
    // SOLUCIÓN: Forzar actualización del mapa (igual que en Mapa 1)
    setTimeout(() => {
        if (mapSinglePart2) {
            mapSinglePart2.invalidateSize();
        }
    }, 100);
    
    // Esperar a que todo se renderice
    setTimeout(() => {
        html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: false,
            scale: 2, // Mayor calidad
            logging: true,
            width: mapContainer.scrollWidth,
            height: mapContainer.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                // SOLUCIÓN: Ocultar botones de cerrar en textos (igual que en Mapa 1)
                const closeButtons = clonedDoc.querySelectorAll('.text-close-btn');
                closeButtons.forEach(btn => {
                    btn.style.display = 'none';
                });
                
                // SOLUCIÓN: Asegurar que todos los textos personalizados se muestren
                const clonedTexts = clonedDoc.querySelectorAll('.custom-text');
                clonedTexts.forEach(text => {
                    text.style.display = 'block';
                    text.style.visibility = 'visible';
                    text.style.opacity = '1';
                });
                
                // SOLUCIÓN: Asegurar que el mapa tenga las dimensiones correctas (igual que en Mapa 1)
                const clonedMap = clonedDoc.getElementById('map-single');
                if (clonedMap) {
                    clonedMap.style.width = '100%';
                    clonedMap.style.height = '100%';
                    
                    // SOLUCIÓN CRÍTICA: Forzar posicionamiento absoluto en el contenedor del mapa
                    const leafletContainer = clonedMap.querySelector('.leaflet-container');
                    if (leafletContainer) {
                        leafletContainer.style.position = 'absolute';
                        leafletContainer.style.top = '0';
                        leafletContainer.style.left = '0';
                        leafletContainer.style.right = '0';
                        leafletContainer.style.bottom = '0';
                        leafletContainer.style.width = '100% !important';
                        leafletContainer.style.height = '100% !important';
                    }
                }
                
                // SOLUCIÓN: Forzar actualización de capas Leaflet en el clon
                const clonedPanes = clonedDoc.querySelectorAll('.leaflet-pane');
                clonedPanes.forEach(pane => {
                    pane.style.transform = 'translate3d(0px, 0px, 0px)';
                });
            }
        }).then(canvas => {
            // Remover loading
            document.body.removeChild(loading);
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.download = 'mapa_unico_' + new Date().getTime() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            console.log('✅ Imagen del Mapa Único generada correctamente con todos los elementos');
        }).catch(error => {
            console.error('Error al generar la imagen del Mapa Único:', error);
            alert('Error al generar la imagen. Inténtalo de nuevo.');
            document.body.removeChild(loading);
        });
    }, 1500); // Aumentado el tiempo de espera para asegurar renderizado
}

// Cambiar capa base
function changeBaseLayerPart2(layer) {
    mapSinglePart2.eachLayer((l) => {
        if (l instanceof L.TileLayer) {
            mapSinglePart2.removeLayer(l);
        }
    });
    
    switch(layer) {
        case 'satellite':
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapSinglePart2);
            break;
        case 'terrain':
            L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(mapSinglePart2);
            break;
        default:
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapSinglePart2);
    }
}

// Procesar referencias
async function processReferencesPart2() {
    console.log('🔍 Procesando referencias...');
    
    const refInput = document.getElementById('refInput-part2');
    const refText = refInput.value.trim();
    
    if (!refText) {
        alert('Por favor, introduce una referencia catastral');
        return;
    }
    
    const references = refText.split(';').map(ref => ref.trim()).filter(ref => ref.length > 0);
    
    if (references.length === 0) {
        alert('No se encontraron referencias válidas');
        return;
    }
    
    showLoadingPart2(true);
    
    try {
        clearParcelsPart2();
        
        const results = [];
        for (const ref of references) {
            try {
                const parcel = await loadParcelFromSIGPACPart2(ref);
                results.push(parcel);
            } catch (error) {
                console.error(`❌ Error con ${ref}:`, error);
            }
        }
        
        if (results.length === 0) {
            throw new Error('No se pudo cargar ninguna parcela');
        }
        
        results.forEach(parcel => {
            addParcelToMapPart2(parcel);
        });
        
        // Añadir círculos si está activado
        const circleToggle = document.getElementById('circleToggle-part2');
        if (circleToggle && circleToggle.value === 'si') {
            results.forEach(parcel => {
                addCircleAroundParcelPart2(parcel);
            });
        }
        
        // Ajustar vista
        if (currentParcelsPart2.length > 0) {
            const group = new L.featureGroup(currentParcelsPart2);
            mapSinglePart2.fitBounds(group.getBounds().pad(0.1));
        }
        
        alert(`✅ Se cargaron ${results.length} de ${references.length} parcelas`);
        
    } catch (error) {
        console.error('❌ Error general:', error);
        alert('Error: ' + error.message);
    } finally {
        showLoadingPart2(false);
    }
}

// Cargar parcela desde SIGPAC
async function loadParcelFromSIGPACPart2(refCatastral) {
    console.log(`📦 Cargando parcela: ${refCatastral}`);
    
    const provincia = refCatastral.substring(0, 2);
    const municipio = refCatastral.substring(2, 5);
    const resto = refCatastral.substring(6);
    const poligono = resto.substring(0, 3);
    const parcela = resto.substring(3, 8);
    
    console.log(`📍 Parsed: Provincia=${provincia}, Municipio=${municipio}, Polígono=${poligono}, Parcela=${parcela}`);
    
    const filtro = `provincia=${provincia} AND municipio=${municipio} AND poligono=${poligono} AND parcela=${parcela}`;
    
    const url = `https://wms.mapa.gob.es/sigpac/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=AU.Sigpac:recinto&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filtro)}`;
    
    console.log('🌐 URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
        throw new Error('No se encontró la parcela en SIGPAC');
    }
    
    console.log('✅ Parcela encontrada');
    return data.features[0];
}

// Añadir parcela al mapa
function addParcelToMapPart2(parcelFeature) {
    const borderColor = document.getElementById('colorPickerBorder').value || '#ff0000';
    const borderWidth = parseInt(document.getElementById('borderWidth').value) || 3;
    
    const layer = L.geoJSON(parcelFeature, {
        style: {
            color: borderColor,
            weight: borderWidth,
            fillColor: borderColor,
            fillOpacity: 0.3,
            opacity: 1
        }
    }).addTo(mapSinglePart2);
    
    // Añadir tooltip
    const ref = parcelFeature.properties?.REFCAT || 'Parcela';
    layer.bindTooltip(ref, {
        permanent: false,
        className: 'parcel-tooltip'
    });
    
    currentParcelsPart2.push(layer);
}

// Añadir círculo alrededor de la parcela - CÍRCULOS MÁS PEQUEÑOS
function addCircleAroundParcelPart2(parcelFeature) {
    try {
        const bounds = L.geoJSON(parcelFeature).getBounds();
        const center = bounds.getCenter();
        const size = Math.max(bounds.getNorth() - bounds.getSouth(), bounds.getEast() - bounds.getWest());
        
        const circleColor = document.getElementById('colorPickerCircle').value || '#0000ff';
        // Radio más pequeño para el mapa 2
        const adjustedRadius = size * 100000 * (circleSizeFactorPart2 / 10);
        
        const circle = L.circle(center, {
            radius: adjustedRadius,
            color: circleColor,
            weight: 2, // Línea más delgada
            fillColor: 'none',
            dashArray: '5,5',
            opacity: 0.8,
            fillOpacity: 0
        }).addTo(mapSinglePart2);
        
        currentCirclesPart2.push(circle);
        
    } catch(error) {
        console.error('Error creating circle:', error);
    }
}

// Actualizar círculos
function updateCirclesPart2() {
    currentCirclesPart2.forEach(circle => mapSinglePart2.removeLayer(circle));
    currentCirclesPart2 = [];
    
    if (document.getElementById('circleToggle-part2').value === 'si') {
        currentParcelsPart2.forEach(parcel => {
            addCircleAroundParcelPart2(parcel.toGeoJSON());
        });
    }
}

// Mostrar/ocultar loading
function showLoadingPart2(show) {
    let loading = document.getElementById('loading-part2');
    
    if (show) {
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-part2';
            loading.className = 'loading-part2';
            loading.innerHTML = 'Cargando parcelas...';
            document.getElementById('map-single').appendChild(loading);
        }
        loading.style.display = 'block';
    } else if (loading) {
        loading.style.display = 'none';
    }
}

// Limpiar parcelas
function clearParcelsPart2() {
    currentParcelsPart2.forEach(layer => {
        mapSinglePart2.removeLayer(layer);
    });
    currentParcelsPart2 = [];
    
    currentCirclesPart2.forEach(circle => {
        mapSinglePart2.removeLayer(circle);
    });
    currentCirclesPart2 = [];
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación MAPA 2...');
    
    // Inicializar MAPA 2 inmediatamente si está visible
    setTimeout(() => {
        if (document.getElementById('part2').classList.contains('active')) {
            initMapPart2();
        }
    }, 100);
    
    // También inicializar cuando se cambie de pestaña
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab === 'part2') {
                setTimeout(() => {
                    initMapPart2();
                }, 50);
            }
        });
    });
});