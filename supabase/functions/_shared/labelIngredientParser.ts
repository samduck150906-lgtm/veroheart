export const MAX_LABEL_INGREDIENT_ITEMS = 100;

export interface ParsedIngredientLabelItem {
  order: number;
  rawText: string;
  baseText: string;
  amountText: string | null;
  percentage: number | null;
  parserMetadata: {
    parentheticalText: string[];
  };
}

export class IngredientLabelParseError extends Error {
  readonly code: 'too_many_items';
  readonly itemCount: number;

  constructor(itemCount: number) {
    super(`원재료 항목이 ${MAX_LABEL_INGREDIENT_ITEMS}개를 초과했습니다.`);
    this.name = 'IngredientLabelParseError';
    this.code = 'too_many_items';
    this.itemCount = itemCount;
  }
}

const OPEN_TO_CLOSE: Record<string, string> = {
  '(': ')', '[': ']', '{': '}', '（': '）', '［': '］', '【': '】',
};
const CLOSERS = new Set(Object.values(OPEN_TO_CLOSE));
const TOP_LEVEL_SEPARATORS = new Set([',', '、', '·', ';', '\n']);

function splitTopLevel(input: string): string[] {
  const pieces: string[] = [];
  const stack: string[] = [];
  let current = '';

  for (const char of input.replace(/\r\n?/g, '\n')) {
    const close = OPEN_TO_CLOSE[char];
    if (close) stack.push(close);
    else if (CLOSERS.has(char) && stack.at(-1) === char) stack.pop();

    if (TOP_LEVEL_SEPARATORS.has(char) && stack.length === 0) {
      if (current.trim()) pieces.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

function stripListPrefix(value: string): string {
  return value
    .replace(/^[\s\-–—•*▪◦]+/, '')
    .replace(/^\d+\s*[.)]\s*/, '')
    .trim();
}

function separateParentheticals(value: string): { base: string; contents: string[] } {
  const stack: string[] = [];
  const contentStack: string[] = [];
  const contents: string[] = [];
  let base = '';

  for (const char of value) {
    const close = OPEN_TO_CLOSE[char];
    if (close) {
      if (stack.length > 0) contentStack[contentStack.length - 1] += char;
      stack.push(close);
      contentStack.push('');
      continue;
    }
    if (CLOSERS.has(char) && stack.at(-1) === char) {
      const completed = contentStack.pop()?.trim() ?? '';
      stack.pop();
      if (stack.length > 0) {
        contentStack[contentStack.length - 1] += `${completed}${char}`;
      } else if (completed) {
        contents.push(completed);
      }
      continue;
    }
    if (stack.length > 0) contentStack[contentStack.length - 1] += char;
    else base += char;
  }

  // A malformed, unclosed note is still metadata and must not be promoted to the base name.
  if (contentStack.length > 0) {
    const unfinished = contentStack[0].trim();
    if (unfinished) contents.push(unfinished);
  }
  return { base, contents };
}

function baseIngredientText(value: string): string {
  return separateParentheticals(value).base
    .replace(/\d+(?:\.\d+)?\s*%/g, ' ')
    .replace(/\s*(등|외)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseIngredientLabelItems(text: string): ParsedIngredientLabelItem[] {
  const pieces = splitTopLevel(text ?? '').map(stripListPrefix).filter(Boolean);
  if (pieces.length > MAX_LABEL_INGREDIENT_ITEMS) {
    throw new IngredientLabelParseError(pieces.length);
  }

  return pieces.map((rawText, index) => {
    const amountMatch = rawText.match(/\d+(?:\.\d+)?\s*%/);
    const amountText = amountMatch?.[0].replace(/\s+/g, '') ?? null;
    return {
      order: index + 1,
      rawText,
      baseText: baseIngredientText(rawText),
      amountText,
      percentage: amountText === null ? null : Number(amountText.replace('%', '')),
      parserMetadata: { parentheticalText: separateParentheticals(rawText).contents },
    };
  }).filter((item) => item.baseText.length > 0);
}
