import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Layout,
  Modal,
  Select,
  Space,
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

type ScreenState = {
  menu: MenuItem;
  components: ScreenComponent[];
  communications: CommunicationDefinition[];
  inputValues: Record<string, string | boolean>;
  gridRows: Record<string, Array<Record<string, unknown>>>;
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
  type: 'Text' | 'Input' | 'Select' | 'Checkbox' | 'DatePicker' | 'Button' | 'AgGrid';
  layout?: { x: number; y: number; width?: number; height?: number };
  zIndex?: number;
  props?: any;
};

function defaultSize(type: ScreenComponent['type']): { w: number; h: number } {
  switch (type) {
    case 'Text':
      return { w: 200, h: 32 };
    case 'Input':
      return { w: 256, h: 40 };
    case 'Select':
      return { w: 220, h: 40 };
    case 'Checkbox':
      return { w: 160, h: 32 };
    case 'DatePicker':
      return { w: 180, h: 40 };
    case 'Button':
      return { w: 160, h: 40 };
    case 'AgGrid':
      return { w: 400, h: 200 };
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
  onInputChange,
  onAction,
}: {
  components: ScreenComponent[];
  inputValues: Record<string, string | boolean>;
  gridRows: Record<string, Array<Record<string, unknown>>>;
  onInputChange: (componentId: string, value: string | boolean) => void;
  onAction: (componentId: string) => void;
}) {
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

  return (
    <div style={{ position: 'relative', minHeight: canvasHeight, width: '100%' }}>
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

        if (c.type === 'Text') {
          return (
            <div key={c.id} style={common}>
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
              </Typography.Text>
            </div>
          );
        }

        if (c.type === 'Input') {
          return (
            <div key={c.id} style={common}>
              <Input
                placeholder={c.props?.placeholder}
                value={String(inputValues[c.id] ?? '')}
                onChange={(e) => onInputChange(c.id, e.target.value)}
                style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
              />
            </div>
          );
        }

        if (c.type === 'Select') {
          return (
            <div key={c.id} style={common}>
              <Select
                placeholder={c.props?.placeholder}
                options={getSelectOptions(c.props)}
                value={(inputValues[c.id] as string | undefined) || undefined}
                onChange={(value) => onInputChange(c.id, value)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (c.type === 'Checkbox') {
          return (
            <div key={c.id} style={common}>
              <Checkbox
                checked={Boolean(inputValues[c.id] ?? c.props?.checked)}
                onChange={(e) => onInputChange(c.id, e.target.checked)}
              >
                {c.props?.label ?? 'Checkbox'}
              </Checkbox>
            </div>
          );
        }

        if (c.type === 'DatePicker') {
          return (
            <div key={c.id} style={common}>
              <DatePicker
                placeholder={c.props?.placeholder}
                onChange={(_, dateString) =>
                  onInputChange(c.id, Array.isArray(dateString) ? dateString[0] ?? '' : dateString)
                }
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (c.type === 'Button') {
          return (
            <div key={c.id} style={common}>
              <Button
                type="primary"
                onClick={() => onAction(c.id)}
                style={{ width: '100%', height: '100%' }}
              >
                {c.props?.text ?? 'Button'}
              </Button>
            </div>
          );
        }

        if (c.type === 'AgGrid') {
          return (
            <div key={c.id} style={common} className="ag-theme-quartz">
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
            </div>
          );
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
  const [inputValues, setInputValues] = useState<Record<string, string | boolean>>({});
  const [gridRows, setGridRows] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [activeMenu, setActiveMenu] = useState<MenuItem | null>(null);
  const [popupScreen, setPopupScreen] = useState<ScreenState | null>(null);

  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);

  const loadMenus = async () => {
    const menuRes = await axios.get('http://localhost:8080/api/menus');
    setMenus(menuRes.data);
  };

  const onLogin = async (values: { username: string; password: string }) => {
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
    const nextToken = loginRes.data.token;
    axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    setToken(nextToken);
    await loadMenus();
  };

  const loadScreenForMenu = async (item: MenuItem) => {
    if (!item.screenId) {
      throw new Error('screenId is required');
    }
    const screenRes = await axios.get(`http://localhost:8080/api/screens/${item.screenId}`);
    return {
      components: screenRes.data.components ?? [],
      communications: screenRes.data.communications ?? [],
    };
  };

  const openMenu = async (item: MenuItem) => {
    if (menuTargetType(item) === 'folder') {
      return;
    }

    setActiveMenu(item);
    setComponents([]);
    setCommunications([]);
    setInputValues({});
    setGridRows({});
    try {
      const screen = await loadScreenForMenu(item);

      if (item.openMode === 'popup') {
        setActiveMenu(null);
        setPopupScreen({
          menu: item,
          components: screen.components,
          communications: screen.communications,
          inputValues: {},
          gridRows: {},
        });
        return;
      }

      setComponents(screen.components);
      setCommunications(screen.communications);
    } catch {
      message.error(`Could not open ${item.name}`);
    }
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
            <Button onClick={loadMenus}>Refresh menus</Button>
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
            footer={null}
            destroyOnClose
            onCancel={() => setPopupScreen(null)}
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
