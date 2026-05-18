// ==============================
//🚀 VARIABLES GLOBALES
//=============================
let productosCriticos = [];
let mapaPasillos = {};
let ubicacionesLibres = [];
let ubicacionesDinamicasOcupadas = [];
let resultadoSlotting = [];
let productosSinUbicacion = [];

//=============================
//🔧 UTILIDADES
//=============================
function limpiarCodigo(valor){

  if(
    valor === null ||
    valor === undefined
  ){
    return "";
  }

  return String(valor)

    .trim()

    .replace(/'/g,"")

    .replace(/\.0$/,"")

    .replace(/\s/g,"")

    .toUpperCase();
}

function numeroReal(valor){

  let txt = String(valor || "")
    .trim()
    .replace(",", ".");

  let n = parseFloat(txt);

  return isNaN(n) ? 0 : n;
}

function extraerPasillo(ubi){

  let p = String(ubi || "")
    .split("-");

  return p[1]
    ? p[1].padStart(2,"0")
    : "00";
}

//=============================
//🧠 PASO 1
//PRODUCTOS SIN UBICACION
//=============================
function obtenerProductosSinUbicacion(){

  let productosLPN = {};

  dataLPN.forEach(l => {

    // =========================
    // CODIGO
    // =========================
    let codigo = limpiarCodigo(
      l["CODIGO"]
    );

    if(!codigo) return;

    // =========================
    // UBICACION
    // =========================
    let ubicacion = String(

      l["UBICACION"] || ""

    )
    .trim()
    .toUpperCase();

    // =========================
    // UBICACIONES VALIDAS
    // =========================
    // MASS
    // BUFFER
    // STOCK-DESBLOQUEO
    // RAMPA
    // BLANCO (PALETERO)
    // =========================
    if(

      !ubicacion.startsWith("MASS") &&

      !ubicacion.startsWith("BUFFER") &&

      !ubicacion.startsWith("STOCK-DESBLOQUEO") &&

      !ubicacion.startsWith("RAMPA") &&

      ubicacion !== ""

    ){
      return;
    }

    // =========================
    // ESTADO
    // =========================
    let estado = String(
      l["ESTADO"] || ""
    )
    .trim();

    if(

      estado !== "Ubicado" &&

      estado !== "Recibido"

    ) return;

    // =========================
    // CREAR PRODUCTO
    // =========================
    if(!productosLPN[codigo]){

      productosLPN[codigo] = {

        codigo,

        descripcion:
          l["DESCRIPCION"] || "",

        bultos:0
      };
    }

    // =========================
    // SUMAR BULTOS
    // =========================
    productosLPN[codigo].bultos +=

      numeroReal(
        l["BULTOS"]
      );
  });

  // =========================
  // PRODUCTOS EN ACTIVO
  // =========================
  let productosActivo = new Set(

    dataInventario

      .map(x =>

        limpiarCodigo(
          x["PRODUCTO"]
        )
      )

      .filter(x => x !== "")
  );

  let resultado = [];

  // =========================
  // FILTRAR SIN UBICACION
  // =========================
  Object.values(productosLPN)

    .forEach(p => {

      if(
        !productosActivo.has(
          p.codigo
        )
      ){

        resultado.push(p);
      }
    });
    productosSinUbicacion = resultado;
  return resultado;
}

/*=============================
🧠 PASO 2
FILTRO DEMANDA REAL
=============================*/
function obtenerProductosCriticos(){

  let sinUbicacion =
    obtenerProductosSinUbicacion();

  let mapaPedido = {};

  dataPedido.forEach(p => {

    let codigo = limpiarCodigo(p["PRODUCTO"]);

    if(!codigo) return;

    let real = numeroReal(p["BULTOS_REAL"]);

    if(real <= 0) return;

    if(!mapaPedido[codigo]){

      mapaPedido[codigo] = {
        codigo,
        bultosReal:0
      };
    }

    mapaPedido[codigo].bultosReal += real;
  });

  let resultado = [];

  sinUbicacion.forEach(p => {

    let pedido = mapaPedido[p.codigo];

    if(!pedido) return;

    resultado.push({

      codigo:p.codigo,

      descripcion:p.descripcion,

      stock:p.bultos,

      bultosReal:pedido.bultosReal
    });
  });

  return resultado;
}

/*=============================
🧠 PASO 3
DEMANDA ALTA / BAJA
=============================*/
function clasificarDemanda(){

  productosCriticos =
    obtenerProductosCriticos();

  let total = productosCriticos
    .reduce((s,p)=>
      s + p.bultosReal
    ,0);

  let promedio =
    productosCriticos.length > 0

    ? total / productosCriticos.length

    : 0;

  productosCriticos.forEach(p => {

    p.promedioGlobal = promedio;

    p.demanda =
      p.bultosReal >= promedio

      ? "ALTO"

      : "BAJO";
  });
}

/*=============================
🧠 PASO 4
MAPA JERARQUICO PASILLOS
=============================*/
function construirMapaPasillos(){

  mapaPasillos = {};

  dataInventario.forEach(i => {

    let ubi = String(
      i["UBICACION"] || ""
    )
    .trim();

    // =========================
    // SOLO MASS
    // =========================
    if(
      !ubi
        .toUpperCase()
        .startsWith("MASS-")
    ){
      return;
    }

    let pasillo =
      extraerPasillo(ubi);

    // =========================
    // EXCLUIR PASILLO 10
    // =========================
    if(pasillo === "10")
      return;

    let codigo =
      limpiarCodigo(
        i["PRODUCTO"]
      );

    if(!codigo) return;

    let prod =
      dataProductos.find(x =>

        limpiarCodigo(
          x["CODIGO"]
        ) === codigo
      );

    if(!prod) return;

    let j1 =
      prod["JERARQUIA1"] ||
      "SIN_J1";

    // =========================
    // CREAR PASILLO
    // =========================
    if(!mapaPasillos[pasillo]){

      mapaPasillos[pasillo] = {

        pasillo,

        total:0,

        jerarquias:{},

        predominante:"",

        porcentaje:0,

        libres:0,

        saturacion:0
      };
    }

    mapaPasillos[pasillo]
      .total++;

    if(
      !mapaPasillos[pasillo]
        .jerarquias[j1]
    ){

      mapaPasillos[pasillo]
        .jerarquias[j1] = 0;
    }

    mapaPasillos[pasillo]
      .jerarquias[j1]++;
  });

  // =========================
  // CALCULAR PREDOMINANCIA
  // =========================
  Object.values(mapaPasillos)

    .forEach(p => {

      let mayor = 0;

      let pred = "";

      Object.entries(p.jerarquias)

        .forEach(([j,c]) => {

          if(c > mayor){

            mayor = c;

            pred = j;
          }
        });

      p.predominante = pred;

      p.porcentaje =

        p.total > 0

        ? (
            (mayor / p.total)
            * 100
          ).toFixed(1)

        : 0;
    });
}



/*=============================
🧠 PASO 5
UBICACIONES DINAMICAS LIBRES
=============================*/
function obtenerUbicacionesLibres(){

  ubicacionesLibres = [];
  
  ubicacionesDinamicasOcupadas = [];

  if(
    !Array.isArray(dataUbicaciones)
  ){
    console.error(
      "dataUbicaciones no existe"
    );
    return;
  }

  dataUbicaciones.forEach(u => {

    // =========================
    // UBICACION
    // =========================
    let ubi = String(
      u["MASCARA"] || ""
    )
    .trim();

    // VALIDAR MASS
    if(
      !ubi
        .toUpperCase()
        .startsWith("MASS-")
    ) return;

    // =========================
    // PASILLO
    // =========================
    let pasillo =
      extraerPasillo(ubi);

    // EXCLUIR PASILLO 10
    if(pasillo === "10")
      return;

    // =========================
    // TIPO UBICACION
    // =========================
    let tipo = String(
      u["TIPO_UBICACION"] || ""
    )
    .toUpperCase()
    .replace(/Ã/g,"A")
    .replace(/Á/g,"A")
    .replace(/À/g,"A")
    .trim();

    // SOLO DINAMICOS
    if(
      !tipo.includes("DIN")
    ) return;

    // =========================
    // PRODUCTO
    // =========================
    let producto = String(
      u["PRODUCTO"] || ""
    )
    
    .normalize("NFKD")
    .replace(/'/g,"")
    .replace(/\s/g,"")
    .trim();


    // =========================
    // VALIDAR LIBRE
    // =========================
    if(
      producto !== "-----------"
    ){

      ubicacionesDinamicasOcupadas.push({

        ubicacion: ubi,

        pasillo,

        producto

      });

      return;
    }

    // =========================
    // LIBRES
    // =========================
    ubicacionesLibres.push({

      ubicacion: ubi,

      pasillo,

      tipo

    });

    // =========================
    // CONTAR LIBRES
    // =========================
    if(!mapaPasillos[pasillo]){
      mapaPasillos[pasillo] = {
        pasillo,
        total:0,
        jerarquias:{},
        predominante:"SIN_J1",
        porcentaje:0,
        libres:0,
        saturacion:0
      };
    }

    mapaPasillos[pasillo]
      .libres++;
  });

  
}

/*=============================
🧠 PASO 6
SCORE INTELIGENTE
=============================*/
function calcularSlotting(){

  resultadoSlotting = [];
  let ubicacionesUsadas = new Set();

  productosCriticos.forEach(p => {

    let prod = dataProductos.find(x =>
      limpiarCodigo(x["CODIGO"])
      === p.codigo
    );

    if(!prod){

      console.warn(
        "NO EXISTE PRODUCTO:",
        p.codigo
      );

      return;
    }

    let uxb = prod["UXB"] || 1;

    let j1 = prod["JERARQUIA1"] || "";

    let candidatos = [];

    Object.values(mapaPasillos)
      .forEach(ps => {

        let score = 0;

        let detalle = [];

        // =========================
        // MATCH JERARQUIA
        // =========================
        if(ps.predominante === j1){

          score += 50;

          detalle.push(
            "+50 jerarquía"
          );
        }

        // =========================
        // UBICACIONES LIBRES
        // =========================
        score += Math.min(ps.libres,20);

        detalle.push(
          `+${Math.min(ps.libres,20)} libres`
        );

        // =========================
        // PREDOMINANCIA
        // =========================
        if(ps.porcentaje >= 70){

          score += 20;

          detalle.push(
            "+20 predominancia"
          );
        }

        // =========================
        // DEMANDA ALTA
        // =========================
        if(p.demanda === "ALTO"){

          score += 10;

          detalle.push(
            "+10 prioridad"
          );
        }

        candidatos.push({

          pasillo:ps.pasillo,

          predominante:ps.predominante,

          porcentaje:ps.porcentaje,

          libres:ps.libres,

          score,

          detalle
        });
      });

    // =========================
    // ORDENAR MEJORES PASILLOS
    // =========================
    candidatos.sort((a,b)=>
      b.score - a.score
    );

    // =========================
    // MEJOR PASILLO
    // =========================
    let mejorPasillo =
      candidatos[0]?.pasillo || null;

    // =========================
    // MEJOR UBICACION LIBRE
    // =========================
    let mejorUbicacion =
      ubicacionesLibres.find(u =>
        u.pasillo === mejorPasillo
        &&
        !ubicacionesUsadas.has(
          u.ubicacion
        )
      );

    if(mejorUbicacion){
      ubicacionesUsadas.add(mejorUbicacion.ubicacion);
    }

    // =========================
    // RESULTADO FINAL
    // =========================
    resultadoSlotting.push({

      codigo:p.codigo,

      descripcion:p.descripcion,

      uxb,

      demanda:p.demanda,

      bultosReal:p.bultosReal,

      top1:candidatos[0] || null,

      ubicacionSugerida:
        mejorUbicacion?.ubicacion || "-",

      top2:candidatos[1] || null,

      top3:candidatos[2] || null,

      detalle:candidatos
    });
  });
}

/*=============================
🚀 EJECUTAR MOTOR
=============================*/
function ejecutarMotorSlotting(){

  clasificarDemanda();

  construirMapaPasillos();

  obtenerUbicacionesLibres();

  calcularSlotting();


  renderSlotting();
}

/*=============================
📊 TABLA PRINCIPAL
=============================*/
function renderSlotting(){

  let totalCriticos =
    resultadoSlotting.length;

  let altos = resultadoSlotting
    .filter(x =>
      x.demanda === "ALTO"
    ).length;

  let bajos = resultadoSlotting
    .filter(x =>
      x.demanda === "BAJO"
    ).length;

  let html = `

  <div class="panel">

    <h2>
      🚀 Slotting Inteligente
    </h2>

    

    <!-- KPIs -->
    <div class="kpi-big-grid">

      <!-- PRODUCTOS -->
      <div class="kpi-big">

        <span>
          Productos Críticos
        </span>

        <h1>

          ${totalCriticos}

        </h1>

      </div>

      <!-- DEMANDA ALTA -->
      <div class="kpi-big">

        <span>
          Demanda Alta
        </span>

        <h1 style="
          color:#ef4444;
        ">

          ${altos}

        </h1>

      </div>

      <!-- DEMANDA BAJA -->
      <div class="kpi-big">

        <span>
          Demanda Baja
        </span>

        <h1 style="
          color:#f59e0b;
        ">

          ${bajos}

        </h1>

      </div>

      <!-- TOTAL DINAMICAS -->
      <div class="kpi-big">

        <span>
          Total Dinámicas
        </span>

        <h1 style="
          color:#2563eb;
        ">

          ${
            ubicacionesLibres.length +
            ubicacionesDinamicasOcupadas.length
          }

        </h1>

      </div>

      <!-- DINAMICAS LIBRES -->
      <div class="kpi-big">

        <span>
          Dinámicas Libres
        </span>

        <h1 style="
          color:#22c55e;
        ">

          ${ubicacionesLibres.length}

        </h1>

      </div>

      <!-- DINAMICAS OCUPADAS -->
      <div class="kpi-big">

        <span>
          Dinámicas Ocupadas
        </span>

        <h1 style="
          color:#dc2626;
        ">

          ${
            ubicacionesDinamicasOcupadas.length
          }

        </h1>

      </div>

    </div>

    <!-- BOTONES -->
    <div class="botones">

      <input
        type="text"
        id="buscarSlotting"
        placeholder="Buscar producto"
        onkeyup="filtrarSlotting()"
      >

      <button onclick="renderAnalisisManual()">
        🔍 Análisis Manual
      </button>

      <button onclick="renderUbicacionesLibres()">
        📦 Ubicaciones Libres
      </button>

      <button onclick="ejecutarMotorSlotting()">
        🔄 Recargar
      </button>

      <button onclick="exportarUbicacionesLibres()">📥 Exportar Excel </button>

    </div>

    <!-- TABLA -->
    <div style="
      max-height:75vh;
      overflow:auto;
      border:1px solid #ddd;
      border-radius:12px;
    ">

    <table id="tablaSlotting">

      <tr>

        <th>CODIGO</th>

        <th>DESCRIPCION</th>

        <th>BULTOS REAL</th>

        <th>UXB</th>

        <th>DEMANDA</th>

        <th>TOP 1</th>

        <th>UBICACION SUGERIDA</th>

        <th>SCORE</th>

        <th>PREDOMINANTE</th>

        <th>LIBRES</th>

        <th>MAX</th>

        <th>MIN</th>

        <th>TOP 2</th>

        <th>TOP 3</th>

      </tr>
  `;

  resultadoSlotting.forEach((r,index) => {

    let color =
      r.demanda === "ALTO"

      ? "#fee2e2"

      : "#fef9c3";

    let maxDefault =
      Number(r.bultosReal || 0);

    let minDefault =
      Math.ceil(maxDefault / 2);

    html += `

      <tr style="background:${color}">

        <td>
          ${r.codigo}
        </td>

        <td>

          <div>
            <b>${r.descripcion}</b>
          </div>

          <div style="
            font-size:11px;
            color:#64748b;
            margin-top:4px;
          ">

            ${r.top1?.predominante || "-"}

          </div>

        </td>

        <td>
          <b>${r.bultosReal}</b>
        </td>

        <td>
          ${r.uxb}
        </td>

        <td>

          ${
            r.demanda === "ALTO"

            ? "🔴 ALTO"

            : "🟡 BAJO"
          }

        </td>

        <td>

          <div style="
            font-weight:bold;
            color:#16a34a;
          ">

            🚶 ${r.top1?.pasillo || "-"}

          </div>

        </td>

        <td>

          <div style="
            color:#2563eb;
            font-weight:bold;
            font-size:12px;
          ">

            ${r.ubicacionSugerida}

          </div>

        </td>

        <td>

          <div style="
            font-weight:bold;
            font-size:15px;
          ">

            ${r.top1?.score || 0}

          </div>

        </td>

        <td>

          <div>
            ${r.top1?.predominante || "-"}
          </div>

          <div style="
            font-size:11px;
            color:#64748b;
          ">

            ${r.top1?.porcentaje || 0}%

          </div>

        </td>

        <td>

          <b>
            ${r.top1?.libres || 0}
          </b>

        </td>

        <!-- MAX -->
        <td>

          <input

            type="number"

            id="max_${index}"

            value="${maxDefault}"

            style="
              width:70px;
              padding:4px;
            "

            oninput="
              actualizarMinimo(${index})
            "
          >

        </td>

        <!-- MIN -->
        <td>

          <input

            type="number"

            id="min_${index}"

            value="${minDefault}"

            style="
              width:70px;
              padding:4px;
              background:#f3f4f6;
            "

            readonly
          >

        </td>

        <td>

          ${
            r.top2

            ? "🚶 " + r.top2.pasillo

            : "-"
          }

        </td>

        <td>

          ${
            r.top3

            ? "🚶 " + r.top3.pasillo

            : "-"
          }

        </td>

      </tr>
    `;
  });

  

  html += `

    </table>

    </div>

  </div>
  `;

  html += renderValidacionSistema();

  document.getElementById("modulo")
    .innerHTML = html;
}

function filtrarSlotting(){

  let txt = document
    .getElementById(
      "buscarSlotting"
    )
    .value
    .toLowerCase();

  let filas = document.querySelectorAll(
    "#tablaSlotting tr"
  );

  filas.forEach((fila,index) => {

    // NO ocultar cabecera
    if(index === 0) return;

    let contenido =
      fila.innerText.toLowerCase();

    fila.style.display =

      contenido.includes(txt)

      ? ""

      : "none";
  });
}

function actualizarMinimo(index){

  let max = Number(

    document.getElementById(
      `max_${index}`
    ).value

  ) || 0;

  let min = Math.ceil(max / 2);

  document.getElementById(
    `min_${index}`
  ).value = min;
}

/*=============================
🔍 ANALISIS MANUAL
=============================*/
function renderAnalisisManual(){

  let html = `

  <div class="panel">

    <!-- HEADER -->
    <div style="
      display:flex;
      align-items:center;
      gap:15px;
      margin-bottom:20px;
      flex-wrap:wrap;
    ">

      <button

        onclick="abrirSlottingInteligente()"

        style="
          background:#334155;
          color:white;
          border:none;
          padding:10px 16px;
          border-radius:8px;
          cursor:pointer;
          font-weight:bold;
        "
      >

        ← Volver

      </button>

      <h2 style="
        margin:0;
      ">
        🔍 Análisis Manual
      </h2>

    </div>

    <!-- BUSCAR PRODUCTO -->
    <div style="
      margin-bottom:20px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      align-items:center;
    ">

      <input

        id="inputProducto"

        placeholder="Código Producto"

        onkeyup="buscarProductoManual()"

        style="
          padding:10px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          min-width:220px;
        "
      >

      <button

        onclick="buscarProductoManual()"

        style="
          background:#dc2626;
          color:white;
          border:none;
          padding:10px 18px;
          border-radius:8px;
          cursor:pointer;
          font-weight:bold;
        "
      >

        Buscar

      </button>

    </div>

    <!-- BUSCAR PASILLO -->
    <div style="
      margin-bottom:25px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      align-items:center;
    ">

      <input

        id="inputPasillo"

        placeholder="Pasillo"

        onkeyup="buscarPasilloManual()"

        style="
          padding:10px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          min-width:220px;
        "
      >

      <button

        onclick="buscarPasilloManual()"

        style="
          background:#ea580c;
          color:white;
          border:none;
          padding:10px 18px;
          border-radius:8px;
          cursor:pointer;
          font-weight:bold;
        "
      >

        Evaluar

      </button>

    </div>

    <!-- RESULTADO -->
    <div id="resultadoManual"></div>

  </div>
  `;

  document.getElementById("modulo")
    .innerHTML = html;
}

/*=============================
🔍 BUSCAR PRODUCTO
=============================*/
function buscarProductoManual(){

  let codigo = limpiarCodigo(

    document.getElementById(
      "inputProducto"
    ).value
  );

  // =========================
  // VALIDAR VACIO
  // =========================
  if(!codigo){

    document.getElementById(
      "resultadoManual"
    ).innerHTML = "";

    return;
  }

  // =========================
  // BUSQUEDA PARCIAL
  // =========================
  let fila = resultadoSlotting.find(x =>

    limpiarCodigo(x.codigo)

      .includes(codigo)

    ||

    String(x.descripcion || "")
      .toUpperCase()
      .includes(codigo)
  );

  // =========================
  // NO ENCONTRADO
  // =========================
  if(!fila){

    document.getElementById(
      "resultadoManual"
    ).innerHTML = `

      <div style="
        padding:20px;
        background:#fee2e2;
        border-radius:10px;
        color:#991b1b;
        font-weight:bold;
      ">

        Producto no encontrado

      </div>
    `;

    return;
  }

  // =========================
  // JERARQUIA PRODUCTO
  // =========================
  let prod = dataProductos.find(p =>

    limpiarCodigo(p["CODIGO"])

    ===

    limpiarCodigo(fila.codigo)
  );

  let jerarquiaProducto =
    prod?.["JERARQUIA1"]
    || "SIN_J1";

  // =========================
  // TABLA RESULTADOS
  // =========================
  let html = `

    <!-- RESUMEN PRODUCTO -->
    <div style="
      margin-bottom:20px;
      padding:20px;
      background:#f8fafc;
      border-radius:14px;
      border:1px solid #e2e8f0;
    ">

      <div style="
        font-size:24px;
        font-weight:bold;
        margin-bottom:8px;
      ">

        ${fila.codigo}

      </div>

      <div style="
        margin-bottom:15px;
        color:#334155;
        font-size:20px;
      ">

        ${fila.descripcion}

      </div>

      <div style="
        display:flex;
        gap:25px;
        flex-wrap:wrap;
        font-size:17px;
      ">

        <div>
          <b>Jerarquía:</b>
          ${jerarquiaProducto}
        </div>

        <div>
          <b>Demanda:</b>
          ${fila.demanda}
        </div>

        <div>
          <b>Bultos:</b>
          ${fila.bultosReal}
        </div>

        <div>
          <b>UXB:</b>
          ${fila.uxb}
        </div>

      </div>

    </div>

    <!-- TABLA PASILLOS -->
    <table>

      <tr>

        <th>PASILLO</th>

        <th>PREDOMINANTE</th>

        <th>%</th>

        <th>LIBRES</th>

        <th>SCORE</th>

        <th>COMPATIBILIDAD</th>

        <th>TOP 5 JERARQUIAS</th>

      </tr>
  `;

  fila.detalle.forEach(d => {

    // =========================
    // MAPA PASILLO
    // =========================
    let pasilloData =
      mapaPasillos[d.pasillo];

    let jerarquias = [];

    if(pasilloData){

      Object.entries(
        pasilloData.jerarquias
      )
      .forEach(([j,c]) => {

        let porcentaje =

          pasilloData.total > 0

          ?

          (
            (c / pasilloData.total)
            * 100
          ).toFixed(1)

          :

          0;

        jerarquias.push({

          jerarquia:j,

          cantidad:c,

          porcentaje
        });
      });
    }

    // =========================
    // TOP 5
    // =========================
    jerarquias.sort((a,b)=>
      b.cantidad - a.cantidad
    );

    let top5 =
      jerarquias.slice(0,5);

    // =========================
    // COMPATIBILIDAD
    // =========================
    let compatible =
      d.predominante
      === jerarquiaProducto;

    let estado = compatible

      ?

      "🟢 Compatible"

      :

      "🔴 Riesgo";

    let colorScore = "#22c55e";

    if(d.score < 50){

      colorScore = "#ef4444";
    }

    else if(d.score < 80){

      colorScore = "#f59e0b";
    }

    html += `

      <tr>

        <!-- PASILLO -->
        <td>

          <b>
            ${d.pasillo}
          </b>

        </td>

        <!-- PREDOMINANTE -->
        <td>
          ${d.predominante}
        </td>

        <!-- % -->
        <td>
          ${d.porcentaje}%
        </td>

        <!-- LIBRES -->
        <td>

          <b>
            ${d.libres}
          </b>

        </td>

        <!-- SCORE -->
        <td style="
          color:${colorScore};
          font-weight:bold;
          font-size:18px;
        ">

          ${d.score}

        </td>

        <!-- COMPATIBLE -->
        <td>

          ${estado}

        </td>

        <!-- TOP 5 -->
        <td>

          <div style="
            display:flex;
            flex-direction:column;
            gap:6px;
          ">
    `;

    top5.forEach(t => {

      html += `

        <div style="
          padding:6px 10px;
          background:#f1f5f9;
          border-radius:8px;
          font-size:13px;
        ">

          <b>
            ${t.jerarquia}
          </b>

          -

          ${t.cantidad}

          (${t.porcentaje}%)

        </div>
      `;
    });

    html += `

          </div>

        </td>

      </tr>
    `;
  });

  html += `</table>`;

  document.getElementById(
    "resultadoManual"
  ).innerHTML = html;
}

/*=============================
🚶 ANALIZAR PASILLO
=============================*/
function buscarPasilloManual(){

  let pasillo = String(
    document.getElementById(
      "inputPasillo"
    ).value
  ).padStart(2,"0");

  let p = mapaPasillos[pasillo];

  if(!p){

    document.getElementById(
      "resultadoManual"
    ).innerHTML = "Pasillo no encontrado";

    return;
  }

  let html = `

    <h3>
      🚶 PASILLO ${pasillo}
    </h3>

    <table>

      <tr>

        <th>JERARQUIA</th>

        <th>CANTIDAD</th>

      </tr>
  `;

  Object.entries(p.jerarquias)
    .forEach(([j,c]) => {

      html += `

        <tr>

          <td>${j}</td>

          <td>${c}</td>

        </tr>
      `;
    });

  html += `

    </table>

    <br>

    <div>

      <b>Predominante:</b>
      ${p.predominante}

      <br>

      <b>%:</b>
      ${p.porcentaje}%

      <br>

      <b>Libres:</b>
      ${p.libres}

    </div>
  `;

  document.getElementById(
    "resultadoManual"
  ).innerHTML = html;
}

/*=============================
🚀 ABRIR MODULO
=============================*/
function abrirSlottingInteligente(){

  if(
    !Array.isArray(dataLPN) ||
    !Array.isArray(dataInventario) ||
    !Array.isArray(dataPedido) ||
    !Array.isArray(dataProductos) ||
    !Array.isArray(dataUbicaciones)
  ){

    document.getElementById("modulo")
      .innerHTML = "⏳ Cargando datos...";

    setTimeout(
      abrirSlottingInteligente,
      500
    );

    return;
  }

  ejecutarMotorSlotting();
}

/*=============================
📦 TABLA UBICACIONES LIBRES
=============================*/
function renderUbicacionesLibres(){

  // =========================
  // RESUMEN PASILLOS
  // =========================
  let resumen = [];

  Object.values(mapaPasillos)
    .forEach(p => {

      let totalDinamicas =

        ubicacionesLibres.filter(u =>
          u.pasillo === p.pasillo
        ).length

        +

        ubicacionesDinamicasOcupadas.filter(u =>
          u.pasillo === p.pasillo
        ).length;

      let ocupadas =
        ubicacionesDinamicasOcupadas.filter(u =>
          u.pasillo === p.pasillo
        ).length;

      let libres =
        ubicacionesLibres.filter(u =>
          u.pasillo === p.pasillo
        ).length;

      let saturacion = totalDinamicas > 0

        ? (
            (ocupadas / totalDinamicas) * 100
          ).toFixed(1)

        : 0;

      let estado = "🟢 Disponible";

      if(libres <= 5){

        estado = "🔴 Crítico";
      }

      else if(libres <= 20){

        estado = "🟠 Medio";
      }

      resumen.push({

        pasillo:p.pasillo,

        predominante:p.predominante,

        porcentaje:p.porcentaje,

        libres,

        ocupadas,

        total:totalDinamicas,

        saturacion,

        estado
      });
    });

  // =========================
  // ORDENAR PASILLOS
  // =========================
  resumen.sort((a,b)=>

    Number(a.pasillo)
    -
    Number(b.pasillo)
  );

  // =========================
  // KPI GENERAL
  // =========================
  let total =
    ubicacionesLibres.length
    +
    ubicacionesDinamicasOcupadas.length;

  // =========================
  // HTML
  // =========================
  let html = `

  <div class="panel">

    <!-- HEADER -->
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:25px;
      flex-wrap:wrap;
      gap:15px;
    ">

      <h2 style="
        margin:0;
      ">
        📦 Ubicaciones Dinámicas
      </h2>

      <button

        onclick="abrirSlottingInteligente()"

        style="
          background:#334155;
          color:white;
          border:none;
          padding:10px 18px;
          border-radius:10px;
          cursor:pointer;
          font-weight:bold;
        "
      >

        ← Volver

      </button>

    </div>

    <!-- KPI -->
    <div style="
      display:grid;
      grid-template-columns:
      repeat(auto-fit,minmax(260px,1fr));
      gap:18px;
      margin-bottom:30px;
    ">

      <!-- TOTAL -->
      <div class="kpi-big">

        <span>
          Total Dinámicas
        </span>

        <h1 style="
          color:#2563eb;
        ">

          ${total}

        </h1>

      </div>

      <!-- LIBRES -->
      <div class="kpi-big">

        <span>
          Dinámicas Libres
        </span>

        <h1 style="
          color:#22c55e;
        ">

          ${ubicacionesLibres.length}

        </h1>

      </div>

      <!-- OCUPADAS -->
      <div class="kpi-big">

        <span>
          Dinámicas Ocupadas
        </span>

        <h1 style="
          color:#dc2626;
        ">

          ${ubicacionesDinamicasOcupadas.length}

        </h1>

      </div>

      <!-- SATURACION -->
      <div class="kpi-big">

        <span>
          Saturación
        </span>

        <h1 style="
          color:#d97706;
        ">

          ${(
            (
              ubicacionesDinamicasOcupadas.length
              / total
            ) * 100
          ).toFixed(1)}%

        </h1>

      </div>

    </div>

    <!-- TABLA -->
    <h3 style="
      margin-bottom:15px;
    ">
      📊 Resumen Pasillos
    </h3>

    <table>

      <tr>

        <th>PASILLO</th>

        <th>PREDOMINANTE</th>

        <th>%</th>

        <th>LIBRES</th>

        <th>OCUPADAS</th>

        <th>TOTAL</th>

        <th>SATURACIÓN</th>

        <th>ESTADO</th>

        <th>TOP 5 JERARQUIAS</th>

        <th>ACCIÓN</th>

      </tr>
  `;

  // =========================
  // TABLA PASILLOS
  // =========================
  resumen.forEach(r => {

    let color = "#22c55e";

    if(r.libres <= 5){

      color = "#ef4444";
    }

    else if(r.libres <= 20){

      color = "#f59e0b";
    }

    // =========================
    // DATA PASILLO
    // =========================
    let pasilloData =
      mapaPasillos[r.pasillo];

    let jerarquias = [];

    if(pasilloData){

      Object.entries(
        pasilloData.jerarquias
      )
      .forEach(([j,c]) => {

        let porcentaje =

          pasilloData.total > 0

          ?

          (
            (c / pasilloData.total)
            * 100
          ).toFixed(1)

          :

          0;

        jerarquias.push({

          jerarquia:j,

          cantidad:c,

          porcentaje
        });
      });
    }

    // =========================
    // TOP 5
    // =========================
    jerarquias.sort((a,b)=>
      b.cantidad - a.cantidad
    );

    let top5 =
      jerarquias.slice(0,5);

    html += `

      <tr>

        <!-- PASILLO -->
        <td>
          <b>${r.pasillo}</b>
        </td>

        <!-- PREDOMINANTE -->
        <td>
          ${r.predominante}
        </td>

        <!-- % -->
        <td>
          ${r.porcentaje}%
        </td>

        <!-- LIBRES -->
        <td style="
          color:${color};
          font-weight:bold;
        ">
          ${r.libres}
        </td>

        <!-- OCUPADAS -->
        <td>
          ${r.ocupadas}
        </td>

        <!-- TOTAL -->
        <td>
          ${r.total}
        </td>

        <!-- SATURACION -->
        <td>
          ${r.saturacion}%
        </td>

        <!-- ESTADO -->
        <td>
          ${r.estado}
        </td>

        <!-- TOP 5 -->
        <td>

          <div style="
            display:flex;
            flex-direction:column;
            gap:5px;
            min-width:220px;
          ">
    `;

    top5.forEach(t => {

      html += `

        <div style="
          background:#f1f5f9;
          padding:6px 10px;
          border-radius:8px;
          font-size:12px;
        ">

          <b>
            ${t.jerarquia}
          </b>

          -

          ${t.cantidad}

          (${t.porcentaje}%)

        </div>
      `;
    });

    html += `

          </div>

        </td>

        <!-- ACCION -->
        <td>

          <button

            onclick="
              verDetallePasillo(
                '${r.pasillo}'
              )
            "

            style="
              background:#6366f1;
              color:white;
              border:none;
              padding:6px 12px;
              border-radius:8px;
              cursor:pointer;
            "
          >

            👁 Ver

          </button>

        </td>

      </tr>
    `;
  });

  html += `

    </table>

    <!-- MODAL -->
    <div id="modalPasillo"></div>

  </div>
  `;

  document.getElementById("modulo")
    .innerHTML = html;
}



function exportarUbicacionesLibres(){

  let html = `
    <table border="1">

      <tr>

        <th>UBICACION</th>

        <th>TIPO_UBICACION</th>

        <th>PRODUCTO</th>

        <th>ESTADO</th>

      </tr>
  `;

  // =========================
  // LIBRES
  // =========================
  ubicacionesLibres.forEach(u => {

    html += `
      <tr>

        <td>
          ${u.ubicacion}
        </td>

        <td>
          ${u.tipo}
        </td>

        <td>
          -----------
        </td>

        <td style="
          background:#dcfce7;
        ">
          LIBRE
        </td>

      </tr>
    `;
  });

  // =========================
  // OCUPADAS
  // =========================
  ubicacionesDinamicasOcupadas
    .forEach(u => {

    html += `
      <tr>

        <td>
          ${u.ubicacion}
        </td>

        <td>
          DINAMICO
        </td>

        <td>
          ${u.producto}
        </td>

        <td style="
          background:#fee2e2;
        ">
          OCUPADA
        </td>

      </tr>
    `;
  });

  html += "</table>";

  let blob = new Blob(

    [html],

    {
      type:
      "application/vnd.ms-excel"
    }
  );

  let a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "ubicaciones_dinamicas.xls";

  a.click();
}

function renderValidacionSistema(){

  // =========================
  // VALORES SISTEMA
  // =========================
  let totalDinamicas =

    ubicacionesLibres.length +

    ubicacionesDinamicasOcupadas.length;

  let libres =
    ubicacionesLibres.length;

  let ocupadas =
    ubicacionesDinamicasOcupadas.length;

  let sinUbicacion =
    productosSinUbicacion.length;

  let aptos =
    productosCriticos.length;

  // =========================
  // VALORES REALES
  // =========================
  let validaciones = [

    {
      nombre:"Total Dinámicas",
      sistema:totalDinamicas,
      real:417
    },

    {
      nombre:"Dinámicas Libres",
      sistema:libres,
      real:346
    },

    {
      nombre:"Dinámicas Ocupadas",
      sistema:ocupadas,
      real:71
    },

    {
      nombre:"Sin Ubicación Activo",
      sistema:sinUbicacion,
      real:92
    },

    {
      nombre:"Aptos Slotting",
      sistema:aptos,
      real:51
    }
  ];

  let html = `

    <div style="
      margin-top:20px;
      border:1px solid #ddd;
      border-radius:12px;
      overflow:hidden;
      background:white;
    ">

      <!-- HEADER -->
      <div

        onclick="
          toggleValidacion()
        "

        style="
          padding:14px;
          background:#0f172a;
          color:white;
          cursor:pointer;
          font-weight:bold;
          font-size:15px;
        "
      >

        📊 Validación Sistema

      </div>

      <!-- BODY -->
      <div

        id="panelValidacion"

        style="
          display:none;
          padding:15px;
        "
      >

        <table>

          <tr>

            <th>MÉTRICA</th>

            <th>SISTEMA</th>

            <th>REAL</th>

            <th>ESTADO</th>

          </tr>
  `;

  validaciones.forEach(v => {

    let ok =
      v.sistema === v.real;

    html += `

      <tr>

        <td>
          ${v.nombre}
        </td>

        <td>
          ${v.sistema}
        </td>

        <td>
          ${v.real}
        </td>

        <td style="
          font-weight:bold;
        ">

          ${
            ok

            ? "✅ OK"

            : "❌ REVISAR"
          }

        </td>

      </tr>
    `;
  });

  html += `

        </table>

      </div>

    </div>
  `;

  return html;
}

function toggleValidacion(){

  let panel = document
    .getElementById(
      "panelValidacion"
    );

  if(
    panel.style.display ===
    "none"
  ){

    panel.style.display =
      "block";

  }else{

    panel.style.display =
      "none";
  }
}

function verDetallePasillo(pasillo){

  let libres = ubicacionesLibres
    .filter(u =>
      u.pasillo === pasillo
    );

  let ocupadas =
    ubicacionesDinamicasOcupadas
      .filter(u =>
        u.pasillo === pasillo
      );

  let html = `

  <div style="
    position:fixed;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,.5);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:9999;
  ">

    <div style="
      background:white;
      width:90%;
      max-width:1100px;
      max-height:90vh;
      overflow:auto;
      border-radius:14px;
      padding:20px;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      ">

        <h2>
          📦 Pasillo ${pasillo}
        </h2>

        <button

          onclick="
            document.getElementById(
              'modalPasillo'
            ).innerHTML=''
          "

          style="
            background:#ef4444;
            color:white;
            border:none;
            padding:8px 14px;
            border-radius:8px;
            cursor:pointer;
          "
        >

          ✖ Cerrar

        </button>

      </div>

      <table>

        <tr>

          <th>UBICACION</th>

          <th>ESTADO</th>

          <th>PRODUCTO</th>

        </tr>
  `;

  libres.forEach(u => {

    html += `

      <tr>

        <td>${u.ubicacion}</td>

        <td style="color:#22c55e;">
          LIBRE
        </td>

        <td>-</td>

      </tr>
    `;
  });

  ocupadas.forEach(u => {

    html += `

      <tr>

        <td>${u.ubicacion}</td>

        <td style="color:#ef4444;">
          OCUPADA
        </td>

        <td>
          ${u.producto || "-"}
        </td>

      </tr>
    `;
  });

  html += `

      </table>

    </div>

  </div>
  `;

  document.getElementById(
    "modalPasillo"
  ).innerHTML = html;
}
