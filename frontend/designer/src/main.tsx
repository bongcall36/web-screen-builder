import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Layout,
  Space,
  Tabs,
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

function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

function defaultSize(type: ScreenComponentType): { w: number; h: number } {
  switch (type) {
    case 'Input':
      return { w: 256, h: 40 };
    case 'Button':
      return { w: 120, h: 40 };
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
      return { w: 72, h: 32 };
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
    props: { text: 'Search' },
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

const COMPONENT_DRAG_MIME = 'application/x-wsb-component';

function defaultPropsFor(type: ScreenComponentType): Record<string, unknown> {
  switch (type) {
    case 'Input':
      return { placeholder: 'Placeholder' };
    case 'Button':
      return { text: 'Button' };
    case 'AgGrid':
      return {
        columnDefs: [{ field: 'id' }, { field: 'name' }],
        rowData: [],
      };
    default:
      return {};
  }
}

function newId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function CanvasPreview({ item }: { item: ScreenComponent }) {
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
      <Button type="primary" style={{ width: '100%', height: '100%' }}>
        {(item.props?.text as string) ?? 'Button'}
      </Button>
    );
  }
  if (item.type === 'AgGrid') {
    const cols = (item.props?.columnDefs as { field?: string }[]) ?? [];
    return (
      <div
        style={{
          border: '1px dashed #91caff',
          borderRadius: 8,
          padding: 12,
          background: '#e6f4ff',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <Typography.Text strong>AgGrid</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
          Columns: {cols.map((col) => col.field ?? '?').join(', ') || '(none)'}
        </Typography.Paragraph>
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

function App() {
  const [form] = Form.useForm();
  const [components, setComponents] = useState<ScreenComponent[]>(DEFAULT_COMPONENTS);
  const [jsonTab, setJsonTab] = useState<string>('visual');
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify({ components: DEFAULT_COMPONENTS }, null, 2),
  );

  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const resizeInfoRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const serialized = useMemo(() => JSON.stringify({ components }, null, 2), [components]);

  const syncJsonDraftFromComponents = useCallback(() => {
    setJsonDraft(JSON.stringify({ components }, null, 2));
  }, [components]);

  const bumpZ = useCallback((id: string) => {
    setComponents((prev) => {
      const z = prev.reduce((m, c) => Math.max(m, c.zIndex ?? 1), 0) + 1;
      return prev.map((c) => (c.id === id ? { ...c, zIndex: z } : c));
    });
  }, []);

  const onDragStartToolbox = (e: React.DragEvent, type: ScreenComponentType) => {
    e.dataTransfer.setData(COMPONENT_DRAG_MIME, type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const acceptDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(COMPONENT_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const dropNewFromToolbox = (e: React.DragEvent) => {
    const inner = canvasInnerRef.current;
    if (!inner) return;
    const raw = e.dataTransfer.getData(COMPONENT_DRAG_MIME) as ScreenComponentType | '';
    if (raw !== 'Input' && raw !== 'Button' && raw !== 'AgGrid') return;
    e.preventDefault();
    e.stopPropagation();
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
  };

  const onItemPointerDown = (e: React.PointerEvent, c: ScreenComponent) => {
    if ((e.target as HTMLElement).closest('[data-delete-btn],[data-resize-handle]')) return;
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
      const parsed = JSON.parse(jsonDraft) as { components?: ScreenComponent[] };
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
      message.success('JSON applied to canvas');
      setJsonTab('visual');
    } catch {
      message.error('Invalid JSON');
    }
  };

  const save = async () => {
    try {
      const { screenId, name } = await form.validateFields(['screenId', 'name']);
      const json = JSON.stringify({ components });
      await axios.post('http://localhost:8080/api/screens', { screenId, name, json });
      message.success('Saved metadata');
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        message.error('Save failed (is the backend running on port 8080?)');
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
            initialValues={{ screenId: 'sample-screen', name: 'Sample Screen' }}
            style={{ maxWidth: 720, marginBottom: 16 }}
          >
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
              <Form.Item label=" " style={{ marginBottom: 0 }}>
                <Button type="primary" onClick={save}>
                  Save metadata
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Tabs
            activeKey={jsonTab}
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
                      padding: 16,
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
                                  <CanvasPreview item={c} />
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
      </Layout>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
