const QR = (() => {
  const RS_BLOCKS_L = [
    null,
    [[1, 26, 19]],
    [[1, 44, 34]],
    [[1, 70, 55]],
    [[1, 100, 80]],
    [[1, 134, 108]],
    [[2, 86, 68]],
    [[2, 98, 78]],
    [[2, 121, 97]],
    [[2, 146, 116]],
    [[2, 86, 68], [2, 87, 69]],
    [[4, 101, 81]],
    [[2, 116, 92], [2, 117, 93]],
    [[4, 133, 107]],
    [[3, 145, 115], [1, 146, 116]],
    [[5, 109, 87], [1, 110, 88]],
    [[5, 122, 98], [1, 123, 99]],
    [[1, 135, 107], [5, 136, 108]],
    [[5, 150, 120], [1, 151, 121]],
    [[3, 141, 113], [4, 142, 114]],
    [[3, 135, 107], [5, 136, 108]]
  ];

  const ALIGNMENT = [
    null,
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90]
  ];

  const gfExp = new Array(512);
  const gfLog = new Array(256);

  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    gfExp[i] = value;
    gfLog[value] = i;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    gfExp[i] = gfExp[i - 255];
  }

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]];
  }

  function rsDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;

    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < degree; j += 1) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) {
          result[j] ^= result[j + 1];
        }
      }
      root = gfMul(root, 2);
    }

    return result;
  }

  function rsRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);

    data.forEach((byte) => {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < divisor.length; i += 1) {
        result[i] ^= gfMul(divisor[i], factor);
      }
    });

    return result;
  }

  class Matrix {
    constructor(version) {
      this.version = version;
      this.size = 17 + version * 4;
      this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
      this.functionModules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    }

    set(x, y, dark, isFunction = true) {
      if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
        return;
      }
      this.modules[y][x] = Boolean(dark);
      if (isFunction) {
        this.functionModules[y][x] = true;
      }
    }
  }

  function appendBits(bits, valueToAppend, length) {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push(((valueToAppend >>> i) & 1) !== 0);
    }
  }

  function totalDataCodewords(version) {
    return RS_BLOCKS_L[version].reduce((sum, group) => sum + group[0] * group[2], 0);
  }

  function encodeData(text, version) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const capacity = totalDataCodewords(version);
    const countBits = version < 10 ? 8 : 16;
    const bits = [];

    if (bytes.length >= (1 << countBits)) {
      throw new Error("Text is too long for this QR version.");
    }

    appendBits(bits, 0x4, 4);
    appendBits(bits, bytes.length, countBits);
    bytes.forEach((byte) => appendBits(bits, byte, 8));

    const capacityBits = capacity * 8;
    appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8 !== 0) {
      bits.push(false);
    }

    const dataCodewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) {
        byte = (byte << 1) | (bits[i + j] ? 1 : 0);
      }
      dataCodewords.push(byte);
    }

    for (let pad = 0xec; dataCodewords.length < capacity; pad ^= 0xfd) {
      dataCodewords.push(pad);
    }

    return dataCodewords;
  }

  function selectVersion(text) {
    const bytes = new TextEncoder().encode(text);

    for (let version = 1; version < RS_BLOCKS_L.length; version += 1) {
      const countBits = version < 10 ? 8 : 16;
      const neededBits = 4 + countBits + bytes.length * 8;
      if (neededBits <= totalDataCodewords(version) * 8) {
        return version;
      }
    }

    throw new Error("This QR link is too long. Shorten the message or subject.");
  }

  function addErrorCorrection(dataCodewords, version) {
    const blocks = [];
    let offset = 0;

    RS_BLOCKS_L[version].forEach(([count, total, data]) => {
      for (let i = 0; i < count; i += 1) {
        const blockData = dataCodewords.slice(offset, offset + data);
        const divisor = rsDivisor(total - data);
        blocks.push({
          data: blockData,
          ecc: rsRemainder(blockData, divisor)
        });
        offset += data;
      }
    });

    const result = [];
    const maxData = Math.max(...blocks.map((block) => block.data.length));
    const maxEcc = Math.max(...blocks.map((block) => block.ecc.length));

    for (let i = 0; i < maxData; i += 1) {
      blocks.forEach((block) => {
        if (i < block.data.length) {
          result.push(block.data[i]);
        }
      });
    }

    for (let i = 0; i < maxEcc; i += 1) {
      blocks.forEach((block) => {
        if (i < block.ecc.length) {
          result.push(block.ecc[i]);
        }
      });
    }

    return result;
  }

  function drawFinder(matrix, x, y) {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const distanceX = Math.abs(dx - 3);
        const distanceY = Math.abs(dy - 3);
        const isInside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const dark = isInside && (distanceX === 3 || distanceY === 3 || (distanceX <= 1 && distanceY <= 1));
        matrix.set(x + dx, y + dy, dark, true);
      }
    }
  }

  function drawAlignment(matrix, x, y) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        matrix.set(x + dx, y + dy, distance !== 1, true);
      }
    }
  }

  function versionBits(version) {
    let bits = version << 12;
    for (let i = 17; i >= 12; i -= 1) {
      if (((bits >>> i) & 1) !== 0) {
        bits ^= 0x1f25 << (i - 12);
      }
    }
    return (version << 12) | (bits & 0xfff);
  }

  function drawVersion(matrix) {
    if (matrix.version < 7) {
      return;
    }

    const bits = versionBits(matrix.version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = matrix.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      matrix.set(a, b, dark, true);
      matrix.set(b, a, dark, true);
    }
  }

  function formatBits(mask) {
    const data = (1 << 3) | mask;
    let bits = data << 10;

    for (let i = 14; i >= 10; i -= 1) {
      if (((bits >>> i) & 1) !== 0) {
        bits ^= 0x537 << (i - 10);
      }
    }

    return ((data << 10) | (bits & 0x3ff)) ^ 0x5412;
  }

  function drawFormat(matrix, mask) {
    const bits = formatBits(mask);

    for (let i = 0; i <= 5; i += 1) {
      matrix.set(8, i, ((bits >>> i) & 1) !== 0, true);
    }
    matrix.set(8, 7, ((bits >>> 6) & 1) !== 0, true);
    matrix.set(8, 8, ((bits >>> 7) & 1) !== 0, true);
    matrix.set(7, 8, ((bits >>> 8) & 1) !== 0, true);
    for (let i = 9; i < 15; i += 1) {
      matrix.set(14 - i, 8, ((bits >>> i) & 1) !== 0, true);
    }

    for (let i = 0; i < 8; i += 1) {
      matrix.set(matrix.size - 1 - i, 8, ((bits >>> i) & 1) !== 0, true);
    }
    for (let i = 8; i < 15; i += 1) {
      matrix.set(8, matrix.size - 15 + i, ((bits >>> i) & 1) !== 0, true);
    }
    matrix.set(8, matrix.size - 8, true, true);
  }

  function setupFunctionPatterns(version) {
    const matrix = new Matrix(version);
    const max = matrix.size - 7;

    drawFinder(matrix, 0, 0);
    drawFinder(matrix, max, 0);
    drawFinder(matrix, 0, max);

    ALIGNMENT[version].forEach((x) => {
      ALIGNMENT[version].forEach((y) => {
        if (!matrix.functionModules[y][x]) {
          drawAlignment(matrix, x, y);
        }
      });
    });

    for (let i = 8; i < matrix.size - 8; i += 1) {
      const dark = i % 2 === 0;
      matrix.set(i, 6, dark, true);
      matrix.set(6, i, dark, true);
    }

    drawFormat(matrix, 0);
    drawVersion(matrix);
    return matrix;
  }

  function maskBit(mask, x, y) {
    switch (mask) {
      case 0:
        return (x + y) % 2 === 0;
      case 1:
        return y % 2 === 0;
      case 2:
        return x % 3 === 0;
      case 3:
        return (x + y) % 3 === 0;
      case 4:
        return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5:
        return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6:
        return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      case 7:
        return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      default:
        return false;
    }
  }

  function placeData(matrix, codewords, mask) {
    let bitIndex = 0;
    let upward = true;

    for (let right = matrix.size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right -= 1;
      }

      for (let vertical = 0; vertical < matrix.size; vertical += 1) {
        const y = upward ? matrix.size - 1 - vertical : vertical;

        for (let dx = 0; dx < 2; dx += 1) {
          const x = right - dx;
          if (!matrix.functionModules[y][x]) {
            let dark = false;
            if (bitIndex < codewords.length * 8) {
              dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            }
            if (maskBit(mask, x, y)) {
              dark = !dark;
            }
            matrix.set(x, y, dark, false);
            bitIndex += 1;
          }
        }
      }

      upward = !upward;
    }
  }

  function penalty(matrix) {
    const size = matrix.size;
    let score = 0;

    for (let y = 0; y < size; y += 1) {
      let runColor = matrix.modules[y][0];
      let runLength = 1;
      for (let x = 1; x < size; x += 1) {
        if (matrix.modules[y][x] === runColor) {
          runLength += 1;
          if (runLength === 5) {
            score += 3;
          } else if (runLength > 5) {
            score += 1;
          }
        } else {
          runColor = matrix.modules[y][x];
          runLength = 1;
        }
      }
    }

    for (let x = 0; x < size; x += 1) {
      let runColor = matrix.modules[0][x];
      let runLength = 1;
      for (let y = 1; y < size; y += 1) {
        if (matrix.modules[y][x] === runColor) {
          runLength += 1;
          if (runLength === 5) {
            score += 3;
          } else if (runLength > 5) {
            score += 1;
          }
        } else {
          runColor = matrix.modules[y][x];
          runLength = 1;
        }
      }
    }

    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const color = matrix.modules[y][x];
        if (
          color === matrix.modules[y][x + 1] &&
          color === matrix.modules[y + 1][x] &&
          color === matrix.modules[y + 1][x + 1]
        ) {
          score += 3;
        }
      }
    }

    const patternA = "10111010000";
    const patternB = "00001011101";

    for (let y = 0; y < size; y += 1) {
      let row = "";
      for (let x = 0; x < size; x += 1) {
        row += matrix.modules[y][x] ? "1" : "0";
      }
      for (let x = 0; x <= size - 11; x += 1) {
        const slice = row.slice(x, x + 11);
        if (slice === patternA || slice === patternB) {
          score += 40;
        }
      }
    }

    for (let x = 0; x < size; x += 1) {
      let column = "";
      for (let y = 0; y < size; y += 1) {
        column += matrix.modules[y][x] ? "1" : "0";
      }
      for (let y = 0; y <= size - 11; y += 1) {
        const slice = column.slice(y, y + 11);
        if (slice === patternA || slice === patternB) {
          score += 40;
        }
      }
    }

    let dark = 0;
    matrix.modules.forEach((row) => {
      row.forEach((module) => {
        if (module) {
          dark += 1;
        }
      });
    });

    const total = size * size;
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  }

  function make(text) {
    if (!text) {
      throw new Error("Add the target details to create a QR code.");
    }

    const version = selectVersion(text);
    const data = encodeData(text, version);
    const codewords = addErrorCorrection(data, version);

    let best = null;
    let bestScore = Infinity;

    for (let mask = 0; mask < 8; mask += 1) {
      const matrix = setupFunctionPatterns(version);
      placeData(matrix, codewords, mask);
      drawFormat(matrix, mask);
      const score = penalty(matrix);

      if (score < bestScore) {
        bestScore = score;
        best = matrix;
      }
    }

    return best;
  }

  function toSvg(text, options = {}) {
    const matrix = make(text);
    const margin = options.margin ?? 4;
    const size = matrix.size + margin * 2;
    const path = [];

    for (let y = 0; y < matrix.size; y += 1) {
      for (let x = 0; x < matrix.size; x += 1) {
        if (matrix.modules[y][x]) {
          path.push(`M${x + margin},${y + margin}h1v1h-1z`);
        }
      }
    }

    return {
      version: matrix.version,
      moduleSize: matrix.size,
      svg: [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code" shape-rendering="crispEdges">`,
        `<rect width="${size}" height="${size}" fill="#fff"/>`,
        `<path d="${path.join("")}" fill="#111827"/>`,
        "</svg>"
      ].join("")
    };
  }

  return { toSvg };
})();

