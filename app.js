/* app.js — Mapas Catastrales */
const PROVINCIAS_ZIP_URL = "https://mapaemplazamiento.netlify.app/shp1_provincias.zip";
const MUNICIPIOS_ZIP_URL = "https://mapaemplazamiento.netlify.app/shp2_municipios.zip";
const MUNICIPIOS_CSV_URL = "https://mapaemplazamiento.netlify.app/map_municipios.csv";
const SIGPAC_WFS_URL = "https://wms.mapa.gob.es/sigpac/wfs";

let mapA, mapB, mapC;
let provincesLayer, municipalitiesLayer, sigpacMunicipalityLayer;
let loadedProvinces = [], loadedMunicipalities = [];
let currentSelectedProvince = null, currentSelectedMunicipality = null;
let currentSelectedParcels = [], currentCircles = [];
let municipiosData = [];
let circleSizeFactor = 10;

// Variables para el control de la estrella
let isStarVisible = false;
let isDragging = false;
let isResizing = false;
let dragStartX, dragStartY;
let initialStarX, initialStarY;
let resizeStartSize;

function initMaps(){
  // SOLUCIÓN 2: Configuración mejorada para mapas estables
  const mapOptions = {
    attributionControl: false,
    zoomControl: false,
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    fadeAnimation: false, // Elimina animaciones que causan desplazamiento
    markerZoomAnimation: false,
    transform3DLimit: 1, // Limita transformaciones 3D
    preferCanvas: true // Mejor rendimiento
  };
  
  mapA = L.map('map-a', mapOptions).setView([40.0, -4.0], 6);
  
  // Asegurar que el contenedor tenga dimensiones antes de inicializar
  setTimeout(() => {
    mapA.invalidateSize();
  }, 100);
  
  L.rectangle([[-90, -180], [90, 180]], { 
    color: "#fff", weight: 0, fillOpacity: 1 
  }).addTo(mapA);

  mapB = L.map('map-b', mapOptions).setView([40.0, -4.0], 6);
  
  setTimeout(() => {
    mapB.invalidateSize();
  }, 150);
  
  L.rectangle([[-90, -180], [90, 180]], { 
    color: "#fff", weight: 0, fillOpacity: 1 
  }).addTo(mapB);

  mapC = L.map('map-c', mapOptions).setView([40.0, -4.0], 6);
  
  setTimeout(() => {
    mapC.invalidateSize();
  }, 200);
  
  L.rectangle([[-90, -180], [90, 180]], { 
    color: "#fff", weight: 0, fillOpacity: 1 
  }).addTo(mapC);

  initZoomControls();
  initStarControls();
  loadAllData();
  
  // Forzar redimensionado final después de cargar todo
  setTimeout(() => {
    mapA.invalidateSize(true);
    mapB.invalidateSize(true);
    mapC.invalidateSize(true);
  }, 500);
}

