import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Button, Card, Collapse, Form, Input, Layout, Space, Tabs, Typography, message, } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import axios from 'axios';
const { Header, Content, Sider } = Layout;
/** Pixel grid for move + resize snap */
const GRID = 8;
function snap(n) {
    return Math.round(n / GRID) * GRID;
}
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
function minSize(type) {
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
function effectiveLayout(c) {
    const d = defaultSize(c.type);
    return {
        x: c.layout?.x ?? 0,
        y: c.layout?.y ?? 0,
        w: typeof c.layout?.width === 'number' ? c.layout.width : d.w,
        h: typeof c.layout?.height === 'number' ? c.layout.height : d.h,
    };
}
const DEFAULT_COMPONENTS = [
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
function defaultPropsFor(type) {
    switch (type) {
        case 'Input':
            return { placeholder: 'Placeholder' };
        case 'Button':
            return { text: 'Button' };
        case 'AgGrid':
            return {
                columnDefs: [{ field: 'id' }, { field: 'name' }],
                rowData: [{ id: '', name: '' }],
            };
        default:
            return {};
    }
}
function newId() {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
function getGridColumns(item) {
    const raw = item.props?.columnDefs;
    if (!Array.isArray(raw))
        return [];
    return raw.filter((col) => typeof col === 'object' && col !== null);
}
function getGridRows(item) {
    const raw = item.props?.rowData;
    if (!Array.isArray(raw))
        return [];
    return raw.filter((row) => typeof row === 'object' && row !== null);
}
function getVisibleGridColumns(item) {
    return getGridColumns(item).filter((col) => typeof col.field === 'string' && col.field);
}
function nextGridField(columns) {
    const fields = new Set(columns.map((col) => col.field).filter(Boolean));
    let index = fields.size + 1;
    let field = `column${index}`;
    while (fields.has(field)) {
        index += 1;
        field = `column${index}`;
    }
    return field;
}
function columnDraftKey(componentId, field) {
    return `${componentId}:${field}`;
}
function CanvasPreview({ item, columnNameDrafts, onGridColumnDraftChange, onGridColumnChange, onGridAddColumn, onGridRemoveColumn, onGridCellChange, onGridAddRow, onGridRemoveRow, }) {
    if (item.type === 'Input') {
        return (_jsx(Input, { readOnly: true, placeholder: item.props?.placeholder ?? 'Input', style: { width: '100%', height: '100%', boxSizing: 'border-box' } }));
    }
    if (item.type === 'Button') {
        return (_jsx(Button, { type: "primary", style: { width: '100%', height: '100%' }, children: item.props?.text ?? 'Button' }));
    }
    if (item.type === 'AgGrid') {
        const cols = getVisibleGridColumns(item);
        const rows = getGridRows(item);
        return (_jsxs("div", { "data-grid-editor": true, style: {
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                background: '#fff',
            }, children: [_jsxs(Space, { size: 4, wrap: true, style: { padding: 4, borderBottom: '1px solid #f0f0f0' }, children: [_jsx(Button, { size: "small", onPointerDown: (e) => e.stopPropagation(), onClick: () => onGridAddColumn(item.id), children: "Add column" }), _jsx(Button, { size: "small", type: "link", onPointerDown: (e) => e.stopPropagation(), onClick: () => onGridAddRow(item.id), style: { paddingInline: 4 }, children: "Add row" })] }), _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [cols.map((col) => (_jsx("th", { style: {
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            padding: 4,
                                            textAlign: 'left',
                                        }, children: _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { size: "small", value: columnNameDrafts[columnDraftKey(item.id, col.field ?? '')] ?? col.field, onPointerDown: (e) => e.stopPropagation(), onChange: (e) => onGridColumnDraftChange(item.id, col.field ?? '', e.target.value), onBlur: () => onGridColumnChange(item.id, col.field ?? ''), onPressEnter: (e) => e.currentTarget.blur() }), _jsx(Button, { size: "small", type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove column", onPointerDown: (e) => e.stopPropagation(), onClick: () => onGridRemoveColumn(item.id, col.field ?? '') })] }) }, col.field))), _jsx("th", { style: { borderBottom: '1px solid #f0f0f0', width: 42 } })] }) }), _jsx("tbody", { children: rows.map((row, rowIndex) => (_jsxs("tr", { children: [cols.map((col) => {
                                        const field = col.field ?? '';
                                        return (_jsx("td", { style: { padding: 3, verticalAlign: 'top' }, children: _jsx(Input, { size: "small", value: String(row[field] ?? ''), onPointerDown: (e) => e.stopPropagation(), onChange: (e) => onGridCellChange(item.id, rowIndex, field, e.target.value) }) }, field));
                                    }), _jsx("td", { style: { padding: 3, verticalAlign: 'top' }, children: _jsx(Button, { size: "small", type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove row", onPointerDown: (e) => e.stopPropagation(), onClick: () => onGridRemoveRow(item.id, rowIndex) }) })] }, rowIndex))) })] })] }));
    }
    return null;
}
const TOOLBOX = [
    { type: 'Input', title: 'Input', description: 'Text field' },
    { type: 'Button', title: 'Button', description: 'Primary action' },
    { type: 'AgGrid', title: 'AgGrid', description: 'Data table' },
];
function App() {
    const [form] = Form.useForm();
    const [components, setComponents] = useState(DEFAULT_COMPONENTS);
    const [jsonTab, setJsonTab] = useState('visual');
    const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify({ components: DEFAULT_COMPONENTS }, null, 2));
    const [columnNameDrafts, setColumnNameDrafts] = useState({});
    const canvasInnerRef = useRef(null);
    const dragInfoRef = useRef(null);
    const resizeInfoRef = useRef(null);
    const serialized = useMemo(() => JSON.stringify({ components }, null, 2), [components]);
    const syncJsonDraftFromComponents = useCallback(() => {
        setJsonDraft(JSON.stringify({ components }, null, 2));
    }, [components]);
    const bumpZ = useCallback((id) => {
        setComponents((prev) => {
            const z = prev.reduce((m, c) => Math.max(m, c.zIndex ?? 1), 0) + 1;
            return prev.map((c) => (c.id === id ? { ...c, zIndex: z } : c));
        });
    }, []);
    const onDragStartToolbox = (e, type) => {
        e.dataTransfer.setData(COMPONENT_DRAG_MIME, type);
        e.dataTransfer.effectAllowed = 'copy';
    };
    const acceptDragOver = (e) => {
        if (e.dataTransfer.types.includes(COMPONENT_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };
    const dropNewFromToolbox = (e) => {
        const inner = canvasInnerRef.current;
        if (!inner)
            return;
        const raw = e.dataTransfer.getData(COMPONENT_DRAG_MIME);
        if (raw !== 'Input' && raw !== 'Button' && raw !== 'AgGrid')
            return;
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
    const removeById = (id) => {
        setComponents((prev) => prev.filter((c) => c.id !== id));
    };
    const updateGridColumnDraft = (componentId, field, value) => {
        setColumnNameDrafts((prev) => ({
            ...prev,
            [columnDraftKey(componentId, field)]: value,
        }));
    };
    const updateGridColumn = (componentId, oldField) => {
        const draftKey = columnDraftKey(componentId, oldField);
        const newField = (columnNameDrafts[draftKey] ?? oldField).trim();
        if (!newField) {
            message.error('Column name is required.');
            setColumnNameDrafts((prev) => ({ ...prev, [draftKey]: oldField }));
            return;
        }
        let didCommit = false;
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
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
                    columnDefs: columns.map((col) => col.field === oldField
                        ? {
                            ...col,
                            field: newField,
                        }
                        : col),
                    rowData: getGridRows(c).map((row) => {
                        if (oldField === newField)
                            return row;
                        const nextRow = { ...row, [newField]: row[oldField] ?? '' };
                        delete nextRow[oldField];
                        return nextRow;
                    }),
                },
            };
        }));
        if (didCommit) {
            setColumnNameDrafts((prev) => {
                const next = { ...prev };
                delete next[draftKey];
                return next;
            });
        }
    };
    const addGridColumn = (componentId) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
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
        }));
    };
    const removeGridColumn = (componentId, field) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
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
        }));
    };
    const updateGridCell = (componentId, rowIndex, field, value) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
            const rows = getGridRows(c);
            return {
                ...c,
                props: {
                    ...c.props,
                    rowData: rows.map((row, index) => index === rowIndex
                        ? {
                            ...row,
                            [field]: value,
                        }
                        : row),
                },
            };
        }));
    };
    const addGridRow = (componentId) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
            const cols = getVisibleGridColumns(c);
            const emptyRow = Object.fromEntries(cols.map((col) => [col.field, '']));
            return {
                ...c,
                props: {
                    ...c.props,
                    rowData: [...getGridRows(c), emptyRow],
                },
            };
        }));
    };
    const removeGridRow = (componentId, rowIndex) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
            return {
                ...c,
                props: {
                    ...c.props,
                    rowData: getGridRows(c).filter((_, index) => index !== rowIndex),
                },
            };
        }));
    };
    const onItemPointerDown = (e, c) => {
        if (e.target.closest('[data-delete-btn],[data-resize-handle],[data-grid-editor]'))
            return;
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        dragInfoRef.current = {
            id: c.id,
            offsetX: e.clientX - r.left,
            offsetY: e.clientY - r.top,
        };
        card.setPointerCapture(e.pointerId);
        bumpZ(c.id);
    };
    const onItemPointerMove = (e) => {
        const d = dragInfoRef.current;
        const inner = canvasInnerRef.current;
        if (!d || !inner)
            return;
        const rect = inner.getBoundingClientRect();
        setComponents((prev) => prev.map((x) => {
            if (x.id !== d.id)
                return x;
            const L = effectiveLayout(x);
            const nx = snap(clamp(e.clientX - rect.left - d.offsetX, 0, Math.max(0, rect.width - L.w)));
            const ny = snap(clamp(e.clientY - rect.top - d.offsetY, 0, Math.max(0, rect.height - L.h)));
            return {
                ...x,
                layout: {
                    x: nx,
                    y: ny,
                    width: L.w,
                    height: L.h,
                },
            };
        }));
    };
    const onItemPointerUp = (e) => {
        dragInfoRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        catch {
            /* already released */
        }
    };
    const onResizePointerDown = (e, c) => {
        e.stopPropagation();
        const L = effectiveLayout(c);
        resizeInfoRef.current = {
            id: c.id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startW: L.w,
            startH: L.h,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        bumpZ(c.id);
    };
    const onResizePointerMove = (e) => {
        const r = resizeInfoRef.current;
        const inner = canvasInnerRef.current;
        if (!r || !inner)
            return;
        const rect = inner.getBoundingClientRect();
        setComponents((prev) => {
            const c = prev.find((x) => x.id === r.id);
            if (!c)
                return prev;
            const xy = { x: c.layout?.x ?? 0, y: c.layout?.y ?? 0 };
            const m = minSize(c.type);
            const maxW = Math.max(m.w, rect.width - xy.x);
            const maxH = Math.max(m.h, rect.height - xy.y);
            const nw = snap(clamp(r.startW + (e.clientX - r.startClientX), m.w, maxW));
            const nh = snap(clamp(r.startH + (e.clientY - r.startClientY), m.h, maxH));
            return prev.map((x) => x.id === r.id
                ? {
                    ...x,
                    layout: {
                        x: xy.x,
                        y: xy.y,
                        width: nw,
                        height: nh,
                    },
                }
                : x);
        });
    };
    const onResizePointerUp = (e) => {
        resizeInfoRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        catch {
            /* */
        }
    };
    const applyJsonDraft = () => {
        try {
            const parsed = JSON.parse(jsonDraft);
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
                    if (typeof c.layout !== 'object' ||
                        c.layout === null ||
                        typeof c.layout.x !== 'number' ||
                        typeof c.layout.y !== 'number') {
                        message.error('layout must be { x: number, y: number, ... } when present.');
                        return;
                    }
                    const lay = c.layout;
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
            setComponents(parsed.components);
            setColumnNameDrafts({});
            message.success('JSON applied to canvas');
            setJsonTab('visual');
        }
        catch {
            message.error('Invalid JSON');
        }
    };
    const save = async () => {
        try {
            const { screenId, name } = await form.validateFields(['screenId', 'name']);
            const json = JSON.stringify({ components });
            await axios.post('http://localhost:8080/api/screens', { screenId, name, json });
            message.success('Saved metadata');
        }
        catch (err) {
            console.error(err);
            if (axios.isAxiosError(err)) {
                message.error('Save failed (is the backend running on port 8080?)');
            }
        }
    };
    return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsx(Header, { style: { display: 'flex', alignItems: 'center', paddingInline: 24 }, children: _jsx(Typography.Title, { level: 4, style: { color: '#fff', margin: 0 }, children: "Designer MVP" }) }), _jsxs(Layout, { children: [_jsxs(Sider, { width: 260, theme: "light", style: {
                            borderRight: '1px solid #f0f0f0',
                            padding: 16,
                            overflow: 'auto',
                        }, children: [_jsx(Typography.Title, { level: 5, style: { marginTop: 0 }, children: "Components" }), _jsx(Typography.Paragraph, { type: "secondary", style: { fontSize: 12, marginBottom: 12 }, children: "Drag from here onto the canvas. Drag items to move (8px snap). Use the corner handle to resize." }), _jsx(Space, { direction: "vertical", size: 10, style: { width: '100%' }, children: TOOLBOX.map((t) => (_jsx(Card, { size: "small", hoverable: true, draggable: true, onDragStart: (e) => onDragStartToolbox(e, t.type), styles: { body: { padding: 12 } }, children: _jsxs(Space, { align: "start", children: [_jsx(HolderOutlined, { style: { color: '#8c8c8c', marginTop: 2 } }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, children: t.title }), _jsx("div", { children: _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: t.description }) })] })] }) }, t.type))) })] }), _jsxs(Content, { style: { padding: 24, background: '#fafafa' }, children: [_jsx(Form, { form: form, layout: "vertical", initialValues: { screenId: 'sample-screen', name: 'Sample Screen' }, style: { maxWidth: 720, marginBottom: 16 }, children: _jsxs(Space, { wrap: true, size: "large", style: { width: '100%' }, align: "start", children: [_jsx(Form.Item, { name: "screenId", label: "Screen ID", rules: [{ required: true }], style: { minWidth: 200, marginBottom: 0 }, children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "name", label: "Screen Name", rules: [{ required: true }], style: { minWidth: 240, marginBottom: 0 }, children: _jsx(Input, {}) }), _jsx(Form.Item, { label: " ", style: { marginBottom: 0 }, children: _jsx(Button, { type: "primary", onClick: save, children: "Save metadata" }) })] }) }), _jsx(Tabs, { activeKey: jsonTab, onChange: (k) => {
                                    setJsonTab(k);
                                    if (k === 'json')
                                        syncJsonDraftFromComponents();
                                }, items: [
                                    {
                                        key: 'visual',
                                        label: 'Screen layout',
                                        children: (_jsx("div", { onDragOver: acceptDragOver, onDrop: dropNewFromToolbox, style: {
                                                minHeight: 420,
                                                background: '#fff',
                                                border: '2px dashed #d9d9d9',
                                                borderRadius: 8,
                                                padding: 16,
                                                transition: 'border-color 0.2s',
                                            }, children: _jsx("div", { ref: canvasInnerRef, onDragOver: acceptDragOver, onDrop: dropNewFromToolbox, style: {
                                                    position: 'relative',
                                                    minHeight: 380,
                                                    width: '100%',
                                                    backgroundSize: `${GRID}px ${GRID}px`,
                                                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
                                                }, children: components.length === 0 ? (_jsx(Typography.Paragraph, { type: "secondary", style: { margin: 0 }, children: "Drop components here from the left toolbox." })) : ([...components]
                                                    .slice()
                                                    .sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1))
                                                    .map((c) => {
                                                    const L = effectiveLayout(c);
                                                    return (_jsxs("div", { onDragOver: acceptDragOver, onDrop: dropNewFromToolbox, style: {
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
                                                        }, onPointerDown: (e) => onItemPointerDown(e, c), onPointerMove: onItemPointerMove, onPointerUp: onItemPointerUp, onPointerCancel: onItemPointerUp, children: [_jsxs("div", { style: {
                                                                    display: 'flex',
                                                                    flexDirection: 'row',
                                                                    alignItems: 'stretch',
                                                                    gap: 8,
                                                                    height: '100%',
                                                                    width: '100%',
                                                                }, children: [_jsx("div", { style: { flex: 1, minWidth: 0, minHeight: 0 }, children: _jsx(CanvasPreview, { item: c, columnNameDrafts: columnNameDrafts, onGridColumnDraftChange: updateGridColumnDraft, onGridColumnChange: updateGridColumn, onGridAddColumn: addGridColumn, onGridRemoveColumn: removeGridColumn, onGridCellChange: updateGridCell, onGridAddRow: addGridRow, onGridRemoveRow: removeGridRow }) }), _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove component", "data-delete-btn": true, onClick: () => removeById(c.id), style: { flexShrink: 0, alignSelf: 'flex-start' } })] }), _jsx("div", { "aria-label": "Resize", "data-resize-handle": true, onPointerDown: (e) => onResizePointerDown(e, c), onPointerMove: onResizePointerMove, onPointerUp: onResizePointerUp, onPointerCancel: onResizePointerUp, style: {
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
                                                                } })] }, c.id));
                                                })) }) })),
                                    },
                                    {
                                        key: 'json',
                                        label: 'JSON',
                                        children: (_jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: 12, children: [_jsx(Input.TextArea, { rows: 14, value: jsonDraft, onChange: (e) => setJsonDraft(e.target.value), style: { fontFamily: 'monospace', fontSize: 12 } }), _jsxs(Space, { children: [_jsx(Button, { onClick: syncJsonDraftFromComponents, children: "Reset from canvas" }), _jsx(Button, { type: "primary", onClick: applyJsonDraft, children: "Apply to canvas" })] })] })),
                                    },
                                ] }), _jsx(Collapse, { style: { marginTop: 16 }, items: [
                                    {
                                        key: 'readonly-json',
                                        label: 'Live JSON preview (read-only)',
                                        children: (_jsx("pre", { style: {
                                                margin: 0,
                                                maxHeight: 220,
                                                overflow: 'auto',
                                                fontSize: 12,
                                                background: '#f5f5f5',
                                                padding: 12,
                                                borderRadius: 6,
                                            }, children: serialized })),
                                    },
                                ] })] })] })] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
