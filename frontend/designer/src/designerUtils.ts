import type React from 'react';
import type { CommunicationDefinition, MenuSummary, ScreenSummary } from './designerTypes';
import {
  GRID,
  SCREEN_COMPONENT_TYPES,
  effectiveLayout,
  type GridColumnDef,
  type GridDataType,
  type GridRow,
  type ScreenComponent,
  type ScreenComponentType,
} from './screenTypes';
import { GRID_DATA_TYPE_OPTIONS } from './designerConstants';

export function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

export function defaultPropsFor(type: ScreenComponentType): Record<string, unknown> {
  switch (type) {
    case 'Text':
      return { text: 'Label' };
    case 'Input':
      return { placeholder: 'Placeholder' };
    case 'TextArea':
      return { placeholder: 'Enter long text', rows: 3 };
    case 'NumberInput':
      return { placeholder: 'Number', min: 0, max: 100 };
    case 'Select':
      return {
        placeholder: 'Select',
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      };
    case 'Checkbox':
      return { label: 'Checkbox', checked: false };
    case 'Switch':
      return { label: 'Enabled', checked: false };
    case 'DatePicker':
      return { placeholder: 'Select date' };
    case 'Button':
      return { text: 'Button' };
    case 'Divider':
      return { text: 'Section' };
    case 'Alert':
      return { message: 'Information', description: 'Helpful message for the user.', alertType: 'info' };
    case 'AgGrid':
      return {
        columnDefs: [],
        rowData: [],
      };
    case 'BarChart':
      return {
        title: 'Sales by Region',
        data: [
          { label: 'North', value: 42 },
          { label: 'East', value: 64 },
          { label: 'West', value: 38 },
        ],
      };
    case 'LineChart':
      return {
        title: 'Monthly Trend',
        data: [
          { label: 'Jan', value: 18 },
          { label: 'Feb', value: 32 },
          { label: 'Mar', value: 28 },
          { label: 'Apr', value: 46 },
        ],
      };
    case 'PieChart':
      return {
        title: 'Share',
        data: [
          { label: 'A', value: 45 },
          { label: 'B', value: 30 },
          { label: 'C', value: 25 },
        ],
      };
    case 'DataMap':
      return {
        title: 'Data Map',
        data: [
          { label: 'A1', value: 8 },
          { label: 'A2', value: 15 },
          { label: 'B1', value: 22 },
          { label: 'B2', value: 34 },
          { label: 'C1', value: 41 },
          { label: 'C2', value: 55 },
        ],
      };
    case 'Card':
      return { title: 'Total Users', value: '1,248', description: '+12% this month' };
    default:
      return {};
  }
}