// SISTEMA DE CONTROL DE ESTRELLA
function initStarControls() {
  const starToggle = document.getElementById('star-toggle');
  const starPosX = document.getElementById('star-pos-x');
  const starPosY = document.getElementById('star-pos-y');
  const starSize = document.getElementById('star-size');
  const customStar = document.getElementById('custom-star');
  const resizeHandle = document.querySelector('.star-resize-handle');

  // Toggle mostrar/ocultar estrella
  starToggle.addEventListener('click', function() {
    isStarVisible = !isStarVisible;
    customStar.style.display = isStarVisible ? 'block' : 'none';
    starToggle.textContent = isStarVisible ? 'Ocultar Estrella' : 'Mostrar Estrella';
    
    if (isStarVisible) {
      updateStarPosition();
      updateStarSize();
    }
  });

  // Control de posición X
  starPosX.addEventListener('input', function() {
    if (isStarVisible) {
      updateStarPosition();
    }
  });

  // Control de posición Y
  starPosY.addEventListener('input', function() {
    if (isStarVisible) {
      updateStarPosition();
    }
  });

  // Control de tamaño
  starSize.addEventListener('input', function() {
    if (isStarVisible) {
      updateStarSize();
    }
  });

  // Sistema de arrastre
  customStar.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);

  // Sistema de redimensionado
  resizeHandle.addEventListener('mousedown', startResize);
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);

  function updateStarPosition() {
    const x = parseInt(starPosX.value);
    const y = parseInt(starPosY.value);
    customStar.style.left = x + 'px';
    customStar.style.top = y + 'px';
  }

  function updateStarSize() {
    const size = parseInt(starSize.value);
    customStar.style.width = size + 'px';
    customStar.style.height = size + 'px';
  }

  function startDrag(e) {
    if (e.target === resizeHandle) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = customStar.getBoundingClientRect();
    initialStarX = rect.left;
    initialStarY = rect.top;
    
    customStar.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function handleDrag(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    const newX = initialStarX + deltaX;
    const newY = initialStarY + deltaY;
    
    starPosX.value = Math.max(0, Math.min(500, newX));
    starPosY.value = Math.max(0, Math.min(400, newY));
    
    updateStarPosition();
  }

  function stopDrag() {
    isDragging = false;
    customStar.style.cursor = 'grab';
  }

  function startResize(e) {
    isResizing = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const currentSize = parseInt(customStar.style.width) || 60;
    resizeStartSize = currentSize;
    
    e.preventDefault();
    e.stopPropagation();
  }

  function handleResize(e) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    const delta = Math.max(deltaX, deltaY);
    const newSize = Math.max(20, Math.min(200, resizeStartSize + delta));
    
    starSize.value = newSize;
    updateStarSize();
  }

  function stopResize() {
    isResizing = false;
  }

  // Touch support
  customStar.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    customStar.dispatchEvent(mouseEvent);
  });

  document.addEventListener('touchmove', function(e) {
    if (isDragging || isResizing) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      document.dispatchEvent(mouseEvent);
      e.preventDefault();
    }
  });

  document.addEventListener('touchend', function() {
    if (isDragging) {
      const mouseEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseEvent);
    }
    if (isResizing) {
      const mouseEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseEvent);
    }
  });
}

function initZoomControls() {
  document.getElementById('zoom-slider-1').addEventListener('input', function(e) {
    const zoomValue = parseInt(e.target.value);
    mapA.setZoom(zoomValue);
    setTimeout(() => addCoordinatesToMap(mapA, 'map-container-1'), 100);
  });
  
  document.getElementById('zoom-slider-2').addEventListener('input', function(e) {
    const zoomValue = parseInt(e.target.value);
    mapB.setZoom(zoomValue);
    setTimeout(() => addCoordinatesToMap(mapB, 'map-container-2'), 100);
  });
  
  document.getElementById('zoom-slider-3').addEventListener('input', function(e) {
    const zoomValue = parseInt(e.target.value);
    mapC.setZoom(zoomValue);
    setTimeout(() => addCoordinatesToMap(mapC, 'map-container-3'), 100);
  });
  
  document.getElementById('circle-slider').addEventListener('input', function(e) {
    circleSizeFactor = parseInt(e.target.value);
    if (currentSelectedParcels.length > 0) {
      updateCircles();
    }
  });
}

async function loadAllData() {
  try {
    await loadMunicipiosCSV();
    await loadZipFromURL(PROVINCIAS_ZIP_URL, 'provincias');
    await loadZipFromURL(MUNICIPIOS_ZIP_URL, 'municipios');
  } catch(err) {
    console.error('Error loading data:', err);
    alert('Error al cargar los datos. Recarga la página.');
  }
}

async function loadMunicipiosCSV() {
  try {
    const response = await fetch(MUNICIPIOS_CSV_URL);
    const csvText = await response.text();
    
    const results = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    
    municipiosData = results.data;
  } catch(err) {
    console.error('Error loading CSV:', err);
    throw new Error('No se pudo cargar el CSV de municipios');
  }
}

