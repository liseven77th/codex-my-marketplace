import test from 'node:test';
import assert from 'node:assert/strict';
import { countSpeechUnits, hasHan, splitChineseCaptions } from '../lib/chinese-text.mjs';
test('counts Chinese characters rather than whitespace-delimited words', () => {
  assert.equal(countSpeechUnits('这款工具可以采集千川数据。'), 12);
  assert.equal(hasHan('中文字幕'), true);
});
test('counts Latin words and numeric groups as single units', () => {
  assert.equal(countSpeechUnits('导出 XLSX 文件，最近 7 天。'), 9);
});
test('splits Chinese captions at punctuation and within long clauses', () => {
  const source = '连接成功后，设置消耗情况、日期范围和最小订单数。最小订单数只保留达到门槛的商品。';
  const chunks = splitChineseCaptions(source, 12);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((chunk) => countSpeechUnits(chunk) <= 12));
  assert.equal(chunks.join(''), source);
});
test('returns no captions for empty narration', () => {
  assert.deepEqual(splitChineseCaptions('  '), []);
});