const $ = (selector) => document.querySelector(selector);

const QR_MODULES = {
  whatsapp: {
    label: "WhatsApp",
    editor: $("#whatsappPayload"),
    qr: $("#whatsappQr"),
    link: $("#whatsappLink"),
    status: $("#whatsappStatus")
  },
  email: {
    label: "Email",
    editor: $("#emailPayload"),
    qr: $("#emailQr"),
    link: $("#emailLink"),
    status: $("#emailStatus")
  },
  sms: {
    label: "SMS",
    editor: $("#smsPayload"),
    qr: $("#smsQr"),
    link: $("#smsLink"),
    status: $("#smsStatus")
  }
};

const EMPTY_QR_PAYLOAD = {
  whatsapp: {
    phone: "",
    message: ""
  },
  email: {
    email: "",
    subject: "",
    message: ""
  },
  sms: {
    phone: "",
    message: ""
  }
};

let sourceQrPayload = cloneQrPayload(EMPTY_QR_PAYLOAD);
let sourceQrSignature = "";
const activeQrLinks = {
  whatsapp: "",
  email: "",
  sms: ""
};

const PAYLOAD_SYNC_INTERVAL_MS = 3000;

function cloneQrPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function readPayloadText(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function normalizeQrPayload(payload) {
  return {
    whatsapp: normalizeWhatsAppPayload(payload?.whatsapp ?? payload),
    email: normalizeEmailPayload(payload?.email ?? payload),
    sms: normalizeSmsPayload(payload?.sms ?? payload)
  };
}

function normalizeWhatsAppPayload(payload) {
  return {
    phone: readPayloadText(payload?.phone),
    message: readPayloadText(payload?.message)
  };
}

function normalizeEmailPayload(payload) {
  return {
    email: cleanPayloadEmail(payload?.email),
    subject: readPayloadText(payload?.subject),
    message: readPayloadText(payload?.message)
  };
}

function normalizeSmsPayload(payload) {
  return {
    phone: readPayloadText(payload?.phone),
    message: readPayloadText(payload?.message)
  };
}

function cleanPayloadEmail(value) {
  const raw = readPayloadText(value);
  const mailtoMatch = raw.match(/mailto:([^)\s]+)/i);
  if (mailtoMatch) {
    return mailtoMatch[1].trim();
  }
  return raw.replace(/^\[|\]$/g, "");
}

