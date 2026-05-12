import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Layout, List, Typography } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
function getStackPosition(index) {
    return { x: 12, y: 12 + index * 80 };
}
function DynamicRenderer({ components }) {
    const placed = components.map((c, index) => {
        const hasLayout = c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
        const pos = hasLayout ? { x: c.layout.x, y: c.layout.y } : getStackPosition(index);
        const z = c.zIndex ?? (index + 1);
        const bottom = pos.y + (c.type === 'AgGrid' ? 260 : c.type === 'Input' ? 44 : 44);
        return { c, pos, z, bottom };
    });
    const canvasHeight = Math.max(320, ...placed.map((p) => p.bottom), 12 + components.length * 80);
    return (_jsx("div", { style: { position: 'relative', minHeight: canvasHeight, width: '100%' }, children: placed.map(({ c, pos, z }) => {
            const common = {
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                zIndex: z,
            };
            if (c.type === 'Input') {
                return (_jsx("div", { style: common, children: _jsx(Input, { placeholder: c.props?.placeholder, style: { width: 280 } }) }, c.id));
            }
            if (c.type === 'Button') {
                return (_jsx("div", { style: common, children: _jsx(Button, { type: "primary", children: c.props?.text ?? 'Button' }) }, c.id));
            }
            if (c.type === 'AgGrid') {
                return (_jsx("div", { style: { ...common, width: 'min(100%, 720px)', height: 240 }, className: "ag-theme-quartz", children: _jsx(AgGridReact, { rowData: c.props?.rowData ?? [], columnDefs: c.props?.columnDefs ?? [] }) }, c.id));
            }
            return null;
        }) }));
}
function App() {
    const [token, setToken] = useState('');
    const [menus, setMenus] = useState([]);
    const [components, setComponents] = useState([]);
    const onLogin = async (values) => {
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
        setToken(loginRes.data.token);
        const menuRes = await axios.get('http://localhost:8080/api/menus');
        setMenus(menuRes.data);
    };
    const onClickMenu = async (screenId) => {
        const screenRes = await axios.get(`http://localhost:8080/api/screens/${screenId}`);
        setComponents(screenRes.data.components ?? []);
    };
    return (_jsxs(Layout, { style: { padding: 24 }, children: [_jsx(Typography.Title, { level: 3, children: "MVP Runtime" }), _jsx(Typography.Paragraph, { children: "Login \u2192 Menu \u2192 Screen Metadata Load \u2192 Dynamic Renderer" }), !token && (_jsxs(Form, { layout: "inline", onFinish: onLogin, children: [_jsx(Form.Item, { name: "username", rules: [{ required: true }], children: _jsx(Input, { placeholder: "username" }) }), _jsx(Form.Item, { name: "password", rules: [{ required: true }], children: _jsx(Input.Password, { placeholder: "password" }) }), _jsx(Button, { htmlType: "submit", type: "primary", children: "Login" })] })), !!token && (_jsxs(_Fragment, { children: [_jsx(List, { header: "Menu", bordered: true, dataSource: menus, renderItem: (item) => (_jsx(List.Item, { onClick: () => onClickMenu(item.screenId), style: { cursor: 'pointer' }, children: item.name })) }), _jsx("div", { style: { marginTop: 16 }, children: _jsx(DynamicRenderer, { components: components }) })] }))] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
