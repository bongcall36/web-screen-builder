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
  props?: any;
};

function DynamicRenderer({ components }: { components: ScreenComponent[] }) {
  return (
    <>
      {components.map((c) => {
        if (c.type === 'Input') {
          return <Input key={c.id} placeholder={c.props?.placeholder} style={{ marginBottom: 8 }} />;
        }
        if (c.type === 'Button') {
          return <Button key={c.id} type="primary" style={{ marginRight: 8 }}>{c.props?.text ?? 'Button'}</Button>;
        }
        if (c.type === 'AgGrid') {
          return (
            <div key={c.id} className="ag-theme-quartz" style={{ height: 240, marginTop: 12 }}>
              <AgGridReact rowData={c.props?.rowData ?? []} columnDefs={c.props?.columnDefs ?? []} />
            </div>
          );
        }
        return null;
      })}
    </>
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
