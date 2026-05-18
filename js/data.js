// ===== URL GOOGLE SHEETS =====
const SHEET_ID = "1-v6vXjHpLlIn0-_lVZw0BtGopnxSHH0zqoOrW8aBwcg";

// ===== DATA GLOBAL =====
let dataPedido = [];
let dataLPN = [];
let dataInventario = [];
let dataQuiebre = [];
let dataProductos = [];
let dataUbicaciones = [];
let dataBloqueo = [];
let datosListos = false;

// ===== CARGAR DATA =====
async function cargarHoja(nombre) {
  const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${nombre}`);
  if(!res.ok) throw new Error(`No se pudo cargar ${nombre}`);
  return await res.json();
}

async function cargarDatos() {

  try {

    dataPedido = await cargarHoja("PEDIDO");
    dataLPN = await cargarHoja("LPNS");
    dataInventario = await cargarHoja("INV_ACTIVO");
    dataQuiebre = await cargarHoja("QUIEBRES");
    dataProductos = await cargarHoja("PRODUCTOS");
    dataUbicaciones = await cargarHoja("UBICACION");

    try {
      dataBloqueo = await cargarHoja("BLOQUEO");
    } catch (errorBloqueo) {
      dataBloqueo = [];
      console.warn("No se pudo cargar BLOQUEO:", errorBloqueo);
    }

    datosListos = true;

    console.log("✅ Datos cargados");
    console.log("PEDIDO:", dataPedido.length);
    console.log("LPN:", dataLPN.length);
    console.log("BLOQUEO:", dataBloqueo.length);

  } catch (error) {
    console.error("❌ Error cargando datos:", error);
  }
}

cargarDatos();