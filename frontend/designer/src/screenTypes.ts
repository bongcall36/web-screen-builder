export const SCREEN_COMPONENT_TYPES = [
  'Text',
  'Input',
  'TextArea',
  'NumberInput',
  'Select',
  'Checkbox',
  'Switch',
  'DatePicker',
  'Button',
  'Divider',
  'Alert',
  'AgGrid',
  'BarChart',
  'LineChart',
  'PieChart',
  'DataMap',
  'Card',
] as const;

export type ScreenComponentType = (typeof SCREEN_COMPONENT_TYPES)[number];
export type GridDataType = 'string' | 'number' | 'boolean' | 'date';

export type ComponentLayout = { x: number; y: number; width?: number; height?: number };
export type GridColumnDef = { field?: string; dataType?: GridDataType };
export type GridRow = Record<string, string | number | boolean | null>;
export type ChartDatum = { label: string; value: number };

export type ScreenComponent = {
  id: string;
  type: ScreenComponentType;
  layout?: ComponentLayout;
  zIndex?: number;
  props?: Record<string, unknown>;
};

/** Pixel grid for move + resize snap */
export const GRID = 8;

export function defaultSize(type: ScreenComponentType): { w: number; h: number } {
  switch (type) {
    case 'Text':
      return { w: 200, h: 32 };
    case 'Input':
      return { w: 256, h: 40 };
    case 'TextArea':
      return { w: 320, h: 96 };
    case 'NumberInput':
      return { w: 180, h: 40 };
    case 'Select':
      return { w: 220, h: 40 };
    case 'Checkbox':
      return { w: 160, h: 32 };
    case 'Switch':
      return { w: 160, h: 32 };
    case 'DatePicker':
      return { w: 180, h: 40 };
    case 'Button':
      return { w: 160, h: 40 };
    case 'Divider':
      return { w: 360, h: 32 };
    case 'Alert':
      return { w: 360, h: 72 };
    case 'AgGrid':
      return { w: 400, h: 200 };
    case 'BarChart':
    case 'LineChart':
    case 'PieChart':
    case 'DataMap':
      return { w: 320, h: 220 };
    case 'Card':
      return { w: 240, h: 140 };
    default:
      return { w: 160, h: 120 };
  }
}

export function minSize(type: ScreenComponentType): { w: number; h: number } {
  switch (type) {
    case 'Text':
      return { w: 80, h: 24 };
    case 'Input':
      return { w: 120, h: 32 };
    case 'TextArea':
      return { w: 180, h: 64 };
    case 'NumberInput':
      return { w: 120, h: 32 };
    case 'Select':
      return { w: 120, h: 32 };
    case 'Checkbox':
      return { w: 120, h: 24 };
    case 'Switch':
      return { w: 120, h: 24 };
    case 'DatePicker':
      return { w: 140, h: 32 };
    case 'Button':
      return { w: 120, h: 32 };
    case 'Divider':
      return { w: 160, h: 24 };
    case 'Alert':
      return { w: 220, h: 56 };
    case 'AgGrid':
      return { w: 200, h: 120 };
    case 'BarChart':
    case 'LineChart':
    case 'PieChart':
    case 'DataMap':
      return { w: 200, h: 140 };
    case 'Card':
      return { w: 160, h: 96 };
    default:
      return { w: 80, h: 40 };
  }
}

export function effectiveLayout(c: ScreenComponent): { x: number; y: number; w: number; h: number } {
  const d = defaultSize(c.type);
  return {
    x: c.layout?.x ?? 0,
    y: c.layout?.y ?? 0,
    w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
    h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
  };
}