async function loadZipFromURL(url, type) {
  try {
    const resp = await fetch(url);
    if(!resp.ok) throw new Error('Error al cargar el archivo');
    
    const ab = await resp.arrayBuffer();
    const result = await processZipArrayBuffer(ab);
    
    if (type === 'provincias') {
      handleLoadedProvinces(result.geojson);
    } else if (type === 'municipios') {
      handleLoadedMunicipalities(result.geojson);
    }
    
  } catch(err) {
    console.error('Error loading', type, ':', err);
    throw err;
  }
}

async function processZipArrayBuffer(arrayBuffer){
  try {
    const maybeGeoJSON = await shp(arrayBuffer);
    if(maybeGeoJSON && (maybeGeoJSON.type === 'FeatureCollection' || maybeGeoJSON.features)){
      return { geojson: maybeGeoJSON, method: 'shpjs' };
    }
  } catch(err){}
  
  try {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(arrayBuffer);
    const names = Object.keys(zip.files).sort();
    const candidate = names.find(n => n.toLowerCase().endsWith('.geojson')) || names.find(n => n.toLowerCase().endsWith('.json'));
    if(!candidate) throw new Error('No se encontró GeoJSON');
    
    const text = await zip.files[candidate].async('string');
    const parsed = JSON.parse(text);
    return { geojson: parsed, method: 'jszip-geojson' };
    
  } catch(err){
    throw new Error('Error procesando ZIP');
  }
}

function handleLoadedProvinces(geojson) {
  try {
    let fc = geojson;
    if(fc.type !== 'FeatureCollection' && fc.features) {
      fc = { type:'FeatureCollection', features: fc.features || [] };
    }
    
    loadedProvinces = fc.features;
    
    if(provincesLayer) mapA.removeLayer(provincesLayer);
    
    const backgroundColor = document.getElementById('colorPickerBackground').value || '#f0f0f0';
    
    provincesLayer = L.geoJSON(fc, {
      style: {
        color: '#333',
        weight: 1,
        fillColor: backgroundColor,
        fillOpacity: 1
      }
    }).addTo(mapA);
    
    mapA.fitBounds(provincesLayer.getBounds().pad(0.02));
    document.getElementById('zoom-slider-1').value = mapA.getZoom();
    setTimeout(() => addCoordinatesToMap(mapA, 'map-container-1'), 100);
    
  } catch(err) {
    console.error('Error loading provinces:', err);
  }
}

function handleLoadedMunicipalities(geojson) {
  try {
    let fc = geojson;
    if(fc.type !== 'FeatureCollection' && fc.features) {
      fc = { type:'FeatureCollection', features: fc.features || [] };
    }
    
    loadedMunicipalities = fc.features;
  } catch(err) {
    console.error('Error loading municipalities:', err);
  }
}

