import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Alert, Button, Checkbox, DatePicker, Divider, Form, Input, InputNumber, Layout, Modal, Select, Space, Switch, Tree, Typography, message, } from 'antd';
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
function effectiveLayout(c) {
    const d = defaultSize(c.type);
    return {
        x: c.layout?.x ?? 0,
        y: c.layout?.y ?? 0,
        w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
        h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
    };
}
function personalizationKey(screenId) {
    return `web-screen-builder:layout:${screenId}`;
}
function applyPersonalizedLayouts(screenId, components) {
    try {
        const raw = window.localStorage.getItem(personalizationKey(screenId));
        if (!raw)
            return components;
        const layouts = JSON.parse(raw);
        return components.map((component) => layouts[component.id]
            ? {
                ...component,
                layout: {
                    ...component.layout,
                    ...layouts[component.id],
                },
            }
            : component);
    }
    catch {
        return components;
    }
}
function savePersonalizedLayouts(screenId, components) {
    const layouts = Object.fromEntries(components.map((component) => {
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
    }));
    window.localStorage.setItem(personalizationKey(screenId), JSON.stringify(layouts));
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
function getChartData(props) {
    const raw = Array.isArray(props?.data) ? props.data : [];
    return raw
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
        label: String(item.label ?? ''),
        value: Number(item.value ?? 0),
    }))
        .filter((item) => item.label && Number.isFinite(item.value));
}
const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
function ChartPanel({ title, children, }) {
    return (_jsxs("div", { style: {
            width: '100%',
            height: '100%',
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            boxSizing: 'border-box',
            overflow: 'hidden',
        }, children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', fontSize: 12, marginBottom: 6 }, children: title }), children] }));
}
function ChartRenderer({ type, props }) {
    const data = getChartData(props);
    const max = Math.max(1, ...data.map((item) => item.value));
    const title = String(props?.title ?? type);
    if (type === 'Card') {
        return (_jsxs("div", { style: {
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
            }, children: [_jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: String(props?.title ?? 'Metric') }), _jsx(Typography.Title, { level: 3, style: { margin: '4px 0' }, children: String(props?.value ?? '0') }), _jsx(Typography.Text, { style: { fontSize: 12 }, children: String(props?.description ?? '') })] }));
    }
    if (type === 'BarChart') {
        return (_jsx(ChartPanel, { title: title, children: _jsx("div", { style: { display: 'flex', alignItems: 'end', gap: 8, height: 'calc(100% - 22px)' }, children: data.map((item, index) => (_jsxs("div", { style: { flex: 1, minWidth: 0, textAlign: 'center' }, children: [_jsx("div", { style: {
                                height: `${Math.max(8, (item.value / max) * 120)}px`,
                                background: CHART_COLORS[index % CHART_COLORS.length],
                                borderRadius: 4,
                            } }), _jsx(Typography.Text, { style: { fontSize: 10 }, children: item.label })] }, item.label))) }) }));
    }
    if (type === 'LineChart') {
        const points = data.map((item, index) => {
            const x = data.length <= 1 ? 20 : 20 + (index / (data.length - 1)) * 260;
            const y = 130 - (item.value / max) * 110;
            return `${x},${y}`;
        });
        return (_jsx(ChartPanel, { title: title, children: _jsxs("svg", { viewBox: "0 0 300 150", style: { width: '100%', height: 'calc(100% - 22px)' }, children: [_jsx("polyline", { points: points.join(' '), fill: "none", stroke: "#1677ff", strokeWidth: "4" }), points.map((point, index) => {
                        const [x, y] = point.split(',').map(Number);
                        return _jsx("circle", { cx: x, cy: y, r: "4", fill: "#1677ff" }, data[index].label);
                    })] }) }));
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
        return (_jsx(ChartPanel, { title: title, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, height: 'calc(100% - 22px)' }, children: [_jsx("div", { style: {
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: `conic-gradient(${segments.join(', ')})`,
                        } }), _jsx(Space, { direction: "vertical", size: 2, children: data.map((item, index) => (_jsxs(Typography.Text, { style: { fontSize: 11 }, children: [_jsx("span", { style: { color: CHART_COLORS[index % CHART_COLORS.length] }, children: "\u25A0" }), " ", item.label] }, item.label))) })] }) }));
    }
    if (type === 'DataMap') {
        return (_jsx(ChartPanel, { title: title, children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }, children: data.map((item) => {
                    const lightness = 92 - Math.round((item.value / max) * 42);
                    return (_jsx("div", { style: {
                            minHeight: 34,
                            padding: 4,
                            borderRadius: 4,
                            background: `hsl(211, 100%, ${lightness}%)`,
                            fontSize: 11,
                        }, children: item.label }, item.label));
                }) }) }));
    }
    return null;
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
function DynamicRenderer({ components, inputValues, gridRows, runtimeEditable = false, onInputChange, onAction, onComponentMove, }) {
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const placed = components.map((c, index) => {
        const hasLayout = c.layout && typeof c.layout.x === 'number' && typeof c.layout.y === 'number';
        const pos = hasLayout ? { x: c.layout.x, y: c.layout.y } : getStackPosition(index);
        const L = effectiveLayout(c);
        const z = c.zIndex ?? index + 1;
        const bottom = pos.y + L.h;
        return { c, pos, z, bottom, L };
    });
    const canvasHeight = Math.max(320, ...placed.map((p) => p.bottom), 12 + components.length * 80);
    const startMove = (event, component) => {
        if (!runtimeEditable || !onComponentMove)
            return;
        const L = effectiveLayout(component);
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        dragRef.current = {
            id: component.id,
            offsetX: event.clientX - rect.left - L.x,
            offsetY: event.clientY - rect.top - L.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };
    const moveComponent = (event) => {
        const drag = dragRef.current;
        const canvas = canvasRef.current;
        if (!drag || !canvas || !onComponentMove)
            return;
        const rect = canvas.getBoundingClientRect();
        onComponentMove(drag.id, Math.max(0, Math.round(event.clientX - rect.left - drag.offsetX)), Math.max(0, Math.round(event.clientY - rect.top - drag.offsetY)));
    };
    const stopMove = (event) => {
        if (dragRef.current) {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };
    return (_jsx("div", { ref: canvasRef, style: {
            position: 'relative',
            minHeight: canvasHeight,
            width: '100%',
            backgroundSize: runtimeEditable ? '16px 16px' : undefined,
            backgroundImage: runtimeEditable
                ? 'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)'
                : undefined,
        }, children: placed.map(({ c, pos, z, L }) => {
            const common = {
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                zIndex: z,
                width: L.w,
                height: L.h,
                boxSizing: 'border-box',
            };
            const wrap = (children) => (_jsxs("div", { style: common, children: [runtimeEditable && (_jsx("button", { type: "button", onPointerDown: (event) => startMove(event, c), onPointerMove: moveComponent, onPointerUp: stopMove, onPointerCancel: stopMove, style: {
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
                        }, children: "Move" })), children] }, c.id));
            if (c.type === 'Text') {
                return wrap(_jsx(Typography.Text, { style: {
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        height: '100%',
                        fontWeight: 600,
                    }, children: c.props?.text ?? 'Label' }));
            }
            if (c.type === 'Input') {
                return wrap(_jsx(Input, { placeholder: c.props?.placeholder, value: String(inputValues[c.id] ?? ''), onChange: (e) => onInputChange(c.id, e.target.value), style: { width: '100%', height: '100%', boxSizing: 'border-box' } }));
            }
            if (c.type === 'TextArea') {
                return wrap(_jsx(Input.TextArea, { placeholder: c.props?.placeholder, value: String(inputValues[c.id] ?? ''), onChange: (e) => onInputChange(c.id, e.target.value), style: { width: '100%', height: '100%', resize: 'none', boxSizing: 'border-box' } }));
            }
            if (c.type === 'NumberInput') {
                return wrap(_jsx(InputNumber, { placeholder: c.props?.placeholder, min: typeof c.props?.min === 'number' ? c.props.min : undefined, max: typeof c.props?.max === 'number' ? c.props.max : undefined, value: inputValues[c.id] ?? null, onChange: (value) => onInputChange(c.id, value), style: { width: '100%', height: '100%' } }));
            }
            if (c.type === 'Select') {
                return wrap(_jsx(Select, { placeholder: c.props?.placeholder, options: getSelectOptions(c.props), value: inputValues[c.id] || undefined, onChange: (value) => onInputChange(c.id, value), style: { width: '100%', height: '100%' } }));
            }
            if (c.type === 'Checkbox') {
                return wrap(_jsx(Checkbox, { checked: Boolean(inputValues[c.id] ?? c.props?.checked), onChange: (e) => onInputChange(c.id, e.target.checked), children: c.props?.label ?? 'Checkbox' }));
            }
            if (c.type === 'Switch') {
                return wrap(_jsxs(Space, { size: 8, children: [_jsx(Switch, { checked: Boolean(inputValues[c.id] ?? c.props?.checked), onChange: (checked) => onInputChange(c.id, checked) }), _jsx(Typography.Text, { children: c.props?.label ?? 'Enabled' })] }));
            }
            if (c.type === 'DatePicker') {
                return wrap(_jsx(DatePicker, { placeholder: c.props?.placeholder, onChange: (_, dateString) => onInputChange(c.id, Array.isArray(dateString) ? dateString[0] ?? '' : dateString), style: { width: '100%', height: '100%' } }));
            }
            if (c.type === 'Button') {
                return wrap(_jsx(Button, { type: "primary", onClick: () => onAction(c.id), style: { width: '100%', height: '100%' }, children: c.props?.text ?? 'Button' }));
            }
            if (c.type === 'Divider') {
                return wrap(_jsx(Divider, { style: { margin: 0 }, children: c.props?.text ?? '' }));
            }
            if (c.type === 'Alert') {
                return wrap(_jsx(Alert, { type: c.props?.alertType ?? 'info', message: c.props?.message ?? 'Information', description: c.props?.description, showIcon: true, style: { height: '100%', overflow: 'hidden' } }));
            }
            if (c.type === 'AgGrid') {
                return wrap(_jsx("div", { className: "ag-theme-quartz", style: { width: '100%', height: '100%' }, children: _jsx(AgGridReact, { rowData: gridRows[c.id] ?? [], columnDefs: getGridColumnDefs(c.props), defaultColDef: {
                            flex: 1,
                            minWidth: 80,
                            resizable: true,
                        }, onGridReady: (event) => event.api.sizeColumnsToFit(), onGridSizeChanged: (event) => event.api.sizeColumnsToFit() }) }));
            }
            if (c.type === 'BarChart' ||
                c.type === 'LineChart' ||
                c.type === 'PieChart' ||
                c.type === 'DataMap' ||
                c.type === 'Card') {
                return wrap(_jsx(ChartRenderer, { type: c.type, props: c.props }));
            }
            return null;
        }) }));
}
function App() {
    const [token, setToken] = useState('');
    const [menus, setMenus] = useState([]);
    const [components, setComponents] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [gridRows, setGridRows] = useState({});
    const [activeMenu, setActiveMenu] = useState(null);
    const [activeRuntimeEditable, setActiveRuntimeEditable] = useState(false);
    const [layoutEditMode, setLayoutEditMode] = useState(false);
    const [popupScreen, setPopupScreen] = useState(null);
    const [popupLayoutEditMode, setPopupLayoutEditMode] = useState(false);
    const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);
    const loadMenus = async () => {
        const menuRes = await axios.get('http://localhost:8080/api/menus');
        setMenus(menuRes.data);
        return menuRes.data;
    };
    const onLogin = async (values) => {
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
        const nextToken = loginRes.data.token;
        axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
        setToken(nextToken);
        const [nextMenus, screenRes] = await Promise.all([
            loadMenus(),
            axios.get('http://localhost:8080/api/screens'),
        ]);
        const initialScreen = screenRes.data.find((screen) => Boolean(screen.isInitialScreen));
        const initialMenu = initialScreen
            ? nextMenus.find((menu) => menu.screenId === initialScreen.screenId)
            : undefined;
        if (initialMenu) {
            await openMenu(initialMenu);
        }
    };
    const loadScreenForMenu = async (item) => {
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
    const openMenu = async (item) => {
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
        }
        catch {
            message.error(`Could not open ${item.name}`);
        }
    };
    const moveInlineComponent = (componentId, x, y) => {
        setComponents((prev) => prev.map((component) => component.id === componentId
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
            : component));
    };
    const saveInlineLayout = () => {
        if (!activeMenu?.screenId)
            return;
        savePersonalizedLayouts(activeMenu.screenId, components);
        setLayoutEditMode(false);
        message.success('Saved your layout');
    };
    const resetInlineLayout = async () => {
        if (!activeMenu?.screenId)
            return;
        window.localStorage.removeItem(personalizationKey(activeMenu.screenId));
        await openMenu(activeMenu);
        setLayoutEditMode(false);
        message.success('Reset your layout');
    };
    const executeAction = async (triggerComponentId, actionCommunications = communications, actionInputValues = inputValues, updateGridRows = setGridRows) => {
        const action = actionCommunications.find((comm) => comm.triggerComponentId === triggerComponentId);
        if (!action) {
            message.warning('No communication action is connected to this button.');
            return;
        }
        const input = Object.fromEntries(action.inputBindings.map((binding) => [
            binding.field,
            actionInputValues[binding.componentId] ?? '',
        ]));
        try {
            const res = await axios.post(`http://localhost:8080/api/communications/${action.formatId || action.id}/execute`, input);
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
                                        }, children: "W" }), _jsxs("div", { children: [_jsx(Typography.Title, { level: 5, style: { margin: 0, lineHeight: 1.1 }, children: "Web Screen Runtime" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: activeMenu?.name ?? 'Select a menu' })] })] }), _jsxs(Space, { size: 8, children: [activeMenu && activeRuntimeEditable && (_jsx(_Fragment, { children: layoutEditMode ? (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => setLayoutEditMode(false), children: "Cancel edit" }), _jsx(Button, { onClick: resetInlineLayout, children: "Reset layout" }), _jsx(Button, { type: "primary", onClick: saveInlineLayout, children: "Save layout" })] })) : (_jsx(Button, { type: "primary", onClick: () => setLayoutEditMode(true), children: "Edit layout" })) })), _jsx(Button, { onClick: loadMenus, children: "Refresh menus" })] })] }), _jsxs(Layout, { children: [_jsxs(Sider, { width: 300, theme: "light", style: {
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
                                    }, children: activeMenu ? (_jsx(DynamicRenderer, { components: components, inputValues: inputValues, gridRows: gridRows, runtimeEditable: activeRuntimeEditable && layoutEditMode, onComponentMove: moveInlineComponent, onInputChange: (componentId, value) => setInputValues((prev) => ({ ...prev, [componentId]: value })), onAction: executeAction })) : (_jsx("div", { style: {
                                            minHeight: 360,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px dashed #cfd7e3',
                                            borderRadius: 8,
                                            background: '#fbfcfe',
                                        }, children: _jsx(Typography.Text, { type: "secondary", children: "Choose a menu from the left." }) })) }) })] }), _jsx(Modal, { open: !!popupScreen, title: popupScreen?.menu.name, width: 980, footer: popupScreen?.allowRuntimePersonalization ? (_jsx(Space, { children: popupLayoutEditMode ? (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => setPopupLayoutEditMode(false), children: "Cancel edit" }), _jsx(Button, { onClick: async () => {
                                            if (!popupScreen?.menu.screenId)
                                                return;
                                            window.localStorage.removeItem(personalizationKey(popupScreen.menu.screenId));
                                            const screen = await loadScreenForMenu(popupScreen.menu);
                                            setPopupScreen((prev) => prev
                                                ? {
                                                    ...prev,
                                                    components: screen.components,
                                                    communications: screen.communications,
                                                    allowRuntimePersonalization: screen.allowRuntimePersonalization,
                                                }
                                                : prev);
                                            setPopupLayoutEditMode(false);
                                            message.success('Reset your layout');
                                        }, children: "Reset layout" }), _jsx(Button, { type: "primary", onClick: () => {
                                            if (!popupScreen?.menu.screenId)
                                                return;
                                            savePersonalizedLayouts(popupScreen.menu.screenId, popupScreen.components);
                                            setPopupLayoutEditMode(false);
                                            message.success('Saved your layout');
                                        }, children: "Save layout" })] })) : (_jsx(Button, { type: "primary", onClick: () => setPopupLayoutEditMode(true), children: "Edit layout" })) })) : null, destroyOnClose: true, onCancel: () => {
                            setPopupLayoutEditMode(false);
                            setPopupScreen(null);
                        }, children: popupScreen && (_jsx("div", { style: {
                                minHeight: 480,
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 20,
                                background: '#fbfcfe',
                            }, children: _jsx(DynamicRenderer, { components: popupScreen.components, inputValues: popupScreen.inputValues, gridRows: popupScreen.gridRows, runtimeEditable: popupScreen.allowRuntimePersonalization && popupLayoutEditMode, onComponentMove: (componentId, x, y) => setPopupScreen((prev) => prev
                                    ? {
                                        ...prev,
                                        components: prev.components.map((component) => component.id === componentId
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
                                            : component),
                                    }
                                    : prev), onInputChange: (componentId, value) => setPopupScreen((prev) => prev
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
