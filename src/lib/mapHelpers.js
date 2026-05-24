export function parseMapData(jsonString) {
  try {
    let parsed = jsonString;
    // Jika masih berupa string (dari localStorage/paste), parse jadi object JSON
    if (typeof jsonString === 'string') {
      parsed = JSON.parse(jsonString);
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Format salah: Data koordinat harus diawali dan diakhiri dengan tanda kurung siku (array).');
    }
    
    // Normalize format to support Leaflet (requires [lat, lng])
    const normalized = parsed.map((item, idx) => {
      const id = item.ref || item.id || `obj_${Date.now()}_${idx}`;
      const name = item.input || item.name || `Object ${idx+1}`;
      
      let type = item.geometryType;
      let coords = item.coordinates;
      
      if (!Array.isArray(coords)) {
        throw new Error(`Data koordinat invalid pada item "${name}"`);
      }
      
      // Inference jika tipe tak dideklarasikan
      if (!type) {
        if (coords.length === 1 && Array.isArray(coords[0])) {
          type = 'point';
        } else if (coords.length > 1) {
          type = 'line';
        } else if (coords.length === 2 && typeof coords[0] === 'number') {
          // Format flat [115.1, -2.7]
          type = 'point';
          coords = [coords];
        }
      }
      
      // Konversi [lng, lat] ke Leaflet [lat, lng]
      const leafletCoords = coords.map(c => {
        if (Array.isArray(c) && c.length >= 2) {
          // Jika nilai origin longitude (>90, Indonesia) ada di indeks 0, balik ke indeks 1 untuk Leaflet.
          if (Math.abs(c[0]) > 90 && Math.abs(c[1]) <= 90) {
            return [Number(c[1]), Number(c[0])]; // Flip to [lat, lng]
          }
          return [Number(c[0]), Number(c[1])]; // Sudah format [lat, lng]
        }
        return c;
      });

      let finalCoords;
      if (type === 'point' || type === 'marker') {
        finalCoords = leafletCoords[0]; // titik hanya [lat, lng]
        type = 'marker';
      } else {
        finalCoords = leafletCoords; // line berupa array of [lat, lng]
        type = 'polyline';
      }

      return { id, name, type, coordinates: finalCoords };
    });
    
    return { data: normalized, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}
