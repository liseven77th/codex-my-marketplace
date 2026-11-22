// Shared language-aware text metrics and caption segmentation for demo-video-plugin.
// Chinese is counted by Han characters; Latin words and numeric groups count as one unit.
const SPEECH_TOKEN = /[\p{Script=Han}]|[A-Za-z]+(?:['’][A-Za-z]+)?|\d+(?:[.,]\d+)*(?:%|％)?/gu;
export function hasHan(text) { return /\p{Script=Han}/u.test(String(text ?? '')); }
export function countSpeechUnits(text) { return (String(text ?? '').match(SPEECH_TOKEN) || []).length; }
function splitLongPart(part, maxUnits) {
  const total = countSpeechUnits(part);
  const chunkCount = Math.ceil(total / maxUnits);
  const target = Math.ceil(total / chunkCount);
  const chunks = [];
  let current = '';
  for (const char of Array.from(part)) {
    current += char;
    if (chunks.length < chunkCount - 1 && countSpeechUnits(current) >= target) {
      chunks.push(current);
      current = '';
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}
/** Prefer Chinese sentence and clause punctuation; balance long phrases to avoid tiny tail captions. */
export function splitChineseCaptions(text, maxUnits = 18) {
  const clean = String(text ?? '').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^。！？!?；;]+[。！？!?；;]?/gu) || [clean];
  const chunks = [];
  for (const sentence of sentences) {
    const clauses = sentence.match(/[^，,、：:]+[，,、：:]?/gu) || [sentence];
    let pending = '';
    const flush = () => { if (pending.trim()) chunks.push(pending.trim()); pending = ''; };
    for (const clause of clauses) {
      if (countSpeechUnits(clause) > maxUnits) {
        flush();
        const parts = splitLongPart(clause, maxUnits);
        for (const part of parts) {
          const last = chunks.length - 1;
          if (last >= 0 && countSpeechUnits(chunks[last] + part) <= maxUnits) chunks[last] += part;
          else chunks.push(part);
        }
      } else {
        if (pending && countSpeechUnits(pending + clause) > maxUnits) flush();
        pending += clause;
      }
    }
    flush();
  }
  return chunks.filter(Boolean);
}
