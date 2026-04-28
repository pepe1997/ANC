// ===== BUSCAR PEDIDO =====

let pendientes = JSON.parse(localStorage.getItem("pendientesPedido") || "{}");
let stockLPN = JSON.parse(localStorage.getItem("stockLPN") || "{}");

function abrirBuscarPedido() {

  procesarDatos();

  let html = `
    <div class="panel">
      <h2>🔎 Buscar Pedido</h2>

      <div class="botones">
        <input id="filtroCodigo" placeholder="Buscar Código" onkeyup="filtrarBusqueda()">
        <input id="filtroDesc" placeholder="Buscar Descripción" onkeyup="filtrarBusqueda()">
        <input id="filtroLpn" placeholder="Buscar LPN" onkeyup="filtrarBusqueda()">

        <button class="btn-export" onclick="reiniciarPendientes()">♻ Reiniciar</button>
      </div>

      <div id="tablaBusqueda"></div>
    </div>
  `;

  document.getElementById("modulo").innerHTML = html;

  filtrarBusqueda();
}

function filtrarBusqueda() {

  let codigo = document.getElementById("filtroCodigo").value.toLowerCase();
  let desc = document.getElementById("filtroDesc").value.toLowerCase();
  let lpn = document.getElementById("filtroLpn").value.toLowerCase();

  let data = window.otrasData.filter(x => {

    return (
      x.codigo.toLowerCase().includes(codigo) &&
      x.desc.toLowerCase().includes(desc) &&
      x.lpn.toLowerCase().includes(lpn)
    );
  });

  let html = `
    <table>
      <tr>
        <th>LPN</th>
        <th>CODIGO</th>
        <th>Q</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>PENDIENTE</th>
        <th>BULTOS</th>
        <th>ESTADO</th>
        <th>ACCION</th>
        <th>DETALLE</th>
      </tr>
  `;

  data.forEach((r) => {

    let key = r.codigo;
    let pendiente = pendientes[key] ?? r.requerido;

    let keyLpn = r.lpn;
    let stockActual = stockLPN[keyLpn] ?? r.bultos;

    let estado = pendiente <= 0
      ? "✅ COMPLETO"
      : "⏳ FALTAN " + pendiente;

    let quiebre = false;

    try{
      quiebre = esQuiebre(r.codigo);
    }catch(e){}

    let estilo = "";

    if (pendiente <= 0){
      estilo = "background:#dcfce7;";
    }

    if (quiebre){
      estilo = "background:#fee2e2;font-weight:bold;";
    }

    html += `
      <tr style="${estilo}">
        <td>${r.lpn}</td>
        <td>${r.codigo}</td>
        <td>${quiebre ? "🔥" : ""}</td>
        <td>${r.desc}</td>
        <td>${r.ubicacion || "PALETERO"}</td>
        <td>${pendiente}</td>
        <td>${stockActual}</td>
        <td>${estado}</td>

        <td>
          <button onclick="tomarStock('${r.codigo}','${r.lpn}',${r.bultos},${r.requerido})">
            ➖ Tomar
          </button>
        </td>

        <td>
          <button onclick="verContenidoLPN('${r.lpn}')">
            👁 Ver
          </button>
        </td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("tablaBusqueda").innerHTML = html;
}

function tomarStock(codigo, lpn, bultos, requerido) {

  let pendiente = pendientes[codigo] ?? requerido;
  let stock = stockLPN[lpn] ?? bultos;

  if (pendiente <= 0 || stock <= 0) return;

  // tomar solo lo necesario
  let tomado = Math.min(pendiente, stock);

  // actualizar pendiente pedido
  let nuevoPendiente = pendiente - tomado;
  if (nuevoPendiente < 0) nuevoPendiente = 0;

  pendientes[codigo] = nuevoPendiente;

  // actualizar stock real del LPN
  let nuevoStock = stock - tomado;
  if (nuevoStock < 0) nuevoStock = 0;

  stockLPN[lpn] = nuevoStock;

  localStorage.setItem("pendientesPedido", JSON.stringify(pendientes));
  localStorage.setItem("stockLPN", JSON.stringify(stockLPN));

  filtrarBusqueda();
}

function reiniciarPendientes() {

  if (confirm("¿Reiniciar avances?")) {
    pendientes = {};
    stockLPN = {};

    localStorage.removeItem("pendientesPedido");
    localStorage.removeItem("stockLPN");

    filtrarBusqueda();
  }
}
function verContenidoLPN(lpn){

  let data = dataLPN.filter(x =>
    String(x["LPN"] || "").trim() === String(lpn).trim()
  );

  let html = `
    <h3>📦 Contenido LPN ${lpn}</h3>

    <button class="btn-export" onclick="filtrarBusqueda()">⬅ Volver</button>

    <table>
      <tr>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>BULTOS</th>
        <th>UBICACION</th>
      </tr>
  `;

  data.forEach(r => {
    html += `
      <tr>
        <td>${r["CODIGO"]}</td>
        <td>${r["DESCRIPCION"]}</td>
        <td>${r["BULTOS"]}</td>
        <td>${r["UBICACION"] || "PALETERO"}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("tablaBusqueda").innerHTML = html;
}