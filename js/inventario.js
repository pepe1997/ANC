// ===== INVENTARIO =====

function abrirInventario(){

  if(dataInventario.length === 0){
    document.getElementById("modulo").innerHTML = "⏳ Cargando datos...";
    setTimeout(abrirInventario,1000);
    return;
  }

  let html = `
    <div class="panel">

      <h2>📦 Inventario Activo</h2>

      <div class="botones">
        <input id="buscaCodigoInv"
               placeholder="Buscar Código"
               onkeyup="filtrarInventario()">

        <input id="buscaDescInv"
               placeholder="Buscar Descripción"
               onkeyup="filtrarInventario()">
      </div>

      <div id="tablaInventario"></div>

    </div>
  `;

  document.getElementById("modulo").innerHTML = html;

  filtrarInventario();
}

// ===== FILTRAR =====
function filtrarInventario(){

  let codigo = document.getElementById("buscaCodigoInv").value.toLowerCase();
  let desc   = document.getElementById("buscaDescInv").value.toLowerCase();

  let data = dataInventario.filter(x => {

    let cod = String(x["PRODUCTO"] || "").toLowerCase();
    let des = String(x["DESCRIPCION"] || "").toLowerCase();

    return (
      cod.includes(codigo) &&
      des.includes(desc)
    );
  });
  data.sort((a,b)=>{

    let ua = String(a["UBICACION"] || "");
    let ub = String(b["UBICACION"] || "");

  return ua.localeCompare(ub, undefined, {
    numeric:true,
    sensitivity:"base"
  });

  });

  let html = `
    <table>
      <tr>
        <th>CODIGO</th>
        <th>DESCRIPCION</th>
        <th>UBICACION</th>
        <th>FECHA EXP</th>
        <th>DISP. BULTOS</th>
        <th>DISP. UNIDADES</th>
      </tr>
  `;

  data.forEach(r => {

    let bultos = Number(r["DISPONIBLE-BULTOS"] || 0);

    let color = "";

    // 🔴 SIN STOCK
    if(bultos === 0){
      color = "background:#fee2e2;";
    }

    // 🟡 STOCK BAJO
    else if(bultos <= 3){
      color = "background:#fef9c3;";
    }

    // 🟢 STOCK NORMAL
    else{
      color = "background:#dcfce7;";
    }

    html += `
      <tr style="${color}">
        <td>${r["PRODUCTO"]}</td>
        <td>${r["DESCRIPCION"]}</td>
        <td>${r["UBICACION"]}</td>
        <td>${r["FECHA_EXP"] || ""}</td>
        <td>${r["DISPONIBLE-BULTOS"] || 0}</td>
        <td>${r["DISPONIBLE-UNIDADES"] || 0}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("tablaInventario").innerHTML = html;
}