function addCoordinatesToMap(map, containerId) {
  const bounds = map.getBounds();
  const mapContainer = document.getElementById(containerId);
  
  mapContainer.querySelectorAll('.coordinate-label, .grid-line').forEach(el => el.remove());
  
  const coordinates = {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
  
  addMultipleCoordinates(containerId, coordinates);
}

function addMultipleCoordinates(containerId, coordinates) {
  const latRange = coordinates.north - coordinates.south;
  const lonRange = coordinates.east - coordinates.west;
  
  const latStep = latRange > 10 ? 2 : latRange > 5 ? 1 : 0.5;
  const lonStep = lonRange > 10 ? 2 : lonRange > 5 ? 1 : 0.5;
  
  for (let lat = Math.floor(coordinates.south); lat <= coordinates.north; lat += latStep) {
    if (lat >= coordinates.south && lat <= coordinates.north) {
      const percentFromSouth = (lat - coordinates.south) / (coordinates.north - coordinates.south);
      const topPosition = percentFromSouth * 100;
      
      if (topPosition > 5 && topPosition < 95) {
        createCoordinateLabel(containerId, 'left', `${lat.toFixed(1)}°`, '', topPosition + '%');
        createCoordinateLabel(containerId, 'right', `${lat.toFixed(1)}°`, '', topPosition + '%');
      }
    }
  }
  
  for (let lon = Math.floor(coordinates.west); lon <= coordinates.east; lon += lonStep) {
    if (lon >= coordinates.west && lon <= coordinates.east) {
      const percentFromWest = (lon - coordinates.west) / (coordinates.east - coordinates.west);
      const leftPosition = percentFromWest * 100;
      
      if (leftPosition > 5 && leftPosition < 95) {
        createCoordinateLabel(containerId, 'top', `${lon.toFixed(1)}°`, '', '', leftPosition + '%');
        createCoordinateLabel(containerId, 'bottom', `${lon.toFixed(1)}°`, '', '', leftPosition + '%');
      }
    }
  }
  
  addGridLines(containerId, coordinates);
}

function addGridLines(containerId, coordinates) {
  const latRange = coordinates.north - coordinates.south;
  const lonRange = coordinates.east - coordinates.west;
  
  const latStep = latRange > 10 ? 2 : latRange > 5 ? 1 : 0.5;
  const lonStep = lonRange > 10 ? 2 : lonRange > 5 ? 1 : 0.5;
  
  for (let lat = Math.floor(coordinates.south); lat <= coordinates.north; lat += latStep) {
    if (lat >= coordinates.south && lat <= coordinates.north) {
      const percentFromSouth = (lat - coordinates.south) / (coordinates.north - coordinates.south);
      const topPosition = percentFromSouth * 100;
      
      const line = document.createElement('div');
      line.className = 'grid-line grid-horizontal';
      line.style.top = `${topPosition}%`;
      document.getElementById(containerId).appendChild(line);
    }
  }
  
  for (let lon = Math.floor(coordinates.west); lon <= coordinates.east; lon += lonStep) {
    if (lon >= coordinates.west && lon <= coordinates.east) {
      const percentFromWest = (lon - coordinates.west) / (coordinates.east - coordinates.west);
      const leftPosition = percentFromWest * 100;
      
      const line = document.createElement('div');
      line.className = 'grid-line grid-vertical';
      line.style.left = `${leftPosition}%`;
      document.getElementById(containerId).appendChild(line);
    }
  }
}

function createCoordinateLabel(containerId, position, text, extraClass = '', top = '', left = '') {
  const label = document.createElement('div');
  label.className = `coordinate-label ${position} ${extraClass}`;
  label.textContent = text;
  label.style.position = 'absolute';
  
  if (top) label.style.top = top;
  if (left) label.style.left = left;
  
  if (position === 'left' || position === 'right') {
    label.style.transform = 'translateY(-50%)';
  }
  if (position === 'top' || position === 'bottom') {
    label.style.transform = 'translateX(-50%)';
  }
  
  document.getElementById(containerId).appendChild(label);
}

function processReference() {
  const refInput = document.getElementById('refInput').value.trim();
  if(!refInput || refInput.length < 5) {
    alert('Referencia catastral inválida. Debe tener al menos 5 dígitos.');
    return;
  }
  
  if(!loadedProvinces.length || !loadedMunicipalities.length || !municipiosData.length) {
    alert('Los datos todavía se están cargando. Espera un momento.');
    return;
  }
  
  const references = refInput.split(';').map(ref => ref.trim()).filter(ref => ref.length >= 5);
  
  if (references.length === 0) {
    alert('No se encontraron referencias válidas.');
    return;
  }
  
  const firstRef = references[0];
  const primeraProvincia = firstRef.slice(0, 2);
  const primerMunicipio = firstRef.slice(2, 5);
  
  for (let i = 1; i < references.length; i++) {
    const ref = references[i];
    const provincia = ref.slice(0, 2);
    const municipio = ref.slice(2, 5);
    
    if (provincia !== primeraProvincia || municipio !== primerMunicipio) {
      alert('Error: Todas las referencias deben ser de la misma provincia y municipio.');
      return;
    }
  }
  
  highlightProvince(primeraProvincia);
  highlightMunicipality(primeraProvincia, primerMunicipio);
  highlightParcels(primeraProvincia, primerMunicipio, references);
}

function highlightProvince(provinciaCode) {
  if(currentSelectedProvince) mapA.removeLayer(currentSelectedProvince);
  
  const fields = autoDetectFields(loadedProvinces[0].properties);
  let foundProvince = null;
  
  for(const feature of loadedProvinces) {
    const props = feature.properties || {};
    for(const field of fields) {
      if(!(field in props)) continue;
      
      const val = String(props[field] || '').trim();
      if(!val) continue;
      
      if(val.length >= 6) {
        const natProv = val.slice(4, 6);
        if(natProv === provinciaCode) {
          foundProvince = feature;
          break;
        }
      }
    }
    if(foundProvince) break;
  }
  
  if(foundProvince) {
    const selectionColor = document.getElementById('colorPickerSelection').value;
    currentSelectedProvince = L.geoJSON(foundProvince, {
      style: {
        color: '#000',
        weight: 2,
        fillColor: selectionColor,
        fillOpacity: 0.7
      }
    }).addTo(mapA);
  } else {
    alert('No se encontró la provincia con código: ' + provinciaCode);
  }
}

function highlightMunicipality(provinciaCode, municipioCodeRef) {
  if(currentSelectedMunicipality) mapB.removeLayer(currentSelectedMunicipality);
  if(municipalitiesLayer) mapB.removeLayer(municipalitiesLayer);
  
  const provinceMunicipalities = loadedMunicipalities.filter(feature => {
    const props = feature.properties || {};
    const natcode = props.NATCODE || '';
    return natcode.length >= 8 && natcode.slice(6, 8) === provinciaCode;
  });
  
  if(provinceMunicipalities.length === 0) {
    alert('No se encontraron municipios para la provincia: ' + provinciaCode);
    return;
  }
  
  const backgroundColor = document.getElementById('colorPickerBackground').value || '#e0e0e0';
  
  municipalitiesLayer = L.geoJSON(provinceMunicipalities, {
    style: {
      color: '#333',
      weight: 1,
      fillColor: backgroundColor,
      fillOpacity: 0.8
      }
    }).addTo(mapB);
  
  mapB.fitBounds(municipalitiesLayer.getBounds());
  document.getElementById('zoom-slider-2').value = mapB.getZoom();
  setTimeout(() => addCoordinatesToMap(mapB, 'map-container-2'), 100);
  
  const municipioCSV = municipiosData.find(row => {
    const municipioValue = row['Municipio'];
    return municipioValue && parseInt(String(municipioValue), 10) === parseInt(municipioCodeRef, 10);
  });
  
  if(!municipioCSV) {
    alert('No se encontró el municipio en el CSV con código: ' + municipioCodeRef);
    return;
  }
  
  const municipioINECode = municipioCSV['Municipio INE'];
  if(!municipioINECode) {
    alert('El municipio encontrado no tiene código INE en el CSV');
    return;
  }
  
  let foundMunicipality = null;
  
  for(const feature of provinceMunicipalities) {
    const props = feature.properties || {};
    const natcode = props.NATCODE || '';
    
    if(natcode.length >= 11) {
      const municipioNatCode = natcode.slice(8, 11);
      const municipioNatCodeNum = parseInt(municipioNatCode, 10);
      const municipioINECodeNum = parseInt(municipioINECode, 10);
      
      if(municipioNatCodeNum === municipioINECodeNum) {
        foundMunicipality = feature;
        break;
      }
    }
  }
  
  if(foundMunicipality) {
    const selectionColor = document.getElementById('colorPickerSelection').value;
    currentSelectedMunicipality = L.geoJSON(foundMunicipality, {
      style: {
        color: '#000',
        weight: 3,
        fillColor: selectionColor,
        fillOpacity: 0.9
      }
    }).addTo(mapB);
  } else {
    alert('No se encontró el municipio en el shapefile con código INE: ' + municipioINECode);
  }
}

async function highlightParcels(provinciaCode, municipioCodeRef, references) {
  currentSelectedParcels.forEach(parcel => mapC.removeLayer(parcel));
  currentSelectedParcels = [];
  
  currentCircles.forEach(circle => mapC.removeLayer(circle));
  currentCircles = [];
  
  if(sigpacMunicipalityLayer) mapC.removeLayer(sigpacMunicipalityLayer);
  
  mapC.eachLayer(layer => {
    if (layer instanceof L.TileLayer) {
      mapC.removeLayer(layer);
    }
  });

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.textContent = `Cargando ${references.length} parcela(s) SIGPAC...`;
  document.getElementById('map-container-3').appendChild(loadingDiv);
  
  try {
    const municipioCSV = municipiosData.find(row => {
      const municipioValue = row['Municipio'];
      return municipioValue && parseInt(String(municipioValue), 10) === parseInt(municipioCodeRef, 10);
    });
    
    if(!municipioCSV) {
      throw new Error('Municipio no encontrado en CSV');
    }
    
    const municipioINECode = municipioCSV['Municipio INE'];
    
    const provinceMunicipalities = loadedMunicipalities.filter(feature => {
      const props = feature.properties || {};
      const natcode = props.NATCODE || '';
      return natcode.length >= 8 && natcode.slice(6, 8) === provinciaCode;
    });
    
    let municipalityForBackground = null;
    for(const feature of provinceMunicipalities) {
      const props = feature.properties || {};
      const natcode = props.NATCODE || '';
      
      if(natcode.length >= 11) {
        const municipioNatCode = natcode.slice(8, 11);
        const municipioNatCodeNum = parseInt(municipioNatCode, 10);
        const municipioINECodeNum = parseInt(municipioINECode, 10);
        
        if(municipioNatCodeNum === municipioINECodeNum) {
          municipalityForBackground = feature;
          break;
        }
      }
    }
    
    if(!municipalityForBackground) {
      throw new Error('Municipio no encontrado para fondo');
    }
    
    const backgroundColor = document.getElementById('colorPickerBackground').value || '#e0e0e0';
    
    sigpacMunicipalityLayer = L.geoJSON(municipalityForBackground, {
      style: {
        color: '#333',
        weight: 1,
        fillColor: backgroundColor,
        fillOpacity: 0.8
      }
    }).addTo(mapC);
    
    const parcelPromises = references.map(ref => loadParcelFromSIGPAC(ref));
    const parcelResults = await Promise.allSettled(parcelPromises);
    
    const successfulParcels = [];
    for (let i = 0; i < parcelResults.length; i++) {
      if (parcelResults[i].status === 'fulfilled') {
        successfulParcels.push(parcelResults[i].value);
      }
    }
    
    if (successfulParcels.length === 0) {
      throw new Error('No se pudo cargar ninguna parcela');
    }
    
    const selectionColor = document.getElementById('colorPickerSelection').value;
    
    successfulParcels.forEach((parcelaFeature) => {
      const parcelLayer = L.geoJSON(parcelaFeature, {
        style: {
          color: '#000',
          weight: 3,
          fillColor: selectionColor,
          fillOpacity: 0.7
        }
      }).addTo(mapC);
      
      currentSelectedParcels.push(parcelLayer);
    });
    
    const showCircle = document.getElementById('circleToggle').value === 'si';
    if (showCircle) {
      successfulParcels.forEach(parcelaFeature => {
        addCircleAroundParcel(parcelaFeature);
      });
    }
    
    if (currentSelectedParcels.length > 0) {
      let combinedBounds = currentSelectedParcels[0].getBounds();
      currentSelectedParcels.forEach(parcel => {
        combinedBounds = combinedBounds.extend(parcel.getBounds());
      });
      
      const municipioBounds = sigpacMunicipalityLayer.getBounds();
      combinedBounds = combinedBounds.extend(municipioBounds);
      
      mapC.fitBounds(combinedBounds.pad(0.05));
      document.getElementById('zoom-slider-3').value = mapC.getZoom();
    } else {
      const municipioBounds = sigpacMunicipalityLayer.getBounds();
      mapC.fitBounds(municipioBounds.pad(0.02));
      document.getElementById('zoom-slider-3').value = mapC.getZoom();
    }
    
    setTimeout(() => addCoordinatesToMap(mapC, 'map-container-3'), 300);
    
  } catch(error) {
    console.error('Error in highlightParcels:', error);
    alert('Error al procesar las parcelas: ' + error.message);
  } finally {
    loadingDiv.remove();
  }
}

async function loadParcelFromSIGPAC(refCatastral) {
  try {
    const provincia = parseInt(refCatastral.slice(0, 2));
    const municipio_catastro = parseInt(refCatastral.slice(2, 5));
    
    const partes = refCatastral.split('A');
    if (partes.length < 2) {
      throw new Error('Formato de referencia catastral inválido');
    }
    
    const poligono = parseInt(partes[1].slice(0, 3));
    const parcela = parseInt(partes[1].slice(3, 8));
    
    const filtro = `provincia=${provincia} AND municipio=${municipio_catastro} AND poligono=${poligono} AND parcela=${parcela}`;
    
    const params = {
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typeName: "AU.Sigpac:recinto",
      outputFormat: "application/json",
      CQL_FILTER: filtro
    };

    const response = await fetch(`${SIGPAC_WFS_URL}?${new URLSearchParams(params)}`);
    
    if (!response.ok) {
      throw new Error(`Error WFS: ${response.status} ${response.statusText}`);
    }

    const geojsonData = await response.json();
    
    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('No se encontró la parcela en SIGPAC');
    }

    return geojsonData.features[0];
    
  } catch(error) {
    console.error('Error loading SIGPAC parcel:', error);
    throw error;
  }
}

