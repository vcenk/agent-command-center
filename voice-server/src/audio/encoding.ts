/**
 * Audio encoding utilities for Twilio Media Streams
 *
 * Twilio sends/receives mu-law encoded audio at 8kHz mono.
 * OpenAI TTS outputs PCM16 at 24kHz.
 * We need to convert between the two formats.
 */

// mu-law compression lookup table (PCM16 linear -> mu-law byte)
const MAX = 0x7fff;
const BIAS = 0x84;
const CLIP = 32635;

const MU_LAW_ENCODE_TABLE = (() => {
  const table = new Uint8Array(65536);
  for (let i = 0; i < 65536; i++) {
    // Treat as signed 16-bit
    let sample = i >= 32768 ? i - 65536 : i;
    const sign = sample < 0 ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;

    let exponent = 7;
    let mask = 0x4000;
    while ((sample & mask) === 0 && exponent > 0) {
      exponent--;
      mask >>= 1;
    }

    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    const muLawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
    table[i] = muLawByte;
  }
  return table;
})();

// mu-law decompression table (mu-law byte -> PCM16 linear)
const MU_LAW_DECODE_TABLE = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    const muLaw = ~i & 0xff;
    const sign = muLaw & 0x80;
    const exponent = (muLaw >> 4) & 0x07;
    const mantissa = muLaw & 0x0f;
    let sample = ((mantissa << 3) + BIAS) << exponent;
    sample -= BIAS;
    table[i] = sign ? -sample : sample;
  }
  return table;
})();

/**
 * Convert PCM16 linear sample to mu-law byte
 */
export function linearToMuLaw(sample: number): number {
  // Clamp to 16-bit range and convert to unsigned index
  const clamped = Math.max(-32768, Math.min(32767, Math.round(sample)));
  const index = clamped < 0 ? clamped + 65536 : clamped;
  return MU_LAW_ENCODE_TABLE[index];
}

/**
 * Convert mu-law byte to PCM16 linear sample
 */
export function muLawToLinear(muLaw: number): number {
  return MU_LAW_DECODE_TABLE[muLaw & 0xff];
}

/**
 * Downsample PCM16 buffer from sourceRate to targetRate
 * Simple linear interpolation
 */
export function downsample(
  input: Int16Array,
  sourceRate: number,
  targetRate: number
): Int16Array {
  if (sourceRate === targetRate) return input;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    output[i] = Math.round(
      input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction
    );
  }

  return output;
}

/**
 * Convert PCM16 buffer (24kHz) to mu-law buffer (8kHz) for Twilio
 */
export function pcm16ToMuLaw8k(pcmBuffer: Buffer, sourceRate: number = 24000): Buffer {
  // Parse PCM16 LE into Int16Array
  const pcm16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);

  // Downsample from sourceRate to 8kHz
  const downsampled = downsample(pcm16, sourceRate, 8000);

  // Convert each sample to mu-law
  const muLaw = Buffer.alloc(downsampled.length);
  for (let i = 0; i < downsampled.length; i++) {
    muLaw[i] = linearToMuLaw(downsampled[i]);
  }

  return muLaw;
}

/**
 * Convert mu-law buffer (8kHz) to PCM16 buffer
 */
export function muLawToPcm16(muLawBuffer: Buffer): Buffer {
  const pcm = Buffer.alloc(muLawBuffer.length * 2);
  for (let i = 0; i < muLawBuffer.length; i++) {
    const sample = muLawToLinear(muLawBuffer[i]);
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

/**
 * Split a mu-law buffer into chunks suitable for Twilio media messages
 * Twilio expects 20ms frames (160 bytes at 8kHz mu-law)
 */
export function splitIntoFrames(muLawBuffer: Buffer, frameSize: number = 160): Buffer[] {
  const frames: Buffer[] = [];
  for (let offset = 0; offset < muLawBuffer.length; offset += frameSize) {
    const end = Math.min(offset + frameSize, muLawBuffer.length);
    frames.push(muLawBuffer.subarray(offset, end));
  }
  return frames;
}
