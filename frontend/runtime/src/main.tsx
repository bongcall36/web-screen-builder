import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Select,
  Space,
  Switch,
  Tree,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const { Header, Content, Sider } = Layout;

type MenuItem = {
  id: string;
  name: string;
  screenId?: string;
  parentId?: string;
  targetType?: 'folder' | 'screen';
  openMode?: 'inline' | 'popup';
};

type GridDataType = 'string' | 'number' | 'boolean' | 'date';
type ChartDatum = { label: string; value: number };

type ScreenState = {
  menu: MenuItem;
  components: ScreenComponent[];
  communications: CommunicationDefinition[];
  allowRuntimePersonalization: boolean;
  inputValues: Record<string, string | boolean | number | null>;
  gridRows: Record<string, Array<Record<string, unknown>>>;
};

type ScreenSummary = {
  screenId: string;
  name: string;
  isInitialScreen?: boolean;
};

type CommunicationDefinition = {
  id: string;
  name: string;
  formatId?: string;
  triggerComponentId: string;
  inputBindings: Array<{ field: string; componentId: string }>;
  outputBindings: Array<{ field: string; componentId: string }>;
  sampleRows?: Array<Record<string, unknown>>;
};

type ScreenComponent = {
  id: string;
  type:
    | 'Text'
    | 'Input'
    | 'TextArea'
    | 'NumberInput'
    | 'Select'
    | 'Checkbox'
    | 'Switch'
    | 'DatePicker'
    | 'Button'
    | 'Divider'
    | 'Alert'
    | 'AgGrid'
    | 'BarChart'
    | 'LineChart'
    | 'PieChart'
    | 'DataMap'
    | 'Card';
  layout?: { x: number; y: number; width?: number; height?: number };
  zIndex?: number;
  props?: any;
};

type PersonalizedLayoutMap = Record<string, { x: number; y: number; width?: number; height?: number }>;

function defaultSize(type: ScreenComponent['type']): { w: number; h: number } {
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

function effectiveLayout(c: ScreenComponent): { x: number; y: number; w: number; h: number } {
  const d = defaultSize(c.type);
  return {
    x: c.layout?.x ?? 0,
    y: c.layout?.y ?? 0,
    w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
    h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
  };
}

function personalizationKey(screenId: string) {
  return `web-screen-builder:layout:${screenId}`;
}

function applyPersonalizedLayouts(screenId: string, components: ScreenComponent[]) {
  try {
    const raw = window.localStorage.getItem(personalizationKey(screenId));
    if (!raw) return components;
    const layouts = JSON.parse(raw) as PersonalizedLayoutMap;
    return components.map((component) =>
      layouts[component.id]
        ? {
            ...component,
            layout: {
              ...component.layout,
              ...layouts[component.id],
            },
          }
        : component,
    );
  } catch {
    return components;
  }
}

function savePersonalizedLayouts(screenId: string, components: ScreenComponent[]) {
  const layouts = Object.fromEntries(
    components.map((component) => {
      const L = effectiveLayout(component);
      return [
        component.id,
        {
          x: L.x,
          y: L.y,
          width: L.w,
          height: L.h,
        },
      ];
    }),
  );
  window.localStorage.setItem(personalizationKey(screenId), JSON.stringify(layouts));
}

function getStackPosition(index: number) {
  return { x: 12, y: 12 + index * 80 };
}

function getSelectOptions(props: any) {
  const raw = Array.isArray(props?.options) ? props.options : [];
  return raw
    .filter((option: any) => typeof option === 'object' && option !== null)
    .map((option: any) => ({
      label: String(option.label ?? option.value ?? ''),
      value: String(option.value ?? option.label ?? ''),
    }))
    .filter((option: { value: string }) => option.value);
}

function getGridColumnDefs(props: any) {
  const columnDefs = Array.isArray(props?.columnDefs) ? props.columnDefs : [];
  return columnDefs.map((columnDef: any) => {
    const dataType = getGridDataType(columnDef.dataType);
    return {
      flex: columnDef.flex ?? 1,
      minWidth: columnDef.minWidth ?? 80,
      ...columnDef,
      cellDataType: toAgGridCellDataType(dataType),
      filter: toAgGridFilter(dataType),
    };
  });
}

function getChartData(props: any): ChartDatum[] {
  const raw = Array.isArray(props?.data) ? props.data : [];
  return raw
    .filter((item: any) => typeof item === 'object' && item !== null)
    .map((item: any) => ({
      label: String(item.label ?? ''),
      value: Number(item.value ?? 0),
    }))
    .filter((item: ChartDatum) => item.label && Number.isFinite(item.value));
}

const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];