export function newId() {
  return `c${Math.random().toString(36).slice(2, 6)}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function getComponentOptions(components: ScreenComponent[], type: ScreenComponentType) {
  return components.filter((component) => component.type === type);
}

export function componentCenter(component: ScreenComponent) {
  const layout = effectiveLayout(component);
  return { x: layout.x + layout.w / 2, y: layout.y + layout.h / 2 };
}

export function isInputLikeComponent(type: ScreenComponentType) {
  return (
    type === 'Input' ||
    type === 'TextArea' ||
    type === 'NumberInput' ||
    type === 'Select' ||
    type === 'Checkbox' ||
    type === 'Switch' ||
    type === 'DatePicker'
  );
}

export function isScreenComponentType(value: string): value is ScreenComponentType {
  return SCREEN_COMPONENT_TYPES.includes(value as ScreenComponentType);
}

export function sanitizeCommunicationsForComponents(
  communications: CommunicationDefinition[],
  components: ScreenComponent[],
) {
  const componentsById = new Map(components.map((component) => [component.id, component]));
  return communications.map((comm) => ({
    ...comm,
    formatId: comm.formatId || comm.id,
    triggerComponentId:
      componentsById.get(comm.triggerComponentId)?.type === 'Button' ? comm.triggerComponentId : '',
    inputBindings: comm.inputBindings.map((binding) => ({
      ...binding,
      componentId:
        componentsById.has(binding.componentId) &&
        isInputLikeComponent(componentsById.get(binding.componentId)!.type)
          ? binding.componentId
          : '',
    })),
    outputBindings: comm.outputBindings.map((binding) => ({
      ...binding,
      componentId:
        componentsById.get(binding.componentId)?.type === 'AgGrid' ? binding.componentId : '',
    })),
  }));
}

export function stripScreenCommunication(comm: CommunicationDefinition): CommunicationDefinition {
  const { sampleRows, ...screenCommunication } = comm;
  return {
    ...screenCommunication,
    formatId: screenCommunication.formatId || screenCommunication.id,
  };
}

export function bindingChipStyle(type: ScreenComponentType): React.CSSProperties {
  const colors = {
    Text: { bg: '#f5f5f5', border: '#d9d9d9', text: '#434343' },
    Input: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
    TextArea: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
    NumberInput: { bg: '#f0f5ff', border: '#adc6ff', text: '#1d39c4' },
    Select: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
    Checkbox: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
    Switch: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
    DatePicker: { bg: '#fff1f0', border: '#ffa39e', text: '#a8071a' },
    Button: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
    Divider: { bg: '#f5f5f5', border: '#d9d9d9', text: '#595959' },
    Alert: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
    AgGrid: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804' },
    BarChart: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
    LineChart: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804' },
    PieChart: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
    DataMap: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
    Card: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
  }[type];

  return {
    position: 'absolute',
    left: 4,
    top: -30,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    maxWidth: 240,
    width: 'max-content',
    minHeight: 26,
    padding: 0,
    borderRadius: 999,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: 11,
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  };
}

export function getColumnDataType(column: GridColumnDef): GridDataType {
  return GRID_DATA_TYPE_OPTIONS.some((option) => option.value === column.dataType)
    ? column.dataType!
    : 'string';
}

export function inferDataType(values: Array<string | number | boolean | null>): GridDataType {
  const present = values.filter((value) => value !== null && value !== '');
  if (present.length === 0) return 'string';
  if (present.every((value) => typeof value === 'boolean')) return 'boolean';
  if (present.every((value) => typeof value === 'number')) return 'number';
  return 'string';
}

export function coerceGridValue(value: string, dataType: GridDataType): string | number | boolean | null {
  if (value.trim() === '') return '';
  if (dataType === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  if (dataType === 'boolean') {
    return value.toLowerCase() === 'true';
  }
  return value;
}

export function nextGridField(columns: GridColumnDef[]) {
  const fields = new Set(columns.map((col) => col.field).filter(Boolean));
  let index = fields.size + 1;
  let field = `column${index}`;
  while (fields.has(field)) {
    index += 1;
    field = `column${index}`;
  }
  return field;
}

export function columnsFromRows(rows: GridRow[]): GridColumnDef[] {
  const fields = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((field) => fields.add(field));
  });
  return Array.from(fields).map((field) => ({
    field,
    dataType: inferDataType(rows.map((row) => row[field])),
  }));
}

export function columnDraftKey(componentId: string, field: string) {
  return `${componentId}:${field}`;
}

export function hasDragType(e: React.DragEvent, type: string) {
  return Array.from(e.dataTransfer.types).includes(type);
}

export function isValidComponentId(value: string) {
  return /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
}

export function nextScreenId(screens: ScreenSummary[]) {
  const ids = new Set(screens.map((screen) => screen.screenId));
  let index = screens.length + 1;
  let screenId = `screen-${index}`;
  while (ids.has(screenId)) {
    index += 1;
    screenId = `screen-${index}`;
  }
  return screenId;
}

export function menuTargetType(menu: MenuSummary): 'folder' | 'screen' {
  return menu.targetType === 'folder' ? 'folder' : 'screen';
}

export function menuOpenMode(menu: MenuSummary): 'inline' | 'popup' {
  return menu.openMode === 'popup' ? 'popup' : 'inline';
}

export function menuParentId(menu: MenuSummary, menuIds: Set<string>) {
  return menu.parentId && menuIds.has(menu.parentId) ? menu.parentId : '';
}

export function buildMenuTree(menus: MenuSummary[]) {
  const ids = new Set(menus.map((menu) => menu.id));
  const childrenByParent = new Map<string, MenuSummary[]>();

  menus.forEach((menu) => {
    const parentId = menuParentId(menu, ids);
    const children = childrenByParent.get(parentId) ?? [];
    children.push(menu);
    childrenByParent.set(parentId, children);
  });

  const makeNodes = (parentId: string): any[] =>
    (childrenByParent.get(parentId) ?? [])
      .sort((a, b) => {
        const typeDiff = Number(menuTargetType(a) !== 'folder') - Number(menuTargetType(b) !== 'folder');
        return typeDiff || (a.name || a.id).localeCompare(b.name || b.id);
      })
      .map((menu) => ({
        key: menu.id,
        title: `${menu.name || menu.id} (${menu.id})${menuTargetType(menu) === 'folder' ? ' / folder' : menu.openMode === 'popup' ? ' / popup' : ''}`,
        children: makeNodes(menu.id),
      }));

  return makeNodes('');
}
