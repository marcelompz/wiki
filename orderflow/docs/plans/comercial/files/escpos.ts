// escpos.ts
// Formatea un pedido en comandos ESC/POS listos para enviar a una impresora
// térmica. Pensado para impresoras de 58mm (32 columnas) o 80mm (48 columnas).

export interface TicketLine {
  name: string;
  quantity: number;
  price: number;
}

export interface TicketPayload {
  businessName?: string;
  table?: string;
  waiterName?: string;
  lines: TicketLine[];
  total: number;
  discount?: number;
  paymentType?: string;
  date?: string;
}

const ESC = "\x1B";
const GS = "\x1D";

const INIT = `${ESC}\x40`; // Reset de la impresora
const ALIGN_CENTER = `${ESC}\x61\x01`;
const ALIGN_LEFT = `${ESC}\x61\x00`;
const BOLD_ON = `${ESC}\x45\x01`;
const BOLD_OFF = `${ESC}\x45\x00`;
const CUT = `${GS}\x56\x00`; // Corte total de papel

// 32 columnas = térmica de 58mm. 48 columnas = térmica de 80mm.
const LINE_WIDTH = 48;

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + " ".repeat(len - str.length);
}

function money(n: number): string {
  return n.toFixed(2);
}

function priceLine(label: string, amount: string): string {
  const spacing = Math.max(1, LINE_WIDTH - amount.length);
  return padRight(label, spacing) + amount + "\n";
}

export function formatTicketEscPos(payload: TicketPayload): string {
  const {
    businessName = "OmniGastro",
    table,
    waiterName,
    lines,
    total,
    discount = 0,
    paymentType,
    date = new Date().toLocaleString("es-PY"),
  } = payload;

  let out = INIT;

  out += ALIGN_CENTER + BOLD_ON + businessName + "\n" + BOLD_OFF;
  out += `${date}\n`;
  if (table) out += `Mesa: ${table}\n`;
  if (waiterName) out += `Atendido por: ${waiterName}\n`;

  out += ALIGN_LEFT + "-".repeat(LINE_WIDTH) + "\n";

  for (const line of lines) {
    const qtyName = `${line.quantity}x ${line.name}`;
    const lineTotal = money(line.price * line.quantity);
    out += priceLine(qtyName.slice(0, LINE_WIDTH - lineTotal.length - 1), lineTotal);
  }

  out += "-".repeat(LINE_WIDTH) + "\n";

  if (discount > 0) {
    out += priceLine("Descuento", `-${money(discount)}`);
  }

  out += BOLD_ON;
  out += priceLine("TOTAL", money(total));
  out += BOLD_OFF;

  if (paymentType) out += `Pago: ${paymentType}\n`;

  out += "\n\n\n";
  out += CUT;

  return out;
}
