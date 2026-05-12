import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Layout, List, Typography } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

type ScreenComponent = {
  id: string;
  type: 'Input' | 'Button' | 'AgGrid';
  layout?: { x: number; y: number; width?: number; height?: number };
  zIndex?: number;
  props?: any;
};

function defaultSize(type: ScreenComponent['type']): { w: number; h: number } {
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

function DynamicRenderer({ components }: { components: ScreenComponent[] }) {
  const placed = components.map((c, index) => {
    const hasLayout =
      c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
    const pos = hasLayout ? { x: c.layout!.x, y: c.layout!.y } : getStackPosition(index);
    const L = effectiveLayout(c);
    const z = c.zIndex ?? (index + 1);
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
        if (c.type === 'Input') {
          return (
            <div key={c.id} style={common}>
              <Input
                placeholder={c.props?.placeholder}
                style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
              />
            </div>
          );
        }
        if (c.type === 'Button') {
          return (
            <div key={c.id} style={common}>
              <Button type="primary" style={{ width: '100%', height: '100%' }}>
                {c.props?.text ?? 'Button'}
              </Button>
            </div>
          );
        }
        if (c.type === 'AgGrid') {
          return (
            <div key={c.id} style={{ ...common }} className="ag-theme-quartz">
              <AgGridReact rowData={c.props?.rowData ?? []} columnDefs={c.props?.columnDefs ?? []} />
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
  const [menus, setMenus] = useState<Array<{ id: string; name: string; screenId: string }>>([]);
  const [components, setComponents] = useState<ScreenComponent[]>([]);

  const onLogin = async (values: { username: string; password: string }) => {
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
    setToken(loginRes.data.token);

    const menuRes = await axios.get('http://localhost:8080/api/menus');
    setMenus(menuRes.data);
  };

  const onClickMenu = async (screenId: string) => {
    const screenRes = await axios.get(`http://localhost:8080/api/screens/${screenId}`);
    setComponents(screenRes.data.components ?? []);
  };

  return (
    <Layout style={{ padding: 24 }}>
      <Typography.Title level={3}>MVP Runtime</Typography.Title>
      <Typography.Paragraph>
        Login → Menu → Screen Metadata Load → Dynamic Renderer
      </Typography.Paragraph>

      {!token && (
        <Form layout="inline" onFinish={onLogin}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="password" />
          </Form.Item>
          <Button htmlType="submit" type="primary">Login</Button>
        </Form>
      )}

      {!!token && (
        <>
          <List
            header="Menu"
            bordered
            dataSource={menus}
            renderItem={(item) => (
              <List.Item onClick={() => onClickMenu(item.screenId)} style={{ cursor: 'pointer' }}>
                {item.name}
              </List.Item>
            )}
          />
          <div style={{ marginTop: 16 }}>
            <DynamicRenderer components={components} />
          </div>
        </>
      )}
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