function addCircleAroundParcel(parcelaFeature) {
  try {
    const centroid = turf.centroid(parcelaFeature);
    const center = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
    
    const bbox = turf.bbox(parcelaFeature);
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];
    
    const maxDimension = Math.max(width, height);
    
    const baseRadius = maxDimension * 0.05;
    const adjustedRadius = baseRadius * (circleSizeFactor / 10) * 10;
    
    const maxRadius = maxDimension * 10;
    const finalRadius = Math.min(adjustedRadius, maxRadius);
    
    const radiusInMeters = finalRadius * 111320;
    
    const selectionColor = document.getElementById('colorPickerSelection').value;
    
    const circle = L.circle(center, {
      radius: radiusInMeters,
      color: selectionColor,
      weight: 3,
      fillColor: 'none',
      dashArray: '5,5',
      opacity: 1,
      fillOpacity: 0
    }).addTo(mapC);
    
    currentCircles.push(circle);
    
  } catch(error) {
    console.error('Error creating circle:', error);
    const bounds = L.geoJSON(parcelaFeature).getBounds();
    const center = bounds.getCenter();
    const size = Math.max(bounds.getNorth() - bounds.getSouth(), bounds.getEast() - bounds.getWest());
    
    const selectionColor = document.getElementById('colorPickerSelection').value;
    const adjustedRadius = size * 500000 * (circleSizeFactor / 10);
    
    const circle = L.circle(center, {
      radius: adjustedRadius,
      color: selectionColor,
      weight: 3,
      fillColor: 'none',
      dashArray: '5,5'
    }).addTo(mapC);
    
    currentCircles.push(circle);
  }
}

