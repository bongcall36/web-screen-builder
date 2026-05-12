import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Layout,
  List,
  Select,
  Space,
  Tabs,
  Tree,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import axios from 'axios';


const { Header, Content, Sider } = Layout;

type ScreenComponentType = 'Input' | 'Button' | 'AgGrid';

/** Pixel grid for move + resize snap */
const GRID = 8;

type ComponentLayout = { x: number; y: number; width?: number; height?: number };
type GridColumnDef = { field?: string };
type GridRow = Record<string, string | number | boolean | null>;
type CommunicationDefinition = {
  id: string;
  name: string;
  formatId: string;
  triggerComponentId: string;
  inputBindings: Array<{ field: string; componentId: string }>;
  outputBindings: Array<{ field: string; componentId: string }>;
  sampleRows?: GridRow[];
};

type CommunicationFormat = {
  id: string;
  name: string;
  inputFields: string[];
  outputFields: string[];
  sampleRows: GridRow[];
};

function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

function defaultSize(type: ScreenComponentType): { w: number; h: number } {
  switch (type) {
    case 'Input':
      return { w: 256, h: 40 };
    case 'Button':
      return { w: 160, h: 40 };
    case 'AgGrid':
      return { w: 400, h: 200 };
    default:
      return { w: 160, h: 120 };
  }
}

function minSize(type: ScreenComponentType): { w: number; h: number } {
  switch (type) {
    case 'Input':
      return { w: 120, h: 32 };
    case 'Button':
      return { w: 120, h: 32 };
    case 'AgGrid':
      return { w: 200, h: 120 };
    default:
      return { w: 80, h: 40 };
  }
}

function effectiveLayout(c: ScreenComponent): { x: number; y: number; w: number; h: number } {
  const d = defaultSize(c.type);
  return {
    x: c.layout?.x ?? 0,
    y: c.layout?.y ?? 0,
    w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
    h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
  };
}

type ScreenComponent = {
  id: string;
  type: ScreenComponentType;
  layout?: ComponentLayout;
  zIndex?: number;
  props?: Record<string, unknown>;
};

type ScreenSummary = {
  screenId: string;
  name: string;
};

type MenuSummary = {
  id: string;
  name: string;
  screenId?: string;
  parentId?: string;
  targetType?: 'folder' | 'screen';
  openMode?: 'inline' | 'popup';
};

const DEFAULT_COMPONENTS: ScreenComponent[] = [
  {
    id: 'input1',
    type: 'Input',
    layout: { x: 16, y: 16, width: 256, height: 40 },
    props: { placeholder: 'Type keyword' },
  },
  {
    id: 'button1',
    type: 'Button',
    layout: { x: 280, y: 16, width: 120, height: 40 },
    props: { text: 'Search', actionId: 'searchUsers' },
  },
  {
    id: 'grid1',
    type: 'AgGrid',
    layout: { x: 16, y: 72, width: 400, height: 200 },
    props: {
      columnDefs: [{ field: 'id' }, { field: 'name' }],
      rowData: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    },
  },
];

const DEFAULT_COMMUNICATIONS: CommunicationDefinition[] = [
  {
    id: 'searchUsers',
    name: 'Search Users',
    formatId: 'searchUsers',
    triggerComponentId: 'button1',
    inputBindings: [{ field: 'keyword', componentId: 'input1' }],
    outputBindings: [{ field: 'rows', componentId: 'grid1' }],
  },
];

const DEFAULT_COMMUNICATION_FORMATS: CommunicationFormat[] = [
  {
    id: 'searchUsers',
    name: 'Search Users',
    inputFields: ['keyword'],
    outputFields: ['rows'],
    sampleRows: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ],
  },
];

const COMPONENT_DRAG_MIME = 'application/x-wsb-component';
const COMPONENT_BIND_MIME = 'application/x-wsb-bind-component';

function defaultPropsFor(type: ScreenComponentType): Record<string, unknown> {
  switch (type) {
    case 'Input':
      return { placeholder: 'Placeholder' };
    case 'Button':
      return { text: 'Button' };
    case 'AgGrid':
      return {
        columnDefs: [],
        rowData: [],
      };
    default:
      return {};
  }
}