function prettyPayloadJson(payload) {
  return JSON.stringify(payload, null, 2);
}

async function loadQrPayloadFile() {
  const response = await fetch(`./payload.json?sync=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("payload.json could not be loaded.");
  }
  return normalizeQrPayload(await response.json());
}

function payloadSignature(payload) {
  return JSON.stringify(payload);
}

function getEditedPayload(type) {
  const data = JSON.parse(QR_MODULES[type].editor.value);
  const scoped = data?.[type] && typeof data[type] === "object" ? data[type] : data;

  if (type === "whatsapp") {
    return normalizeWhatsAppPayload(scoped);
  }
  if (type === "email") {
    return normalizeEmailPayload(scoped);
  }
  return normalizeSmsPayload(scoped);
}

function normalizeQrPhone(value, keepPlus = false) {
  const raw = readPayloadText(value);
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  return keepPlus && raw.startsWith("+") ? `+${digits}` : digits;
}

function buildWhatsAppQrLink(payload) {
  const phone = normalizeQrPhone(payload.phone);
  if (!phone) {
    throw new Error("Payload needs a phone number.");
  }

  const message = readPayloadText(payload.message);
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

function buildEmailQrLink(payload) {
  const email = cleanPayloadEmail(payload.email);
  if (!email) {
    throw new Error("Payload needs an email address.");
  }

  const query = buildMailQuery({
    subject: payload.subject,
    body: payload.message
  });

  return `mailto:${email}${query ? `?${query}` : ""}`;
}

function buildSmsQrLink(payload) {
  const phone = normalizeQrPhone(payload.phone, true);
  if (!phone) {
    throw new Error("Payload needs a phone number.");
  }

  const message = readPayloadText(payload.message);
  return `sms:${phone}${message ? `?&body=${encodeURIComponent(message)}` : ""}`;
}

function buildMailQuery(params) {
  return Object.entries(params)
    .map(([key, value]) => [key, readPayloadText(value)])
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function buildQrLink(type, payload) {
  if (type === "whatsapp") {
    return buildWhatsAppQrLink(payload);
  }
  if (type === "email") {
    return buildEmailQrLink(payload);
  }
  return buildSmsQrLink(payload);
}

function setQrEmpty(type, message, isError = false) {
  const module = QR_MODULES[type];
  module.qr.innerHTML = `<div class="qr-empty">${message}</div>`;
  module.link.textContent = "";
  module.status.textContent = message;
  module.status.classList.toggle("is-error", isError);
  module.editor.classList.toggle("is-invalid", isError);
  activeQrLinks[type] = "";
  setQrDownloadState(type, true);
}

function renderQrModule(type, showGeneratedToast = false) {
  const module = QR_MODULES[type];

  try {
    const payload = getEditedPayload(type);
    const link = buildQrLink(type, payload);
    const result = QR.toSvg(link);

    module.qr.innerHTML = result.svg;
    module.link.textContent = link;
    module.status.textContent = `Generated from payload. QR version ${result.version}.`;
    module.status.classList.remove("is-error");
    module.editor.classList.remove("is-invalid");
    activeQrLinks[type] = link;
    setQrDownloadState(type, false);

    if (showGeneratedToast) {
      showQrToast(`${module.label} QR generated`);
    }
  } catch (error) {
    const isJsonError = error instanceof SyntaxError;
    setQrEmpty(type, isJsonError ? "Invalid JSON payload." : error.message, true);
  }
}

function renderAllQrModules() {
  Object.keys(QR_MODULES).forEach((type) => renderQrModule(type));
}

function setQrDownloadState(type, disabled) {
  const button = document.querySelector(`[data-download="${type}"]`);
  if (button) {
    button.disabled = disabled;
  }
}

function resetQrModule(type) {
  QR_MODULES[type].editor.value = prettyPayloadJson(sourceQrPayload[type]);
  renderQrModule(type);
  showQrToast(`${QR_MODULES[type].label} payload reset`);
}

function downloadQrSvg(type) {
  if (!activeQrLinks[type]) {
    return;
  }

  const svg = QR_MODULES[type].qr.querySelector("svg");
  if (!svg) {
    return;
  }

  const blob = new Blob([svg.outerHTML], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${type}-qr.svg`;
  document.body.append(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function showQrToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showQrToast.timer);
  showQrToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function attachQrEvents() {
  Object.entries(QR_MODULES).forEach(([type, module]) => {
    module.editor.addEventListener("input", () => renderQrModule(type));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    if (button.dataset.generate) {
      renderQrModule(button.dataset.generate, true);
    }
    if (button.dataset.download) {
      downloadQrSvg(button.dataset.download);
    }
    if (button.dataset.reset) {
      resetQrModule(button.dataset.reset);
    }
  });
}

function loadQrEditorsFromPayload() {
  Object.keys(QR_MODULES).forEach((type) => {
    QR_MODULES[type].editor.value = prettyPayloadJson(sourceQrPayload[type]);
  });
}

async function syncQrPayloadFromFile(showToastOnChange = false) {
  const nextPayload = await loadQrPayloadFile();
  const nextSignature = payloadSignature(nextPayload);

  if (nextSignature === sourceQrSignature) {
    return false;
  }

  sourceQrPayload = nextPayload;
  sourceQrSignature = nextSignature;
  loadQrEditorsFromPayload();
  renderAllQrModules();

  if (showToastOnChange) {
    showQrToast("payload.json synced");
  }

  return true;
}

function startQrPayloadAutoSync() {
  window.setInterval(async () => {
    try {
      await syncQrPayloadFromFile(true);
    } catch (error) {
      console.warn(error.message);
    }
  }, PAYLOAD_SYNC_INTERVAL_MS);
}

async function initializeQrApp() {
  attachQrEvents();

  try {
    await syncQrPayloadFromFile();
    startQrPayloadAutoSync();
  } catch (error) {
    loadQrEditorsFromPayload();
    Object.keys(QR_MODULES).forEach((type) => {
      setQrEmpty(type, error.message, true);
    });
  }
}

initializeQrApp();
