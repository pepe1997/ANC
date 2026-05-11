// ===============================================
// 🧠 VALIDACION - SLOTTING INTELIGENTE
// ===============================================

// ===============================================
// 💾 MAXIMOS MANUALES
// ===============================================
let maximosManuales = JSON.parse(
  localStorage.getItem("maximosManuales") || "{}"
);

// ===============================================
// 💾 GUARDAR MAXIMO
// ===============================================
function guardarMaximo(codigo,valor){

  valor = Number(valor || 0);

  if(valor <= 0){

    delete maximosManuales[codigo];

  }else{

    maximosManuales[codigo] = valor;
  }

  localStorage.setItem(
    "maximosManuales",
    JSON.stringify(maximosManuales)
  );

  renderSlottingInteligente();
}

// ===============================================
// 🧠 RENDER PRINCIPAL
// ===============================================
function renderSlottingInteligente(){

  // ===============================================
  // 🔥 PRODUCTOS SIN UBICACION
  // ===============================================
  let codigos = [...new Set(

    dataLPN.map(x =>
      limpiarCodigo(x["CODIGO"])
    ).filter(x => x !== "")

  )];

  let sinUbi = [];

  codigos.forEach(cod => {

    let existe = dataInventario.some(i =>

      limpiarCodigo(i["PRODUCTO"]) === cod

    );

    if(!existe){

      sinUbi.push(cod);
    }

  });

  // ===============================================
  // 🔥 AGRUPAR
  // ===============================================
  let agrupado = {};

  dataLPN.forEach(x => {

    let cod = limpiarCodigo(x["CODIGO"]);

    if(!sinUbi.includes(cod)) return;

    if(!agrupado[cod]){

      agrupado[cod] = {

        codigo: cod,

        lpns: 0,

        bultos: 0
      };
    }

    agrupado[cod].lpns += 1;

    agrupado[cod].bultos += numeroReal(x["BULTOS"] || 0);

  });

  let base = Object.values(agrupado);

  // ===============================================
  // 🔥 PROMEDIO PEDIDO
  // ===============================================
  let pedidosValidos = dataPedido
    .map(x => numeroReal(x["BULTOS_REAL"]))
    .filter(x => x > 0);

  let promedioPedido =

    pedidosValidos.reduce((a,b)=>a+b,0) /

    (pedidosValidos.length || 1);

  // ===============================================
  // 🔥 MAPA PRODUCTOS
  // ===============================================
  let mapaProductos = {};

  dataProductos.forEach(p => {

    let cod = limpiarCodigo(p["CODIGO"]);

    mapaProductos[cod] = {

      alterno:
        p["CODIGO_ALT"] || "",

      descripcion:
        p["DESCRIPCION"] || "",

      uxb:
        numeroReal(p["UXB"] || 0),

      jerarquia:
        p["JERARQUIA2"] || "SIN JERARQUIA"
    };

  });

  // ===============================================
  // 🔥 MAPA PASILLOS
  // ===============================================
  let mapaPasillos = {};

  dataInventario.forEach(i => {

    let cod = limpiarCodigo(i["PRODUCTO"]);

    let prod = mapaProductos[cod];

    if(!prod) return;

    let jerarquia = prod.jerarquia;

    let ubi = String(i["UBICACION"] || "");

    let partes = ubi.split("-");

    if(partes.length < 3) return;

    let pasillo = partes[1];

    if(!mapaPasillos[pasillo]){

      mapaPasillos[pasillo] = {};
    }

    if(!mapaPasillos[pasillo][jerarquia]){

      mapaPasillos[pasillo][jerarquia] = 0;
    }

    mapaPasillos[pasillo][jerarquia]++;

  });

  // ===============================================
  // 🔥 PASILLO DOMINANTE
  // ===============================================
  let pasilloDominante = {};

  Object.keys(mapaPasillos).forEach(p => {

    let data = mapaPasillos[p];

    let max = 0;

    let ganador = "";

    Object.keys(data).forEach(j => {

      if(data[j] > max){

        max = data[j];

        ganador = j;
      }

    });

    pasilloDominante[p] = ganador;

  });

  // ===============================================
  // 🔥 UBICACIONES LIBRES
  // ===============================================
  let ubicacionesLibres = dataUbicaciones.filter(u => {

    let tipo =
      String(u["TIPO_UBICACION"] || "")
      .toLowerCase();

    let producto =
      String(u["PRODUCTO"] || "")
      .trim();

    return (

      tipo.includes("din") &&

      producto === "'-----------"

    );

  });

  // ===============================================
  // 🔥 RESULTADO
  // ===============================================
  let resultado = [];

  base.forEach(x => {

    let codigo = x.codigo;

    // ===============================================
    // 🔥 PEDIDO
    // ===============================================
    let pedido = dataPedido

      .filter(p =>

        limpiarCodigo(p["PRODUCTO"]) === codigo

      )

      .reduce((s,p)=>

        s + numeroReal(p["BULTOS_REAL"])

      ,0);

    // ===============================================
    // ❌ SIN PEDIDO
    // ===============================================
    if(pedido <= 0) return;

    // ===============================================
    // 🔥 TIPO PEDIDO
    // ===============================================
    let tipoPedido =

      pedido >= promedioPedido

      ? "ALTO"

      : "BAJO";

    // ===============================================
    // 🔥 PRODUCTO
    // ===============================================
    let prod = mapaProductos[codigo] || {};

    let jerarquia =
      prod.jerarquia || "SIN JERARQUIA";

    // ===============================================
    // 🔥 CANDIDATAS
    // ===============================================
    let candidatas = ubicacionesLibres.filter(u => {

      let mascara = String(u["MASCARA"] || "");

      let partes = mascara.split("-");

      if(partes.length < 3) return false;

      let pasillo = partes[1];

      return (

        pasilloDominante[pasillo] === jerarquia

      );

    });

    // ===============================================
    // 🔥 PRIORIZAR NIVEL
    // ===============================================
    if(tipoPedido === "ALTO"){

      candidatas.sort((a,b)=>

        numeroReal(a["Niv"] || 99) -

        numeroReal(b["Niv"] || 99)

      );

    }else{

      candidatas.sort((a,b)=>

        numeroReal(b["Niv"] || 0) -

        numeroReal(a["Niv"] || 0)

      );

    }

    let sugerida =
      candidatas[0] || null;

    // ===============================================
    // 🔥 MAX / MIN
    // ===============================================
    let maximo =

      maximosManuales[codigo] || "";

    let minimo = "";

    if(maximo !== ""){

      minimo = Number(maximo) / 2;
    }

    // ===============================================
    // 🔥 PUSH
    // ===============================================
    resultado.push({

      codigo: codigo,

      alterno:
        prod.alterno || "",

      descripcion:
        prod.descripcion || "",

      pedido: pedido,

      tipoPedido: tipoPedido,

      jerarquia: jerarquia,

      uxb:
        prod.uxb || 0,

      maximo: maximo,

      minimo: minimo,

      sugerida:
        sugerida
        ? sugerida["MASCARA"]
        : "SIN UBICACION IDEAL"

    });

  });

  // ===============================================
  // 🔥 ORDEN
  // ===============================================
  resultado.sort((a,b)=>

    b.pedido - a.pedido

  );

  // ===============================================
  // 📊 KPIS
  // ===============================================
  let altos =
    resultado.filter(x =>
      x.tipoPedido === "ALTO"
    ).length;

  let bajos =
    resultado.filter(x =>
      x.tipoPedido === "BAJO"
    ).length;

  let conUbi =
    resultado.filter(x =>
      x.sugerida !== "SIN UBICACION IDEAL"
    ).length;

  let sinUbiFinal =
    resultado.filter(x =>
      x.sugerida === "SIN UBICACION IDEAL"
    ).length;

  // ===============================================
  // 🔥 FILAS
  // ===============================================
  let filas = "";

  resultado.forEach(r => {

    filas += `

      <tr>

        <td>${r.codigo}</td>

        <td>${r.alterno}</td>

        <td>${r.descripcion}</td>

        <td>
          ${formatoDecimal(r.pedido)}
        </td>

        <td>

          <span style="
            padding:4px 8px;
            border-radius:8px;
            font-weight:bold;
            background:
              ${r.tipoPedido === "ALTO"
                ? "#fee2e2"
                : "#fef9c3"};
            color:
              ${r.tipoPedido === "ALTO"
                ? "#b91c1c"
                : "#92400e"};
          ">

            ${r.tipoPedido}

          </span>

        </td>

        <td>${r.jerarquia}</td>

        <td>${r.uxb}</td>

        <td>

          <input

            type="number"

            value="${r.maximo}"

            placeholder="Definir"

            onchange="
              guardarMaximo(
                '${r.codigo}',
                this.value
              )
            "

            style="
              width:90px;
              padding:6px;
              border-radius:6px;
              border:
                ${r.maximo === ""
                  ? "2px solid #ef4444"
                  : "2px solid #22c55e"};
            "
          >

        </td>

        <td>

          ${r.minimo !== ""
            ? formatoDecimal(r.minimo)
            : "-"}

        </td>

        <td style="
          font-weight:bold;
          color:
            ${r.sugerida === "SIN UBICACION IDEAL"
              ? "#ef4444"
              : "#111827"};
        ">

          ${r.sugerida}

        </td>

      </tr>

    `;

  });

  // ===============================================
  // 🔥 HTML
  // ===============================================
  let html = `

    <div class="panel">

      <h2>🧠 Slotting Inteligente</h2>

      <div class="kpi-big-grid">

        <div class="kpi-big">
          <span>Productos</span>
          <h1>${resultado.length}</h1>
        </div>

        <div class="kpi-big">
          <span>🔴 Alto</span>
          <h1>${altos}</h1>
        </div>

        <div class="kpi-big">
          <span>🟡 Bajo</span>
          <h1>${bajos}</h1>
        </div>

        <div class="kpi-big">
          <span>✅ Con Ubicación</span>
          <h1>${conUbi}</h1>
        </div>

        <div class="kpi-big">
          <span>⚠ Sin Ubicación</span>
          <h1>${sinUbiFinal}</h1>
        </div>

      </div>

      <div style="
        overflow:auto;
        max-height:75vh;
      ">

        <table>

          <tr>

            <th>CODIGO</th>

            <th>COD ALTERNO</th>

            <th>DESCRIPCION</th>

            <th>PEDIDO</th>

            <th>TIPO</th>

            <th>JERARQUIA</th>

            <th>UXB</th>

            <th>MAX</th>

            <th>MIN</th>

            <th>UBICACION SUGERIDA</th>

          </tr>

          ${filas}

        </table>

      </div>

    </div>

  `;

  document.getElementById("modulo").innerHTML = html;
}