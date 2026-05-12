import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Layout, List, Typography } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
function defaultSize(type) {
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
function effectiveLayout(c) {
    const d = defaultSize(c.type);
    return {
        x: c.layout?.x ?? 0,
        y: c.layout?.y ?? 0,
        w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
        h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
    };
}
function getStackPosition(index) {
    return { x: 12, y: 12 + index * 80 };
}
function getGridColumnDefs(props) {
    const columnDefs = Array.isArray(props?.columnDefs) ? props.columnDefs : [];
    return columnDefs.map((columnDef) => ({
        ...columnDef,
        cellDataType: false,
    }));
}
function DynamicRenderer({ components }) {
    const placed = components.map((c, index) => {
        const hasLayout = c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
        const pos = hasLayout ? { x: c.layout.x, y: c.layout.y } : getStackPosition(index);
        const L = effectiveLayout(c);
        const z = c.zIndex ?? (index + 1);
        const bottom = pos.y + L.h;
        return { c, pos, z, bottom, L };
    });
    const canvasHeight = Math.max(320, ...placed.map((p) => p.bottom), 12 + components.length * 80);
    return (_jsx("div", { style: { position: 'relative', minHeight: canvasHeight, width: '100%' }, children: placed.map(({ c, pos, z, L }) => {
            const common = {
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                zIndex: z,
                width: L.w,
                height: L.h,
                boxSizing: 'border-box',
            };
            if (c.type === 'Input') {
                return (_jsx("div", { style: common, children: _jsx(Input, { placeholder: c.props?.placeholder, style: { width: '100%', height: '100%', boxSizing: 'border-box' } }) }, c.id));
            }
            if (c.type === 'Button') {
                return (_jsx("div", { style: common, children: _jsx(Button, { type: "primary", style: { width: '100%', height: '100%' }, children: c.props?.text ?? 'Button' }) }, c.id));
            }
            if (c.type === 'AgGrid') {
                return (_jsx("div", { style: { ...common }, className: "ag-theme-quartz", children: _jsx(AgGridReact, { rowData: c.props?.rowData ?? [], columnDefs: getGridColumnDefs(c.props) }) }, c.id));
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