function newId() {
  return `c${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function getGridColumns(item: ScreenComponent): GridColumnDef[] {
  const raw = item.props?.columnDefs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((col): col is GridColumnDef => typeof col === 'object' && col !== null);
}

function getGridRows(item: ScreenComponent): GridRow[] {
  const raw = item.props?.rowData;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is GridRow => typeof row === 'object' && row !== null);
}

function getComponentOptions(components: ScreenComponent[], type: ScreenComponentType) {
  return components.filter((component) => component.type === type);
}

function sanitizeCommunicationsForComponents(
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
        componentsById.get(binding.componentId)?.type === 'Input' ? binding.componentId : '',
    })),
    outputBindings: comm.outputBindings.map((binding) => ({
      ...binding,
      componentId:
        componentsById.get(binding.componentId)?.type === 'AgGrid' ? binding.componentId : '',
    })),
  }));
}

function stripScreenCommunication(comm: CommunicationDefinition): CommunicationDefinition {
  const { sampleRows, ...screenCommunication } = comm;
  return {
    ...screenCommunication,
    formatId: screenCommunication.formatId || screenCommunication.id,
  };
}

function bindingChipStyle(type: ScreenComponentType): React.CSSProperties {
  const colors = {
    Input: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
    Button: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
    AgGrid: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804' },
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

function getVisibleGridColumns(item: ScreenComponent): GridColumnDef[] {
  return getGridColumns(item).filter((col) => typeof col.field === 'string' && col.field);
}

function nextGridField(columns: GridColumnDef[]) {
  const fields = new Set(columns.map((col) => col.field).filter(Boolean));
  let index = fields.size + 1;
  let field = `column${index}`;
  while (fields.has(field)) {
    index += 1;
    field = `column${index}`;
  }
  return field;
}

function columnsFromRows(rows: GridRow[]): GridColumnDef[] {
  const fields = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((field) => fields.add(field));
  });
  return Array.from(fields).map((field) => ({ field }));
}

function columnDraftKey(componentId: string, field: string) {
  return `${componentId}:${field}`;
}

function hasDragType(e: React.DragEvent, type: string) {
  return Array.from(e.dataTransfer.types).includes(type);
}

function isValidComponentId(value: string) {
  return /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
}

function nextScreenId(screens: ScreenSummary[]) {
  const ids = new Set(screens.map((screen) => screen.screenId));
  let index = screens.length + 1;
  let screenId = `screen-${index}`;
  while (ids.has(screenId)) {
    index += 1;
    screenId = `screen-${index}`;
  }
  return screenId;
}

function CanvasPreview({
  item,
  columnNameDrafts,
  onGridColumnDraftChange,
  onGridColumnChange,
  onGridAddColumn,
  onGridRemoveColumn,
  onGridSaveRows,
  onButtonTextChange,
  onGridCellChange,
  onGridAddRow,
  onGridRemoveRow,
}: {
  item: ScreenComponent;
  columnNameDrafts: Record<string, string>;
  onGridColumnDraftChange: (componentId: string, field: string, value: string) => void;
  onGridColumnChange: (componentId: string, oldField: string) => void;
  onGridAddColumn: (componentId: string) => void;
  onGridRemoveColumn: (componentId: string, field: string) => void;
  onGridSaveRows: (componentId: string) => void;
  onButtonTextChange: (componentId: string, value: string) => void;
  onGridCellChange: (componentId: string, rowIndex: number, field: string, value: string) => void;
  onGridAddRow: (componentId: string) => void;
  onGridRemoveRow: (componentId: string, rowIndex: number) => void;
}) {
  if (item.type === 'Input') {
    return (
      <Input
        readOnly
        placeholder={(item.props?.placeholder as string) ?? 'Input'}
        style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
      />
    );
  }
  if (item.type === 'Button') {
    return (
      <Input
        value={(item.props?.text as string) ?? 'Button'}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onButtonTextChange(item.id, e.target.value)}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          textAlign: 'center',
          color: '#fff',
          background: '#1677ff',
          borderColor: '#1677ff',
          fontWeight: 600,
        }}
      />
    );
  }
  if (item.type === 'AgGrid') {
    const cols = getVisibleGridColumns(item);
    const rows = getGridRows(item);
    return (
      <div
        data-grid-editor
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          background: '#fff',
        }}
      >
        <Space size={4} wrap style={{ padding: 4, borderBottom: '1px solid #f0f0f0' }}>
          <Button
            size="small"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onGridAddColumn(item.id)}
          >
            Add column
          </Button>
          <Button
            size="small"
            type="link"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onGridAddRow(item.id)}
            style={{ paddingInline: 4 }}
          >
            Add row
          </Button>
          <Button
            size="small"
            type="primary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onGridSaveRows(item.id)}
          >
            Save rows
          </Button>
        </Space>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col.field}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 4,
                    textAlign: 'left',
                  }}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="small"
                      value={columnNameDrafts[columnDraftKey(item.id, col.field ?? '')] ?? col.field}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onGridColumnDraftChange(item.id, col.field ?? '', e.target.value)
                      }
                      onBlur={() => onGridColumnChange(item.id, col.field ?? '')}
                      onPressEnter={(e) => e.currentTarget.blur()}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Remove column"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onGridRemoveColumn(item.id, col.field ?? '')}
                    />
                  </Space.Compact>
                </th>
              ))}
              <th style={{ borderBottom: '1px solid #f0f0f0', width: 42 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {cols.map((col) => {
                  const field = col.field ?? '';
                  return (
                    <td key={field} style={{ padding: 3, verticalAlign: 'top' }}>
                      <Input
                        size="small"
                        value={String(row[field] ?? '')}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onGridCellChange(item.id, rowIndex, field, e.target.value)
                        }
                      />
                    </td>
                  );
                })}
                <td style={{ padding: 3, verticalAlign: 'top' }}>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Remove row"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onGridRemoveRow(item.id, rowIndex)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

const TOOLBOX: { type: ScreenComponentType; title: string; description: string }[] = [
  { type: 'Input', title: 'Input', description: 'Text field' },
  { type: 'Button', title: 'Button', description: 'Primary action' },
  { type: 'AgGrid', title: 'AgGrid', description: 'Data table' },
];

function menuTargetType(menu: MenuSummary): 'folder' | 'screen' {
  return menu.targetType === 'folder' ? 'folder' : 'screen';
}

function menuOpenMode(menu: MenuSummary): 'inline' | 'popup' {
  return menu.openMode === 'popup' ? 'popup' : 'inline';
}

function menuParentId(menu: MenuSummary, menuIds: Set<string>) {
  return menu.parentId && menuIds.has(menu.parentId) ? menu.parentId : '';
}

function buildMenuTree(menus: MenuSummary[]) {
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

function toActiveKeys(keys: string | string[]) {
  return Array.isArray(keys) ? keys : [keys];
}

function App() {
  const [form] = Form.useForm();
  const watchedScreenId = Form.useWatch('screenId', form) ?? 'sample-screen';
  const watchedScreenName = Form.useWatch('name', form) ?? 'Sample Screen';
  const watchedMenuId = Form.useWatch('menuId', form) ?? 'm1';
  const watchedMenuName = Form.useWatch('menuName', form) ?? 'Sample Screen';
  const [screens, setScreens] = useState<ScreenSummary[]>([]);
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [components, setComponents] = useState<ScreenComponent[]>(DEFAULT_COMPONENTS);
  const [communications, setCommunications] =
    useState<CommunicationDefinition[]>(DEFAULT_COMMUNICATIONS);
  const [communicationFormats, setCommunicationFormats] = useState<CommunicationFormat[]>(
    DEFAULT_COMMUNICATION_FORMATS,
  );
  const [jsonTab, setJsonTab] = useState<string>('visual');
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify({ components: DEFAULT_COMPONENTS, communications: DEFAULT_COMMUNICATIONS.map(stripScreenCommunication) }, null, 2),
  );
  const [columnNameDrafts, setColumnNameDrafts] = useState<Record<string, string>>({});
  const [openSettings, setOpenSettings] = useState<string[]>([]);
  const [editingMenuId, setEditingMenuId] = useState('m1');

  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const resizeInfoRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const serialized = useMemo(
    () => JSON.stringify({ components, communications: communications.map(stripScreenCommunication) }, null, 2),
    [components, communications],
  );
  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);

  const syncJsonDraftFromComponents = useCallback(() => {
    setJsonDraft(JSON.stringify({ components, communications: communications.map(stripScreenCommunication) }, null, 2));
  }, [components, communications]);

  const loadDesignerMetadata = useCallback(async () => {
    const [screenRes, menuRes, formatRes] = await Promise.all([
      axios.get('http://localhost:8080/api/screens'),
      axios.get('http://localhost:8080/api/menus'),
      axios.get('http://localhost:8080/api/communications/formats'),
    ]);
    setScreens(screenRes.data);
    setMenus(menuRes.data);
    setCommunicationFormats(formatRes.data);
  }, []);

  useEffect(() => {
    loadDesignerMetadata().catch(() => {
      message.warning('Could not load screen and menu list.');
    });
  }, [loadDesignerMetadata]);

  useEffect(() => {
    setCommunications((prev) => {
      const next = sanitizeCommunicationsForComponents(prev, components);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [components]);

  const loadScreen = async (screenId: string, menuOverride?: MenuSummary) => {
    try {
      const res = await axios.get(`http://localhost:8080/api/screens/${screenId}`);
      const nextComponents = Array.isArray(res.data.components) ? res.data.components : [];
      const nextCommunications = Array.isArray(res.data.communications)
        ? res.data.communications
        : [];
      const sanitizedCommunications = sanitizeCommunicationsForComponents(
        nextCommunications.map((comm: CommunicationDefinition) => ({
          ...comm,
          formatId: comm.formatId || comm.id,
        })),
        nextComponents,
      );
      const name = res.data.name || screenId;
      const linkedMenu = menuOverride ?? menus.find((menu) => menu.screenId === screenId);
      form.setFieldsValue({
        screenId,
        name,
        menuId: linkedMenu?.id ?? `menu-${screenId}`,
        menuName: linkedMenu?.name ?? name,
        menuParentId: linkedMenu?.parentId ?? '',
        menuTargetType: menuTargetType(linkedMenu ?? { id: '', name: '', screenId }),
        menuOpenMode: menuOpenMode(linkedMenu ?? { id: '', name: '', screenId }),
      });
      setEditingMenuId(linkedMenu?.id ?? `menu-${screenId}`);
      setComponents(nextComponents);
      setCommunications(sanitizedCommunications);
      setJsonDraft(
        JSON.stringify(
          { components: nextComponents, communications: sanitizedCommunications },
          null,
          2,
        ),
      );
      setColumnNameDrafts({});
      setJsonTab('visual');
      setOpenSettings([]);
      message.success(`Loaded ${screenId}`);
    } catch {
      message.error('Screen load failed.');
    }
  };

  const loadMenu = async (menu: MenuSummary) => {
    form.setFieldsValue({
      menuId: menu.id,
      menuName: menu.name,
      menuParentId: menu.parentId ?? '',
      menuTargetType: menuTargetType(menu),
      menuOpenMode: menuOpenMode(menu),
      screenId: menu.screenId ?? form.getFieldValue('screenId'),
    });
    setEditingMenuId(menu.id);

    if (menuTargetType(menu) === 'screen' && menu.screenId) {
      await loadScreen(menu.screenId, menu);
      return;
    }

    setOpenSettings([]);
    message.info('Loaded menu node. Folder menus do not open a screen.');
  };

  const bumpZ = useCallback((id: string) => {
    setComponents((prev) => {
      const z = prev.reduce((m, c) => Math.max(m, c.zIndex ?? 1), 0) + 1;
      return prev.map((c) => (c.id === id ? { ...c, zIndex: z } : c));
    });
  }, []);

  const onDragStartToolbox = (e: React.DragEvent, type: ScreenComponentType) => {
    e.dataTransfer.setData(COMPONENT_DRAG_MIME, type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragStartComponentBinding = (e: React.DragEvent, component: ScreenComponent) => {
    e.stopPropagation();
    e.dataTransfer.setData(
      COMPONENT_BIND_MIME,
      JSON.stringify({ id: component.id, type: component.type }),
    );
    e.dataTransfer.setData('text/plain', component.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const readDroppedComponent = (
    e: React.DragEvent,
    acceptedTypes: ScreenComponentType[],
  ): { id: string; type: ScreenComponentType } | null => {
    const raw = e.dataTransfer.getData(COMPONENT_BIND_MIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { id?: string; type?: ScreenComponentType };
      if (!parsed.id || !parsed.type || !acceptedTypes.includes(parsed.type)) {
        message.error(`Drop ${acceptedTypes.join(' or ')} component here.`);
        return null;
      }
      e.preventDefault();
      e.stopPropagation();
      return { id: parsed.id, type: parsed.type };
    } catch {
      return null;
    }
  };

  const acceptComponentBindingDrop = (e: React.DragEvent) => {
    if (hasDragType(e, COMPONENT_BIND_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const acceptDragOver = (e: React.DragEvent) => {
    if (hasDragType(e, COMPONENT_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const dropNewFromToolbox = (e: React.DragEvent) => {
    if (!hasDragType(e, COMPONENT_DRAG_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    const inner = canvasInnerRef.current;
    if (!inner) return;
    const raw = e.dataTransfer.getData(COMPONENT_DRAG_MIME) as ScreenComponentType | '';
    if (raw !== 'Input' && raw !== 'Button' && raw !== 'AgGrid') return;
    const rect = inner.getBoundingClientRect();
    const ds = defaultSize(raw);
    const x = snap(clamp(e.clientX - rect.left - 4, 0, Math.max(0, rect.width - ds.w)));
    const y = snap(clamp(e.clientY - rect.top - 4, 0, Math.max(0, rect.height - ds.h)));
    setComponents((prev) => {
      const z = prev.reduce((m, c) => Math.max(m, c.zIndex ?? 1), 0) + 1;
      return [
        ...prev,
        {
          id: newId(),
          type: raw,
          props: defaultPropsFor(raw),
          layout: { x, y, width: ds.w, height: ds.h },
          zIndex: z,
        },
      ];
    });
    message.success(`Added ${raw}`);
  };

  const removeById = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setCommunications((prev) =>
      prev.map((comm) => ({
        ...comm,
        inputBindings: comm.inputBindings.filter((binding) => binding.componentId !== id),
        outputBindings: comm.outputBindings.filter((binding) => binding.componentId !== id),
        triggerComponentId: comm.triggerComponentId === id ? '' : comm.triggerComponentId,
      })),
    );
  };

  const updateComponentId = (oldId: string, newIdValue: string) => {
    const nextId = newIdValue.trim();
    if (nextId === oldId) return;
    if (!isValidComponentId(nextId)) {
      message.error('Component ID must start with a letter and use letters, numbers, _ or -.');
      return;
    }
    if (components.some((component) => component.id === nextId)) {
      message.error('Component ID already exists.');
      return;
    }
    setComponents((prev) =>
      prev.map((component) => (component.id === oldId ? { ...component, id: nextId } : component)),
    );
    setCommunications((prev) =>
      prev.map((comm) => ({
        ...comm,
        triggerComponentId: comm.triggerComponentId === oldId ? nextId : comm.triggerComponentId,
        inputBindings: comm.inputBindings.map((binding) => ({
          ...binding,
          componentId: binding.componentId === oldId ? nextId : binding.componentId,
        })),
        outputBindings: comm.outputBindings.map((binding) => ({
          ...binding,
          componentId: binding.componentId === oldId ? nextId : binding.componentId,
        })),
      })),
    );
    message.success(`Component ID changed to ${nextId}`);
  };

  const updateCommunication = (
    actionId: string,
    patch: Partial<CommunicationDefinition>,
  ) => {
    setCommunications((prev) =>
      prev.map((comm) => (comm.id === actionId ? { ...comm, ...patch } : comm)),
    );
  };

  const updateCommunicationInput = (
    actionId: string,
    index: number,
    patch: Partial<{ field: string; componentId: string }>,
  ) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              inputBindings: (comm.inputBindings.length > 0
                ? comm.inputBindings
                : [{ field: 'keyword', componentId: '' }]
              ).map((binding, bindingIndex) =>
                bindingIndex === index ? { ...binding, ...patch } : binding,
              ),
            }
          : comm,
      ),
    );
  };

  const updateCommunicationOutput = (
    actionId: string,
    index: number,
    patch: Partial<{ field: string; componentId: string }>,
  ) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              outputBindings: (comm.outputBindings.length > 0
                ? comm.outputBindings
                : [{ field: 'rows', componentId: '' }]
              ).map((binding, bindingIndex) =>
                bindingIndex === index ? { ...binding, ...patch } : binding,
              ),
            }
          : comm,
      ),
    );
  };

  const addCommunicationInput = (actionId: string) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              inputBindings: [
                ...comm.inputBindings,
                { field: `input${comm.inputBindings.length + 1}`, componentId: '' },
              ],
            }
          : comm,
      ),
    );
  };

  const removeCommunicationInput = (actionId: string, index: number) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              inputBindings: comm.inputBindings.filter((_, bindingIndex) => bindingIndex !== index),
            }
          : comm,
      ),
    );
  };

  const addCommunicationOutput = (actionId: string) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              outputBindings: [
                ...comm.outputBindings,
                { field: `rows${comm.outputBindings.length + 1}`, componentId: '' },
              ],
            }
          : comm,
      ),
    );
  };

  const removeCommunicationOutput = (actionId: string, index: number) => {
    setCommunications((prev) =>
      prev.map((comm) =>
        comm.id === actionId
          ? {
              ...comm,
              outputBindings: comm.outputBindings.filter((_, bindingIndex) => bindingIndex !== index),
            }
          : comm,
      ),
    );
  };

  const updateCommunicationFormat = (
    formatId: string,
    patch: Partial<CommunicationFormat>,
  ) => {
    setCommunicationFormats((prev) =>
      prev.map((format) => (format.id === formatId ? { ...format, ...patch } : format)),
    );
  };

  const updateCommunicationFormatField = (
    formatId: string,
    key: 'inputFields' | 'outputFields',
    index: number,
    value: string,
  ) => {
    setCommunicationFormats((prev) =>
      prev.map((format) =>
        format.id === formatId
          ? {
              ...format,
              [key]: format[key].map((field, fieldIndex) =>
                fieldIndex === index ? value.trim() : field,
              ),
            }
          : format,
      ),
    );
  };

  const addCommunicationFormatField = (
    formatId: string,
    key: 'inputFields' | 'outputFields',
  ) => {
    setCommunicationFormats((prev) =>
      prev.map((format) =>
        format.id === formatId
          ? {
              ...format,
              [key]: [
                ...format[key],
                key === 'inputFields'
                  ? `input${format.inputFields.length + 1}`
                  : `output${format.outputFields.length + 1}`,
              ],
            }
          : format,
      ),
    );
  };

  const removeCommunicationFormatField = (
    formatId: string,
    key: 'inputFields' | 'outputFields',
    index: number,
  ) => {
    setCommunicationFormats((prev) =>
      prev.map((format) =>
        format.id === formatId
          ? {
              ...format,
              [key]: format[key].filter((_, fieldIndex) => fieldIndex !== index),
            }
          : format,
      ),
    );
  };

  const updateCommunicationSampleRows = (formatId: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        message.error('Sample output must be a JSON array.');
        return;
      }
      updateCommunicationFormat(formatId, { sampleRows: parsed });
    } catch {
      message.error('Invalid sample output JSON.');
    }
  };

  const addCommunication = () => {
    const nextIndex = communications.length + 1;
    const id = `action${nextIndex}`;
    setCommunications((prev) => [
      ...prev,
      {
        id,
        name: `Action ${nextIndex}`,
        formatId: communicationFormats[0]?.id ?? 'searchUsers',
        triggerComponentId: '',
        inputBindings: [{ field: 'keyword', componentId: '' }],
        outputBindings: [{ field: 'rows', componentId: '' }],
      },
    ]);
  };

  const addCommunicationFormat = () => {
    const nextIndex = communicationFormats.length + 1;
    const id = `format${nextIndex}`;
    setCommunicationFormats((prev) => [
      ...prev,
      {
        id,
        name: `Format ${nextIndex}`,
        inputFields: ['keyword'],
        outputFields: ['rows'],
        sampleRows: [],
      },
    ]);
    message.success(`Added ${id}`);
  };

  const saveCommunicationFormat = async (format: CommunicationFormat) => {
    try {
      await axios.post('http://localhost:8080/api/communications/formats', format);
      message.success(`Saved ${format.id}`);
    } catch {
      message.error(`Save failed: ${format.id}`);
    }
  };

  const deleteCommunicationFormat = async (formatId: string) => {
    try {
      await axios.delete(`http://localhost:8080/api/communications/formats/${formatId}`);
      setCommunicationFormats((prev) => prev.filter((format) => format.id !== formatId));
      setCommunications((prev) =>
        prev.map((comm) => (comm.formatId === formatId ? { ...comm, formatId: '' } : comm)),
      );
      message.success(`Deleted ${formatId}`);
    } catch {
      message.error(`Delete failed: ${formatId}`);
    }
  };

  const removeCommunication = (actionId: string) => {
    setCommunications((prev) => prev.filter((comm) => comm.id !== actionId));
  };

  const updateButtonText = (componentId: string, value: string) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === componentId && component.type === 'Button'
          ? {
              ...component,
              props: {
                ...component.props,
                text: value,
              },
            }
          : component,
      ),
    );
  };

  const bindTriggerComponent = (actionId: string, componentId: string) => {
    updateCommunication(actionId, { triggerComponentId: componentId });
  };

  const clearTriggerComponent = (actionId: string) => {
    updateCommunication(actionId, { triggerComponentId: '' });
  };

  const bindInputComponent = (actionId: string, index: number, componentId: string) => {
    updateCommunicationInput(actionId, index, { componentId });
  };

  const clearInputComponent = (actionId: string, index: number) => {
    updateCommunicationInput(actionId, index, { componentId: '' });
  };

  const bindOutputComponent = (actionId: string, index: number, componentId: string) => {
    updateCommunicationOutput(actionId, index, { componentId });
    applyFormatRowsToEmptyGrid(actionId, componentId);
  };

  const clearOutputComponent = (actionId: string, index: number) => {
    updateCommunicationOutput(actionId, index, { componentId: '' });
  };

  const applyFormatRowsToEmptyGrid = (
    actionId: string,
    componentId: string,
    formatIdOverride?: string,
  ) => {
    const action = communications.find((comm) => comm.id === actionId);
    const format = communicationFormats.find(
      (item) => item.id === (formatIdOverride || action?.formatId || action?.id),
    );
    if (!format || format.sampleRows.length === 0) return;

    setComponents((prev) =>
      prev.map((component) => {
        if (component.id !== componentId || component.type !== 'AgGrid') return component;
        if (getGridRows(component).length > 0) return component;
        return {
          ...component,
          props: {
            ...component.props,
            columnDefs: columnsFromRows(format.sampleRows),
            rowData: format.sampleRows,
          },
        };
      }),
    );
  };

  const saveGridRowsToLinkedFormat = async (componentId: string) => {
    const grid = components.find(
      (component) => component.id === componentId && component.type === 'AgGrid',
    );
    const action = communications.find((comm) =>
      comm.outputBindings.some((binding) => binding.componentId === componentId),
    );
    const format = communicationFormats.find(
      (item) => item.id === (action?.formatId || action?.id),
    );

    if (!grid) {
      message.error('Grid component was not found.');
      return;
    }
    if (!format) {
      message.warning('Connect this grid to an output format before saving rows.');
      return;
    }

    const columns = getGridColumns(grid);
    const rows = getGridRows(grid);
    const renamePairs: Array<{ oldField: string; newField: string; draftKey: string }> = [];

    for (const column of columns) {
      const oldField = column.field ?? '';
      const draftKey = columnDraftKey(componentId, oldField);
      const newField = (columnNameDrafts[draftKey] ?? oldField).trim();
      if (!newField) {
        message.error('Column name is required.');
        return;
      }
      if (
        oldField !== newField &&
        columns.some((candidate) => candidate.field === newField && candidate.field !== oldField)
      ) {
        message.error('Column name already exists.');
        return;
      }
      if (oldField !== newField) {
        renamePairs.push({ oldField, newField, draftKey });
      }
    }

    const nextColumns = columns.map((column) => {
      const rename = renamePairs.find((item) => item.oldField === column.field);
      return rename ? { ...column, field: rename.newField } : column;
    });
    const sampleRows = rows.map((row) => {
      const nextRow = { ...row };
      renamePairs.forEach(({ oldField, newField }) => {
        nextRow[newField] = nextRow[oldField] ?? '';
        delete nextRow[oldField];
      });
      return nextRow;
    });
    const normalizedGrid = {
      ...grid,
      props: {
        ...grid.props,
        columnDefs: nextColumns,
        rowData: sampleRows,
      },
    };
    const nextFormat = { ...format, sampleRows };

    setComponents((prev) =>
      prev.map((component) => (component.id === componentId ? normalizedGrid : component)),
    );
    if (renamePairs.length > 0) {
      setColumnNameDrafts((prev) => {
        const next = { ...prev };
        renamePairs.forEach(({ draftKey }) => {
          delete next[draftKey];
        });
        return next;
      });
    }
    setCommunicationFormats((prev) =>
      prev.map((item) => (item.id === nextFormat.id ? nextFormat : item)),
    );

    try {
      await axios.post('http://localhost:8080/api/communications/formats', nextFormat);
      message.success(`Saved ${sampleRows.length} grid rows to ${nextFormat.id}`);
    } catch {
      message.error(`Save failed: ${nextFormat.id}`);
    }
  };

  const updateGridColumnDraft = (componentId: string, field: string, value: string) => {
    setColumnNameDrafts((prev) => ({
      ...prev,
      [columnDraftKey(componentId, field)]: value,
    }));
  };

  const updateGridColumn = (componentId: string, oldField: string) => {
    const draftKey = columnDraftKey(componentId, oldField);
    const newField = (columnNameDrafts[draftKey] ?? oldField).trim();
    if (!newField) {
      message.error('Column name is required.');
      setColumnNameDrafts((prev) => ({ ...prev, [draftKey]: oldField }));
      return;
    }
    let didCommit = false;
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        const columns = getGridColumns(c);
        if (oldField !== newField && columns.some((col) => col.field === newField)) {
          message.error('Column name already exists.');
          setColumnNameDrafts((drafts) => ({ ...drafts, [draftKey]: oldField }));
          return c;
        }
        didCommit = true;
        return {
          ...c,
          props: {
            ...c.props,
            columnDefs: columns.map((col) =>
              col.field === oldField
                ? {
                    ...col,
                    field: newField,
                  }
                : col,
            ),
            rowData: getGridRows(c).map((row) => {
              if (oldField === newField) return row;
              const nextRow = { ...row, [newField]: row[oldField] ?? '' };
              delete nextRow[oldField];
              return nextRow;
            }),
          },
        };
      }),
    );
    if (didCommit) {
      setColumnNameDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    }
  };

  const addGridColumn = (componentId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        const columns = getGridColumns(c);
        const field = nextGridField(columns);
        return {
          ...c,
          props: {
            ...c.props,
            columnDefs: [...columns, { field }],
            rowData: getGridRows(c).map((row) => ({ ...row, [field]: '' })),
          },
        };
      }),
    );
  };

  const removeGridColumn = (componentId: string, field: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        return {
          ...c,
          props: {
            ...c.props,
            columnDefs: getGridColumns(c).filter((col) => col.field !== field),
            rowData: getGridRows(c).map((row) => {
              const nextRow = { ...row };
              delete nextRow[field];
              return nextRow;
            }),
          },
        };
      }),
    );
  };

  const updateGridCell = (componentId: string, rowIndex: number, field: string, value: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        const rows = getGridRows(c);
        return {
          ...c,
          props: {
            ...c.props,
            rowData: rows.map((row, index) =>
              index === rowIndex
                ? {
                    ...row,
                    [field]: value,
                  }
                : row,
            ),
          },
        };
      }),
    );
  };

  const addGridRow = (componentId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        const cols = getVisibleGridColumns(c);
        const emptyRow = Object.fromEntries(cols.map((col) => [col.field, '']));
        return {
          ...c,
          props: {
            ...c.props,
            rowData: [...getGridRows(c), emptyRow],
          },
        };
      }),
    );
  };

  const removeGridRow = (componentId: string, rowIndex: number) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== componentId || c.type !== 'AgGrid') return c;
        return {
          ...c,
          props: {
            ...c.props,
            rowData: getGridRows(c).filter((_, index) => index !== rowIndex),
          },
        };
      }),
    );
  };

  const onItemPointerDown = (e: React.PointerEvent, c: ScreenComponent) => {
    if ((e.target as HTMLElement).closest('[data-delete-btn],[data-resize-handle],[data-grid-editor],[data-bind-drag]')) return;
    const card = e.currentTarget as HTMLElement;
    const r = card.getBoundingClientRect();
    dragInfoRef.current = {
      id: c.id,
      offsetX: e.clientX - r.left,
      offsetY: e.clientY - r.top,
    };
    card.setPointerCapture(e.pointerId);
    bumpZ(c.id);
  };

  const onItemPointerMove = (e: React.PointerEvent) => {
    const d = dragInfoRef.current;
    const inner = canvasInnerRef.current;
    if (!d || !inner) return;
    const rect = inner.getBoundingClientRect();
    setComponents((prev) =>
      prev.map((x) => {
        if (x.id !== d.id) return x;
        const L = effectiveLayout(x);
        const nx = snap(
          clamp(e.clientX - rect.left - d.offsetX, 0, Math.max(0, rect.width - L.w)),
        );
        const ny = snap(
          clamp(e.clientY - rect.top - d.offsetY, 0, Math.max(0, rect.height - L.h)),
        );
        return {
          ...x,
          layout: {
            x: nx,
            y: ny,
            width: L.w,
            height: L.h,
          },
        };
      }),
    );
  };

  const onItemPointerUp = (e: React.PointerEvent) => {
    dragInfoRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onResizePointerDown = (e: React.PointerEvent, c: ScreenComponent) => {
    e.stopPropagation();
    const L = effectiveLayout(c);
    resizeInfoRef.current = {
      id: c.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: L.w,
      startH: L.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    bumpZ(c.id);
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeInfoRef.current;
    const inner = canvasInnerRef.current;
    if (!r || !inner) return;
    const rect = inner.getBoundingClientRect();
    setComponents((prev) => {
      const c = prev.find((x) => x.id === r.id);
      if (!c) return prev;
      const xy = { x: c.layout?.x ?? 0, y: c.layout?.y ?? 0 };
      const m = minSize(c.type);
      const maxW = Math.max(m.w, rect.width - xy.x);
      const maxH = Math.max(m.h, rect.height - xy.y);
      const nw = snap(clamp(r.startW + (e.clientX - r.startClientX), m.w, maxW));
      const nh = snap(clamp(r.startH + (e.clientY - r.startClientY), m.h, maxH));
      return prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              layout: {
                x: xy.x,
                y: xy.y,
                width: nw,
                height: nh,
              },
            }
          : x,
      );
    });
  };

  const onResizePointerUp = (e: React.PointerEvent) => {
    resizeInfoRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as {
        components?: ScreenComponent[];
        communications?: CommunicationDefinition[];
      };
      if (!Array.isArray(parsed.components)) {
        message.error('JSON must contain a "components" array.');
        return;
      }
      for (const c of parsed.components) {
        if (!c || typeof c.id !== 'string' || !['Input', 'Button', 'AgGrid'].includes(c.type)) {
          message.error('Each component needs id and type (Input | Button | AgGrid).');
          return;
        }
        if (c.layout !== undefined) {
          if (
            typeof c.layout !== 'object' ||
            c.layout === null ||
            typeof (c.layout as ComponentLayout).x !== 'number' ||
            typeof (c.layout as ComponentLayout).y !== 'number'
          ) {
            message.error('layout must be { x: number, y: number, ... } when present.');
            return;
          }
          const lay = c.layout as ComponentLayout;
          if (lay.width !== undefined) {
            if (typeof lay.width !== 'number' || lay.width < GRID) {
              message.error('layout.width must be a number ≥ grid size when present.');
              return;
            }
          }
          if (lay.height !== undefined) {
            if (typeof lay.height !== 'number' || lay.height < GRID) {
              message.error('layout.height must be a number ≥ grid size when present.');
              return;
            }
          }
        }
        if (c.zIndex !== undefined && typeof c.zIndex !== 'number') {
          message.error('zIndex must be a number when present.');
          return;
        }
      }
      setComponents(parsed.components as ScreenComponent[]);
      setCommunications(
        Array.isArray(parsed.communications)
          ? parsed.communications.map((comm) => ({ ...comm, formatId: comm.formatId || comm.id }))
          : [],
      );
      setColumnNameDrafts({});
      message.success('JSON applied to canvas');
      setJsonTab('visual');
    } catch {
      message.error('Invalid JSON');
    }
  };

  const saveCurrentScreen = async () => {
    const { screenId, name, menuId, menuName, menuParentId, menuTargetType, menuOpenMode } =
      await form.validateFields([
      'screenId',
      'name',
      'menuId',
      'menuName',
      'menuParentId',
      'menuTargetType',
      'menuOpenMode',
    ]);
    const sanitizedCommunications = sanitizeCommunicationsForComponents(communications, components);
    await Promise.all(
      communicationFormats.map((format) =>
        axios.post('http://localhost:8080/api/communications/formats', format),
      ),
    );
    const json = JSON.stringify({
      components,
      communications: sanitizedCommunications.map(stripScreenCommunication),
    });
    await axios.post('http://localhost:8080/api/screens', { screenId, name, json });
    await axios.post('http://localhost:8080/api/menus', {
      id: menuId,
      previousId: editingMenuId,
      name: menuName,
      screenId,
      parentId: menuParentId ?? '',
      targetType: menuTargetType ?? 'screen',
      openMode: menuOpenMode ?? 'inline',
    });
    setEditingMenuId(menuId);
    return { screenId, name };
  };

  const saveMenuOnly = async () => {
    try {
      const { menuId, menuName, menuParentId, menuTargetType, menuOpenMode, screenId } =
        await form.validateFields([
          'menuId',
          'menuName',
          'menuParentId',
          'menuTargetType',
          'menuOpenMode',
          ...(form.getFieldValue('menuTargetType') === 'screen' ? ['screenId'] : []),
        ]);
      await axios.post('http://localhost:8080/api/menus', {
        id: menuId,
        previousId: editingMenuId,
        name: menuName,
        screenId: menuTargetType === 'screen' ? screenId : '',
        parentId: menuParentId ?? '',
        targetType: menuTargetType ?? 'screen',
        openMode: menuOpenMode ?? 'inline',
      });
      setEditingMenuId(menuId);
      await loadDesignerMetadata();
      message.success('Saved menu');
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        message.error('Menu save failed (is the backend running on port 8080?)');
      }
    }
  };

  const save = async () => {
    try {
      await saveCurrentScreen();
      await loadDesignerMetadata();
      message.success('Saved screen and menu');
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        message.error('Save failed (is the backend running on port 8080?)');
      }
    }
  };

  const saveAction = async (actionId: string) => {
    try {
      await saveCurrentScreen();
      await loadDesignerMetadata();
      message.success(`Saved action ${actionId}`);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        message.error('Action save failed (is the backend running on port 8080?)');
      }
    }
  };

  const newScreen = async () => {
    try {
      const savedScreen = await saveCurrentScreen();
      const screenId = nextScreenId([
        ...screens,
        { screenId: savedScreen.screenId, name: savedScreen.name },
      ]);
      const name = `Screen ${screenId.replace('screen-', '')}`;
      await axios.post('http://localhost:8080/api/screens', {
        screenId,
        name,
        json: JSON.stringify({ components: [], communications: [] }),
      });
      await axios.post('http://localhost:8080/api/menus', {
        id: `menu-${screenId}`,
        previousId: '',
        name,
        screenId,
        parentId: '',
        targetType: 'screen',
        openMode: 'inline',
      });
      setScreens((prev) => {
        const withoutCurrent = prev.filter((screen) => screen.screenId !== savedScreen.screenId);
        return [
          ...withoutCurrent,
          savedScreen,
          {
            screenId,
            name,
          },
        ];
      });
      form.setFieldsValue({
        screenId,
        name,
        menuId: `menu-${screenId}`,
        menuName: name,
        menuParentId: '',
        menuTargetType: 'screen',
        menuOpenMode: 'inline',
      });
      setComponents([]);
      setCommunications([]);
      setJsonDraft(JSON.stringify({ components: [], communications: [] }, null, 2));
      setColumnNameDrafts({});
      setJsonTab('visual');
      setEditingMenuId(`menu-${screenId}`);
      setOpenSettings(['menu', 'screen']);
      await loadDesignerMetadata();
      message.success('Added new screen');
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        message.error('New screen failed (is the backend running on port 8080?)');
      }
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', paddingInline: 24 }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Designer MVP
        </Typography.Title>
      </Header>
      <Layout>
        <Sider
          width={260}
          theme="light"
          style={{
            borderRight: '1px solid #f0f0f0',
            padding: 16,
            overflow: 'auto',
          }}
        >
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Screens
          </Typography.Title>
          <Button block type="primary" onClick={newScreen} style={{ marginBottom: 12 }}>
            New screen
          </Button>
          <List
            size="small"
            bordered
            dataSource={screens}
            locale={{ emptyText: 'No saved screens' }}
            renderItem={(screen) => (
              <List.Item
                onClick={() => loadScreen(screen.screenId)}
                style={{ cursor: 'pointer', paddingInline: 8 }}
              >
                <div style={{ minWidth: 0 }}>
                  <Typography.Text strong>{screen.name || screen.screenId}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {screen.screenId}
                    </Typography.Text>
                  </div>
                </div>
              </List.Item>
            )}
            style={{ marginBottom: 20, background: '#fff' }}
          />
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Menus
          </Typography.Title>
          <div style={{ marginBottom: 20, background: '#fff', border: '1px solid #f0f0f0', padding: 8 }}>
            <Tree
              treeData={menuTreeData}
              blockNode
              showLine
              expandedKeys={menus.map((menu) => menu.id)}
              onSelect={(keys) => {
                const menu = menus.find((item) => item.id === String(keys[0] ?? ''));
                if (menu) {
                  loadMenu(menu);
                }
              }}
            />
            {menus.length === 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                No saved menus
              </Typography.Text>
            )}
          </div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Components
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            Drag from here onto the canvas. Drag items to move (8px snap). Use the corner handle to
            resize.
          </Typography.Paragraph>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {TOOLBOX.map((t) => (
              <Card
                key={t.type}
                size="small"
                hoverable
                draggable
                onDragStart={(e) => onDragStartToolbox(e, t.type)}
                styles={{ body: { padding: 12 } }}
              >
                <Space align="start">
                  <HolderOutlined style={{ color: '#8c8c8c', marginTop: 2 }} />
                  <div>
                    <Typography.Text strong>{t.title}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t.description}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Sider>
        <Content style={{ padding: 24, background: '#fafafa' }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              screenId: 'sample-screen',
              name: 'Sample Screen',
              menuId: 'm1',
              menuName: 'Sample Screen',
              menuParentId: '',
              menuTargetType: 'screen',
              menuOpenMode: 'inline',
            }}
            style={{ width: '100%', marginBottom: 16 }}
          >
            <Collapse
              activeKey={openSettings.includes('menu') ? ['menu'] : []}
              onChange={(keys) => {
                const activeKeys = toActiveKeys(keys);
                setOpenSettings((prev) =>
                  activeKeys.includes('menu')
                    ? Array.from(new Set([...prev, 'menu']))
                    : prev.filter((key) => key !== 'menu'),
                );
              }}
              style={{ width: '100%', marginBottom: 16, background: '#fff' }}
              items={[
                {
                  key: 'menu',
                  label: (
                    <Space size={8}>
                      <Typography.Text strong>Menu settings</Typography.Text>
                      <Typography.Text type="secondary">
                        {watchedMenuName} ({watchedMenuId})
                      </Typography.Text>
                    </Space>
                  ),
                  children: (
                    <Space wrap size="large" style={{ width: '100%' }} align="start">
                      <Form.Item
                        name="menuId"
                        label="Menu ID"
                        rules={[{ required: true }]}
                        style={{ minWidth: 160, marginBottom: 0 }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="menuName"
                        label="Menu Name"
                        rules={[{ required: true }]}
                        style={{ minWidth: 200, marginBottom: 0 }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="menuParentId"
                        label="Parent Menu ID"
                        style={{ minWidth: 180, marginBottom: 0 }}
                      >
                        <Input placeholder="empty for root" />
                      </Form.Item>
                      <Space size="large" align="start" wrap={false}>
                        <Form.Item
                          name="menuTargetType"
                          label="Menu Type"
                          rules={[{ required: true }]}
                          style={{ minWidth: 150, marginBottom: 0 }}
                        >
                          <Select
                            options={[
                              { value: 'screen', label: 'Screen' },
                              { value: 'folder', label: 'Folder' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          name="menuOpenMode"
                          label="Open Mode"
                          rules={[{ required: true }]}
                          style={{ minWidth: 150, marginBottom: 0 }}
                        >
                          <Select
                            options={[
                              { value: 'inline', label: 'Inline' },
                              { value: 'popup', label: 'Popup' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item label=" " style={{ marginBottom: 0 }}>
                          <Button onClick={saveMenuOnly}>Save menu only</Button>
                        </Form.Item>
                      </Space>
                    </Space>
                  ),
                },
              ]}
            />

            <Collapse
              activeKey={openSettings.includes('screen') ? ['screen'] : []}
              onChange={(keys) => {
                const activeKeys = toActiveKeys(keys);
                setOpenSettings((prev) =>
                  activeKeys.includes('screen')
                    ? Array.from(new Set([...prev, 'screen']))
                    : prev.filter((key) => key !== 'screen'),
                );
              }}
              style={{ width: '100%', background: '#fff' }}
              items={[
                {
                  key: 'screen',
                  label: (
                    <Space size={8}>
                      <Typography.Text strong>Screen settings</Typography.Text>
                      <Typography.Text type="secondary">
                        {watchedScreenName} ({watchedScreenId})
                      </Typography.Text>
                    </Space>
                  ),
                  children: (
                    <Space wrap size="large" style={{ width: '100%' }} align="start">
                      <Form.Item
                        name="screenId"
                        label="Screen ID"
                        rules={[{ required: true }]}
                        style={{ minWidth: 200, marginBottom: 0 }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name="name"
                        label="Screen Name"
                        rules={[{ required: true }]}
                        style={{ minWidth: 240, marginBottom: 0 }}
                      >
                        <Input />
                      </Form.Item>
                    </Space>
                  ),
                },
              ]}
            />
          </Form>

          <Tabs
            activeKey={jsonTab}
            tabBarExtraContent={
              <Button type="primary" onClick={save}>
                Save screen and menu
              </Button>
            }
            onChange={(k) => {
              setJsonTab(k);
              if (k === 'json') syncJsonDraftFromComponents();
            }}
            items={[
              {
                key: 'visual',
                label: 'Screen layout',
                children: (
                  <div
                    onDragOver={acceptDragOver}
                    onDrop={dropNewFromToolbox}
                    style={{
                      minHeight: 420,
                      background: '#fff',
                      border: '2px dashed #d9d9d9',
                      borderRadius: 8,
                      padding: '40px 16px 16px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      ref={canvasInnerRef}
                      onDragOver={acceptDragOver}
                      onDrop={dropNewFromToolbox}
                      style={{
                        position: 'relative',
                        minHeight: 380,
                        width: '100%',
                        backgroundSize: `${GRID}px ${GRID}px`,
                        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
                      }}
                    >
                      {components.length === 0 ? (
                        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                          Drop components here from the left toolbox.
                        </Typography.Paragraph>
                      ) : (
                        [...components]
                          .slice()
                          .sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1))
                          .map((c) => {
                            const L = effectiveLayout(c);
                            return (
                            <div
                              key={c.id}
                              onDragOver={acceptDragOver}
                              onDrop={dropNewFromToolbox}
                              style={{
                                position: 'absolute',
                                left: L.x,
                                top: L.y,
                                width: L.w,
                                height: L.h,
                                zIndex: c.zIndex ?? 1,
                                boxSizing: 'border-box',
                                padding: 8,
                                border: '1px solid #d9d9d9',
                                borderRadius: 8,
                                background: '#fff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                cursor: 'grab',
                                touchAction: 'none',
                              }}
                              onPointerDown={(e) => onItemPointerDown(e, c)}
                              onPointerMove={onItemPointerMove}
                              onPointerUp={onItemPointerUp}
                              onPointerCancel={onItemPointerUp}
                            >
                              <div
                                data-bind-drag
                                title={`Drag ${c.type} to communication binding`}
                                style={bindingChipStyle(c.type)}
                              >
                                <span
                                  draggable
                                  onDragStart={(e) => onDragStartComponentBinding(e, c)}
                                  style={{
                                    cursor: 'grab',
                                    padding: '4px 8px',
                                    borderRight: '1px solid rgba(0,0,0,0.12)',
                                  }}
                                >
                                  {c.type}
                                </span>
                                <Input
                                  key={c.id}
                                  size="small"
                                  defaultValue={c.id}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => updateComponentId(c.id, e.target.value)}
                                  onPressEnter={(e) => e.currentTarget.blur()}
                                  style={{
                                    width: Math.max(100, Math.min(190, c.id.length * 9 + 44)),
                                    height: 26,
                                    border: 0,
                                    background: 'transparent',
                                    color: 'inherit',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    paddingInline: 8,
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'stretch',
                                  gap: 8,
                                  height: '100%',
                                  width: '100%',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                                  <CanvasPreview
                                    item={c}
                                    columnNameDrafts={columnNameDrafts}
                                    onGridColumnDraftChange={updateGridColumnDraft}
                                    onGridColumnChange={updateGridColumn}
                                    onGridAddColumn={addGridColumn}
                                    onGridRemoveColumn={removeGridColumn}
                                    onGridSaveRows={saveGridRowsToLinkedFormat}
                                    onButtonTextChange={updateButtonText}
                                    onGridCellChange={updateGridCell}
                                    onGridAddRow={addGridRow}
                                    onGridRemoveRow={removeGridRow}
                                  />
                                </div>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label="Remove component"
                                  data-delete-btn
                                  onClick={() => removeById(c.id)}
                                  style={{ flexShrink: 0, alignSelf: 'flex-start' }}
                                />
                              </div>
                              <div
                                aria-label="Resize"
                                data-resize-handle
                                onPointerDown={(e) => onResizePointerDown(e, c)}
                                onPointerMove={onResizePointerMove}
                                onPointerUp={onResizePointerUp}
                                onPointerCancel={onResizePointerUp}
                                style={{
                                  position: 'absolute',
                                  right: 2,
                                  bottom: 2,
                                  width: 14,
                                  height: 14,
                                  cursor: 'nwse-resize',
                                  borderRadius: 2,
                                  border: '1px solid #91caff',
                                  background: 'linear-gradient(135deg, transparent 50%, #1677ff 50%)',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'json',
                label: 'JSON',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Input.TextArea
                      rows={14}
                      value={jsonDraft}
                      onChange={(e) => setJsonDraft(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Space>
                      <Button onClick={syncJsonDraftFromComponents}>Reset from canvas</Button>
                      <Button type="primary" onClick={applyJsonDraft}>
                        Apply to canvas
                      </Button>
                    </Space>
                  </Space>
                ),
              },
            ]}
          />

          <Collapse
            style={{ marginTop: 16 }}
            items={[
              {
                key: 'readonly-json',
                label: 'Live JSON preview (read-only)',
                children: (
                  <pre
                    style={{
                      margin: 0,
                      maxHeight: 220,
                      overflow: 'auto',
                      fontSize: 12,
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    {serialized}
                  </pre>
                ),
              },
            ]}
          />
        </Content>
        <Sider
          width={360}
          theme="light"
          style={{
            borderLeft: '1px solid #f0f0f0',
            padding: 16,
            overflow: 'auto',
          }}
        >
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Communication
            </Typography.Title>
            <Space size={6}>
              <Button size="small" onClick={addCommunicationFormat}>
                Add format
              </Button>
              <Button size="small" onClick={addCommunication}>
                Add action
              </Button>
            </Space>
          </Space>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            Drag a component ID chip from the canvas into a binding box.
          </Typography.Paragraph>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Collapse
              size="small"
              items={[
                {
                  key: 'formats',
                  label: `Formats (${communicationFormats.length})`,
                  children: (
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      {communicationFormats.map((format) => (
                        <Card
                          key={format.id}
                          size="small"
                          title={format.id}
                          extra={
                            <Space size={4}>
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => saveCommunicationFormat(format)}
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                danger
                                onClick={() => deleteCommunicationFormat(format.id)}
                              >
                                Delete
                              </Button>
                            </Space>
                          }
                        >
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Input
                              addonBefore="Name"
                              value={format.name}
                              onChange={(e) =>
                                updateCommunicationFormat(format.id, { name: e.target.value })
                              }
                            />
                            <div>
                              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Typography.Text strong>Inputs</Typography.Text>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    addCommunicationFormatField(format.id, 'inputFields')
                                  }
                                >
                                  Add
                                </Button>
                              </Space>
                              <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                                {format.inputFields.map((field, index) => (
                                  <Space.Compact key={`format-input-${index}`} style={{ width: '100%' }}>
                                    <Input
                                      value={field}
                                      onChange={(e) =>
                                        updateCommunicationFormatField(
                                          format.id,
                                          'inputFields',
                                          index,
                                          e.target.value,
                                        )
                                      }
                                    />
                                    <Button
                                      danger
                                      disabled={format.inputFields.length === 1}
                                      onClick={() =>
                                        removeCommunicationFormatField(
                                          format.id,
                                          'inputFields',
                                          index,
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </Space.Compact>
                                ))}
                              </Space>
                            </div>
                            <div>
                              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Typography.Text strong>Outputs</Typography.Text>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    addCommunicationFormatField(format.id, 'outputFields')
                                  }
                                >
                                  Add
                                </Button>
                              </Space>
                              <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 6 }}>
                                {format.outputFields.map((field, index) => (
                                  <Space.Compact key={`format-output-${index}`} style={{ width: '100%' }}>
                                    <Input
                                      value={field}
                                      onChange={(e) =>
                                        updateCommunicationFormatField(
                                          format.id,
                                          'outputFields',
                                          index,
                                          e.target.value,
                                        )
                                      }
                                    />
                                    <Button
                                      danger
                                      disabled={format.outputFields.length === 1}
                                      onClick={() =>
                                        removeCommunicationFormatField(
                                          format.id,
                                          'outputFields',
                                          index,
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </Space.Compact>
                                ))}
                              </Space>
                            </div>
                            <div>
                              <Typography.Text strong>Sample Output Rows JSON</Typography.Text>
                              <Input.TextArea
                                key={`format-${format.id}-${JSON.stringify(format.sampleRows)}`}
                                rows={5}
                                defaultValue={JSON.stringify(format.sampleRows, null, 2)}
                                onBlur={(e) =>
                                  updateCommunicationSampleRows(format.id, e.target.value)
                                }
                                style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}
                              />
                            </div>
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
            {communications.map((comm) => {
              const selectedFormat =
                communicationFormats.find((format) => format.id === (comm.formatId || comm.id)) ??
                {
                  id: comm.formatId || comm.id,
                  name: comm.formatId || comm.id,
                  inputFields: [],
                  outputFields: [],
                  sampleRows: [],
                };
              const inputBindings =
                comm.inputBindings.length > 0
                  ? comm.inputBindings
                  : [{ field: 'keyword', componentId: '' }];
              const outputBindings =
                comm.outputBindings.length > 0 ? comm.outputBindings : [{ field: 'rows', componentId: '' }];
              const dropStyle = {
                minHeight: 32,
                border: '1px dashed #91caff',
                borderRadius: 6,
                padding: '4px 8px',
                background: '#f6ffed',
                color: '#262626',
                display: 'flex',
                alignItems: 'center',
              };

              return (
                <Card
                  key={comm.id}
                  size="small"
                  title={comm.name || comm.id}
                  extra={
                    <Space size={4}>
                      <Button size="small" type="primary" onClick={() => saveAction(comm.id)}>
                        Save
                      </Button>
                      <Button
                        danger
                        size="small"
                        type="text"
                        onClick={() => removeCommunication(comm.id)}
                      >
                        Remove
                      </Button>
                    </Space>
                  }
                >
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Input
                      addonBefore="ID"
                      value={comm.id}
                      onChange={(e) =>
                        updateCommunication(comm.id, { id: e.target.value.trim() })
                      }
                    />
                    <Input
                      addonBefore="Name"
                      value={comm.name}
                      onChange={(e) => updateCommunication(comm.id, { name: e.target.value })}
                    />
                    <Input
                      addonBefore="Format"
                      list="communication-format-ids"
                      value={comm.formatId || comm.id}
                      onChange={(e) => {
                        const nextFormatId = e.target.value.trim();
                        updateCommunication(comm.id, { formatId: nextFormatId });
                        comm.outputBindings.forEach((binding) => {
                          if (binding.componentId) {
                            applyFormatRowsToEmptyGrid(
                              comm.id,
                              binding.componentId,
                              nextFormatId,
                            );
                          }
                        });
                      }}
                    />
                    <div>
                      <Typography.Text strong>Trigger Button</Typography.Text>
                      <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                        <div
                          onDragOver={acceptComponentBindingDrop}
                          onDrop={(e) => {
                            const dropped = readDroppedComponent(e, ['Button']);
                            if (dropped) bindTriggerComponent(comm.id, dropped.id);
                          }}
                          style={{ ...dropStyle, flex: 1 }}
                        >
                          {comm.triggerComponentId || 'Drop Button here'}
                        </div>
                        <Button
                          disabled={!comm.triggerComponentId}
                          onClick={() => clearTriggerComponent(comm.id)}
                          style={{ height: 32 }}
                        >
                          Clear
                        </Button>
                      </Space.Compact>
                    </div>
                    <div>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text strong>Inputs</Typography.Text>
                        <Button size="small" onClick={() => addCommunicationInput(comm.id)}>
                          Add input
                        </Button>
                      </Space>
                      <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 6 }}>
                        {inputBindings.map((inputBinding, index) => (
                          <div key={`input-${index}`}>
                            <Space.Compact style={{ width: '100%', marginBottom: 6 }}>
                              <Input
                                addonBefore="field"
                                value={inputBinding.field}
                                onChange={(e) =>
                                  updateCommunicationInput(comm.id, index, {
                                    field: e.target.value,
                                  })
                                }
                              />
                              <Button
                                danger
                                disabled={inputBindings.length === 1}
                                onClick={() => removeCommunicationInput(comm.id, index)}
                              >
                                Remove
                              </Button>
                            </Space.Compact>
                            <Space.Compact style={{ width: '100%' }}>
                              <div
                                onDragOver={acceptComponentBindingDrop}
                                onDrop={(e) => {
                                  const dropped = readDroppedComponent(e, ['Input']);
                                  if (dropped) bindInputComponent(comm.id, index, dropped.id);
                                }}
                                style={{ ...dropStyle, flex: 1 }}
                              >
                                {inputBinding.componentId || 'Drop Input here'}
                              </div>
                              <Button
                                disabled={!inputBinding.componentId}
                                onClick={() => clearInputComponent(comm.id, index)}
                                style={{ height: 32 }}
                              >
                                Unlink
                              </Button>
                            </Space.Compact>
                          </div>
                        ))}
                      </Space>
                    </div>
                    <div>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text strong>Outputs</Typography.Text>
                        <Button size="small" onClick={() => addCommunicationOutput(comm.id)}>
                          Add output
                        </Button>
                      </Space>
                      <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 6 }}>
                        {outputBindings.map((outputBinding, index) => (
                          <div key={`output-${index}`}>
                            <Space.Compact style={{ width: '100%', marginBottom: 6 }}>
                              <Input
                                addonBefore="field"
                                value={outputBinding.field}
                                onChange={(e) =>
                                  updateCommunicationOutput(comm.id, index, {
                                    field: e.target.value,
                                  })
                                }
                              />
                              <Button
                                danger
                                disabled={outputBindings.length === 1}
                                onClick={() => removeCommunicationOutput(comm.id, index)}
                              >
                                Remove
                              </Button>
                            </Space.Compact>
                            <Space.Compact style={{ width: '100%' }}>
                              <div
                                onDragOver={acceptComponentBindingDrop}
                                onDrop={(e) => {
                                  const dropped = readDroppedComponent(e, ['AgGrid']);
                                  if (dropped) bindOutputComponent(comm.id, index, dropped.id);
                                }}
                                style={{ ...dropStyle, flex: 1 }}
                              >
                                {outputBinding.componentId || 'Drop AgGrid here'}
                              </div>
                              <Button
                                disabled={!outputBinding.componentId}
                                onClick={() => clearOutputComponent(comm.id, index)}
                                style={{ height: 32 }}
                              >
                                Unlink
                              </Button>
                            </Space.Compact>
                          </div>
                        ))}
                      </Space>
                    </div>
                    <div>
                      <Typography.Text strong>Sample Output Rows JSON</Typography.Text>
                      <Input.TextArea
                        key={`${comm.id}-${selectedFormat.id}-${JSON.stringify(selectedFormat.sampleRows)}`}
                        rows={5}
                        defaultValue={JSON.stringify(selectedFormat.sampleRows, null, 2)}
                        onBlur={(e) =>
                          updateCommunicationSampleRows(selectedFormat.id, e.target.value)
                        }
                        style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}
                      />
                    </div>
                  </Space>
                </Card>
              );
            })}
            <datalist id="communication-format-ids">
              {communicationFormats.map((format) => (
                <option key={format.id} value={format.id} />
              ))}
            </datalist>
          </Space>
        </Sider>
      </Layout>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
