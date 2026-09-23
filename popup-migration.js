/* Google Authenticator migration payload decoder.
 * Decodes otpauth-migration:// payloads locally without external libraries or network access.
 */
(() => {
  const textDecoder = new TextDecoder();

  function fail(message) {
    throw new Error(message || "Invalid Google Authenticator migration payload.");
  }

  function readVarint(bytes, cursor) {
    let value = 0n;
    let shift = 0n;
    while (cursor.offset < bytes.length && shift <= 70n) {
      const byte = BigInt(bytes[cursor.offset++]);
      value |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) return value;
      shift += 7n;
    }
    fail();
  }

  function readLengthDelimited(bytes, cursor) {
    const length = Number(readVarint(bytes, cursor));
    if (!Number.isSafeInteger(length) || length < 0 || cursor.offset + length > bytes.length) fail();
    const value = bytes.subarray(cursor.offset, cursor.offset + length);
    cursor.offset += length;
    return value;
  }

  function skipField(bytes, cursor, wireType) {
    if (wireType === 0) {
      readVarint(bytes, cursor);
      return;
    }
    if (wireType === 1) {
      if (cursor.offset + 8 > bytes.length) fail();
      cursor.offset += 8;
      return;
    }
    if (wireType === 2) {
      readLengthDelimited(bytes, cursor);
      return;
    }
    if (wireType === 5) {
      if (cursor.offset + 4 > bytes.length) fail();
      cursor.offset += 4;
      return;
    }
    fail();
  }

  function decodeString(bytes) {
    return textDecoder.decode(bytes).replace(/\0/g, "").trim();
  }

  function bytesToBase32(bytes) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let output = "";
    let buffer = 0;
    let bits = 0;

    for (const byte of bytes) {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        output += alphabet[(buffer >>> bits) & 31];
        buffer &= (1 << bits) - 1;
      }
    }
    if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];
    return output;
  }

  function decodeOtpParameters(bytes) {
    const cursor = { offset: 0 };
    const result = {
      secret: new Uint8Array(),
      name: "",
      issuer: "",
      algorithm: 0,
      digits: 0,
      type: 0,
      counter: 0n
    };

    while (cursor.offset < bytes.length) {
      const tag = readVarint(bytes, cursor);
      const field = Number(tag >> 3n);
      const wire = Number(tag & 7n);

      if (field === 1 && wire === 2) result.secret = readLengthDelimited(bytes, cursor);
      else if (field === 2 && wire === 2) result.name = decodeString(readLengthDelimited(bytes, cursor));
      else if (field === 3 && wire === 2) result.issuer = decodeString(readLengthDelimited(bytes, cursor));
      else if (field === 4 && wire === 0) result.algorithm = Number(readVarint(bytes, cursor));
      else if (field === 5 && wire === 0) result.digits = Number(readVarint(bytes, cursor));
      else if (field === 6 && wire === 0) result.type = Number(readVarint(bytes, cursor));
      else if (field === 7 && wire === 0) result.counter = readVarint(bytes, cursor);
      else skipField(bytes, cursor, wire);
    }

    return result;
  }

  function decodePayload(bytes) {
    const cursor = { offset: 0 };
    const payload = {
      otpParameters: [],
      version: 0,
      batchSize: 1,
      batchIndex: 0,
      batchId: 0
    };

    while (cursor.offset < bytes.length) {
      const tag = readVarint(bytes, cursor);
      const field = Number(tag >> 3n);
      const wire = Number(tag & 7n);

      if (field === 1 && wire === 2) payload.otpParameters.push(decodeOtpParameters(readLengthDelimited(bytes, cursor)));
      else if (field === 2 && wire === 0) payload.version = Number(readVarint(bytes, cursor));
      else if (field === 3 && wire === 0) payload.batchSize = Math.max(1, Number(readVarint(bytes, cursor)) || 1);
      else if (field === 4 && wire === 0) payload.batchIndex = Math.max(0, Number(readVarint(bytes, cursor)) || 0);
      else if (field === 5 && wire === 0) payload.batchId = Number(readVarint(bytes, cursor)) || 0;
      else skipField(bytes, cursor, wire);
    }

    return payload;
  }

  function base64ToBytes(value) {
    let normalized = String(value || "")
      .trim()
      .replace(/ /g, "+")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";

    let binary;
    try {
      binary = atob(normalized);
    } catch {
      fail();
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function mapAlgorithm(value) {
    if (value === 0 || value === 1) return "SHA-1";
    if (value === 2) return "SHA-256";
    if (value === 3) return "SHA-512";
    return null;
  }

  function mapDigits(value) {
    if (value === 0 || value === 1) return 6;
    if (value === 2) return 8;
    return null;
  }

  function decodeUri(raw) {
    let url;
    try {
      url = new URL(String(raw || "").trim());
    } catch {
      fail();
    }
    if (url.protocol.toLowerCase() !== "otpauth-migration:") fail();

    const encoded = url.searchParams.get("data");
    if (!encoded) fail();

    const payload = decodePayload(base64ToBytes(encoded));
    const entries = [];
    let unsupportedCount = 0;

    for (const parameter of payload.otpParameters) {
      // Google Authenticator: 1 = HOTP, 2 = TOTP.
      if (parameter.type !== 2) {
        unsupportedCount++;
        continue;
      }

      const algorithm = mapAlgorithm(parameter.algorithm);
      const digits = mapDigits(parameter.digits);
      if (!algorithm || !digits || !parameter.secret.length) {
        unsupportedCount++;
        continue;
      }

      entries.push({
        secret: bytesToBase32(parameter.secret),
        label: parameter.name,
        issuer: parameter.issuer,
        algorithm,
        digits,
        period: 30
      });
    }

    return {
      entries,
      unsupportedCount,
      version: payload.version,
      batchSize: payload.batchSize,
      batchIndex: payload.batchIndex,
      batchId: payload.batchId
    };
  }

  globalThis.TotpMigration = Object.freeze({ decodeUri, bytesToBase32 });
})();
