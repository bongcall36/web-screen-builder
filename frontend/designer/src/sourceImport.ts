import { defaultSize, type ScreenComponent, type ScreenComponentType } from './screenTypes';

export type SourceInputType = 'js' | 'hbs' | 'react-js';

export type SourceScreenComponentType = ScreenComponentType;
export type SourceScreenComponent = ScreenComponent;

export type SourceScreenDraft = {
  sourceType: SourceInputType;
  lineCount: number;
  charCount: number;
  summaryTitle: string;
  summaryMessage: string;
  summaryDescription: string;
  components: SourceScreenComponent[];
};

export function sourceTypeLabel(sourceType: SourceInputType) {
  if (sourceType === 'react-js') return 'React JS';
  return sourceType.toUpperCase();
}

function makeGeneratedId(prefix: string, index: number) {
  return `generated-${prefix}-${index}`;
}

function cleanSourceLabel(value: string | undefined, fallback: string) {
  const cleaned = (value ?? '')
    .replace(/\{.*?\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function extractFirstString(source: string, keys: string[]) {
  for (const key of keys) {
    const pattern = new RegExp(`${key}\\s*[=:]\\s*["'\`]([^"'\`]{1,80})["'\`]`, 'i');
    const match = source.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return '';
}

function extractJsGridColumns(sourceText: string) {
  const fields = new Set<string>();
  const patterns = [
    /(?:dataIndex|field|key)\s*:\s*["'`]([A-Za-z0-9_.-]{1,40})["'`]/g,
    /<Column[^>]+(?:dataIndex|field|key)=["'`]([A-Za-z0-9_.-]{1,40})["'`]/g,
  ];
  patterns.forEach((pattern) => {
    for (const match of sourceText.matchAll(pattern)) {
      if (match[1] && !['id', 'key'].includes(match[1])) {
        fields.add(match[1]);
      }
    }
  });
  return [...fields].slice(0, 6).map((field) => ({ field }));
}

function inferJsComponentType(snippet: string): SourceScreenComponentType | null {
  const lower = snippet.toLowerCase();
  if (/(xtype|type)\s*:\s*["'`](grid|gridpanel|table)["'`]/.test(lower) || /<table|<aggrid|<datagrid/.test(lower)) return 'AgGrid';
  if (/(xtype|type)\s*:\s*["'`](textarea|textareafield)["'`]/.test(lower) || /<textarea/.test(lower)) return 'TextArea';
  if (/(xtype|type)\s*:\s*["'`](numberfield|number|numberinput)["'`]/.test(lower) || /type=["'`]number["'`]/.test(lower)) return 'NumberInput';
  if (/(xtype|type)\s*:\s*["'`](combo|combobox|select)["'`]/.test(lower) || /<select/.test(lower)) return 'Select';
  if (/(xtype|type)\s*:\s*["'`](checkbox|checkboxfield)["'`]/.test(lower) || /type=["'`]checkbox["'`]/.test(lower)) return 'Checkbox';
  if (/(xtype|type)\s*:\s*["'`](datefield|datepicker)["'`]/.test(lower) || /type=["'`]date["'`]/.test(lower)) return 'DatePicker';
  if (/(xtype|type)\s*:\s*["'`](button)["'`]/.test(lower) || /<button/.test(lower)) return 'Button';
  if (/(xtype|type)\s*:\s*["'`](label|displayfield|text)["'`]/.test(lower)) return 'Text';
  if (/(xtype|type)\s*:\s*["'`](textfield|input|text)["'`]/.test(lower) || /<input/.test(lower)) return 'Input';
  if (/(fieldlabel|placeholder|name)\s*[=:]/.test(lower)) return 'Input';
  return null;
}

function propsForInferredComponent(
  type: SourceScreenComponentType,
  label: string,
  sourceText: string,
) {
  if (type === 'Text') return { text: label };
  if (type === 'Button') return { text: label };
  if (type === 'Checkbox' || type === 'Switch') return { label };
  if (type === 'Select') return { placeholder: label, options: ['Option 1', 'Option 2'] };
  if (type === 'AgGrid') {
    const columnDefs = extractJsGridColumns(sourceText);
    return {
      columnDefs: columnDefs.length > 0 ? columnDefs : [{ field: 'field1' }, { field: 'field2' }],
      rowData: [],
    };
  }
  return { placeholder: label };
}

function buildInferredComponents(
  snippets: string[],
  inferType: (snippet: string) => SourceScreenComponentType | null,
  labelKeys: string[],
  sourceText: string,
): SourceScreenComponent[] {
  const components: SourceScreenComponent[] = [];
  const seen = new Set<string>();
  const addComponent = (
    type: SourceScreenComponentType,
    label: string,
    sourceForProps: string,
  ) => {
    const dedupeKey = `${type}:${label.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const index = components.length + 1;
    const isWide = type === 'AgGrid' || type === 'TextArea';
    const column = isWide ? 0 : (index - 1) % 2;
    const row = Math.floor((index - 1) / 2);
    const size = defaultSize(type);
    components.push({
      id: makeGeneratedId(type.toLowerCase(), index),
      type,
      layout: {
        x: 24 + column * 300,
        y: 24 + row * 72,
        width: isWide ? Math.max(size.w, 560) : size.w,
        height: type === 'AgGrid' ? 220 : size.h,
      },
      props: propsForInferredComponent(type, label, sourceForProps),
      zIndex: index + 2,
    });
  };

  snippets.forEach((snippet) => {
    const type = inferType(snippet);
    if (!type) return;
    const label = cleanSourceLabel(extractFirstString(snippet, labelKeys), type);
    addComponent(type, label, snippet);
  });

  return components.slice(0, 16);
}

function appendGridIfNeeded(sourceText: string, components: SourceScreenComponent[]) {
  if (!(/columns\s*[:=]/i.test(sourceText) || /<Column\b/i.test(sourceText))) return;
  if (components.some((item) => item.type === 'AgGrid')) return;
  const index = components.length + 1;
  components.push({
    id: makeGeneratedId('aggrid', index),
    type: 'AgGrid',
    layout: { x: 24, y: 24 + Math.floor((index - 1) / 2) * 72, width: 560, height: 220 },
    props: propsForInferredComponent('AgGrid', 'Result Grid', sourceText),
    zIndex: index + 2,
  });
}

function inferJsScreenComponents(sourceText: string): SourceScreenComponent[] {
  const lines = sourceText.split(/\r?\n/);
  const snippets: string[] = [];

  lines.forEach((line, index) => {
    const next = lines.slice(index, index + 4).join(' ');
    if (inferJsComponentType(next)) {
      snippets.push(next);
    } else if (/<(input|button|select|textarea|table)\b/i.test(line)) {
      snippets.push(line);
    }
  });

  const components = buildInferredComponents(
    snippets,
    inferJsComponentType,
    ['fieldLabel', 'label', 'text', 'title', 'placeholder', 'name', 'headerName'],
    sourceText,
  );
  appendGridIfNeeded(sourceText, components);
  return components.slice(0, 16);
}

function inferHbsComponentType(snippet: string): SourceScreenComponentType | null {
  const lower = snippet.toLowerCase();
  if (/<table|{{#each|{{each|grid|datatable/.test(lower)) return 'AgGrid';
  if (/<textarea|{{textarea/.test(lower)) return 'TextArea';
  if (/<select|{{select|{{combo/.test(lower)) return 'Select';
  if (/type=["'`]checkbox["'`]|{{checkbox/.test(lower)) return 'Checkbox';
  if (/type=["'`]date["'`]|{{date/.test(lower)) return 'DatePicker';
  if (/<button|{{button/.test(lower)) return 'Button';
  if (/<input[^>]+type=["'`]number["'`]|{{number/.test(lower)) return 'NumberInput';
  if (/<input|{{input/.test(lower)) return 'Input';
  if (/<label|<h[1-6]\b|{{label|{{title/.test(lower)) return 'Text';
  return null;
}

function inferHbsScreenComponents(sourceText: string): SourceScreenComponent[] {
  const snippets = [
    ...sourceText.matchAll(/<(?:input|button|select|textarea|table|label|h[1-6])\b[^>]*>(?:[^<]{0,80})?/gi),
    ...sourceText.matchAll(/{{[#/]?(?:input|textarea|select|combo|checkbox|button|date|number|label|title|each)\b[^}]*}}/gi),
  ].map((match) => match[0]);

  return buildInferredComponents(
    snippets,
    inferHbsComponentType,
    ['label', 'aria-label', 'title', 'placeholder', 'name', 'value'],
    sourceText,
  );
}

function inferReactComponentType(snippet: string): SourceScreenComponentType | null {
  const lower = snippet.toLowerCase();
  if (/<(aggrid|datagrid|table|grid)\b/.test(lower)) return 'AgGrid';
  if (/<(textarea|input\.textarea)\b/.test(lower)) return 'TextArea';
  if (/<(select|combobox)\b/.test(lower)) return 'Select';
  if (/<(checkbox)\b/.test(lower) || /type=["'`]checkbox["'`]/.test(lower)) return 'Checkbox';
  if (/<(switch)\b/.test(lower)) return 'Switch';
  if (/<(datepicker)\b/.test(lower) || /type=["'`]date["'`]/.test(lower)) return 'DatePicker';
  if (/<(button)\b/.test(lower)) return 'Button';
  if (/<(inputnumber|numberinput)\b/.test(lower) || /type=["'`]number["'`]/.test(lower)) return 'NumberInput';
  if (/<(input|textfield)\b/.test(lower)) return 'Input';
  if (/<(typography\.text|label|span|h[1-6])\b/.test(lower)) return 'Text';
  return null;
}

function inferReactScreenComponents(sourceText: string): SourceScreenComponent[] {
  const snippets = [
    ...sourceText.matchAll(/<(?:Input\.TextArea|Typography\.Text|InputNumber|NumberInput|DatePicker|AgGrid|DataGrid|TextField|Input|Button|Select|Checkbox|Switch|Table|Grid|label|span|h[1-6])\b[^>]*(?:>(?:[^<]{0,80})?)?/g),
    ...sourceText.matchAll(/<Column\b[^>]*\/?>/g),
  ].map((match) => match[0]);

  const components = buildInferredComponents(
    snippets,
    inferReactComponentType,
    ['label', 'aria-label', 'title', 'placeholder', 'name', 'children', 'headerName', 'dataIndex'],
    sourceText,
  );
  appendGridIfNeeded(sourceText, components);
  return components.slice(0, 16);
}

function makeFallbackSourceScreenDraft(
  sourceType: SourceInputType,
  sourceText: string,
): SourceScreenDraft {
  const lineCount = sourceText.trim() ? sourceText.split(/\r?\n/).length : 0;
  const charCount = sourceText.length;
  const label = sourceTypeLabel(sourceType);
  return {
    sourceType,
    lineCount,
    charCount,
    summaryTitle: `${label} Source Screen Draft`,
    summaryMessage: 'Source pasted',
    summaryDescription: `${lineCount} lines / ${charCount} characters. Parser hook is ready for the next step.`,
    components: [
      {
        id: 'generated-input',
        type: 'Input',
        layout: { x: 24, y: 24, width: 280, height: 40 },
        props: { placeholder: 'Detected field placeholder' },
        zIndex: 1,
      },
      {
        id: 'generated-action',
        type: 'Button',
        layout: { x: 320, y: 24, width: 140, height: 40 },
        props: { text: 'Action' },
        zIndex: 2,
      },
      {
        id: 'generated-grid',
        type: 'AgGrid',
        layout: { x: 24, y: 88, width: 560, height: 220 },
        props: {
          columnDefs: [{ field: 'source' }, { field: 'status' }],
          rowData: [
            { source: label, status: 'Ready for parser' },
            { source: 'Screen builder', status: 'Preview only' },
          ],
        },
        zIndex: 3,
      },
    ],
  };
}

export function makeSourceScreenDraft(
  sourceType: SourceInputType,
  sourceText: string,
): SourceScreenDraft {
  const lineCount = sourceText.trim() ? sourceText.split(/\r?\n/).length : 0;
  const charCount = sourceText.length;
  const label = sourceTypeLabel(sourceType);
  const inferredComponents =
    sourceType === 'js'
      ? inferJsScreenComponents(sourceText)
      : sourceType === 'hbs'
        ? inferHbsScreenComponents(sourceText)
        : inferReactScreenComponents(sourceText);
  const bodyComponents =
    inferredComponents.length > 0
      ? inferredComponents
      : makeFallbackSourceScreenDraft(sourceType, sourceText).components;
  const parsedMessage =
    sourceType === 'js'
      ? 'JS source parsed'
      : sourceType === 'hbs'
        ? 'HBS source parsed'
        : 'React JS source parsed';

  return {
    sourceType,
    lineCount,
    charCount,
    summaryTitle: `${label} Source Screen Draft`,
    summaryMessage: inferredComponents.length > 0 ? parsedMessage : 'Source pasted',
    summaryDescription:
      inferredComponents.length > 0
        ? `${lineCount} lines / ${charCount} characters. ${inferredComponents.length} ${sourceTypeLabel(sourceType)} component candidates detected.`
        : `${lineCount} lines / ${charCount} characters. No ${sourceTypeLabel(sourceType)} UI patterns detected yet.`,
    components: bodyComponents,
  };
}
