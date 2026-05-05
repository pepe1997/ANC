// ===== BUSCAR PEDIDO PRO FINAL + FIX REINICIO + DECIMALES =====

let pendientes = JSON.parse(localStorage.getItem("pendientesPedido") || "{}");
let stockLPN = JSON.parse(localStorage.getItem("stockLPN") || "{}");
let stockInicial = JSON.parse(localStorage.getItem("stockInicial") || "{}");

let dataAgrupada = [];

// ===============================
function abrirBuscarPedido() {

  procesarDatos();

  // 🔥 GUARDAR ORIGINAL SOLO UNA VEZ
  window.otrasData.forEach(r=>{
    if(r.requeridoOriginal === undefined){
      r.requeridoOriginal = Number(r.requerido) || 0;
    }
  });

  agruparData();

  document.getElementById("modulo").innerHTML = `
    <div class="panel">
      <h2>🔎 Buscar Pedido</h2>

      <div class="botones">
        <input id="filtroCodigo" placeholder="Buscar Código" onkeyup="filtrarBusqueda()">
        <input id="filtroDesc" placeholder="Buscar Descripción" onkeyup="filtrarBusqueda()">
        <input id="filtroLpn" placeholder="Buscar LPN" onkeyup="filtrarBusqueda()">

        <button onclick="reiniciarPendientes()">♻ Reiniciar</button>
      </div>

      <div id="kpiBusqueda"></div>
      <div id="tablaBusqueda"></div>
    </div>
  `;

  filtrarBusqueda();
}

// ===============================
// 🔥 AGRUPAR POR LPN + CODIGO
// ===============================
function agruparData(){

  let mapa = {};

  window.otrasData.forEach(r=>{

    let key = `${r.lpn}|${r.codigo}`;

    if(!mapa[key]){
      mapa[key] = {
        lpn: r.lpn,
        codigo: r.codigo,
        desc: r.desc,
        ubicacion: r.ubicacion,
        requerido: num(r.requeridoOriginal ?? r.requerido), // 🔥 FIX
        bultos: 0
      };
    }

    mapa[key].bultos += Number(r.bultos) || 0;
  });

  dataAgrupada = Object.values(mapa);

  // 🔥 STOCK INICIAL SOLO UNA VEZ
  dataAgrupada.forEach(r=>{
    let key = `${r.lpn}|${r.codigo}`;
    if(stockInicial[key] === undefined){
      stockInicial[key] = r.bultos;
    }
  });

  localStorage.setItem("stockInicial", JSON.stringify(stockInicial));
}

// ===============================
// 🔥 FIX DECIMALES (SIN FLOOR)
// ===============================
function num(n){
  let val = Number(n) || 0;

  if(Number.isInteger(val)){
    return val;
  }

  return Number(val.toFixed(3));
}

// ===============================
// 🔥 SOLO VISUAL
// ===============================
function format(n){
  let val = Number(n) || 0;

  if(Number.isInteger(val)) return val;

  return val.toFixed(3);
}

// ===============================
function filtrarBusqueda() {

  let codigo = document.getElementById("filtroCodigo").value.toLowerCase();
  let desc = document.getElementById("filtroDesc").value.toLowerCase();
  let lpn = document.getElementById("filtroLpn").value.toLowerCase();

  let data = dataAgrupada.filter(x => {

    return (
      x.codigo.toLowerCase().includes(codigo) &&
      x.desc.toLowerCase().includes(desc) &&
      x.lpn.toLowerCase().includes(lpn)
    );
  });

  // ===============================
  // 📊 KPI
  // ===============================
  let productos = new Set(data.map(x=>x.codigo)).size;
  let pendienteTotal = 0;
  let completos = 0;

  data.forEach(r=>{
    let p = num(pendientes[r.codigo] ?? r.requerido);
    if(p === 0) completos++;
    else pendienteTotal += p;
  });

  document.getElementById("kpiBusqueda").innerHTML = `
    <div style="margin-bottom:10px;font-weight:bold;">
      📦 Productos: ${productos} |
      ⏳ Pendiente: ${format(pendienteTotal)} |
      ✅ Completos: ${completos}
    </div>
  `;

  // ===============================
  // 🧾 TABLA
  // ===============================
  let html = `
    <table>
      <tr>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>PENDIENTE</th>
        <th>STOCK</th>
        <th>ESTADO</th>
        <th>ACCION</th>
      </tr>
  `;

  data.forEach(r => {

    let pendiente = num(pendientes[r.codigo] ?? r.requerido);
    let key = `${r.lpn}|${r.codigo}`;

    let stockActual = num(stockLPN[key] ?? r.bultos);
    let stockIni = num(stockInicial[key] ?? r.bultos);

    let tomado = Math.min(pendiente, stockActual);

    let estado = "";
    let accion = "";
    let estilo = "";

    if(pendiente === 0){
      estado = "✅ COMPLETO";
      accion = "✔";
      estilo = "background:#dcfce7;";
    }
    else if(stockIni > 0 && stockActual === 0){
      estado = "🔴 USADO COMPLETO";
      accion = "✔";
      estilo = "background:#fee2e2;";
    }
    else if(stockIni === 0){
      estado = "🚫 SIN STOCK";
      accion = "❌";
      estilo = "background:#fee2e2;";
    }
    else{
      estado = "🟡 DISPONIBLE";
      accion = `
        <button onclick="tomarStock('${r.codigo}','${r.lpn}',${r.bultos},${r.requerido})">
          ➖ (${format(tomado)})
        </button>
      `;
    }

    html += `
      <tr style="${estilo}">
        <td>${r.lpn}</td>
        <td>${r.codigo}</td>
        <td>${r.desc}</td>
        <td>${r.ubicacion || "PALETERO"}</td>
        <td><b>${format(pendiente)}</b></td>
        <td>${format(stockActual)}</td>
        <td>${estado}</td>
        <td>${accion}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("tablaBusqueda").innerHTML = html;
}

// ===============================
function tomarStock(codigo, lpn, bultos, requerido) {

  let pendiente = num(pendientes[codigo] ?? requerido);
  let key = `${lpn}|${codigo}`;
  let stock = num(stockLPN[key] ?? bultos);

  if(pendiente <= 0 || stock <= 0) return;

  let tomado = Math.min(pendiente, stock);

  pendientes[codigo] = num(pendiente - tomado);
  stockLPN[key] = num(stock - tomado);

  localStorage.setItem("pendientesPedido", JSON.stringify(pendientes));
  localStorage.setItem("stockLPN", JSON.stringify(stockLPN));

  if(stock - tomado === 0){
    alert(`✔ Se tomó todo el stock del LPN ${lpn}`);
  }

  filtrarBusqueda();
}

// ===============================
function reiniciarPendientes() {

  if(confirm("¿Reiniciar avances?")){

    pendientes = {};
    stockLPN = {};
    stockInicial = {};

    localStorage.removeItem("pendientesPedido");
    localStorage.removeItem("stockLPN");
    localStorage.removeItem("stockInicial");

    window.otrasData.forEach(r=>{
      if(r.requeridoOriginal !== undefined){
        r.requerido = r.requeridoOriginal;
      }
    });

    abrirBuscarPedido();
  }
}