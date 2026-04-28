// ===== URL GOOGLE SHEETS =====
const SHEET_ID = "1-v6vXjHpLlIn0-_lVZw0BtGopnxSHH0zqoOrW8aBwcg";

// ===== DATA GLOBAL =====
let dataPedido = [];
let dataLPN = [];
let dataInventario = [];
let dataQuiebre = [];
let dataProductos = [];
let datosListos = false;

// ===== CARGAR DATA =====
async function cargarDatos() {

  try {

    const resPedido = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/PEDIDO`);
    dataPedido = await resPedido.json();

    const resLPN = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/LPNS`);
    dataLPN = await resLPN.json();

    const resInv = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/INV_ACTIVO`);
    dataInventario = await resInv.json();

    const resQui = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/QUIEBRES`);
    dataQuiebre = await resQui.json();

    const resProd = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/PRODUCTOS`);
    dataProductos = await resProd.json();

    datosListos = true;

    console.log("✅ Datos cargados");
    console.log("PEDIDO:", dataPedido.length);
    console.log("LPN:", dataLPN.length);

  } catch (error) {
    console.error("❌ Error cargando datos:", error);
  }
}

cargarDatos();