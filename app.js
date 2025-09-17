/* app.js - Mapa Emplazamiento en 3 paneles
   Requisitos: debes poner las URLs reales de shp1.zip, shp2.zip y map_municipios.csv
*/

///////////////////// CONFIG - PON AQUÍ TUS URLS /////////////////////
const URL_SHP_PROVINCIAS = "https://tu-hosting/shp1_provincias.zip"; // shp1 (provincias)
const URL_SHP_MUNICIPIOS = "https://tu-hosting/shp2_municipios.zip"; // shp2 (municipios/terminos)
const URL_CSV_MUNICIPIOS = "https://tu-hosting/map_municipios.csv"; // CSV con columnas Municipio, Municipio INE
//////////////////////////////////////////////////////////////////////

// Variables globales para mapas y capas
let mapA, mapB, mapC;
let layerProvincias = null;
let layerMunicipios = null;
let selProvinceLayer = null;
let selMunicipioLayer = null;
let csvMapping = null;

function setStatus(txt){
  document.getElementById('status').innerText = txt || '';
}

/* Util: extraer provincia (2 dígitos) y municipio (3 dígitos) de la referencia */
function parseReference(ref){
  // quitamos espacios y nos quedamos con los primeros 5 caracteres relevantes
  const clean = ref.trim();
  if(clean.length < 5) return null;
  const prov = clean.slice(0,2);
  const mun = clean.slice(2,5);
  return {prov, mun};
}

/* FUNCIONES DE INICIALIZACIÓN DE MAPAS */
function initMaps(){
  // Mapa A (España - provincias)
  mapA = L.map('map-a', { attributionControl: false, zoomControl: true }).setView([40.0, -4.0], 6);

  // Mapa B (Provincia con municipios)
  mapB = L.map('map-b', { attributionControl: false, zoomControl: true }).setView([40.0, -4.0], 8);

  // Mapa C (Municipio ampliado) - sin capas base OSM por defecto si quieres fondo neutro
  mapC = L.map('map-c', { attributionControl: false, zoomControl: true }).setView([40.0, -4.0], 10);

  // Si quieres fondo OSM (opcional) descomenta estas líneas:
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 });
  osm.addTo(mapA);
  osm.addTo(mapB);
  osm.addTo(mapC);
}

/* Cargar CSV de mapeo Municipio -> Municipio INE */
function loadCSVMapping(){
  return new Promise((resolve, reject) => {
    Papa.parse(URL_CSV_MUNICIPIOS, {
      download: true,
      header: true,
      complete: function(results){
        csvMapping = results.data;
        setStatus('CSV de mapeo cargado.');
        resolve();
      },
      error: function(err){ reject(err); }
    });
  });
}

/* Cargar shapefile zipped usando shpjs y añadir a mapa */
async function loadShapefiles(){
  setStatus('Cargando shapefiles (esto puede tardar unos segundos)...');

  // Cargar provincias (shp1)
  const geojsonProvincias = await shp(URL_SHP_PROVINCIAS);
  layerProvincias = L.geoJSON(geojsonProvincias, {
    style: () => ({ color:'#333', weight:1, fillColor:'#fff6d6', fillOpacity:1 }),
    onEachFeature: (f, layer) => {
      const code = f.properties.NATCODE || f.properties.natcode || f.properties.CODIGO || '';
      layer.bindTooltip(code || 'Provincia');
    }
  }).addTo(mapA);
  mapA.fitBounds(layerProvincias.getBounds());

  // Cargar municipios (shp2)
  const geojsonMunicipios = await shp(URL_SHP_MUNICIPIOS);
  layerMunicipios = L.geoJSON(geojsonMunicipios, {
    style: ()=> ({ color:'#444', weight:0.6, fillColor:'#fff9e6', fillOpacity:1 }),
    onEachFeature: (f, layer) => {
      const code = f.properties.NATCODE || f.properties.natcode || f.properties.CODIGO || '';
      layer.bindTooltip(code || 'Municipio');
    }
  }).addTo(mapB);
  mapB.fitBounds(layerMunicipios.getBounds());

  setStatus('Shapefiles cargados.');
}

