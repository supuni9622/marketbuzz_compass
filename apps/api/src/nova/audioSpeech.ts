/**
 * Nova audio speech: OpenAI TTS. Used to speak Nova's responses (e.g. Ask Nova "Read aloud").
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
import OpenAI from "openai";
import { config } from "../config.js";

const MAX_INPUT_CHARS = 4096;
const DEFAULT_VOICE = "nova";
const DEFAULT_MODEL = "tts-1";
const DEFAULT_RESPONSE_FORMAT = "mp3";
const DEFAULT_SPEED = 1.0;

const VALID_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

const VALID_FORMATS = ["mp3", "opus", "aac", "flac", "wav", "pcm"] as const;

export interface CreateSpeechOptions {
  /** Text to speak (max 4096 characters). */
  text: string;
  /** Voice name; defaults to "nova". */
  voice?: string;
  /** Model: tts-1, tts-1-hd, or gpt-4o-mini-tts. */
  model?: string;
  /** Output format; defaults to mp3. */
  response_format?: string;
  /** Speed 0.25–4.0; defaults to 1.0. */
  speed?: number;
}

export interface CreateSpeechResult {
  /** Audio buffer (e.g. MP3). */
  buffer: Buffer;
  /** Content-Type for the response (e.g. audio/mpeg). */
  contentType: string;
  /** Number of input characters used (for usage tracking). */
  charactersUsed: number;
}

function getContentType(format: string): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "opus":
      return "audio/opus";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "wav":
      return "audio/wav";
    case "pcm":
      return "audio/raw";
    default:
      return "audio/mpeg";
  }
}

/**
 * Generate speech from text using OpenAI TTS. Same API key as Nova.
 */
export async function createSpeech(options: CreateSpeechOptions): Promise<CreateSpeechResult> {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const text = (options.text ?? "").trim();
  if (!text) {
    throw new Error("text is required and must not be empty");
  }

  const truncated = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
  const charactersUsed = truncated.length;

  const voice = options.voice && VALID_VOICES.includes(options.voice as (typeof VALID_VOICES)[number])
    ? (options.voice as (typeof VALID_VOICES)[number])
    : DEFAULT_VOICE;

  const model = options.model ?? DEFAULT_MODEL;
  const responseFormat = options.response_format && VALID_FORMATS.includes(options.response_format as (typeof VALID_FORMATS)[number])
    ? (options.response_format as (typeof VALID_FORMATS)[number])
    : (DEFAULT_RESPONSE_FORMAT as (typeof VALID_FORMATS)[number]);

  const speed = typeof options.speed === "number"
    ? Math.max(0.25, Math.min(4, options.speed))
    : DEFAULT_SPEED;

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: truncated,
    response_format: responseFormat,
    speed,
  });

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = getContentType(responseFormat);

  return {
    buffer,
    contentType,
    charactersUsed,
  };
}
