import { COMPONENT_DEFS, COMPONENT_ORDER } from "../core/constants.js";
import { formatEngineeringValue, formatResistance, formatSymmetricVoltage } from "../core/support.js";
import { state } from "../runtime/state.js";
import { showStatus } from "../editor/ui.js";

// Bill of Materials generation and PDF export.

function formatPotentiometerPosition(value) {
  const percent = Math.max(0, Math.min(100, Math.round((value ?? 0.5) * 100)));
  return `${percent}%`;
}

function formatComponentValue(component) {
  const { type, value } = component;

  if (type === "resistor") return formatResistance(value);
  if (type === "potentiometer") {
    return `${formatResistance(value)}, cursor ${formatPotentiometerPosition(component.wiperPosition)}`;
  }
  if (type === "capacitor") return formatEngineeringValue(value, "F");
  if (type === "voltage_source") return formatEngineeringValue(value, "V");
  if (type === "voltage_node") return formatEngineeringValue(value, "V");
  if (type === "current_source") return formatEngineeringValue(value, "A");
  if (type === "cccs") return `${value} A/A`;
  if (type === "op_amp") return formatSymmetricVoltage(value);
  if (type === "bjt_npn" || type === "bjt_pnp") return `β = ${value}`;
  if (type === "mosfet_n" || type === "mosfet_p") {
    const k = component.k != null ? component.k : 0.01;
    const vt = component.vt != null ? component.vt : 2;
    return `k = ${formatEngineeringValue(k, "A/V²")}, Vt = ${formatEngineeringValue(vt, "V")}`;
  }
  if (type === "zener_diode") {
    if (component.vz != null) return `Vz = ${formatEngineeringValue(component.vz, "V")}`;
    return "—";
  }
  if (type === "diode") return "—";
  return "—";
}

function buildBomGroups() {
  const groupMap = new Map();

  for (const component of state.components) {
    const type = component.type;
    if (type === "junction" || type === "ground" || type === "voltage_node") continue;

    if (!groupMap.has(type)) {
      groupMap.set(type, []);
    }
    groupMap.get(type).push(component);
  }

  // Sort groups by COMPONENT_ORDER
  const ordered = [];
  for (const type of COMPONENT_ORDER) {
    if (groupMap.has(type)) {
      ordered.push({ type, components: groupMap.get(type) });
    }
  }

  return ordered;
}

function buildBomHtml(groups) {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalComponents = groups.reduce((sum, g) => sum + g.components.length, 0);

  const rows = groups.map(({ type, components }) => {
    const def = COMPONENT_DEFS[type];
    const label = def?.label ?? type;

    if (components.length === 1) {
      return `
        <tr>
          <td class="qty">1</td>
          <td>${label}</td>
          <td class="value">${formatComponentValue(components[0])}</td>
        </tr>`;
    }

    // Multiple components of same type — check if all have same value
    const allSameValue = components.every(
      (c) => formatComponentValue(c) === formatComponentValue(components[0])
    );

    if (allSameValue) {
      return `
        <tr>
          <td class="qty">${components.length}</td>
          <td>${label}</td>
          <td class="value">${formatComponentValue(components[0])}</td>
        </tr>`;
    }

    // Different values — one row per component
    return components
      .map(
        (c, i) => `
        <tr>
          <td class="qty">1</td>
          <td>${label}${components.length > 1 ? ` (${i + 1})` : ""}</td>
          <td class="value">${formatComponentValue(c)}</td>
        </tr>`
      )
      .join("");
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lista de Materiais</title>
  <style>
    @page {
      size: A4;
      margin: 30mm 25mm 25mm 25mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }

    .page {
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 32px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 2.5px solid #0f172a;
    }

    .header-left h1 {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #0f172a;
      line-height: 1.1;
    }

    .header-left p {
      margin-top: 4px;
      font-size: 9.5pt;
      color: #64748b;
    }

    .header-right {
      text-align: right;
    }

    .header-right .date {
      font-size: 9pt;
      color: #64748b;
    }

    .header-right .total-badge {
      margin-top: 6px;
      display: inline-block;
      background: #0f172a;
      color: #f8fafc;
      font-size: 9pt;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    thead th {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      text-align: left;
      padding: 0 10px 8px 10px;
      border-bottom: 1.5px solid #e2e8f0;
    }

    thead th.qty {
      text-align: center;
      width: 48px;
    }

    thead th.value {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    tbody td {
      padding: 9px 10px;
      font-size: 10.5pt;
      vertical-align: middle;
    }

    tbody td.qty {
      text-align: center;
      font-weight: 700;
      font-size: 11pt;
      color: #0f172a;
      width: 48px;
    }

    tbody td.value {
      text-align: right;
      font-family: "Cascadia Code", "Fira Code", "Courier New", monospace;
      font-size: 10pt;
      color: #0369a1;
    }

    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: #94a3b8;
      text-align: center;
    }

    @media print {
      body { padding: 0; }
      .page { padding: 0; max-width: 100%; }
      thead th { color: #475569; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>Lista de Materiais</h1>
        <p>Bill of Materials &mdash; Circuito DC</p>
      </div>
      <div class="header-right">
        <div class="date">${date}</div>
        <div class="total-badge">${totalComponents} componente${totalComponents !== 1 ? "s" : ""}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="qty">Qtd</th>
          <th>Componente</th>
          <th class="value">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>

    <div class="footer">
      Gerado pelo Simulador de Circuitos DC
    </div>
  </div>
</body>
</html>`;
}

function handleBomAction() {
  if (state.components.length === 0) {
    showStatus("Nenhum componente no circuito", true);
    return;
  }

  const groups = buildBomGroups();
  if (groups.length === 0) {
    showStatus("Nenhum componente para listar", true);
    return;
  }

  const html = buildBomHtml(groups);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");
  if (!win) {
    showStatus("Permita pop-ups para gerar o PDF", true);
    URL.revokeObjectURL(url);
    return;
  }

  win.addEventListener("load", () => {
    URL.revokeObjectURL(url);
    win.focus();
    win.print();
  });
}

export { handleBomAction };