function ChartPanel({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 10,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#fff',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
        {title}
      </Typography.Text>
      {children}
    </div>
  );
}

function ChartRenderer({ type, props }: { type: ScreenComponent['type']; props: any }) {
  const data = getChartData(props);
  const max = Math.max(1, ...data.map((item) => item.value));
  const title = String(props?.title ?? type);

  if (type === 'Card') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {String(props?.title ?? 'Metric')}
        </Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0' }}>
          {String(props?.value ?? '0')}
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12 }}>
          {String(props?.description ?? '')}
        </Typography.Text>
      </div>
    );
  }

  if (type === 'BarChart') {
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 'calc(100% - 22px)' }}>
          {data.map((item, index) => (
            <div key={item.label} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <div
                style={{
                  height: `${Math.max(8, (item.value / max) * 120)}px`,
                  background: CHART_COLORS[index % CHART_COLORS.length],
                  borderRadius: 4,
                }}
              />
              <Typography.Text style={{ fontSize: 10 }}>{item.label}</Typography.Text>
            </div>
          ))}
        </div>
      </ChartPanel>
    );
  }

  if (type === 'LineChart') {
    const points = data.map((item, index) => {
      const x = data.length <= 1 ? 20 : 20 + (index / (data.length - 1)) * 260;
      const y = 130 - (item.value / max) * 110;
      return `${x},${y}`;
    });
    return (
      <ChartPanel title={title}>
        <svg viewBox="0 0 300 150" style={{ width: '100%', height: 'calc(100% - 22px)' }}>
          <polyline points={points.join(' ')} fill="none" stroke="#1677ff" strokeWidth="4" />
          {points.map((point, index) => {
            const [x, y] = point.split(',').map(Number);
            return <circle key={data[index].label} cx={x} cy={y} r="4" fill="#1677ff" />;
          })}
        </svg>
      </ChartPanel>
    );
  }

  if (type === 'PieChart') {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    let offset = 0;
    const segments = data.map((item, index) => {
      const start = offset;
      const end = start + (item.value / total) * 360;
      offset = end;
      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}deg ${end}deg`;
    });
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 'calc(100% - 22px)' }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `conic-gradient(${segments.join(', ')})`,
            }}
          />
          <Space direction="vertical" size={2}>
            {data.map((item, index) => (
              <Typography.Text key={item.label} style={{ fontSize: 11 }}>
                <span style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>■</span> {item.label}
              </Typography.Text>
            ))}
          </Space>
        </div>
      </ChartPanel>
    );
  }

  if (type === 'DataMap') {
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {data.map((item) => {
            const lightness = 92 - Math.round((item.value / max) * 42);
            return (
              <div
                key={item.label}
                style={{
                  minHeight: 34,
                  padding: 4,
                  borderRadius: 4,
                  background: `hsl(211, 100%, ${lightness}%)`,
                  fontSize: 11,
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </ChartPanel>
    );
  }

  return null;
}

function getGridDataType(value: unknown): GridDataType {
  return value === 'number' || value === 'boolean' || value === 'date' ? value : 'string';
}

function toAgGridCellDataType(dataType: GridDataType) {
  if (dataType === 'string') return 'text';
  if (dataType === 'date') return 'dateString';
  return dataType;
}

function toAgGridFilter(dataType: GridDataType) {
  if (dataType === 'number') return 'agNumberColumnFilter';
  if (dataType === 'date') return 'agDateColumnFilter';
  return 'agTextColumnFilter';
}

function menuTargetType(menu: MenuItem): 'folder' | 'screen' {
  return menu.targetType === 'folder' ? 'folder' : 'screen';
}

function menuParentId(menu: MenuItem, menuIds: Set<string>) {
  return menu.parentId && menuIds.has(menu.parentId) ? menu.parentId : '';
}

function buildMenuTree(menus: MenuItem[]) {
  const ids = new Set(menus.map((menu) => menu.id));
  const childrenByParent = new Map<string, MenuItem[]>();

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
        title: `${menu.name || menu.id} (${menu.id})`,
        selectable: menuTargetType(menu) === 'screen',
        children: makeNodes(menu.id),
      }));

  return makeNodes('');
}

function DynamicRenderer({
  components,
  inputValues,
  gridRows,
  runtimeEditable = false,
  onInputChange,
  onAction,
  onComponentMove,
}: {
  components: ScreenComponent[];
  inputValues: Record<string, string | boolean | number | null>;
  gridRows: Record<string, Array<Record<string, unknown>>>;
  runtimeEditable?: boolean;
  onInputChange: (componentId: string, value: string | boolean | number | null) => void;
  onAction: (componentId: string) => void;
  onComponentMove?: (componentId: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const placed = components.map((c, index) => {
    const hasLayout =
      c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
    const pos = hasLayout ? { x: c.layout!.x, y: c.layout!.y } : getStackPosition(index);
    const L = effectiveLayout(c);
    const z = c.zIndex ?? index + 1;
    const bottom = pos.y + L.h;
    return { c, pos, z, bottom, L };
  });

  const canvasHeight = Math.max(320, ...placed.map((p) => p.bottom), 12 + components.length * 80);

  const startMove = (event: React.PointerEvent, component: ScreenComponent) => {
    if (!runtimeEditable || !onComponentMove) return;
    const L = effectiveLayout(component);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragRef.current = {
      id: component.id,
      offsetX: event.clientX - rect.left - L.x,
      offsetY: event.clientY - rect.top - L.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveComponent = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !onComponentMove) return;
    const rect = canvas.getBoundingClientRect();
    onComponentMove(
      drag.id,
      Math.max(0, Math.round(event.clientX - rect.left - drag.offsetX)),
      Math.max(0, Math.round(event.clientY - rect.top - drag.offsetY)),
    );
  };

  const stopMove = (event: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        minHeight: canvasHeight,
        width: '100%',
        backgroundSize: runtimeEditable ? '16px 16px' : undefined,
        backgroundImage: runtimeEditable
          ? 'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)'
          : undefined,
      }}
    >
      {placed.map(({ c, pos, z, L }) => {
        const common = {
          position: 'absolute' as const,
          left: pos.x,
          top: pos.y,
          zIndex: z,
          width: L.w,
          height: L.h,
          boxSizing: 'border-box' as const,
        };

        const wrap = (children: React.ReactNode) => (
          <div key={c.id} style={common}>
            {runtimeEditable && (
              <button
                type="button"
                onPointerDown={(event) => startMove(event, c)}
                onPointerMove={moveComponent}
                onPointerUp={stopMove}
                onPointerCancel={stopMove}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  zIndex: 5,
                  height: 22,
                  border: '1px solid #91caff',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#0958d9',
                  cursor: 'move',
                  fontSize: 11,
                }}
              >
                Move
              </button>
            )}
            {children}
          </div>
        );

        if (c.type === 'Text') {
          return wrap(
              <Typography.Text
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  fontWeight: 600,
                }}
              >
                {c.props?.text ?? 'Label'}
              </Typography.Text>,
          );
        }

        if (c.type === 'Input') {
          return wrap(
              <Input
                placeholder={c.props?.placeholder}
                value={String(inputValues[c.id] ?? '')}
                onChange={(e) => onInputChange(c.id, e.target.value)}
                style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
              />,
          );
        }

        if (c.type === 'TextArea') {
          return wrap(
              <Input.TextArea
                placeholder={c.props?.placeholder}
                value={String(inputValues[c.id] ?? '')}
                onChange={(e) => onInputChange(c.id, e.target.value)}
                style={{ width: '100%', height: '100%', resize: 'none', boxSizing: 'border-box' }}
              />,
          );
        }

        if (c.type === 'NumberInput') {
          return wrap(
              <InputNumber
                placeholder={c.props?.placeholder}
                min={typeof c.props?.min === 'number' ? c.props.min : undefined}
                max={typeof c.props?.max === 'number' ? c.props.max : undefined}
                value={(inputValues[c.id] as number | null | undefined) ?? null}
                onChange={(value) => onInputChange(c.id, value)}
                style={{ width: '100%', height: '100%' }}
              />,
          );
        }

        if (c.type === 'Select') {
          return wrap(
              <Select
                placeholder={c.props?.placeholder}
                options={getSelectOptions(c.props)}
                value={(inputValues[c.id] as string | undefined) || undefined}
                onChange={(value) => onInputChange(c.id, value)}
                style={{ width: '100%', height: '100%' }}
              />,
          );
        }

        if (c.type === 'Checkbox') {
          return wrap(
              <Checkbox
                checked={Boolean(inputValues[c.id] ?? c.props?.checked)}
                onChange={(e) => onInputChange(c.id, e.target.checked)}
              >
                {c.props?.label ?? 'Checkbox'}
              </Checkbox>,
          );
        }

        if (c.type === 'Switch') {
          return wrap(
              <Space size={8}>
                <Switch
                  checked={Boolean(inputValues[c.id] ?? c.props?.checked)}
                  onChange={(checked) => onInputChange(c.id, checked)}
                />
                <Typography.Text>{c.props?.label ?? 'Enabled'}</Typography.Text>
              </Space>,
          );
        }

        if (c.type === 'DatePicker') {
          return wrap(
              <DatePicker
                placeholder={c.props?.placeholder}
                onChange={(_, dateString) =>
                  onInputChange(c.id, Array.isArray(dateString) ? dateString[0] ?? '' : dateString)
                }
                style={{ width: '100%', height: '100%' }}
              />,
          );
        }

        if (c.type === 'Button') {
          return wrap(
              <Button
                type="primary"
                onClick={() => onAction(c.id)}
                style={{ width: '100%', height: '100%' }}
              >
                {c.props?.text ?? 'Button'}
              </Button>,
          );
        }

        if (c.type === 'Divider') {
          return wrap(<Divider style={{ margin: 0 }}>{c.props?.text ?? ''}</Divider>);
        }

        if (c.type === 'Alert') {
          return wrap(
            <Alert
              type={c.props?.alertType ?? 'info'}
              message={c.props?.message ?? 'Information'}
              description={c.props?.description}
              showIcon
              style={{ height: '100%', overflow: 'hidden' }}
            />,
          );
        }

        if (c.type === 'AgGrid') {
          return wrap(
            <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
              <AgGridReact
                rowData={gridRows[c.id] ?? []}
                columnDefs={getGridColumnDefs(c.props)}
                defaultColDef={{
                  flex: 1,
                  minWidth: 80,
                  resizable: true,
                }}
                onGridReady={(event) => event.api.sizeColumnsToFit()}
                onGridSizeChanged={(event) => event.api.sizeColumnsToFit()}
              />
            </div>,
          );
        }

        if (
          c.type === 'BarChart' ||
          c.type === 'LineChart' ||
          c.type === 'PieChart' ||
          c.type === 'DataMap' ||
          c.type === 'Card'
        ) {
          return wrap(<ChartRenderer type={c.type} props={c.props} />);
        }

        return null;
      })}
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string>('');
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [components, setComponents] = useState<ScreenComponent[]>([]);
  const [communications, setCommunications] = useState<CommunicationDefinition[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string | boolean | number | null>>({});
  const [gridRows, setGridRows] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [activeMenu, setActiveMenu] = useState<MenuItem | null>(null);
  const [activeRuntimeEditable, setActiveRuntimeEditable] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [popupScreen, setPopupScreen] = useState<ScreenState | null>(null);
  const [popupLayoutEditMode, setPopupLayoutEditMode] = useState(false);

  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);

  const loadMenus = async () => {
    const menuRes = await axios.get('http://localhost:8080/api/menus');
    setMenus(menuRes.data);
    return menuRes.data as MenuItem[];
  };

  const onLogin = async (values: { username: string; password: string }) => {
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
    const nextToken = loginRes.data.token;
    axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    setToken(nextToken);
    const [nextMenus, screenRes] = await Promise.all([
      loadMenus(),
      axios.get('http://localhost:8080/api/screens'),
    ]);
    const initialScreen = (screenRes.data as ScreenSummary[]).find((screen) =>
      Boolean(screen.isInitialScreen),
    );
    const initialMenu = initialScreen
      ? nextMenus.find((menu) => menu.screenId === initialScreen.screenId)
      : undefined;
    if (initialMenu) {
      await openMenu(initialMenu);
    }
  };

  const loadScreenForMenu = async (item: MenuItem) => {
    if (!item.screenId) {
      throw new Error('screenId is required');
    }
    const screenRes = await axios.get(`http://localhost:8080/api/screens/${item.screenId}`);
    const allowRuntimePersonalization = Boolean(screenRes.data.allowRuntimePersonalization);
    const baseComponents = screenRes.data.components ?? [];
    return {
      components: allowRuntimePersonalization
        ? applyPersonalizedLayouts(item.screenId, baseComponents)
        : baseComponents,
      communications: screenRes.data.communications ?? [],
      allowRuntimePersonalization,
    };
  };

  const openMenu = async (item: MenuItem) => {
    if (menuTargetType(item) === 'folder') {
      return;
    }

    setActiveMenu(item);
    setComponents([]);
    setCommunications([]);
    setActiveRuntimeEditable(false);
    setLayoutEditMode(false);
    setInputValues({});
    setGridRows({});
    try {
      const screen = await loadScreenForMenu(item);

      if (item.openMode === 'popup') {
        setActiveMenu(null);
        setLayoutEditMode(false);
        setPopupLayoutEditMode(false);
        setPopupScreen({
          menu: item,
          components: screen.components,
          communications: screen.communications,
          allowRuntimePersonalization: screen.allowRuntimePersonalization,
          inputValues: {},
          gridRows: {},
        });
        return;
      }

      setComponents(screen.components);
      setCommunications(screen.communications);
      setActiveRuntimeEditable(screen.allowRuntimePersonalization);
    } catch {
      message.error(`Could not open ${item.name}`);
    }
  };

  const moveInlineComponent = (componentId: string, x: number, y: number) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === componentId
          ? {
              ...component,
              layout: {
                ...component.layout,
                x,
                y,
                width: effectiveLayout(component).w,
                height: effectiveLayout(component).h,
              },
            }
          : component,
      ),
    );
  };

  const saveInlineLayout = () => {
    if (!activeMenu?.screenId) return;
    savePersonalizedLayouts(activeMenu.screenId, components);
    setLayoutEditMode(false);
    message.success('Saved your layout');
  };

  const resetInlineLayout = async () => {
    if (!activeMenu?.screenId) return;
    window.localStorage.removeItem(personalizationKey(activeMenu.screenId));
    await openMenu(activeMenu);
    setLayoutEditMode(false);
    message.success('Reset your layout');
  };

  const executeAction = async (
    triggerComponentId: string,
    actionCommunications = communications,
    actionInputValues = inputValues,
    updateGridRows: React.Dispatch<
      React.SetStateAction<Record<string, Array<Record<string, unknown>>>>
    > = setGridRows,
  ) => {
    const action = actionCommunications.find((comm) => comm.triggerComponentId === triggerComponentId);
    if (!action) {
      message.warning('No communication action is connected to this button.');
      return;
    }

    const input = Object.fromEntries(
      action.inputBindings.map((binding) => [
        binding.field,
        actionInputValues[binding.componentId] ?? '',
      ]),
    );

    try {
      const res = await axios.post(
        `http://localhost:8080/api/communications/${action.formatId || action.id}/execute`,
        input,
      );
      updateGridRows((prev) => {
        const next = { ...prev };
        action.outputBindings.forEach((binding) => {
          const outputRows = Array.isArray(res.data[binding.field])
            ? res.data[binding.field]
            : Array.isArray(res.data.rows)
              ? res.data.rows
              : [];
          next[binding.componentId] = outputRows;
        });
        return next;
      });
      message.success(`${action.name || action.id} completed`);
    } catch {
      message.error(`${action.name || action.id} failed`);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6f8' }}>
      {!token && (
        <Content
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#f4f6f8',
          }}
        >
          <div
            style={{
              width: 420,
              padding: 28,
              border: '1px solid #d9dee7',
              borderRadius: 10,
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
            }}
          >
            <Space size={12} style={{ marginBottom: 24 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#1677ff',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                W
              </div>
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Web Screen Runtime
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Sign in to open published screens
                </Typography.Text>
              </div>
            </Space>
            <Form layout="vertical" onFinish={onLogin}>
              <Form.Item name="username" rules={[{ required: true }]}>
                <Input placeholder="username" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true }]}>
                <Input.Password placeholder="password" />
              </Form.Item>
              <Button htmlType="submit" type="primary" block>
                Login
              </Button>
            </Form>
          </div>
        </Content>
      )}

      {!!token && (
        <Layout style={{ minHeight: '100vh', background: '#f4f6f8' }}>
          <Header
            style={{
              height: 56,
              lineHeight: 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingInline: 20,
              background: '#ffffff',
              borderBottom: '1px solid #d9dee7',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              zIndex: 20,
            }}
          >
            <Space size={12}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#1677ff',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                W
              </div>
              <div>
                <Typography.Title level={5} style={{ margin: 0, lineHeight: 1.1 }}>
                  Web Screen Runtime
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {activeMenu?.name ?? 'Select a menu'}
                </Typography.Text>
              </div>
            </Space>
            <Space size={8}>
              {activeMenu && activeRuntimeEditable && (
                <>
                  {layoutEditMode ? (
                    <>
                      <Button onClick={() => setLayoutEditMode(false)}>Cancel edit</Button>
                      <Button onClick={resetInlineLayout}>Reset layout</Button>
                      <Button type="primary" onClick={saveInlineLayout}>
                        Save layout
                      </Button>
                    </>
                  ) : (
                    <Button type="primary" onClick={() => setLayoutEditMode(true)}>
                      Edit layout
                    </Button>
                  )}
                </>
              )}
              <Button onClick={loadMenus}>Refresh menus</Button>
            </Space>
          </Header>
          <Layout>
            <Sider
              width={300}
              theme="light"
              style={{
                borderRight: '1px solid #d9dee7',
                background: '#ffffff',
                padding: 16,
                overflow: 'auto',
                height: 'calc(100vh - 56px)',
              }}
            >
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 10 }}>
                Menu
              </Typography.Title>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 8,
                  background: '#fff',
                }}
              >
                <Tree
                  treeData={menuTreeData}
                  blockNode
                  showLine
                  expandedKeys={menus.map((menu) => menu.id)}
                  selectedKeys={activeMenu ? [activeMenu.id] : []}
                  onSelect={(keys) => {
                    const item = menus.find((menu) => menu.id === String(keys[0] ?? ''));
                    if (item) {
                      openMenu(item);
                    }
                  }}
                />
                {menus.length === 0 && (
                  <Typography.Text type="secondary">No menus</Typography.Text>
                )}
              </div>
            </Sider>

            <Content
              style={{
                background: '#f4f6f8',
                padding: 20,
                overflow: 'auto',
                height: 'calc(100vh - 56px)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  minHeight: '100%',
                  background: '#fff',
                  border: '1px solid #d9dee7',
                  borderRadius: 10,
                  padding: 24,
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                }}
              >
                {activeMenu ? (
                  <DynamicRenderer
                    components={components}
                    inputValues={inputValues}
                    gridRows={gridRows}
                    runtimeEditable={activeRuntimeEditable && layoutEditMode}
                    onComponentMove={moveInlineComponent}
                    onInputChange={(componentId, value) =>
                      setInputValues((prev) => ({ ...prev, [componentId]: value }))
                    }
                    onAction={executeAction}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: 360,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #cfd7e3',
                      borderRadius: 8,
                      background: '#fbfcfe',
                    }}
                  >
                    <Typography.Text type="secondary">Choose a menu from the left.</Typography.Text>
                  </div>
                )}
              </div>
            </Content>
          </Layout>

          <Modal
            open={!!popupScreen}
            title={popupScreen?.menu.name}
            width={980}
            footer={
              popupScreen?.allowRuntimePersonalization ? (
                <Space>
                  {popupLayoutEditMode ? (
                    <>
                      <Button onClick={() => setPopupLayoutEditMode(false)}>Cancel edit</Button>
                      <Button
                        onClick={async () => {
                          if (!popupScreen?.menu.screenId) return;
                          window.localStorage.removeItem(personalizationKey(popupScreen.menu.screenId));
                          const screen = await loadScreenForMenu(popupScreen.menu);
                          setPopupScreen((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  components: screen.components,
                                  communications: screen.communications,
                                  allowRuntimePersonalization: screen.allowRuntimePersonalization,
                                }
                              : prev,
                          );
                          setPopupLayoutEditMode(false);
                          message.success('Reset your layout');
                        }}
                      >
                        Reset layout
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => {
                          if (!popupScreen?.menu.screenId) return;
                          savePersonalizedLayouts(popupScreen.menu.screenId, popupScreen.components);
                          setPopupLayoutEditMode(false);
                          message.success('Saved your layout');
                        }}
                      >
                        Save layout
                      </Button>
                    </>
                  ) : (
                    <Button type="primary" onClick={() => setPopupLayoutEditMode(true)}>
                      Edit layout
                    </Button>
                  )}
                </Space>
              ) : null
            }
            destroyOnClose
            onCancel={() => {
              setPopupLayoutEditMode(false);
              setPopupScreen(null);
            }}
          >
            {popupScreen && (
              <div
                style={{
                  minHeight: 480,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 20,
                  background: '#fbfcfe',
                }}
              >
                <DynamicRenderer
                  components={popupScreen.components}
                  inputValues={popupScreen.inputValues}
                  gridRows={popupScreen.gridRows}
                  runtimeEditable={popupScreen.allowRuntimePersonalization && popupLayoutEditMode}
                  onComponentMove={(componentId, x, y) =>
                    setPopupScreen((prev) =>
                      prev
                        ? {
                            ...prev,
                            components: prev.components.map((component) =>
                              component.id === componentId
                                ? {
                                    ...component,
                                    layout: {
                                      ...component.layout,
                                      x,
                                      y,
                                      width: effectiveLayout(component).w,
                                      height: effectiveLayout(component).h,
                                    },
                                  }
                                : component,
                            ),
                          }
                        : prev,
                    )
                  }
                  onInputChange={(componentId, value) =>
                    setPopupScreen((prev) =>
                      prev
                        ? {
                            ...prev,
                            inputValues: { ...prev.inputValues, [componentId]: value },
                          }
                        : prev,
                    )
                  }
                  onAction={(triggerComponentId) =>
                    executeAction(
                      triggerComponentId,
                      popupScreen.communications,
                      popupScreen.inputValues,
                      (updater) =>
                        setPopupScreen((prev) =>
                          prev
                            ? {
                                ...prev,
                                gridRows:
                                  typeof updater === 'function'
                                    ? updater(prev.gridRows)
                                    : updater,
                              }
                            : prev,
                        ),
                    )
                  }
                />
              </div>
            )}
          </Modal>
        </Layout>
      )}
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