/* Buscar y pintar provincia y municipio según referencia */
function highlightFromReference(ref){
  setStatus('Procesando referencia...');
  const parsed = parseReference(ref);
  if(!parsed){ setStatus('Referencia inválida (menos de 5 caracteres).'); return; }
  const provCode = parsed.prov;
  const munCode = parsed.mun;

  // 1) Encontrar la provincia en layerProvincias
  if(selProvinceLayer){ mapA.removeLayer(selProvinceLayer); selProvinceLayer=null; }
  let foundProvFeature = null;
  layerProvincias.eachLayer(l => {
    const nat = (l.feature.properties.NATCODE || l.feature.properties.natcode || '').toString();
    // intentos de coincidencia: contienen provCode o terminan en provCode
    if(nat.includes(provCode) || nat.endsWith(provCode)) foundProvFeature = l.feature;
  });

  if(!foundProvFeature){
    setStatus('Provincia no encontrada automáticamente. Intentando coincidencias parciales...');
    // intentar coincidencias parciales por otros métodos (ej: buscar por nombre o por otros campos)
    // -- por simplicidad, si no la encontramos avisamos y paramos
    return;
  }

  // Dibujar provincia en mapA (resaltada)
  selProvinceLayer = L.geoJSON(foundProvFeature, { style: ()=> ({ color:'#000', weight:2, fillColor: document.getElementById('color-prov').value, fillOpacity:1 }) }).addTo(mapA);
  mapA.fitBounds(selProvinceLayer.getBounds());

  // 2) Filtrar municipios de esa provincia para mapB y buscar el municipio objetivo
  if(selMunicipioLayer){ mapB.removeLayer(selMunicipioLayer); selMunicipioLayer=null; }
  // Necesitamos el código combinado provincia+municipio (5 dígitos) según NATCODE en shp2
  // Pero primero convertimos municipio usando CSV si es necesario
  const mappedMun = mapMunicipioCode(munCode);
  const combinedCode = provCode + mappedMun; // ej "18" + "123" => "18123"
  let targetMunFeature = null;

  // Pintar solo municipios de la provincia en mapB: buscaremos aquellos cuya NATCODE contenga combinedCode
  const municipioFeatures = [];
  layerMunicipios.eachLayer(l => {
    const nat = (l.feature.properties.NATCODE || l.feature.properties.natcode || '').toString();
    if(nat.includes(combinedCode) || nat.endsWith(combinedCode)) {
      municipioFeatures.push(l.feature);
      // si coincide exactamente en los últimos 5 dígitos, lo marcamos como objetivo
      const tail = nat.slice(-5);
      if(tail === combinedCode) targetMunFeature = l.feature;
    }
  });

  // Si no hemos encontrado targetMunFeature por coincidencia exacta, intentar matching por 'contains' con munCode
  if(!targetMunFeature){
    municipioFeatures.forEach(f => {
      const nat = (f.properties.NATCODE||'').toString();
      if(nat.includes(munCode)) targetMunFeature = f;
    });
  }

  // Añadir todos los municipios de la provincia a mapB
  if(municipioFeatures.length > 0){
    const allMunLayer = L.geoJSON(municipioFeatures, { style: ()=> ({ color:'#666', weight:0.6, fillColor:'#fff9e6', fillOpacity:1 }) }).addTo(mapB);
    mapB.fitBounds(allMunLayer.getBounds());
  } else {
    setStatus('No se encontraron municipios para la provincia en shp2 (revisa NATCODE y mapeo).');
  }

  // Si encontramos el municipio objetivo, lo resaltamos en amarillo y lo mostramos en panel C
  if(targetMunFeature){
    selMunicipioLayer = L.geoJSON(targetMunFeature, { style: ()=> ({ color:'#000', weight:2, fillColor: document.getElementById('color-mun').value, fillOpacity:1 }) }).addTo(mapB);
    mapB.fitBounds(selMunicipioLayer.getBounds());
    // Panel C: mostrar solo el municipio en grande
    showMunicipioInC(targetMunFeature);
    setStatus('Provincia y municipio resaltados.');
  } else {
    setStatus('Municipio objetivo no encontrado con exactitud; aparecen municipios de la provincia.');
  }
}

/* Usar CSV mapping para transformar municipio (si existe) */
function mapMunicipioCode(munCode){
  if(!csvMapping) return munCode; // si no hay csv, devolvemos el original
  // Buscar fila donde col "Municipio" == munCode
  for(const row of csvMapping){
    if(row.Municipio && row.Municipio.trim() === munCode){
      return (row['Municipio INE'] || row['Municipio_INE'] || row['MunicipioINE'] || row['Municipio INE ']).toString().padStart(3,'0');
    }
  }
  // si no hay coincidencia devolver munCode tal cual (padded)
  return munCode.toString().padStart(3,'0');
}

/* Mostrar un único municipio en el panel C (ampliado) */
function showMunicipioInC(feature){
  // limpiar capas previas
  if(mapC._myMunLayer) { mapC.removeLayer(mapC._myMunLayer); mapC._myMunLayer = null; }
  const layer = L.geoJSON(feature, { style: ()=> ({ color:'#111', weight:2, fillColor: document.getElementById('color-mun').value, fillOpacity:1 }) }).addTo(mapC);
  mapC._myMunLayer = layer;
  mapC.fitBounds(layer.getBounds());
}

/* Inicia todo: mapas y carga de datos */
async function start(){
  setStatus('Iniciando...');
  initMaps();
  try {
    await loadCSVMapping();
  } catch(e){
    console.warn('No se pudo cargar CSV de mapeo:', e);
    setStatus('Aviso: no se pudo cargar CSV de mapeo. Continuando sin mapeo.');
  }
  try {
    await loadShapefiles();
  } catch(e){
    console.error('Error cargando shapefiles:', e);
    setStatus('Error cargando shapefiles. Revisa URLs y CORS.');
  }
  setStatus('Listo. Introduce referencia y pulsa Buscar.');
}

/* Eventos UI */
document.getElementById('btn-buscar').addEventListener('click', ()=> {
  const ref = document.getElementById('ref-cat').value;
  highlightFromReference(ref);
});
document.getElementById('btn-zoom-full').addEventListener('click', ()=> {
  if(mapC._myMunLayer) mapC.fitBounds(mapC._myMunLayer.getBounds());
});

/* arrancar */
start();