function updateCircles() {
  currentCircles.forEach(circle => mapC.removeLayer(circle));
  currentCircles = [];
  
  if (document.getElementById('circleToggle').value === 'si') {
    currentSelectedParcels.forEach(parcel => {
      addCircleAroundParcel(parcel.toGeoJSON());
    });
  }
}

function autoDetectFields(properties) {
  if(!properties) return [];
  const keys = Object.keys(properties);
  const cand = [];
  const words = ['nat','cod','prov','ine','codigo','code'];
  
  keys.forEach(k => {
    const kl = k.toLowerCase();
    if(words.some(w => kl.includes(w))) cand.push(k);
  });
  
  return cand.length > 0 ? cand : Object.keys(properties).slice(0, 3);
}

// Función de exportación para Mapa 1 MEJORADA
function exportMap1ToImage() {
    const mapsContainer = document.getElementById('maps-container');
    
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
    loading.innerHTML = 'Generando imagen del Mapa Múltiple...';
    document.body.appendChild(loading);
    
    // Forzar actualización de los mapas
    setTimeout(() => {
        if (mapA) mapA.invalidateSize();
        if (mapB) mapB.invalidateSize();
        if (mapC) mapC.invalidateSize();
    }, 100);
    
    // Esperar a que todo se renderice
    setTimeout(() => {
        html2canvas(mapsContainer, {
            useCORS: true,
            allowTaint: false,
            scale: 2, // Mayor calidad
            logging: true,
            width: mapsContainer.scrollWidth,
            height: mapsContainer.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                // Ocultar handles de redimensionado
                const resizeHandles = clonedDoc.querySelectorAll('.star-resize-handle');
                resizeHandles.forEach(handle => {
                    handle.style.display = 'none';
                });
                
                // Asegurar que la estrella se muestre correctamente
                const clonedStar = clonedDoc.getElementById('custom-star');
                if (clonedStar) {
                    clonedStar.style.display = isStarVisible ? 'block' : 'none';
                }
                
                // Forzar actualización de mapas en el clon
                const clonedMaps = clonedDoc.querySelectorAll('#map-a, #map-b, #map-c');
                clonedMaps.forEach(map => {
                    map.style.width = '100%';
                    map.style.height = '100%';
                });
            }
        }).then(canvas => {
            // Remover loading
            document.body.removeChild(loading);
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.download = 'mapa_multiple_' + new Date().getTime() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            console.log('✅ Imagen del Mapa Múltiple generada correctamente');
        }).catch(error => {
            console.error('Error al generar la imagen del Mapa Múltiple:', error);
            alert('Error al generar la imagen. Inténtalo de nuevo.');
            document.body.removeChild(loading);
        });
    }, 1500);
}

