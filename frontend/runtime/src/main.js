import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Button, Checkbox, DatePicker, Form, Input, Layout, Modal, Select, Space, Tree, Typography, message, } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
const { Header, Content, Sider } = Layout;
function defaultSize(type) {
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
function getSelectOptions(props) {
    const raw = Array.isArray(props?.options) ? props.options : [];
    return raw
        .filter((option) => typeof option === 'object' && option !== null)
        .map((option) => ({
        label: String(option.label ?? option.value ?? ''),
        value: String(option.value ?? option.label ?? ''),
    }))
        .filter((option) => option.value);
}
function getGridColumnDefs(props) {
    const columnDefs = Array.isArray(props?.columnDefs) ? props.columnDefs : [];
    return columnDefs.map((columnDef) => {
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
function getGridDataType(value) {
    return value === 'number' || value === 'boolean' || value === 'date' ? value : 'string';
}
function toAgGridCellDataType(dataType) {
    if (dataType === 'string')
        return 'text';
    if (dataType === 'date')
        return 'dateString';
    return dataType;
}
function toAgGridFilter(dataType) {
    if (dataType === 'number')
        return 'agNumberColumnFilter';
    if (dataType === 'date')
        return 'agDateColumnFilter';
    return 'agTextColumnFilter';
}
function menuTargetType(menu) {
    return menu.targetType === 'folder' ? 'folder' : 'screen';
}
function menuParentId(menu, menuIds) {
    return menu.parentId && menuIds.has(menu.parentId) ? menu.parentId : '';
}
function buildMenuTree(menus) {
    const ids = new Set(menus.map((menu) => menu.id));
    const childrenByParent = new Map();
    menus.forEach((menu) => {
        const parentId = menuParentId(menu, ids);
        const children = childrenByParent.get(parentId) ?? [];
        children.push(menu);
        childrenByParent.set(parentId, children);
    });
    const makeNodes = (parentId) => (childrenByParent.get(parentId) ?? [])
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
function DynamicRenderer({ components, inputValues, gridRows, onInputChange, onAction, }) {
    const placed = components.map((c, index) => {
        const hasLayout = c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
        const pos = hasLayout ? { x: c.layout.x, y: c.layout.y } : getStackPosition(index);
        const L = effectiveLayout(c);
        const z = c.zIndex ?? index + 1;
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
            if (c.type === 'Text') {
                return (_jsx("div", { style: common, children: _jsx(Typography.Text, { style: {
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%',
                            fontWeight: 600,
                        }, children: c.props?.text ?? 'Label' }) }, c.id));
            }
            if (c.type === 'Input') {
                return (_jsx("div", { style: common, children: _jsx(Input, { placeholder: c.props?.placeholder, value: String(inputValues[c.id] ?? ''), onChange: (e) => onInputChange(c.id, e.target.value), style: { width: '100%', height: '100%', boxSizing: 'border-box' } }) }, c.id));
            }
            if (c.type === 'Select') {
                return (_jsx("div", { style: common, children: _jsx(Select, { placeholder: c.props?.placeholder, options: getSelectOptions(c.props), value: inputValues[c.id] || undefined, onChange: (value) => onInputChange(c.id, value), style: { width: '100%', height: '100%' } }) }, c.id));
            }
            if (c.type === 'Checkbox') {
                return (_jsx("div", { style: common, children: _jsx(Checkbox, { checked: Boolean(inputValues[c.id] ?? c.props?.checked), onChange: (e) => onInputChange(c.id, e.target.checked), children: c.props?.label ?? 'Checkbox' }) }, c.id));
            }
            if (c.type === 'DatePicker') {
                return (_jsx("div", { style: common, children: _jsx(DatePicker, { placeholder: c.props?.placeholder, onChange: (_, dateString) => onInputChange(c.id, Array.isArray(dateString) ? dateString[0] ?? '' : dateString), style: { width: '100%', height: '100%' } }) }, c.id));
            }
            if (c.type === 'Button') {
                return (_jsx("div", { style: common, children: _jsx(Button, { type: "primary", onClick: () => onAction(c.id), style: { width: '100%', height: '100%' }, children: c.props?.text ?? 'Button' }) }, c.id));
            }
            if (c.type === 'AgGrid') {
                return (_jsx("div", { style: common, className: "ag-theme-quartz", children: _jsx(AgGridReact, { rowData: gridRows[c.id] ?? c.props?.rowData ?? [], columnDefs: getGridColumnDefs(c.props), defaultColDef: {
                            flex: 1,
                            minWidth: 80,
                            resizable: true,
                        }, onGridReady: (event) => event.api.sizeColumnsToFit(), onGridSizeChanged: (event) => event.api.sizeColumnsToFit() }) }, c.id));
            }
            return null;
        }) }));
}
function App() {
    const [token, setToken] = useState('');
    const [menus, setMenus] = useState([]);
    const [components, setComponents] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [communicationFormats, setCommunicationFormats] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [gridRows, setGridRows] = useState({});
    const [activeMenu, setActiveMenu] = useState(null);
    const [popupScreen, setPopupScreen] = useState(null);
    const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);
    const loadMenus = async () => {
        const menuRes = await axios.get('http://localhost:8080/api/menus');
        setMenus(menuRes.data);
    };
    const loadCommunicationFormats = async () => {
        const formatRes = await axios.get('http://localhost:8080/api/communications/formats');
        setCommunicationFormats(formatRes.data);
    };
    const onLogin = async (values) => {
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
        const nextToken = loginRes.data.token;
        axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
        setToken(nextToken);
        await Promise.all([loadMenus(), loadCommunicationFormats()]);
    };
    const loadScreenForMenu = async (item) => {
        if (!item.screenId) {
            throw new Error('screenId is required');
        }
        const screenRes = await axios.get(`http://localhost:8080/api/screens/${item.screenId}`);
        return {
            components: screenRes.data.components ?? [],
            communications: screenRes.data.communications ?? [],
        };
    };
    const openMenu = async (item) => {
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
        }
        catch {
            message.error(`Could not open ${item.name}`);
        }
    };
    const executeAction = async (triggerComponentId, actionCommunications = communications, actionInputValues = inputValues, updateGridRows = setGridRows) => {
        const action = actionCommunications.find((comm) => comm.triggerComponentId === triggerComponentId);
        if (!action) {
            message.warning('No communication action is connected to this button.');
            return;
        }
        const format = communicationFormats.find((item) => item.id === (action.formatId || action.id));
        const input = Object.fromEntries(action.inputBindings.map((binding) => [
            binding.field,
            actionInputValues[binding.componentId] ?? '',
        ]));
        try {
            const res = await axios.post(`http://localhost:8080/api/communications/${action.formatId || action.id}/execute`, {
                input,
                sampleRows: format?.sampleRows ?? action.sampleRows ?? [],
            });
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
        }
        catch {
            message.error(`${action.name || action.id} failed`);
        }
    };
    return (_jsxs(Layout, { style: { minHeight: '100vh', background: '#f4f6f8' }, children: [!token && (_jsx(Content, { style: {
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    background: '#f4f6f8',
                }, children: _jsxs("div", { style: {
                        width: 420,
                        padding: 28,
                        border: '1px solid #d9dee7',
                        borderRadius: 10,
                        background: '#ffffff',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                    }, children: [_jsxs(Space, { size: 12, style: { marginBottom: 24 }, children: [_jsx("div", { style: {
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: '#1677ff',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                    }, children: "W" }), _jsxs("div", { children: [_jsx(Typography.Title, { level: 4, style: { margin: 0 }, children: "Web Screen Runtime" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: "Sign in to open published screens" })] })] }), _jsxs(Form, { layout: "vertical", onFinish: onLogin, children: [_jsx(Form.Item, { name: "username", rules: [{ required: true }], children: _jsx(Input, { placeholder: "username" }) }), _jsx(Form.Item, { name: "password", rules: [{ required: true }], children: _jsx(Input.Password, { placeholder: "password" }) }), _jsx(Button, { htmlType: "submit", type: "primary", block: true, children: "Login" })] })] }) })), !!token && (_jsxs(Layout, { style: { minHeight: '100vh', background: '#f4f6f8' }, children: [_jsxs(Header, { style: {
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
                        }, children: [_jsxs(Space, { size: 12, children: [_jsx("div", { style: {
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            background: '#1677ff',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                        }, children: "W" }), _jsxs("div", { children: [_jsx(Typography.Title, { level: 5, style: { margin: 0, lineHeight: 1.1 }, children: "Web Screen Runtime" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: activeMenu?.name ?? 'Select a menu' })] })] }), _jsx(Button, { onClick: loadMenus, children: "Refresh menus" })] }), _jsxs(Layout, { children: [_jsxs(Sider, { width: 300, theme: "light", style: {
                                    borderRight: '1px solid #d9dee7',
                                    background: '#ffffff',
                                    padding: 16,
                                    overflow: 'auto',
                                    height: 'calc(100vh - 56px)',
                                }, children: [_jsx(Typography.Title, { level: 5, style: { marginTop: 0, marginBottom: 10 }, children: "Menu" }), _jsxs("div", { style: {
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 8,
                                            padding: 8,
                                            background: '#fff',
                                        }, children: [_jsx(Tree, { treeData: menuTreeData, blockNode: true, showLine: true, expandedKeys: menus.map((menu) => menu.id), selectedKeys: activeMenu ? [activeMenu.id] : [], onSelect: (keys) => {
                                                    const item = menus.find((menu) => menu.id === String(keys[0] ?? ''));
                                                    if (item) {
                                                        openMenu(item);
                                                    }
                                                } }), menus.length === 0 && (_jsx(Typography.Text, { type: "secondary", children: "No menus" }))] })] }), _jsx(Content, { style: {
                                    background: '#f4f6f8',
                                    padding: 20,
                                    overflow: 'auto',
                                    height: 'calc(100vh - 56px)',
                                    boxSizing: 'border-box',
                                }, children: _jsx("div", { style: {
                                        minHeight: '100%',
                                        background: '#fff',
                                        border: '1px solid #d9dee7',
                                        borderRadius: 10,
                                        padding: 24,
                                        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                                    }, children: activeMenu ? (_jsx(DynamicRenderer, { components: components, inputValues: inputValues, gridRows: gridRows, onInputChange: (componentId, value) => setInputValues((prev) => ({ ...prev, [componentId]: value })), onAction: executeAction })) : (_jsx("div", { style: {
                                            minHeight: 360,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px dashed #cfd7e3',
                                            borderRadius: 8,
                                            background: '#fbfcfe',
                                        }, children: _jsx(Typography.Text, { type: "secondary", children: "Choose a menu from the left." }) })) }) })] }), _jsx(Modal, { open: !!popupScreen, title: popupScreen?.menu.name, width: 980, footer: null, destroyOnClose: true, onCancel: () => setPopupScreen(null), children: popupScreen && (_jsx("div", { style: {
                                minHeight: 480,
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 20,
                                background: '#fbfcfe',
                            }, children: _jsx(DynamicRenderer, { components: popupScreen.components, inputValues: popupScreen.inputValues, gridRows: popupScreen.gridRows, onInputChange: (componentId, value) => setPopupScreen((prev) => prev
                                    ? {
                                        ...prev,
                                        inputValues: { ...prev.inputValues, [componentId]: value },
                                    }
                                    : prev), onAction: (triggerComponentId) => executeAction(triggerComponentId, popupScreen.communications, popupScreen.inputValues, (updater) => setPopupScreen((prev) => prev
                                    ? {
                                        ...prev,
                                        gridRows: typeof updater === 'function'
                                            ? updater(prev.gridRows)
                                            : updater,
                                    }
                                    : prev)) }) })) })] }))] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
