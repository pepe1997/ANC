// ===============================
// 📦 INVENTARIO INTELIGENTE (LIMPIO)
// ===============================

// ===== UTIL =====
function extraerPasillo(ubi){
  let p = String(ubi || "").split("-");
  return p[1] ? p[1].padStart(2,"0") : "00";
}

function ordenarUbicacion(a,b){

  function parse(u){
    let p = String(u || "").split("-");
    return {
      pasillo: Number(p[1]) || 0,
      bahia: Number(p[2]) || 0,
      nivel: Number(p[3]) || 0,
      col: Number(p[4]) || 0
    };
  }

  let ua = parse(a);
  let ub = parse(b);

  if(ua.pasillo !== ub.pasillo) return ua.pasillo - ub.pasillo;
  if(ua.bahia !== ub.bahia) return ua.bahia - ub.bahia;
  if(ua.nivel !== ub.nivel) return ua.nivel - ub.nivel;
  return ua.col - ub.col;
}

// ===============================
// 📦 ABRIR INVENTARIO
// ===============================
function abrirInventario(){

  if(!Array.isArray(dataInventario) || dataInventario.length === 0){
    document.getElementById("modulo").innerHTML = "⏳ Cargando inventario...";
    setTimeout(abrirInventario,500);
    return;
  }

  document.getElementById("modulo").innerHTML = `
    <div class="panel">

      <h2>📦 Inventario Inteligente</h2>

      <div class="botones">
        <button onclick="verInventarioGeneral()">📋 General</button>
        <button onclick="verPasillos()">🚶 Pasillos</button>
      </div>

      <div id="vistaInventario"></div>

    </div>
  `;

  verInventarioGeneral();
}

// ===============================
// 📋 GENERAL
// ===============================
function verInventarioGeneral(){

  document.getElementById("vistaInventario").innerHTML = `
    <div class="botones">
      <input id="buscaCodigoInv" placeholder="Código" onkeyup="filtrarInventarioPro()">
      <input id="buscaDescInv" placeholder="Descripción" onkeyup="filtrarInventarioPro()">

      <button onclick="setFiltro('todos')">Todo</button>
      <button onclick="setFiltro('sin')">🔴 Sin Stock</button>
      <button onclick="setFiltro('bajo')">🟡 Bajo</button>
    </div>

    <div id="tablaInventario"></div>
  `;

  window.filtroInventario = "todos";

  filtrarInventarioPro();
}

function setFiltro(tipo){
  window.filtroInventario = tipo;
  filtrarInventarioPro();
}

function filtrarInventarioPro(){

  let codigo = document.getElementById("buscaCodigoInv").value.toLowerCase();
  let desc   = document.getElementById("buscaDescInv").value.toLowerCase();

  let data = dataInventario.filter(x => {

    let cod = String(x["PRODUCTO"] || "").toLowerCase();
    let des = String(x["DESCRIPCION"] || "").toLowerCase();
    let b = Number(x["DISPONIBLE-BULTOS"] || 0);

    let pasaFiltro =
      window.filtroInventario === "todos" ||
      (window.filtroInventario === "sin" && b === 0) ||
      (window.filtroInventario === "bajo" && b > 0 && b <= 3);

    return cod.includes(codigo) && des.includes(desc) && pasaFiltro;
  });

  data.sort((a,b)=>
    ordenarUbicacion(a["UBICACION"], b["UBICACION"])
  );

  renderTabla(data);
}

// ===============================
// 🚶 PASILLOS
// ===============================
function verPasillos(){

  let mass = dataInventario.filter(x =>
    String(x["UBICACION"] || "").startsWith("Mass-")
  );

  let mapa = {};

  mass.forEach(r=>{
    let p = extraerPasillo(r["UBICACION"]);
    if(!mapa[p]) mapa[p] = [];
    mapa[p].push(r);
  });

  let html = "";

  Object.keys(mapa).sort().forEach(p=>{

    let data = mapa[p].sort((a,b)=>
      ordenarUbicacion(a["UBICACION"], b["UBICACION"])
    );

    let sin = data.filter(x=> Number(x["DISPONIBLE-BULTOS"]||0)===0).length;
    let bajo = data.filter(x=> {
      let b = Number(x["DISPONIBLE-BULTOS"]||0);
      return b>0 && b<=3;
    }).length;

    html += `
      <div style="margin-bottom:25px;">
        <h3>🚶 PASILLO ${p}</h3>
        <div style="margin-bottom:8px;">
          🔴 ${sin} &nbsp; 🟡 ${bajo} &nbsp; 📦 ${data.length}
        </div>
        ${crearTablaSimple(data)}
      </div>
    `;
  });

  document.getElementById("vistaInventario").innerHTML = html;
}

// ===============================
// 🧱 TABLA
// ===============================
function crearTablaSimple(data){

  let html = `
    <table>
      <tr>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>BULTOS</th>
      </tr>
  `;

  data.forEach(r=>{
    let b = Number(r["DISPONIBLE-BULTOS"]||0);

    let color =
      b===0 ? "#fee2e2" :
      b<=3 ? "#fef9c3" :
      "#dcfce7";

    html += `
      <tr style="background:${color}">
        <td>${r["PRODUCTO"]}</td>
        <td>${r["DESCRIPCION"]}</td>
        <td>${r["UBICACION"]}</td>
        <td>${b}</td>
      </tr>
    `;
  });

  html += "</table>";

  return html;
}

function renderTabla(data){
  document.getElementById("tablaInventario").innerHTML =
    crearTablaSimple(data);
}