(function(){
  const turfScript = document.createElement('script');
  turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
  turfScript.onload = function() {
    initMaps();
  };
  document.head.appendChild(turfScript);
  
  document.getElementById('btn-process-ref').addEventListener('click', processReference);
  document.getElementById('refInput').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') processReference();
  });
  
  // Añadir event listener para el botón de exportación del Mapa 1
  document.getElementById('btn-export-image-map1').addEventListener('click', exportMap1ToImage);
  
  document.getElementById('colorPickerBackground').addEventListener('change', function() {
    if(provincesLayer) {
      provincesLayer.setStyle({
        fillColor: this.value,
        fillOpacity: 1
      });
    }
    
    if(municipalitiesLayer) {
      municipalitiesLayer.setStyle({
        fillColor: this.value,
        fillOpacity: 0.8
      });
    }
    
    if(sigpacMunicipalityLayer) {
      sigpacMunicipalityLayer.setStyle({
        fillColor: this.value,
        fillOpacity: 0.8
      });
    }
  });

  document.getElementById('colorPickerSelection').addEventListener('change', function() {
    const selectionColor = this.value;
    
    if(currentSelectedProvince) {
      currentSelectedProvince.setStyle({ fillColor: selectionColor });
    }
    
    if(currentSelectedMunicipality) {
      currentSelectedMunicipality.setStyle({ fillColor: selectionColor });
    }
    
    currentSelectedParcels.forEach(parcel => {
      parcel.setStyle({ fillColor: selectionColor });
    });
    
    currentCircles.forEach(circle => {
      circle.setStyle({ color: selectionColor });
    });
  });

  document.getElementById('circleToggle').addEventListener('change', function() {
    if(currentSelectedParcels.length > 0 && this.value === 'si') {
      currentSelectedParcels.forEach(parcel => {
        addCircleAroundParcel(parcel.toGeoJSON());
      });
    } else {
      currentCircles.forEach(circle => mapC.removeLayer(circle));
      currentCircles = [];
    }
  });
})();