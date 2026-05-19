import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Alert, Button, Card, Checkbox, Dropdown, Form, Input, InputNumber, Layout, List, Modal, Select, Space, Switch, Tabs, Tooltip, Tree, Typography, message, } from 'antd';
import { CalendarOutlined, BarChartOutlined, CheckSquareOutlined, DeleteOutlined, EditOutlined, FieldNumberOutlined, FileTextOutlined, FontSizeOutlined, FormOutlined, HeatMapOutlined, LineChartOutlined, MinusOutlined, NotificationOutlined, OneToOneOutlined, PieChartOutlined, ProfileOutlined, SwitcherOutlined, TableOutlined, UnorderedListOutlined, } from '@ant-design/icons';
import 'antd/dist/reset.css';
import axios from 'axios';
import { makeSourceScreenDraft, sourceTypeLabel, } from './sourceImport';
import { CanvasPreview, PreviewRenderer, SourceDraftCanvas, getGridColumns, getGridRows, getSelectOptions, getVisibleGridColumns, } from './componentRenderers';
import { GRID, SCREEN_COMPONENT_TYPES, defaultSize, effectiveLayout, minSize, } from './screenTypes';
const { Header, Content, Sider } = Layout;
const GRID_DATA_TYPE_OPTIONS = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
];
function snap(n) {
    return Math.round(n / GRID) * GRID;
}
const DEFAULT_COMPONENTS = [];
const DEFAULT_COMMUNICATIONS = [];
const DEFAULT_COMMUNICATION_FORMATS = [
    {
        id: 'searchUsers',
        name: 'Search Users',
        inputFields: ['keyword'],
        outputFields: ['rows'],
        sampleRows: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Charlie' },
        ],
    },
];
const COMPONENT_DRAG_MIME = 'application/x-wsb-component';
const COMPONENT_BIND_MIME = 'application/x-wsb-bind-component';
function defaultPropsFor(type) {
    switch (type) {
        case 'Text':
            return { text: 'Label' };
        case 'Input':
            return { placeholder: 'Placeholder' };
        case 'TextArea':
            return { placeholder: 'Enter long text', rows: 3 };
        case 'NumberInput':
            return { placeholder: 'Number', min: 0, max: 100 };
        case 'Select':
            return {
                placeholder: 'Select',
                options: [
                    { label: 'Option 1', value: 'option1' },
                    { label: 'Option 2', value: 'option2' },
                ],
            };
        case 'Checkbox':
            return { label: 'Checkbox', checked: false };
        case 'Switch':
            return { label: 'Enabled', checked: false };
        case 'DatePicker':
            return { placeholder: 'Select date' };
        case 'Button':
            return { text: 'Button' };
        case 'Divider':
            return { text: 'Section' };
        case 'Alert':
            return { message: 'Information', description: 'Helpful message for the user.', alertType: 'info' };
        case 'AgGrid':
            return {
                columnDefs: [],
                rowData: [],
            };
        case 'BarChart':
            return {
                title: 'Sales by Region',
                data: [
                    { label: 'North', value: 42 },
                    { label: 'East', value: 64 },
                    { label: 'West', value: 38 },
                ],
            };
        case 'LineChart':
            return {
                title: 'Monthly Trend',
                data: [
                    { label: 'Jan', value: 18 },
                    { label: 'Feb', value: 32 },
                    { label: 'Mar', value: 28 },
                    { label: 'Apr', value: 46 },
                ],
            };
        case 'PieChart':
            return {
                title: 'Share',
                data: [
                    { label: 'A', value: 45 },
                    { label: 'B', value: 30 },
                    { label: 'C', value: 25 },
                ],
            };
        case 'DataMap':
            return {
                title: 'Data Map',
                data: [
                    { label: 'A1', value: 8 },
                    { label: 'A2', value: 15 },
                    { label: 'B1', value: 22 },
                    { label: 'B2', value: 34 },
                    { label: 'C1', value: 41 },
                    { label: 'C2', value: 55 },
                ],
            };
        case 'Card':
            return { title: 'Total Users', value: '1,248', description: '+12% this month' };
        default:
            return {};
    }
}
function newId() {
    return `c${Math.random().toString(36).slice(2, 6)}`;
}
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
function getComponentOptions(components, type) {
    return components.filter((component) => component.type === type);
}
function componentCenter(component) {
    const L = effectiveLayout(component);
    return { x: L.x + L.w / 2, y: L.y + L.h / 2 };
}
function isInputLikeComponent(type) {
    return (type === 'Input' ||
        type === 'TextArea' ||
        type === 'NumberInput' ||
        type === 'Select' ||
        type === 'Checkbox' ||
        type === 'Switch' ||
        type === 'DatePicker');
}
function isScreenComponentType(value) {
    return SCREEN_COMPONENT_TYPES.includes(value);
}
function sanitizeCommunicationsForComponents(communications, components) {
    const componentsById = new Map(components.map((component) => [component.id, component]));
    return communications.map((comm) => ({
        ...comm,
        formatId: comm.formatId || comm.id,
        triggerComponentId: componentsById.get(comm.triggerComponentId)?.type === 'Button' ? comm.triggerComponentId : '',
        inputBindings: comm.inputBindings.map((binding) => ({
            ...binding,
            componentId: componentsById.has(binding.componentId) &&
                isInputLikeComponent(componentsById.get(binding.componentId).type)
                ? binding.componentId
                : '',
        })),
        outputBindings: comm.outputBindings.map((binding) => ({
            ...binding,
            componentId: componentsById.get(binding.componentId)?.type === 'AgGrid' ? binding.componentId : '',
        })),
    }));
}
function stripScreenCommunication(comm) {
    const { sampleRows, ...screenCommunication } = comm;
    return {
        ...screenCommunication,
        formatId: screenCommunication.formatId || screenCommunication.id,
    };
}
function bindingChipStyle(type) {
    const colors = {
        Text: { bg: '#f5f5f5', border: '#d9d9d9', text: '#434343' },
        Input: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
        TextArea: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
        NumberInput: { bg: '#f0f5ff', border: '#adc6ff', text: '#1d39c4' },
        Select: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
        Checkbox: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
        Switch: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
        DatePicker: { bg: '#fff1f0', border: '#ffa39e', text: '#a8071a' },
        Button: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
        Divider: { bg: '#f5f5f5', border: '#d9d9d9', text: '#595959' },
        Alert: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
        AgGrid: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804' },
        BarChart: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9' },
        LineChart: { bg: '#f6ffed', border: '#b7eb8f', text: '#237804' },
        PieChart: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
        DataMap: { bg: '#e6fffb', border: '#87e8de', text: '#006d75' },
        Card: { bg: '#f9f0ff', border: '#d3adf7', text: '#531dab' },
    }[type];
    return {
        position: 'absolute',
        left: 4,
        top: -30,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        maxWidth: 240,
        width: 'max-content',
        minHeight: 26,
        padding: 0,
        borderRadius: 999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 11,
        fontWeight: 600,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    };
}
function getColumnDataType(column) {
    return GRID_DATA_TYPE_OPTIONS.some((option) => option.value === column.dataType)
        ? column.dataType
        : 'string';
}
function inferDataType(values) {
    const present = values.filter((value) => value !== null && value !== '');
    if (present.length === 0)
        return 'string';
    if (present.every((value) => typeof value === 'boolean'))
        return 'boolean';
    if (present.every((value) => typeof value === 'number'))
        return 'number';
    return 'string';
}
function coerceGridValue(value, dataType) {
    if (value.trim() === '')
        return '';
    if (dataType === 'number') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : value;
    }
    if (dataType === 'boolean') {
        return value.toLowerCase() === 'true';
    }
    return value;
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
function columnsFromRows(rows) {
    const fields = new Set();
    rows.forEach((row) => {
        Object.keys(row).forEach((field) => fields.add(field));
    });
    return Array.from(fields).map((field) => ({
        field,
        dataType: inferDataType(rows.map((row) => row[field])),
    }));
}
function columnDraftKey(componentId, field) {
    return `${componentId}:${field}`;
}
function hasDragType(e, type) {
    return Array.from(e.dataTransfer.types).includes(type);
}
function isValidComponentId(value) {
    return /^[A-Za-z][A-Za-z0-9_-]*$/.test(value);
}
function nextScreenId(screens) {
    const ids = new Set(screens.map((screen) => screen.screenId));
    let index = screens.length + 1;
    let screenId = `screen-${index}`;
    while (ids.has(screenId)) {
        index += 1;
        screenId = `screen-${index}`;
    }
    return screenId;
}
function GridEditor({ item, columnNameDrafts, onGridColumnDraftChange, onGridColumnChange, onGridColumnDataTypeChange, onGridAddColumn, onGridRemoveColumn, onGridSaveRows, onGridCellChange, onGridAddRow, onGridRemoveRow, }) {
    const cols = getVisibleGridColumns(item);
    const rows = getGridRows(item);
    return (_jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [_jsxs(Space, { size: 8, wrap: true, children: [_jsx(Button, { size: "small", onClick: () => onGridAddColumn(item.id), children: "Add column" }), _jsx(Button, { size: "small", onClick: () => onGridAddRow(item.id), children: "Add row" }), _jsx(Button, { size: "small", type: "primary", onClick: () => onGridSaveRows(item.id), children: "Save rows" })] }), _jsx("div", { style: {
                    maxHeight: 520,
                    overflow: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    background: '#fff',
                }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [cols.map((col) => (_jsx("th", { style: {
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            padding: 4,
                                            textAlign: 'left',
                                            minWidth: 220,
                                        }, children: _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { size: "small", value: columnNameDrafts[columnDraftKey(item.id, col.field ?? '')] ?? col.field, onChange: (e) => onGridColumnDraftChange(item.id, col.field ?? '', e.target.value), onBlur: () => onGridColumnChange(item.id, col.field ?? ''), onPressEnter: (e) => e.currentTarget.blur() }), _jsx(Select, { size: "small", value: getColumnDataType(col), options: GRID_DATA_TYPE_OPTIONS, onChange: (value) => onGridColumnDataTypeChange(item.id, col.field ?? '', value), style: { width: 96 } }), _jsx(Button, { size: "small", type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove column", onClick: () => onGridRemoveColumn(item.id, col.field ?? '') })] }) }, col.field))), _jsx("th", { style: { borderBottom: '1px solid #f0f0f0', width: 42 } })] }) }), _jsx("tbody", { children: rows.map((row, rowIndex) => (_jsxs("tr", { children: [cols.map((col) => {
                                        const field = col.field ?? '';
                                        return (_jsx("td", { style: { padding: 3, verticalAlign: 'top' }, children: _jsx(Input, { size: "small", value: String(row[field] ?? ''), onChange: (e) => onGridCellChange(item.id, rowIndex, field, e.target.value) }) }, field));
                                    }), _jsx("td", { style: { padding: 3, verticalAlign: 'top' }, children: _jsx(Button, { size: "small", type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove row", onClick: () => onGridRemoveRow(item.id, rowIndex) }) })] }, rowIndex))) })] }) })] }));
}
const TOOLBOX = [
    { type: 'Text', title: 'Text', description: 'Static label' },
    { type: 'Input', title: 'Input', description: 'Text field' },
    { type: 'TextArea', title: 'Text Area', description: 'Long text field' },
    { type: 'NumberInput', title: 'Number', description: 'Numeric input' },
    { type: 'Select', title: 'Select', description: 'Option picker' },
    { type: 'Checkbox', title: 'Checkbox', description: 'True/false input' },
    { type: 'Switch', title: 'Switch', description: 'Toggle input' },
    { type: 'DatePicker', title: 'DatePicker', description: 'Date input' },
    { type: 'Button', title: 'Button', description: 'Primary action' },
    { type: 'Divider', title: 'Divider', description: 'Section separator' },
    { type: 'Alert', title: 'Alert', description: 'Status message' },
    { type: 'AgGrid', title: 'AgGrid', description: 'Data table' },
    { type: 'BarChart', title: 'Bar Chart', description: 'Bar visualization' },
    { type: 'LineChart', title: 'Line Chart', description: 'Trend visualization' },
    { type: 'PieChart', title: 'Pie Chart', description: 'Share visualization' },
    { type: 'DataMap', title: 'Data Map', description: 'Heat map blocks' },
    { type: 'Card', title: 'Card', description: 'Metric display' },
];
const TOOLBOX_ICONS = {
    Text: _jsx(FontSizeOutlined, {}),
    Input: _jsx(FormOutlined, {}),
    TextArea: _jsx(FileTextOutlined, {}),
    NumberInput: _jsx(FieldNumberOutlined, {}),
    Select: _jsx(UnorderedListOutlined, {}),
    Checkbox: _jsx(CheckSquareOutlined, {}),
    Switch: _jsx(SwitcherOutlined, {}),
    DatePicker: _jsx(CalendarOutlined, {}),
    Button: _jsx(OneToOneOutlined, {}),
    Divider: _jsx(MinusOutlined, {}),
    Alert: _jsx(NotificationOutlined, {}),
    AgGrid: _jsx(TableOutlined, {}),
    BarChart: _jsx(BarChartOutlined, {}),
    LineChart: _jsx(LineChartOutlined, {}),
    PieChart: _jsx(PieChartOutlined, {}),
    DataMap: _jsx(HeatMapOutlined, {}),
    Card: _jsx(ProfileOutlined, {}),
};
function menuTargetType(menu) {
    return menu.targetType === 'folder' ? 'folder' : 'screen';
}
function menuOpenMode(menu) {
    return menu.openMode === 'popup' ? 'popup' : 'inline';
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
        title: `${menu.name || menu.id} (${menu.id})${menuTargetType(menu) === 'folder' ? ' / folder' : menu.openMode === 'popup' ? ' / popup' : ''}`,
        children: makeNodes(menu.id),
    }));
    return makeNodes('');
}
function App() {
    const [form] = Form.useForm();
    const [settingsForm] = Form.useForm();
    const [token, setToken] = useState('');
    const watchedScreenId = Form.useWatch('screenId', { form, preserve: true }) ?? '';
    const watchedScreenName = Form.useWatch('name', { form, preserve: true }) ?? '';
    const watchedMenuId = Form.useWatch('menuId', { form, preserve: true }) ?? '';
    const watchedMenuName = Form.useWatch('menuName', { form, preserve: true }) ?? '';
    const [screens, setScreens] = useState([]);
    const [menus, setMenus] = useState([]);
    const [components, setComponents] = useState(DEFAULT_COMPONENTS);
    const [communications, setCommunications] = useState(DEFAULT_COMMUNICATIONS);
    const [communicationFormats, setCommunicationFormats] = useState(DEFAULT_COMMUNICATION_FORMATS);
    const [jsonTab, setJsonTab] = useState('visual');
    const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify({ components: DEFAULT_COMPONENTS, communications: DEFAULT_COMMUNICATIONS.map(stripScreenCommunication) }, null, 2));
    const [sourceInputType, setSourceInputType] = useState('js');
    const [sourceInputText, setSourceInputText] = useState('');
    const [sourceScreenDraft, setSourceScreenDraft] = useState(null);
    const [sourceDraftModalOpen, setSourceDraftModalOpen] = useState(false);
    const [aiDraftLoading, setAiDraftLoading] = useState(false);
    const [columnNameDrafts, setColumnNameDrafts] = useState({});
    const [settingsModal, setSettingsModal] = useState(null);
    const [screenPickerOpen, setScreenPickerOpen] = useState(false);
    const [editingMenuId, setEditingMenuId] = useState('');
    const [formatsModalOpen, setFormatsModalOpen] = useState(false);
    const [metadataRevision, setMetadataRevision] = useState(0);
    const [expandedMenuKeys, setExpandedMenuKeys] = useState([]);
    const [selectedFormatId, setSelectedFormatId] = useState(DEFAULT_COMMUNICATION_FORMATS[0]?.id ?? '');
    const [selectedComponentId, setSelectedComponentId] = useState(null);
    const [selectedComponentIds, setSelectedComponentIds] = useState([]);
    const [editingComponentId, setEditingComponentId] = useState(null);
    const [savedSnapshot, setSavedSnapshot] = useState('');
    const [formRevision, setFormRevision] = useState(0);
    const [dragGuide, setDragGuide] = useState(null);
    const [selectedActionId, setSelectedActionId] = useState(null);
    const [previewInputValues, setPreviewInputValues] = useState({});
    const [previewGridRows, setPreviewGridRows] = useState({});
    const canvasInnerRef = useRef(null);
    const dragInfoRef = useRef(null);
    const resizeInfoRef = useRef(null);
    const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);
    const visibleScreens = useMemo(() => {
        const selectedScreen = screens.find((screen) => screen.screenId === watchedScreenId);
        if (selectedScreen) {
            return [selectedScreen];
        }
        return screens.slice(-1);
    }, [screens, watchedScreenId]);
    const selectedFormat = communicationFormats.find((format) => format.id === selectedFormatId) ??
        communicationFormats[0];
    const selectedComponent = components.find((component) => component.id === selectedComponentId);
    const selectedComponents = components.filter((component) => selectedComponentIds.includes(component.id));
    const editingComponent = components.find((component) => component.id === editingComponentId);
    const selectedAction = communications.find((comm) => comm.id === selectedActionId);
    const hasSelectedScreen = Boolean(watchedScreenId);
    const hasSelectedMenu = Boolean(watchedMenuId);
    const sourceDraftCanvasHeight = Math.max(620, ...(sourceScreenDraft?.components ?? []).map((component) => {
        const layout = effectiveLayout(component);
        return layout.y + layout.h + 32;
    }));
    const actionBindingLines = useMemo(() => {
        if (!selectedAction)
            return [];
        const byId = new Map(components.map((component) => [component.id, component]));
        const trigger = byId.get(selectedAction.triggerComponentId);
        if (!trigger)
            return [];
        const from = componentCenter(trigger);
        return [
            ...selectedAction.inputBindings
                .map((binding) => byId.get(binding.componentId))
                .filter((component) => Boolean(component))
                .map((component) => ({ from: componentCenter(component), to: from, color: '#52c41a' })),
            ...selectedAction.outputBindings
                .map((binding) => byId.get(binding.componentId))
                .filter((component) => Boolean(component))
                .map((component) => ({ from, to: componentCenter(component), color: '#1677ff' })),
        ];
    }, [components, selectedAction]);
    const currentSnapshot = useMemo(() => JSON.stringify({
        form: {
            screenId: form.getFieldValue('screenId'),
            name: form.getFieldValue('name'),
            allowRuntimePersonalization: Boolean(form.getFieldValue('allowRuntimePersonalization')),
            isInitialScreen: Boolean(form.getFieldValue('isInitialScreen')),
            menuId: form.getFieldValue('menuId'),
            menuName: form.getFieldValue('menuName'),
            menuParentId: form.getFieldValue('menuParentId') ?? '',
            menuTargetType: form.getFieldValue('menuTargetType') ?? 'screen',
            menuOpenMode: form.getFieldValue('menuOpenMode') ?? 'inline',
        },
        components,
        communications: communications.map(stripScreenCommunication),
        communicationFormats,
    }), [components, communications, communicationFormats, form, formRevision]);
    const hasUnsavedChanges = savedSnapshot !== '' && savedSnapshot !== currentSnapshot;
    const currentFormValues = () => ({
        screenId: form.getFieldValue('screenId') ?? '',
        name: form.getFieldValue('name') ?? '',
        allowRuntimePersonalization: Boolean(form.getFieldValue('allowRuntimePersonalization')),
        isInitialScreen: Boolean(form.getFieldValue('isInitialScreen')),
        menuId: form.getFieldValue('menuId') ?? '',
        menuName: form.getFieldValue('menuName') ?? '',
        menuParentId: form.getFieldValue('menuParentId') ?? '',
        menuTargetType: form.getFieldValue('menuTargetType') ?? 'screen',
        menuOpenMode: form.getFieldValue('menuOpenMode') ?? 'inline',
    });
    const applyFormValues = (values) => {
        form.setFieldsValue(values);
        setFormRevision((prev) => prev + 1);
    };
    const openMenuSettings = () => {
        settingsForm.setFieldsValue({
            menuId: form.getFieldValue('menuId'),
            menuName: form.getFieldValue('menuName'),
            menuParentId: form.getFieldValue('menuParentId') ?? '',
            menuTargetType: form.getFieldValue('menuTargetType') ?? 'screen',
            menuOpenMode: form.getFieldValue('menuOpenMode') ?? 'inline',
            screenId: form.getFieldValue('screenId'),
        });
        setSettingsModal({ type: 'menu', mode: 'edit' });
    };
    const openScreenSettings = () => {
        settingsForm.setFieldsValue({
            screenId: form.getFieldValue('screenId'),
            name: form.getFieldValue('name'),
            allowRuntimePersonalization: Boolean(form.getFieldValue('allowRuntimePersonalization')),
            isInitialScreen: Boolean(form.getFieldValue('isInitialScreen')),
        });
        setSettingsModal({ type: 'screen', mode: 'edit' });
    };
    const syncJsonDraftFromComponents = useCallback(() => {
        setJsonDraft(JSON.stringify({ components, communications: communications.map(stripScreenCommunication) }, null, 2));
    }, [components, communications]);
    const captureSavedSnapshot = useCallback((formValues) => {
        const values = { ...currentFormValues(), ...formValues };
        setSavedSnapshot(JSON.stringify({
            form: {
                screenId: values.screenId,
                name: values.name,
                allowRuntimePersonalization: Boolean(values.allowRuntimePersonalization),
                isInitialScreen: Boolean(values.isInitialScreen),
                menuId: values.menuId,
                menuName: values.menuName,
                menuParentId: values.menuParentId ?? '',
                menuTargetType: values.menuTargetType ?? 'screen',
                menuOpenMode: values.menuOpenMode ?? 'inline',
            },
            components,
            communications: communications.map(stripScreenCommunication),
            communicationFormats,
        }));
    }, [components, communicationFormats, communications, form]);
    const loadDesignerMetadata = useCallback(async () => {
        const cacheBuster = Date.now();
        const [screenRes, menuRes, formatRes] = await Promise.all([
            axios.get('http://localhost:8080/api/screens', { params: { _: cacheBuster } }),
            axios.get('http://localhost:8080/api/menus', { params: { _: cacheBuster } }),
            axios.get('http://localhost:8080/api/communications/formats', {
                params: { _: cacheBuster },
            }),
        ]);
        setScreens([...screenRes.data]);
        setMenus([...menuRes.data]);
        setExpandedMenuKeys((prev) => {
            const menuIds = new Set(menuRes.data.map((menu) => menu.id));
            const keptKeys = prev.filter((key) => menuIds.has(String(key)));
            return keptKeys.length > 0 ? keptKeys : menuRes.data.map((menu) => menu.id);
        });
        setCommunicationFormats([...formatRes.data]);
        setMetadataRevision((prev) => prev + 1);
        setSelectedFormatId((prev) => formatRes.data.some((format) => format.id === prev)
            ? prev
            : formatRes.data[0]?.id ?? '');
    }, []);
    useEffect(() => {
        if (!token) {
            return;
        }
        loadDesignerMetadata().catch(() => {
            message.warning('Could not load screen and menu list.');
        });
    }, [loadDesignerMetadata, token]);
    useEffect(() => {
        setCommunications((prev) => {
            const next = sanitizeCommunicationsForComponents(prev, components);
            return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
        });
    }, [components]);
    const loadScreen = async (screenId, menuOverride) => {
        try {
            const res = await axios.get(`http://localhost:8080/api/screens/${screenId}`);
            const nextComponents = Array.isArray(res.data.components) ? res.data.components : [];
            const nextCommunications = Array.isArray(res.data.communications)
                ? res.data.communications
                : [];
            const sanitizedCommunications = sanitizeCommunicationsForComponents(nextCommunications.map((comm) => ({
                ...comm,
                formatId: comm.formatId || comm.id,
            })), nextComponents);
            const name = res.data.name || screenId;
            const linkedMenu = menuOverride ?? menus.find((menu) => menu.screenId === screenId);
            applyFormValues({
                screenId,
                name,
                allowRuntimePersonalization: Boolean(res.data.allowRuntimePersonalization),
                isInitialScreen: Boolean(res.data.isInitialScreen),
                menuId: linkedMenu?.id ?? `menu-${screenId}`,
                menuName: linkedMenu?.name ?? name,
                menuParentId: linkedMenu?.parentId ?? '',
                menuTargetType: menuTargetType(linkedMenu ?? { id: '', name: '', screenId }),
                menuOpenMode: menuOpenMode(linkedMenu ?? { id: '', name: '', screenId }),
            });
            setEditingMenuId(linkedMenu?.id ?? `menu-${screenId}`);
            setComponents(nextComponents);
            setCommunications(sanitizedCommunications);
            setSelectedComponentId(null);
            setSelectedComponentIds([]);
            setJsonDraft(JSON.stringify({ components: nextComponents, communications: sanitizedCommunications }, null, 2));
            setColumnNameDrafts({});
            setJsonTab('visual');
            setSettingsModal(null);
            setSavedSnapshot(JSON.stringify({
                form: {
                    screenId,
                    name,
                    allowRuntimePersonalization: Boolean(res.data.allowRuntimePersonalization),
                    isInitialScreen: Boolean(res.data.isInitialScreen),
                    menuId: linkedMenu?.id ?? `menu-${screenId}`,
                    menuName: linkedMenu?.name ?? name,
                    menuParentId: linkedMenu?.parentId ?? '',
                    menuTargetType: menuTargetType(linkedMenu ?? { id: '', name: '', screenId }),
                    menuOpenMode: menuOpenMode(linkedMenu ?? { id: '', name: '', screenId }),
                },
                components: nextComponents,
                communications: sanitizedCommunications.map(stripScreenCommunication),
                communicationFormats,
            }));
            message.success(`Loaded ${screenId}`);
        }
        catch {
            message.error('Screen load failed.');
        }
    };
    const loadMenu = async (menu) => {
        applyFormValues({
            menuId: menu.id,
            menuName: menu.name,
            menuParentId: menu.parentId ?? '',
            menuTargetType: menuTargetType(menu),
            menuOpenMode: menuOpenMode(menu),
            screenId: menu.screenId ?? form.getFieldValue('screenId'),
        });
        setEditingMenuId(menu.id);
        if (menuTargetType(menu) === 'screen' && menu.screenId) {
            await loadScreen(menu.screenId, menu);
            return;
        }
        setSettingsModal(null);
        message.info('Loaded menu node. Folder menus do not open a screen.');
    };
    const resetDesignerToBlank = (nextScreens = screens) => {
        if (nextScreens.length === 0) {
            applyFormValues({
                screenId: '',
                name: '',
                allowRuntimePersonalization: false,
                isInitialScreen: false,
                menuId: '',
                menuName: '',
                menuParentId: '',
                menuTargetType: 'screen',
                menuOpenMode: 'inline',
            });
            setEditingMenuId('');
            setComponents([]);
            setCommunications([]);
            setSelectedComponentId(null);
            setSelectedComponentIds([]);
            setColumnNameDrafts({});
            setJsonDraft(JSON.stringify({ components: [], communications: [] }, null, 2));
            setJsonTab('visual');
            setSavedSnapshot('');
            return;
        }
        const screenId = nextScreenId(nextScreens);
        const name = `Screen ${screenId.replace('screen-', '')}`;
        applyFormValues({
            screenId,
            name,
            allowRuntimePersonalization: false,
            isInitialScreen: false,
            menuId: `menu-${screenId}`,
            menuName: name,
            menuParentId: '',
            menuTargetType: 'screen',
            menuOpenMode: 'inline',
        });
        setEditingMenuId(`menu-${screenId}`);
        setComponents([]);
        setCommunications([]);
        setSelectedComponentId(null);
        setSelectedComponentIds([]);
        setColumnNameDrafts({});
        setJsonDraft(JSON.stringify({ components: [], communications: [] }, null, 2));
        setJsonTab('visual');
        setSavedSnapshot('');
    };
    const deleteMenu = async (menuId) => {
        if (!menuId) {
            message.error('Menu ID is required.');
            return;
        }
        try {
            await axios.delete(`http://localhost:8080/api/menus/${encodeURIComponent(menuId)}`);
            if (editingMenuId === menuId) {
                applyFormValues({
                    menuId: `menu-${form.getFieldValue('screenId')}`,
                    menuName: form.getFieldValue('name'),
                    menuParentId: '',
                    menuTargetType: 'screen',
                    menuOpenMode: 'inline',
                });
                setEditingMenuId(`menu-${form.getFieldValue('screenId')}`);
            }
            await loadDesignerMetadata();
            message.success(`Deleted menu ${menuId}`);
        }
        catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            message.error(`Menu delete failed: ${menuId}${status ? ` (${status})` : ''}`);
        }
    };
    const confirmDeleteMenu = (menuId) => {
        Modal.confirm({
            title: 'Delete menu?',
            content: `Menu ${menuId} will be removed. The linked screen data will remain.`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: () => deleteMenu(menuId),
        });
    };
    const deleteScreen = async (screenId) => {
        if (!screenId) {
            message.error('Screen ID is required.');
            return;
        }
        try {
            const linkedMenus = menus.filter((menu) => menu.screenId === screenId);
            await axios.delete(`http://localhost:8080/api/screens/${encodeURIComponent(screenId)}`);
            const menuDeleteResults = await Promise.allSettled(linkedMenus.map((menu) => axios.delete(`http://localhost:8080/api/menus/${encodeURIComponent(menu.id)}`)));
            const nextScreens = screens.filter((screen) => screen.screenId !== screenId);
            resetDesignerToBlank(nextScreens);
            await loadDesignerMetadata();
            const failedMenuDeletes = menuDeleteResults.filter((result) => result.status === 'rejected')
                .length;
            if (failedMenuDeletes > 0) {
                message.warning(`Deleted screen ${screenId}, but ${failedMenuDeletes} linked menu delete(s) failed.`);
                return;
            }
            message.success(`Deleted screen ${screenId}`);
        }
        catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            message.error(`Screen delete failed: ${screenId}${status ? ` (${status})` : ''}`);
        }
    };
    const confirmDeleteScreen = (screenId) => {
        const linkedCount = menus.filter((menu) => menu.screenId === screenId).length;
        Modal.confirm({
            title: 'Delete screen?',
            content: linkedCount > 0
                ? `Screen ${screenId} and ${linkedCount} linked menu item(s) will be removed.`
                : `Screen ${screenId} will be removed.`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: () => deleteScreen(screenId),
        });
    };
    const bumpZ = useCallback((id) => {
        setComponents((prev) => {
            const z = prev.reduce((m, c) => Math.max(m, c.zIndex ?? 1), 0) + 1;
            return prev.map((c) => (c.id === id ? { ...c, zIndex: z } : c));
        });
    }, []);
    const onDragStartToolbox = (e, type) => {
        e.dataTransfer.setData(COMPONENT_DRAG_MIME, type);
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
    };
    const onDragStartComponentBinding = (e, component) => {
        e.stopPropagation();
        e.dataTransfer.setData(COMPONENT_BIND_MIME, JSON.stringify({ id: component.id, type: component.type }));
        e.dataTransfer.setData('text/plain', component.id);
        e.dataTransfer.effectAllowed = 'copy';
    };
    const readDroppedComponent = (e, acceptedTypes) => {
        const raw = e.dataTransfer.getData(COMPONENT_BIND_MIME);
        if (!raw)
            return null;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed.id || !parsed.type || !acceptedTypes.includes(parsed.type)) {
                message.error(`Drop ${acceptedTypes.join(' or ')} component here.`);
                return null;
            }
            e.preventDefault();
            e.stopPropagation();
            return { id: parsed.id, type: parsed.type };
        }
        catch {
            return null;
        }
    };
    const acceptComponentBindingDrop = (e) => {
        if (hasDragType(e, COMPONENT_BIND_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };
    const acceptDragOver = (e) => {
        if (hasDragType(e, COMPONENT_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };
    const dropNewFromToolbox = (e) => {
        if (!hasDragType(e, COMPONENT_DRAG_MIME))
            return;
        e.preventDefault();
        e.stopPropagation();
        const inner = canvasInnerRef.current;
        if (!inner)
            return;
        const raw = e.dataTransfer.getData(COMPONENT_DRAG_MIME);
        if (!isScreenComponentType(raw))
            return;
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
    const addPreset = (preset) => {
        const zBase = components.reduce((max, component) => Math.max(max, component.zIndex ?? 1), 0);
        if (preset === 'searchGrid') {
            const inputId = newId();
            const buttonId = newId();
            const gridId = newId();
            const actionId = `action${communications.length + 1}`;
            setComponents((prev) => [
                ...prev,
                {
                    id: inputId,
                    type: 'Input',
                    layout: { x: 16, y: 16, width: 240, height: 40 },
                    props: { placeholder: 'Keyword' },
                    zIndex: zBase + 1,
                },
                {
                    id: buttonId,
                    type: 'Button',
                    layout: { x: 272, y: 16, width: 120, height: 40 },
                    props: { text: 'Search' },
                    zIndex: zBase + 2,
                },
                {
                    id: gridId,
                    type: 'AgGrid',
                    layout: { x: 16, y: 72, width: 520, height: 240 },
                    props: {
                        columnDefs: [
                            { field: 'id', dataType: 'number' },
                            { field: 'name', dataType: 'string' },
                        ],
                        rowData: [],
                    },
                    zIndex: zBase + 3,
                },
            ]);
            setCommunications((prev) => [
                ...prev,
                {
                    id: actionId,
                    name: 'Search',
                    formatId: 'searchUsers',
                    triggerComponentId: buttonId,
                    inputBindings: [{ field: 'keyword', componentId: inputId }],
                    outputBindings: [{ field: 'rows', componentId: gridId }],
                },
            ]);
            message.success('Added Search Form + Grid preset');
            return;
        }
        if (preset === 'dashboard') {
            setComponents((prev) => [
                ...prev,
                {
                    id: newId(),
                    type: 'Card',
                    layout: { x: 16, y: 16, width: 220, height: 120 },
                    props: { title: 'Total Sales', value: '$42K', description: '+8% this month' },
                    zIndex: zBase + 1,
                },
                {
                    id: newId(),
                    type: 'BarChart',
                    layout: { x: 16, y: 152, width: 320, height: 220 },
                    props: defaultPropsFor('BarChart'),
                    zIndex: zBase + 2,
                },
                {
                    id: newId(),
                    type: 'LineChart',
                    layout: { x: 352, y: 152, width: 320, height: 220 },
                    props: defaultPropsFor('LineChart'),
                    zIndex: zBase + 3,
                },
            ]);
            message.success('Added Dashboard preset');
            return;
        }
        const labelId = newId();
        const inputId = newId();
        const buttonId = newId();
        setComponents((prev) => [
            ...prev,
            {
                id: labelId,
                type: 'Text',
                layout: { x: 16, y: 16, width: 180, height: 32 },
                props: { text: 'Detail Name' },
                zIndex: zBase + 1,
            },
            {
                id: inputId,
                type: 'Input',
                layout: { x: 16, y: 64, width: 260, height: 40 },
                props: { placeholder: 'Name' },
                zIndex: zBase + 2,
            },
            {
                id: buttonId,
                type: 'Button',
                layout: { x: 16, y: 120, width: 120, height: 40 },
                props: { text: 'Save' },
                zIndex: zBase + 3,
            },
        ]);
        message.success('Added Popup Detail Form preset');
    };
    const startMenuScreen = (parentId = '') => {
        const screenId = nextScreenId(screens);
        const name = `Screen ${screenId.replace('screen-', '')}`;
        settingsForm.setFieldsValue({
            screenId,
            name,
            allowRuntimePersonalization: false,
            isInitialScreen: false,
            menuId: `menu-${screenId}`,
            menuName: name,
            menuParentId: parentId,
            menuTargetType: 'screen',
            menuOpenMode: 'inline',
        });
        setSettingsModal({ type: 'menu', mode: 'new-screen' });
        message.info('Configure the new menu screen, then save to update the designer.');
    };
    const startMenuFolder = (parentId = '') => {
        const folderCount = menus.filter((menu) => menuTargetType(menu) === 'folder').length + 1;
        settingsForm.setFieldsValue({
            menuId: `folder-${folderCount}`,
            menuName: `Folder ${folderCount}`,
            menuParentId: parentId,
            menuTargetType: 'folder',
            menuOpenMode: 'inline',
            screenId: form.getFieldValue('screenId'),
        });
        setSettingsModal({ type: 'menu', mode: 'new-folder' });
        message.info('Configure the new folder, then save to publish it.');
    };
    const removeById = (id) => {
        setComponents((prev) => prev.filter((c) => c.id !== id));
        setEditingComponentId((current) => (current === id ? null : current));
        setSelectedComponentId((current) => (current === id ? null : current));
        setSelectedComponentIds((current) => current.filter((item) => item !== id));
        setCommunications((prev) => prev.map((comm) => ({
            ...comm,
            inputBindings: comm.inputBindings.filter((binding) => binding.componentId !== id),
            outputBindings: comm.outputBindings.filter((binding) => binding.componentId !== id),
            triggerComponentId: comm.triggerComponentId === id ? '' : comm.triggerComponentId,
        })));
    };
    const updateComponentProps = (componentId, patch) => {
        setComponents((prev) => prev.map((component) => component.id === componentId
            ? {
                ...component,
                props: {
                    ...component.props,
                    ...patch,
                },
            }
            : component));
    };
    const updateComponentLayout = (componentId, patch) => {
        setComponents((prev) => prev.map((component) => {
            if (component.id !== componentId)
                return component;
            const L = effectiveLayout(component);
            const nextLayout = {
                x: patch.x ?? L.x,
                y: patch.y ?? L.y,
                width: patch.width ?? L.w,
                height: patch.height ?? L.h,
            };
            const m = minSize(component.type);
            return {
                ...component,
                layout: {
                    x: Math.max(0, snap(nextLayout.x)),
                    y: Math.max(0, snap(nextLayout.y)),
                    width: Math.max(m.w, snap(nextLayout.width)),
                    height: Math.max(m.h, snap(nextLayout.height)),
                },
            };
        }));
    };
    const selectComponent = (componentId, additive) => {
        setSelectedComponentId(componentId);
        setSelectedComponentIds((prev) => {
            if (!additive)
                return [componentId];
            return prev.includes(componentId)
                ? prev.filter((item) => item !== componentId)
                : [...prev, componentId];
        });
    };
    const alignSelectedComponents = (mode) => {
        if (selectedComponents.length < 2)
            return;
        const layouts = selectedComponents.map(effectiveLayout);
        const left = Math.min(...layouts.map((layout) => layout.x));
        const top = Math.min(...layouts.map((layout) => layout.y));
        const width = layouts[0].w;
        setComponents((prev) => prev.map((component) => {
            if (!selectedComponentIds.includes(component.id))
                return component;
            const L = effectiveLayout(component);
            return {
                ...component,
                layout: {
                    x: mode === 'left' ? left : L.x,
                    y: mode === 'top' ? top : L.y,
                    width: mode === 'sameWidth' ? width : L.w,
                    height: L.h,
                },
            };
        }));
    };
    const distributeSelectedComponents = () => {
        if (selectedComponents.length < 3)
            return;
        const sorted = [...selectedComponents].sort((a, b) => effectiveLayout(a).x - effectiveLayout(b).x);
        const first = effectiveLayout(sorted[0]);
        const last = effectiveLayout(sorted[sorted.length - 1]);
        const step = (last.x - first.x) / (sorted.length - 1);
        setComponents((prev) => prev.map((component) => {
            const index = sorted.findIndex((item) => item.id === component.id);
            if (index < 0)
                return component;
            const L = effectiveLayout(component);
            return {
                ...component,
                layout: {
                    x: snap(first.x + step * index),
                    y: L.y,
                    width: L.w,
                    height: L.h,
                },
            };
        }));
    };
    const executePreviewAction = async (triggerComponentId) => {
        const action = communications.find((comm) => comm.triggerComponentId === triggerComponentId);
        if (!action) {
            message.warning('No communication action is connected to this button.');
            return;
        }
        const input = Object.fromEntries(action.inputBindings.map((binding) => [
            binding.field,
            previewInputValues[binding.componentId] ?? '',
        ]));
        try {
            const res = await axios.post(`http://localhost:8080/api/communications/${action.formatId || action.id}/execute`, input);
            setPreviewGridRows((prev) => {
                const next = { ...prev };
                action.outputBindings.forEach((binding) => {
                    const rows = Array.isArray(res.data[binding.field])
                        ? res.data[binding.field]
                        : Array.isArray(res.data.rows)
                            ? res.data.rows
                            : [];
                    next[binding.componentId] = rows;
                });
                return next;
            });
            message.success(`${action.name || action.id} preview completed`);
        }
        catch {
            message.error(`${action.name || action.id} preview failed`);
        }
    };
    const updateComponentId = (oldId, newIdValue) => {
        const nextId = newIdValue.trim();
        if (nextId === oldId)
            return;
        if (!isValidComponentId(nextId)) {
            message.error('Component ID must start with a letter and use letters, numbers, _ or -.');
            return;
        }
        if (components.some((component) => component.id === nextId)) {
            message.error('Component ID already exists.');
            return;
        }
        setComponents((prev) => prev.map((component) => (component.id === oldId ? { ...component, id: nextId } : component)));
        setCommunications((prev) => prev.map((comm) => ({
            ...comm,
            triggerComponentId: comm.triggerComponentId === oldId ? nextId : comm.triggerComponentId,
            inputBindings: comm.inputBindings.map((binding) => ({
                ...binding,
                componentId: binding.componentId === oldId ? nextId : binding.componentId,
            })),
            outputBindings: comm.outputBindings.map((binding) => ({
                ...binding,
                componentId: binding.componentId === oldId ? nextId : binding.componentId,
            })),
        })));
        setEditingComponentId((current) => (current === oldId ? nextId : current));
        setSelectedComponentId((current) => (current === oldId ? nextId : current));
        setSelectedComponentIds((current) => current.map((item) => (item === oldId ? nextId : item)));
        message.success(`Component ID changed to ${nextId}`);
    };
    const updateCommunication = (actionId, patch) => {
        setCommunications((prev) => prev.map((comm) => (comm.id === actionId ? { ...comm, ...patch } : comm)));
    };
    const updateCommunicationInput = (actionId, index, patch) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                inputBindings: (comm.inputBindings.length > 0
                    ? comm.inputBindings
                    : [{ field: 'keyword', componentId: '' }]).map((binding, bindingIndex) => bindingIndex === index ? { ...binding, ...patch } : binding),
            }
            : comm));
    };
    const updateCommunicationOutput = (actionId, index, patch) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                outputBindings: (comm.outputBindings.length > 0
                    ? comm.outputBindings
                    : [{ field: 'rows', componentId: '' }]).map((binding, bindingIndex) => bindingIndex === index ? { ...binding, ...patch } : binding),
            }
            : comm));
    };
    const alignBindingsToFields = (fields, bindings, fallbackField) => {
        const nextFields = fields.length > 0 ? fields : [fallbackField];
        return nextFields.map((field, index) => ({
            field,
            componentId: bindings.find((binding) => binding.field === field)?.componentId ??
                bindings[index]?.componentId ??
                '',
        }));
    };
    const changeCommunicationFormat = (comm, nextFormatId) => {
        const format = communicationFormats.find((item) => item.id === nextFormatId);
        const nextInputBindings = alignBindingsToFields(format?.inputFields ?? [], comm.inputBindings, 'keyword');
        const nextOutputBindings = alignBindingsToFields(format?.outputFields ?? [], comm.outputBindings, 'rows');
        updateCommunication(comm.id, {
            formatId: nextFormatId,
            inputBindings: nextInputBindings,
            outputBindings: nextOutputBindings,
        });
        nextOutputBindings.forEach((binding) => {
            if (binding.componentId) {
                applyFormatRowsToEmptyGrid(comm.id, binding.componentId, nextFormatId);
            }
        });
    };
    const addCommunicationInput = (actionId) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                inputBindings: [
                    ...comm.inputBindings,
                    { field: `input${comm.inputBindings.length + 1}`, componentId: '' },
                ],
            }
            : comm));
    };
    const removeCommunicationInput = (actionId, index) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                inputBindings: comm.inputBindings.filter((_, bindingIndex) => bindingIndex !== index),
            }
            : comm));
    };
    const addCommunicationOutput = (actionId) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                outputBindings: [
                    ...comm.outputBindings,
                    { field: `rows${comm.outputBindings.length + 1}`, componentId: '' },
                ],
            }
            : comm));
    };
    const removeCommunicationOutput = (actionId, index) => {
        setCommunications((prev) => prev.map((comm) => comm.id === actionId
            ? {
                ...comm,
                outputBindings: comm.outputBindings.filter((_, bindingIndex) => bindingIndex !== index),
            }
            : comm));
    };
    const updateCommunicationFormat = (formatId, patch) => {
        setCommunicationFormats((prev) => prev.map((format) => (format.id === formatId ? { ...format, ...patch } : format)));
    };
    const updateCommunicationFormatField = (formatId, key, index, value) => {
        setCommunicationFormats((prev) => prev.map((format) => format.id === formatId
            ? {
                ...format,
                [key]: format[key].map((field, fieldIndex) => fieldIndex === index ? value.trim() : field),
            }
            : format));
    };
    const addCommunicationFormatField = (formatId, key) => {
        setCommunicationFormats((prev) => prev.map((format) => format.id === formatId
            ? {
                ...format,
                [key]: [
                    ...format[key],
                    key === 'inputFields'
                        ? `input${format.inputFields.length + 1}`
                        : `output${format.outputFields.length + 1}`,
                ],
            }
            : format));
    };
    const removeCommunicationFormatField = (formatId, key, index) => {
        setCommunicationFormats((prev) => prev.map((format) => format.id === formatId
            ? {
                ...format,
                [key]: format[key].filter((_, fieldIndex) => fieldIndex !== index),
            }
            : format));
    };
    const updateCommunicationSampleRows = (formatId, value) => {
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
                message.error('Sample output must be a JSON array.');
                return;
            }
            updateCommunicationFormat(formatId, { sampleRows: parsed });
        }
        catch {
            message.error('Invalid sample output JSON.');
        }
    };
    const addCommunication = () => {
        const nextIndex = communications.length + 1;
        const id = `action${nextIndex}`;
        setCommunications((prev) => [
            ...prev,
            {
                id,
                name: `Action ${nextIndex}`,
                formatId: communicationFormats[0]?.id ?? 'searchUsers',
                triggerComponentId: '',
                inputBindings: [{ field: 'keyword', componentId: '' }],
                outputBindings: [{ field: 'rows', componentId: '' }],
            },
        ]);
    };
    const buildSourceScreenDraft = () => {
        if (!sourceInputText.trim()) {
            message.warning('소스를 먼저 붙여넣어 주세요.');
            return;
        }
        setSourceScreenDraft(makeSourceScreenDraft(sourceInputType, sourceInputText));
        message.success('화면 초안이 생성되었습니다.');
    };
    const buildAiSourceScreenDraft = async () => {
        if (!sourceInputText.trim()) {
            message.warning('소스를 먼저 붙여넣어 주세요.');
            return;
        }
        setAiDraftLoading(true);
        try {
            // TODO: Replace this mock with a backend AI endpoint call.
            const draft = makeSourceScreenDraft(sourceInputType, sourceInputText);
            setSourceScreenDraft({
                ...draft,
                summaryMessage: `AI ${draft.summaryMessage}`,
                summaryDescription: `${draft.summaryDescription} AI endpoint hook is ready.`,
            });
            message.success('AI 화면 초안이 생성되었습니다.');
        }
        finally {
            setAiDraftLoading(false);
        }
    };
    const clearSourceScreenDraft = () => {
        setSourceInputText('');
        setSourceScreenDraft(null);
    };
    const createScreenFromSourceDraft = () => {
        if (!sourceScreenDraft) {
            message.warning('Generate a screen draft first.');
            return;
        }
        const screenId = nextScreenId(screens);
        const name = `${sourceTypeLabel(sourceScreenDraft.sourceType)} Generated Screen`;
        const menuId = `menu-${screenId}`;
        const nextComponents = sourceScreenDraft.components.map((component) => ({
            ...component,
            layout: component.layout ? { ...component.layout } : undefined,
            props: component.props ? { ...component.props } : undefined,
        }));
        const nextValues = {
            screenId,
            name,
            allowRuntimePersonalization: false,
            isInitialScreen: false,
            menuId,
            menuName: name,
            menuParentId: '',
            menuTargetType: 'screen',
            menuOpenMode: 'inline',
        };
        applyFormValues(nextValues);
        setScreens((prev) => [
            ...prev.filter((screen) => screen.screenId !== screenId),
            { screenId, name, allowRuntimePersonalization: false, isInitialScreen: false },
        ]);
        setMenus((prev) => [
            ...prev.filter((menu) => menu.id !== menuId),
            {
                id: menuId,
                name,
                screenId,
                parentId: '',
                targetType: 'screen',
                openMode: 'inline',
            },
        ]);
        setComponents(nextComponents);
        setCommunications([]);
        setSelectedComponentId(null);
        setSelectedComponentIds([]);
        setEditingComponentId(null);
        setColumnNameDrafts({});
        setPreviewInputValues({});
        setPreviewGridRows({});
        setJsonDraft(JSON.stringify({ components: nextComponents, communications: [] }, null, 2));
        setEditingMenuId(menuId);
        setSavedSnapshot('');
        setJsonTab('visual');
        message.success('Created a screen draft in Screen layout. Use Save to persist it.');
    };
    const addCommunicationFormat = () => {
        const nextIndex = communicationFormats.length + 1;
        const id = `format${nextIndex}`;
        setCommunicationFormats((prev) => [
            ...prev,
            {
                id,
                name: `Format ${nextIndex}`,
                inputFields: ['keyword'],
                outputFields: ['rows'],
                sampleRows: [],
            },
        ]);
        setSelectedFormatId(id);
        message.success(`Added ${id}`);
    };
    const saveCommunicationFormat = async (format) => {
        try {
            await axios.post('http://localhost:8080/api/communications/formats', format);
            message.success(`Saved ${format.id}`);
        }
        catch {
            message.error(`Save failed: ${format.id}`);
        }
    };
    const deleteCommunicationFormat = async (formatId) => {
        try {
            await axios.delete(`http://localhost:8080/api/communications/formats/${formatId}`);
            setCommunicationFormats((prev) => {
                const next = prev.filter((format) => format.id !== formatId);
                setSelectedFormatId((current) => current === formatId ? next[0]?.id ?? '' : current);
                return next;
            });
            setCommunications((prev) => prev.map((comm) => (comm.formatId === formatId ? { ...comm, formatId: '' } : comm)));
            message.success(`Deleted ${formatId}`);
        }
        catch {
            message.error(`Delete failed: ${formatId}`);
        }
    };
    const removeCommunication = (actionId) => {
        setCommunications((prev) => prev.filter((comm) => comm.id !== actionId));
    };
    const updateButtonText = (componentId, value) => {
        setComponents((prev) => prev.map((component) => component.id === componentId && component.type === 'Button'
            ? {
                ...component,
                props: {
                    ...component.props,
                    text: value,
                },
            }
            : component));
    };
    const updateSelectOption = (componentId, index, patch) => {
        setComponents((prev) => prev.map((component) => component.id === componentId && component.type === 'Select'
            ? {
                ...component,
                props: {
                    ...component.props,
                    options: getSelectOptions(component).map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option),
                },
            }
            : component));
    };
    const addSelectOption = (componentId) => {
        setComponents((prev) => prev.map((component) => {
            if (component.id !== componentId || component.type !== 'Select')
                return component;
            const options = getSelectOptions(component);
            const nextIndex = options.length + 1;
            return {
                ...component,
                props: {
                    ...component.props,
                    options: [
                        ...options,
                        { label: `Option ${nextIndex}`, value: `option${nextIndex}` },
                    ],
                },
            };
        }));
    };
    const removeSelectOption = (componentId, index) => {
        setComponents((prev) => prev.map((component) => {
            if (component.id !== componentId || component.type !== 'Select')
                return component;
            const options = getSelectOptions(component);
            return {
                ...component,
                props: {
                    ...component.props,
                    options: options.length > 1
                        ? options.filter((_, optionIndex) => optionIndex !== index)
                        : options,
                },
            };
        }));
    };
    const bindTriggerComponent = (actionId, componentId) => {
        updateCommunication(actionId, { triggerComponentId: componentId });
    };
    const clearTriggerComponent = (actionId) => {
        updateCommunication(actionId, { triggerComponentId: '' });
    };
    const bindInputComponent = (actionId, index, componentId) => {
        updateCommunicationInput(actionId, index, { componentId });
    };
    const clearInputComponent = (actionId, index) => {
        updateCommunicationInput(actionId, index, { componentId: '' });
    };
    const bindOutputComponent = (actionId, index, componentId) => {
        updateCommunicationOutput(actionId, index, { componentId });
        applyFormatRowsToEmptyGrid(actionId, componentId);
    };
    const clearOutputComponent = (actionId, index) => {
        updateCommunicationOutput(actionId, index, { componentId: '' });
    };
    const applyFormatRowsToEmptyGrid = (actionId, componentId, formatIdOverride) => {
        const action = communications.find((comm) => comm.id === actionId);
        const format = communicationFormats.find((item) => item.id === (formatIdOverride || action?.formatId || action?.id));
        if (!format || format.sampleRows.length === 0)
            return;
        setComponents((prev) => prev.map((component) => {
            if (component.id !== componentId || component.type !== 'AgGrid')
                return component;
            if (getGridRows(component).length > 0)
                return component;
            return {
                ...component,
                props: {
                    ...component.props,
                    columnDefs: columnsFromRows(format.sampleRows),
                    rowData: format.sampleRows,
                },
            };
        }));
    };
    const saveGridRowsToLinkedFormat = async (componentId) => {
        const grid = components.find((component) => component.id === componentId && component.type === 'AgGrid');
        const action = communications.find((comm) => comm.outputBindings.some((binding) => binding.componentId === componentId));
        const format = communicationFormats.find((item) => item.id === (action?.formatId || action?.id));
        if (!grid) {
            message.error('Grid component was not found.');
            return;
        }
        if (!format) {
            message.warning('Connect this grid to an output format before saving rows.');
            return;
        }
        const columns = getGridColumns(grid);
        const rows = getGridRows(grid);
        const renamePairs = [];
        for (const column of columns) {
            const oldField = column.field ?? '';
            const draftKey = columnDraftKey(componentId, oldField);
            const newField = (columnNameDrafts[draftKey] ?? oldField).trim();
            if (!newField) {
                message.error('Column name is required.');
                return;
            }
            if (oldField !== newField &&
                columns.some((candidate) => candidate.field === newField && candidate.field !== oldField)) {
                message.error('Column name already exists.');
                return;
            }
            if (oldField !== newField) {
                renamePairs.push({ oldField, newField, draftKey });
            }
        }
        const nextColumns = columns.map((column) => {
            const rename = renamePairs.find((item) => item.oldField === column.field);
            return rename ? { ...column, field: rename.newField } : column;
        });
        const sampleRows = rows.map((row) => {
            const nextRow = { ...row };
            renamePairs.forEach(({ oldField, newField }) => {
                nextRow[newField] = nextRow[oldField] ?? '';
                delete nextRow[oldField];
            });
            return nextRow;
        });
        const normalizedGrid = {
            ...grid,
            props: {
                ...grid.props,
                columnDefs: nextColumns,
                rowData: sampleRows,
            },
        };
        const nextFormat = { ...format, sampleRows };
        setComponents((prev) => prev.map((component) => (component.id === componentId ? normalizedGrid : component)));
        if (renamePairs.length > 0) {
            setColumnNameDrafts((prev) => {
                const next = { ...prev };
                renamePairs.forEach(({ draftKey }) => {
                    delete next[draftKey];
                });
                return next;
            });
        }
        setCommunicationFormats((prev) => prev.map((item) => (item.id === nextFormat.id ? nextFormat : item)));
        try {
            await axios.post('http://localhost:8080/api/communications/formats', nextFormat);
            message.success(`Saved ${sampleRows.length} grid rows to ${nextFormat.id}`);
        }
        catch {
            message.error(`Save failed: ${nextFormat.id}`);
        }
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
    const updateGridColumnDataType = (componentId, field, dataType) => {
        setComponents((prev) => prev.map((c) => {
            if (c.id !== componentId || c.type !== 'AgGrid')
                return c;
            return {
                ...c,
                props: {
                    ...c.props,
                    columnDefs: getGridColumns(c).map((col) => col.field === field ? { ...col, dataType } : col),
                    rowData: getGridRows(c).map((row) => ({
                        ...row,
                        [field]: coerceGridValue(String(row[field] ?? ''), dataType),
                    })),
                },
            };
        }));
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
                    columnDefs: [...columns, { field, dataType: 'string' }],
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
            const dataType = getColumnDataType(getGridColumns(c).find((column) => column.field === field) ?? {});
            return {
                ...c,
                props: {
                    ...c.props,
                    rowData: rows.map((row, index) => index === rowIndex
                        ? {
                            ...row,
                            [field]: coerceGridValue(value, dataType),
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
            const emptyRow = Object.fromEntries(cols.map((col) => [col.field, coerceGridValue('', getColumnDataType(col))]));
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
        if (e.target.closest('[data-delete-btn],[data-resize-handle],[data-grid-editor],[data-select-editor],[data-bind-drag]'))
            return;
        selectComponent(c.id, e.ctrlKey || e.metaKey || e.shiftKey);
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
            setDragGuide({ x: nx, y: ny });
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
        setDragGuide(null);
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
                if (!c || typeof c.id !== 'string' || !isScreenComponentType(c.type)) {
                    message.error(`Each component needs id and type (${SCREEN_COMPONENT_TYPES.join(' | ')}).`);
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
            setCommunications(Array.isArray(parsed.communications)
                ? parsed.communications.map((comm) => ({ ...comm, formatId: comm.formatId || comm.id }))
                : []);
            setColumnNameDrafts({});
            message.success('JSON applied to canvas');
            setJsonTab('visual');
        }
        catch {
            message.error('Invalid JSON');
        }
    };
    const saveCurrentScreen = async (nextValues, previousMenuId = editingMenuId) => {
        const values = nextValues
            ? { ...currentFormValues(), ...nextValues }
            : await form.validateFields([
                'screenId',
                'name',
                'allowRuntimePersonalization',
                'isInitialScreen',
                'menuId',
                'menuName',
                'menuParentId',
                'menuTargetType',
                'menuOpenMode',
            ]);
        const { screenId, name, allowRuntimePersonalization, isInitialScreen, menuId, menuName, menuParentId, menuTargetType, menuOpenMode, } = values;
        const sanitizedCommunications = sanitizeCommunicationsForComponents(communications, components);
        await Promise.all(communicationFormats.map((format) => axios.post('http://localhost:8080/api/communications/formats', format)));
        const json = JSON.stringify({
            components,
            communications: sanitizedCommunications.map(stripScreenCommunication),
        });
        await axios.post('http://localhost:8080/api/screens', {
            screenId,
            name,
            allowRuntimePersonalization: Boolean(allowRuntimePersonalization),
            isInitialScreen: Boolean(isInitialScreen),
            json,
        });
        await axios.post('http://localhost:8080/api/menus', {
            id: menuId,
            previousId: previousMenuId,
            name: menuName,
            screenId: menuTargetType === 'screen' ? screenId : '',
            parentId: menuParentId ?? '',
            targetType: menuTargetType ?? 'screen',
            openMode: menuOpenMode ?? 'inline',
        });
        setEditingMenuId(menuId);
        return { screenId, name };
    };
    const saveMenuOnly = async (nextValues, previousMenuId = editingMenuId) => {
        try {
            const values = nextValues
                ? { ...currentFormValues(), ...nextValues }
                : await form.validateFields([
                    'menuId',
                    'menuName',
                    'menuParentId',
                    'menuTargetType',
                    'menuOpenMode',
                    ...(form.getFieldValue('menuTargetType') === 'screen' ? ['screenId'] : []),
                ]);
            const { menuId, menuName, menuParentId, menuTargetType, menuOpenMode, screenId } = values;
            await axios.post('http://localhost:8080/api/menus', {
                id: menuId,
                previousId: previousMenuId,
                name: menuName,
                screenId: menuTargetType === 'screen' ? screenId : '',
                parentId: menuParentId ?? '',
                targetType: menuTargetType ?? 'screen',
                openMode: menuOpenMode ?? 'inline',
            });
            setEditingMenuId(menuId);
            message.success('Saved menu');
            return true;
        }
        catch (err) {
            console.error(err);
            if (axios.isAxiosError(err)) {
                message.error('Menu save failed (is the backend running on port 8080?)');
            }
            return false;
        }
    };
    const save = async () => {
        if (!hasSelectedScreen) {
            message.info('메뉴나 화면을 먼저 선택하거나 새로 생성하세요.');
            return;
        }
        try {
            await saveCurrentScreen();
            await loadDesignerMetadata();
            captureSavedSnapshot();
            message.success('Saved screen and menu');
        }
        catch (err) {
            console.error(err);
            if (axios.isAxiosError(err)) {
                message.error('Save failed (is the backend running on port 8080?)');
            }
        }
    };
    const saveAction = async (actionId) => {
        try {
            await saveCurrentScreen();
            await loadDesignerMetadata();
            captureSavedSnapshot();
            message.success(`Saved action ${actionId}`);
        }
        catch (err) {
            console.error(err);
            if (axios.isAxiosError(err)) {
                message.error('Action save failed (is the backend running on port 8080?)');
            }
        }
    };
    const newScreen = () => {
        const screenId = nextScreenId(screens);
        const name = `Screen ${screenId.replace('screen-', '')}`;
        settingsForm.setFieldsValue({
            screenId,
            name,
            allowRuntimePersonalization: false,
            isInitialScreen: false,
        });
        setSettingsModal({ type: 'screen', mode: 'new' });
    };
    const saveMenuSettings = async () => {
        if (!settingsModal || settingsModal.type !== 'menu')
            return;
        const values = await settingsForm.validateFields([
            'menuId',
            'menuName',
            'menuParentId',
            'menuTargetType',
            'menuOpenMode',
            ...(settingsForm.getFieldValue('menuTargetType') === 'screen' ? ['screenId'] : []),
        ]);
        const previousMenuId = settingsModal.mode === 'edit' ? editingMenuId : '';
        const saved = await saveMenuOnly(values, previousMenuId);
        if (!saved)
            return;
        applyFormValues(values);
        setEditingMenuId(values.menuId);
        setMenus((prev) => {
            const nextMenu = {
                id: values.menuId,
                name: values.menuName,
                screenId: values.menuTargetType === 'screen' ? values.screenId : '',
                parentId: values.menuParentId ?? '',
                targetType: values.menuTargetType ?? 'screen',
                openMode: values.menuOpenMode ?? 'inline',
            };
            return [
                ...prev.filter((menu) => menu.id !== previousMenuId && menu.id !== values.menuId),
                nextMenu,
            ];
        });
        setExpandedMenuKeys((prev) => prev.includes(values.menuId) ? prev : [...prev, values.menuId]);
        if (settingsModal.mode === 'new-screen') {
            setComponents([]);
            setCommunications([]);
            setSelectedComponentId(null);
            setSelectedComponentIds([]);
            setColumnNameDrafts({});
            setJsonDraft(JSON.stringify({ components: [], communications: [] }, null, 2));
            setJsonTab('visual');
            setSavedSnapshot('');
        }
        else {
            captureSavedSnapshot(values);
        }
        await loadDesignerMetadata();
        setSettingsModal(null);
    };
    const saveScreenSettings = async () => {
        if (!settingsModal || settingsModal.type !== 'screen')
            return;
        try {
            const previousScreenId = form.getFieldValue('screenId');
            const values = await settingsForm.validateFields([
                'screenId',
                'name',
                'allowRuntimePersonalization',
                'isInitialScreen',
            ]);
            if (settingsModal.mode === 'new') {
                const nextMenuId = `menu-${values.screenId}`;
                await axios.post('http://localhost:8080/api/screens', {
                    screenId: values.screenId,
                    name: values.name,
                    allowRuntimePersonalization: Boolean(values.allowRuntimePersonalization),
                    isInitialScreen: Boolean(values.isInitialScreen),
                    json: JSON.stringify({ components: [], communications: [] }),
                });
                await axios.post('http://localhost:8080/api/menus', {
                    id: nextMenuId,
                    previousId: '',
                    name: values.name,
                    screenId: values.screenId,
                    parentId: '',
                    targetType: 'screen',
                    openMode: 'inline',
                });
                const nextValues = {
                    screenId: values.screenId,
                    name: values.name,
                    allowRuntimePersonalization: Boolean(values.allowRuntimePersonalization),
                    isInitialScreen: Boolean(values.isInitialScreen),
                    menuId: nextMenuId,
                    menuName: values.name,
                    menuParentId: '',
                    menuTargetType: 'screen',
                    menuOpenMode: 'inline',
                };
                applyFormValues(nextValues);
                setScreens((prev) => [
                    ...prev.filter((screen) => screen.screenId !== values.screenId),
                    {
                        screenId: values.screenId,
                        name: values.name,
                        allowRuntimePersonalization: Boolean(values.allowRuntimePersonalization),
                        isInitialScreen: Boolean(values.isInitialScreen),
                    },
                ]);
                setMenus((prev) => [
                    ...prev.filter((menu) => menu.id !== nextMenuId),
                    {
                        id: nextMenuId,
                        name: values.name,
                        screenId: values.screenId,
                        parentId: '',
                        targetType: 'screen',
                        openMode: 'inline',
                    },
                ]);
                setComponents([]);
                setCommunications([]);
                setSelectedComponentId(null);
                setSelectedComponentIds([]);
                setColumnNameDrafts({});
                setJsonDraft(JSON.stringify({ components: [], communications: [] }, null, 2));
                setJsonTab('visual');
                setEditingMenuId(nextMenuId);
                await loadDesignerMetadata();
                setSavedSnapshot(JSON.stringify({
                    form: nextValues,
                    components: [],
                    communications: [],
                    communicationFormats,
                }));
                setSettingsModal(null);
                message.success('Added new screen');
                return;
            }
            const nextValues = { ...currentFormValues(), ...values };
            await saveCurrentScreen(nextValues);
            if (previousScreenId && previousScreenId !== values.screenId) {
                await axios.delete(`http://localhost:8080/api/screens/${encodeURIComponent(previousScreenId)}`);
            }
            applyFormValues(values);
            setScreens((prev) => [
                ...prev.filter((screen) => screen.screenId !== previousScreenId && screen.screenId !== values.screenId),
                {
                    screenId: values.screenId,
                    name: values.name,
                    allowRuntimePersonalization: Boolean(values.allowRuntimePersonalization),
                    isInitialScreen: Boolean(values.isInitialScreen),
                },
            ]);
            setMenus((prev) => prev.map((menu) => menu.id === nextValues.menuId
                ? {
                    ...menu,
                    screenId: nextValues.menuTargetType === 'screen' ? values.screenId : '',
                }
                : menu));
            await loadDesignerMetadata();
            captureSavedSnapshot(nextValues);
            setSettingsModal(null);
            message.success('Saved screen settings');
        }
        catch (err) {
            console.error(err);
            if (axios.isAxiosError(err)) {
                message.error('Screen settings save failed (is the backend running on port 8080?)');
            }
        }
    };
    const onLogin = async (values) => {
        try {
            const loginRes = await axios.post('http://localhost:8080/api/auth/login', values);
            const nextToken = loginRes.data.token;
            axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
            setToken(nextToken);
            await loadDesignerMetadata();
        }
        catch {
            message.error('Login failed (is the backend running on port 8080?)');
        }
    };
    if (!token) {
        return (_jsx(Content, { style: {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background: '#fafafa',
            }, children: _jsxs("div", { style: { width: 420 }, children: [_jsx(Typography.Title, { level: 3, children: "Designer MVP" }), _jsxs(Form, { layout: "vertical", onFinish: onLogin, children: [_jsx(Form.Item, { name: "username", rules: [{ required: true }], children: _jsx(Input, { placeholder: "username" }) }), _jsx(Form.Item, { name: "password", rules: [{ required: true }], children: _jsx(Input.Password, { placeholder: "password" }) }), _jsx(Button, { htmlType: "submit", type: "primary", block: true, children: "Login" })] })] }) }));
    }
    return (_jsxs(Layout, { style: { minHeight: '100vh', background: '#f4f6f8' }, children: [_jsxs(Header, { style: {
                    height: 56,
                    lineHeight: 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingInline: 20,
                    background: '#ffffff',
                    borderBottom: '1px solid #d9dee7',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
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
                                }, children: "W" }), _jsxs("div", { children: [_jsx(Typography.Title, { level: 5, style: { margin: 0, lineHeight: 1.1 }, children: "Web Screen Builder" }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: hasSelectedScreen
                                            ? `${watchedScreenName || watchedScreenId} (${watchedScreenId})`
                                            : 'No screen selected' })] })] }), _jsxs(Space, { size: 8, children: [!hasSelectedScreen ? (_jsx(Typography.Text, { type: "secondary", children: "No screen selected" })) : hasUnsavedChanges ? (_jsx(Typography.Text, { type: "warning", children: "Unsaved changes" })) : (_jsx(Typography.Text, { type: "secondary", children: "Saved" })), _jsx(Button, { type: "primary", disabled: !hasSelectedScreen, onClick: save, children: "Save" })] })] }), _jsxs(Layout, { children: [_jsxs(Sider, { width: 300, theme: "light", style: {
                            borderRight: '1px solid #d9dee7',
                            background: '#ffffff',
                            padding: 16,
                            overflow: 'auto',
                            height: 'calc(100vh - 56px)',
                        }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Screens" }), _jsxs(Space, { size: 6, children: [_jsx(Button, { size: "small", type: "primary", onClick: newScreen, children: "New" }), _jsx(Button, { size: "small", onClick: () => setScreenPickerOpen(true), children: "List" }), _jsx(Button, { size: "small", disabled: !hasSelectedScreen, onClick: openScreenSettings, children: "Screen settings" })] })] }), _jsx(List, { size: "small", bordered: true, dataSource: visibleScreens, locale: { emptyText: 'No saved screens' }, renderItem: (screen) => (_jsx(List.Item, { onClick: () => loadScreen(screen.screenId), actions: [
                                        _jsx(Button, { size: "small", danger: true, type: "text", icon: _jsx(DeleteOutlined, {}), "aria-label": "Delete screen", onClick: (e) => {
                                                e.stopPropagation();
                                                confirmDeleteScreen(screen.screenId);
                                            } }, "delete"),
                                    ], style: { cursor: 'pointer', paddingInline: 8 }, children: _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs(Space, { size: 6, children: [_jsx(Typography.Text, { strong: true, children: screen.name || screen.screenId }), screen.isInitialScreen && (_jsx(Typography.Text, { type: "success", style: { fontSize: 12 }, children: "Initial" }))] }), _jsx("div", { children: _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: screen.screenId }) })] }) })), style: { marginBottom: 20, background: '#fff', borderRadius: 8, overflow: 'hidden' } }), _jsx(Modal, { open: screenPickerOpen, title: "Screens", width: 640, onCancel: () => setScreenPickerOpen(false), footer: _jsx(Button, { onClick: () => setScreenPickerOpen(false), children: "Close" }), children: _jsx(List, { size: "small", bordered: true, dataSource: screens, locale: { emptyText: 'No saved screens' }, renderItem: (screen) => (_jsx(List.Item, { onClick: () => {
                                            setScreenPickerOpen(false);
                                            loadScreen(screen.screenId);
                                        }, actions: [
                                            _jsx(Button, { size: "small", danger: true, type: "text", icon: _jsx(DeleteOutlined, {}), "aria-label": "Delete screen", onClick: (e) => {
                                                    e.stopPropagation();
                                                    confirmDeleteScreen(screen.screenId);
                                                } }, "delete"),
                                        ], style: { cursor: 'pointer', paddingInline: 8 }, children: _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs(Space, { size: 6, children: [_jsx(Typography.Text, { strong: true, children: screen.name || screen.screenId }), screen.screenId === watchedScreenId && (_jsx(Typography.Text, { type: "success", style: { fontSize: 12 }, children: "Current" })), screen.isInitialScreen && (_jsx(Typography.Text, { type: "success", style: { fontSize: 12 }, children: "Initial" }))] }), _jsx("div", { children: _jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: screen.screenId }) })] }) })) }) }), _jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Menus" }), _jsxs(Space, { size: 6, children: [_jsx(Dropdown, { trigger: ['click'], menu: {
                                                    items: [
                                                        { key: 'screen', label: 'Screen menu' },
                                                        { key: 'folder', label: 'Folder' },
                                                    ],
                                                    onClick: ({ key }) => {
                                                        if (key === 'folder') {
                                                            startMenuFolder();
                                                        }
                                                        else {
                                                            startMenuScreen();
                                                        }
                                                    },
                                                }, children: _jsx(Button, { size: "small", type: "primary", children: "New" }) }), _jsx(Button, { size: "small", disabled: !hasSelectedMenu, onClick: openMenuSettings, children: "Menu settings" })] })] }), _jsxs("div", { style: {
                                    marginBottom: 20,
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: 8,
                                }, children: [_jsx(Tree, { treeData: menuTreeData, blockNode: true, showLine: true, expandedKeys: expandedMenuKeys, selectedKeys: editingMenuId ? [editingMenuId] : [], onExpand: (keys) => setExpandedMenuKeys(keys), onSelect: (_, info) => {
                                            const menu = menus.find((item) => item.id === String(info.node.key ?? ''));
                                            if (menu) {
                                                loadMenu(menu);
                                            }
                                        } }, `menu-tree-${metadataRevision}`), menus.length === 0 && (_jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: "No saved menus" }))] }), _jsx(Typography.Title, { level: 5, style: { marginTop: 0, marginBottom: 6 }, children: "Presets" }), _jsxs(Space, { direction: "vertical", size: 6, style: { width: '100%', marginBottom: 16 }, children: [_jsx(Button, { block: true, size: "small", onClick: () => addPreset('searchGrid'), children: "Search Form + Grid" }), _jsx(Button, { block: true, size: "small", onClick: () => addPreset('dashboard'), children: "Dashboard Cards + Charts" }), _jsx(Button, { block: true, size: "small", onClick: () => addPreset('popupDetail'), children: "Popup Detail Form" })] }), _jsx(Typography.Title, { level: 5, style: { marginTop: 0, marginBottom: 6 }, children: "Components" }), _jsx("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 8,
                                    padding: 8,
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    background: '#f8fafc',
                                }, children: TOOLBOX.map((t) => (_jsx(Tooltip, { title: `${t.title}: ${t.description}`, children: _jsx("button", { type: "button", draggable: true, onDragStart: (e) => onDragStartToolbox(e, t.type), "aria-label": t.title, style: {
                                            height: 44,
                                            border: '1px solid #d9dee7',
                                            borderRadius: 8,
                                            background: '#ffffff',
                                            color: '#334155',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'grab',
                                            fontSize: 18,
                                            boxShadow: '0 1px 1px rgba(15,23,42,0.04)',
                                        }, children: TOOLBOX_ICONS[t.type] }) }, t.type))) })] }), _jsxs(Content, { style: {
                            padding: 20,
                            background: '#f4f6f8',
                            height: 'calc(100vh - 56px)',
                            overflow: 'auto',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                        }, children: [_jsxs(Form, { form: form, layout: "vertical", onValuesChange: () => setFormRevision((prev) => prev + 1), initialValues: {
                                    screenId: '',
                                    name: '',
                                    allowRuntimePersonalization: false,
                                    isInitialScreen: false,
                                    menuId: '',
                                    menuName: '',
                                    menuParentId: '',
                                    menuTargetType: 'screen',
                                    menuOpenMode: 'inline',
                                }, style: { width: '100%', marginBottom: 12, flex: '0 0 auto' }, children: [_jsx("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            background: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 8,
                                        }, children: _jsxs(Space, { size: 16, wrap: true, children: [_jsxs(Typography.Text, { children: [_jsx("strong", { children: "Menu" }), ' ', hasSelectedMenu ? `${watchedMenuName || watchedMenuId} (${watchedMenuId})` : ''] }), _jsxs(Typography.Text, { children: [_jsx("strong", { children: "Screen" }), ' ', hasSelectedScreen ? `${watchedScreenName || watchedScreenId} (${watchedScreenId})` : ''] }), (!hasSelectedMenu || !hasSelectedScreen) && (_jsx(Typography.Text, { type: "secondary", children: "\uBA54\uB274\uB098 \uD654\uBA74\uC744 \uBA3C\uC800 \uC120\uD0DD\uD558\uAC70\uB098 \uC0C8\uB85C \uC0DD\uC131\uD558\uC138\uC694." }))] }) }), _jsx(Modal, { open: settingsModal?.type === 'menu', title: settingsModal?.type === 'menu' && settingsModal.mode !== 'edit' ? 'New menu' : 'Menu settings', width: 760, onCancel: () => setSettingsModal(null), footer: _jsxs(Space, { children: [settingsModal?.type === 'menu' && settingsModal.mode === 'edit' && (_jsx(Button, { danger: true, onClick: () => confirmDeleteMenu(settingsForm.getFieldValue('menuId')), children: "Delete menu" })), _jsx(Button, { onClick: () => setSettingsModal(null), children: "Cancel" }), _jsx(Button, { type: "primary", onClick: saveMenuSettings, children: "Save menu" })] }), children: _jsx(Form, { form: settingsForm, layout: "vertical", children: _jsxs("div", { style: {
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                    gap: 16,
                                                }, children: [_jsx(Form.Item, { name: "menuId", label: "Menu ID", rules: [{ required: true }], children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "menuName", label: "Menu Name", rules: [{ required: true }], children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "menuParentId", label: "Parent Menu ID", children: _jsx(Input, { placeholder: "empty for root" }) }), _jsx(Form.Item, { name: "menuTargetType", label: "Menu Type", rules: [{ required: true }], children: _jsx(Select, { options: [
                                                                { value: 'screen', label: 'Screen' },
                                                                { value: 'folder', label: 'Folder' },
                                                            ] }) }), _jsx(Form.Item, { name: "menuOpenMode", label: "Open Mode", rules: [{ required: true }], children: _jsx(Select, { options: [
                                                                { value: 'inline', label: 'Inline' },
                                                                { value: 'popup', label: 'Popup' },
                                                            ] }) })] }) }) }), _jsx(Modal, { open: settingsModal?.type === 'screen', title: settingsModal?.type === 'screen' && settingsModal.mode === 'new' ? 'New screen' : 'Screen settings', width: 760, onCancel: () => setSettingsModal(null), footer: _jsxs(Space, { children: [settingsModal?.type === 'screen' && settingsModal.mode === 'edit' && (_jsx(Button, { danger: true, onClick: () => confirmDeleteScreen(settingsForm.getFieldValue('screenId')), children: "Delete screen" })), _jsx(Button, { onClick: () => setSettingsModal(null), children: "Cancel" }), _jsx(Button, { type: "primary", onClick: saveScreenSettings, children: "Save screen" })] }), children: _jsx(Form, { form: settingsForm, layout: "vertical", children: _jsxs("div", { style: {
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                    gap: 16,
                                                }, children: [_jsx(Form.Item, { name: "screenId", label: "Screen ID", rules: [{ required: true }], children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "name", label: "Screen Name", rules: [{ required: true }], children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "allowRuntimePersonalization", label: "Runtime Edit", valuePropName: "checked", children: _jsx(Checkbox, { children: "Allow layout personalization" }) }), _jsx(Form.Item, { name: "isInitialScreen", label: "Initial Screen", valuePropName: "checked", children: _jsx(Checkbox, { children: "Open on runtime login" }) })] }) }) })] }), _jsx(Tabs, { activeKey: jsonTab, onChange: (k) => {
                                    setJsonTab(k);
                                    if (k === 'json')
                                        syncJsonDraftFromComponents();
                                }, style: {
                                    height: 'calc(100% - 84px)',
                                    minHeight: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                }, items: [
                                    {
                                        key: 'visual',
                                        label: 'Screen layout',
                                        children: (_jsxs("div", { onDragOver: acceptDragOver, onDrop: dropNewFromToolbox, style: {
                                                height: 'calc(100vh - 208px)',
                                                minHeight: 360,
                                                background: '#ffffff',
                                                border: '1px solid #d9dee7',
                                                borderRadius: 10,
                                                padding: '16px 16px 24px',
                                                transition: 'border-color 0.2s',
                                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                                                boxSizing: 'border-box',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 14, flex: '0 0 auto' }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Screen Layout" }), _jsxs(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: [components.length, " components"] })] }), _jsxs("div", { ref: canvasInnerRef, onDragOver: acceptDragOver, onDrop: dropNewFromToolbox, style: {
                                                        position: 'relative',
                                                        flex: 1,
                                                        minHeight: 0,
                                                        width: '100%',
                                                        marginTop: 8,
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: 8,
                                                        backgroundColor: '#fbfcfe',
                                                        backgroundSize: `${GRID}px ${GRID}px`,
                                                        backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)`,
                                                        overflow: 'visible',
                                                        boxSizing: 'border-box',
                                                    }, children: [components.length === 0 ? (_jsx(Typography.Paragraph, { type: "secondary", style: { margin: 0 }, children: "Drop components here from the left toolbox." })) : ([...components]
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
                                                                    border: selectedComponentIds.includes(c.id)
                                                                        ? '2px solid #1677ff'
                                                                        : '1px solid #cfd7e3',
                                                                    borderRadius: 8,
                                                                    background: '#fff',
                                                                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                                                                    cursor: 'grab',
                                                                    touchAction: 'none',
                                                                }, onPointerDown: (e) => onItemPointerDown(e, c), onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    selectComponent(c.id, e.ctrlKey || e.metaKey || e.shiftKey);
                                                                }, onPointerMove: onItemPointerMove, onPointerUp: onItemPointerUp, onPointerCancel: onItemPointerUp, children: [_jsxs("div", { "data-bind-drag": true, title: `Drag ${c.type} to communication binding`, style: bindingChipStyle(c.type), children: [_jsx("span", { draggable: true, onDragStart: (e) => onDragStartComponentBinding(e, c), style: {
                                                                                    cursor: 'grab',
                                                                                    padding: '4px 8px',
                                                                                    borderRight: '1px solid rgba(0,0,0,0.12)',
                                                                                }, children: c.type }), _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, {}), "aria-label": "Edit component", "data-delete-btn": true, onPointerDown: (e) => e.stopPropagation(), onClick: () => setEditingComponentId(c.id), style: {
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                    color: 'inherit',
                                                                                } }), _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), "aria-label": "Remove component", "data-delete-btn": true, onPointerDown: (e) => e.stopPropagation(), onClick: () => removeById(c.id), style: {
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                } })] }), _jsx("div", { style: {
                                                                            position: 'relative',
                                                                            height: '100%',
                                                                            width: '100%',
                                                                        }, children: _jsx("div", { style: { width: '100%', height: '100%', minWidth: 0, minHeight: 0 }, children: _jsx(CanvasPreview, { item: c }) }) }), _jsx("div", { "aria-label": "Resize", "data-resize-handle": true, onPointerDown: (e) => onResizePointerDown(e, c), onPointerMove: onResizePointerMove, onPointerUp: onResizePointerUp, onPointerCancel: onResizePointerUp, style: {
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
                                                        })), dragGuide && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                                                        position: 'absolute',
                                                                        left: dragGuide.x,
                                                                        top: 0,
                                                                        bottom: 0,
                                                                        width: 1,
                                                                        background: '#1677ff',
                                                                        pointerEvents: 'none',
                                                                        zIndex: 999,
                                                                    } }), _jsx("div", { style: {
                                                                        position: 'absolute',
                                                                        left: 0,
                                                                        right: 0,
                                                                        top: dragGuide.y,
                                                                        height: 1,
                                                                        background: '#1677ff',
                                                                        pointerEvents: 'none',
                                                                        zIndex: 999,
                                                                    } })] })), actionBindingLines.length > 0 && (_jsx("svg", { style: {
                                                                position: 'absolute',
                                                                inset: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                pointerEvents: 'none',
                                                                zIndex: 998,
                                                            }, children: actionBindingLines.map((line, index) => (_jsx("line", { x1: line.from.x, y1: line.from.y, x2: line.to.x, y2: line.to.y, stroke: line.color, strokeWidth: "2", strokeDasharray: "6 4" }, index))) }))] })] })),
                                    },
                                    {
                                        key: 'json',
                                        label: 'JSON',
                                        children: (_jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: 12, children: [_jsx(Input.TextArea, { rows: 14, value: jsonDraft, onChange: (e) => setJsonDraft(e.target.value), style: { fontFamily: 'monospace', fontSize: 12 } }), _jsxs(Space, { children: [_jsx(Button, { onClick: syncJsonDraftFromComponents, children: "Reset from canvas" }), _jsx(Button, { type: "primary", onClick: applyJsonDraft, children: "Apply to canvas" })] })] })),
                                    },
                                    {
                                        key: 'source-import',
                                        label: 'Source import',
                                        children: (_jsxs("div", { style: {
                                                height: 'calc(100vh - 208px)',
                                                minHeight: 360,
                                                display: 'grid',
                                                gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(420px, 1.1fr)',
                                                gap: 16,
                                            }, children: [_jsxs("div", { style: {
                                                        background: '#ffffff',
                                                        border: '1px solid #d9dee7',
                                                        borderRadius: 8,
                                                        padding: 16,
                                                        minHeight: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        overflow: 'auto',
                                                    }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Source Input" }), _jsx(Select, { size: "small", value: sourceInputType, onChange: (value) => setSourceInputType(value), options: [
                                                                        { value: 'js', label: 'JS' },
                                                                        { value: 'hbs', label: 'HBS' },
                                                                        { value: 'react-js', label: 'React JS' },
                                                                    ], style: { width: 120 } })] }), _jsx(Input.TextArea, { value: sourceInputText, onChange: (e) => setSourceInputText(e.target.value), placeholder: "\uAE30\uC874 js, hbs, react js \uC18C\uC2A4\uB97C \uC5EC\uAE30\uC5D0 \uBD99\uC5EC\uB123\uC73C\uC138\uC694.", style: {
                                                                flex: 1,
                                                                minHeight: 0,
                                                                resize: 'none',
                                                                fontFamily: 'monospace',
                                                                fontSize: 12,
                                                            } }), _jsxs(Space, { style: { marginTop: 12, justifyContent: 'space-between', width: '100%' }, children: [_jsxs(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: [sourceInputText.length, " chars"] }), _jsxs(Space, { size: 8, children: [_jsx(Button, { onClick: clearSourceScreenDraft, children: "Clear" }), _jsx(Button, { type: "primary", onClick: buildSourceScreenDraft, children: "Generate draft" }), _jsx(Button, { loading: aiDraftLoading, onClick: buildAiSourceScreenDraft, children: "AI Generate draft" })] })] })] }), _jsxs("div", { style: {
                                                        background: '#ffffff',
                                                        border: '1px solid #d9dee7',
                                                        borderRadius: 8,
                                                        padding: 16,
                                                        minHeight: 0,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        overflow: 'auto',
                                                    }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Generated Screen" }), _jsxs(Space, { size: 8, children: [_jsx(Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: sourceScreenDraft
                                                                                ? `${sourceTypeLabel(sourceScreenDraft.sourceType)} / ${sourceScreenDraft.lineCount} lines`
                                                                                : 'No draft' }), _jsx(Button, { size: "small", disabled: !sourceScreenDraft, onClick: () => setSourceDraftModalOpen(true), children: "Open large" }), _jsx(Button, { size: "small", type: "primary", disabled: !sourceScreenDraft, onClick: createScreenFromSourceDraft, children: "Create screen" })] })] }), sourceScreenDraft && (_jsx(Alert, { type: "info", showIcon: true, message: sourceScreenDraft.summaryMessage, description: `${sourceScreenDraft.summaryTitle} - ${sourceScreenDraft.summaryDescription}`, style: { marginBottom: 12, flex: '0 0 auto' } })), _jsx(SourceDraftCanvas, { draft: sourceScreenDraft, height: sourceDraftCanvasHeight })] }), _jsx(Modal, { open: sourceDraftModalOpen, title: "Generated Screen", width: "calc(100vw - 96px)", style: { top: 32 }, onCancel: () => setSourceDraftModalOpen(false), footer: _jsxs(Space, { children: [_jsx(Button, { onClick: () => setSourceDraftModalOpen(false), children: "Close" }), _jsx(Button, { type: "primary", disabled: !sourceScreenDraft, onClick: () => {
                                                                    createScreenFromSourceDraft();
                                                                    setSourceDraftModalOpen(false);
                                                                }, children: "Create screen" })] }), children: _jsxs("div", { style: { height: 'calc(100vh - 180px)', overflow: 'auto' }, children: [sourceScreenDraft && (_jsx(Alert, { type: "info", showIcon: true, message: sourceScreenDraft.summaryMessage, description: `${sourceScreenDraft.summaryTitle} - ${sourceScreenDraft.summaryDescription}`, style: { marginBottom: 12 } })), _jsx(SourceDraftCanvas, { draft: sourceScreenDraft, height: Math.max(sourceDraftCanvasHeight, 720) })] }) })] })),
                                    },
                                    {
                                        key: 'preview',
                                        label: 'Preview',
                                        children: (_jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Runtime Preview" }), _jsx(Button, { size: "small", onClick: () => {
                                                                setPreviewInputValues({});
                                                                setPreviewGridRows({});
                                                            }, children: "Reset preview" })] }), _jsx(PreviewRenderer, { components: components, inputValues: previewInputValues, gridRows: previewGridRows, onInputChange: (componentId, value) => setPreviewInputValues((prev) => ({ ...prev, [componentId]: value })), onAction: executePreviewAction })] })),
                                    },
                                ] })] }), _jsxs(Sider, { width: 400, theme: "light", style: {
                            borderLeft: '1px solid #d9dee7',
                            background: '#ffffff',
                            padding: 16,
                            overflow: 'auto',
                            height: 'calc(100vh - 56px)',
                        }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 12 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: "Actions" }), _jsxs(Space, { size: 6, children: [hasUnsavedChanges && (_jsx(Typography.Text, { type: "warning", style: { fontSize: 12 }, children: "Unsaved changes" })), _jsxs(Button, { size: "small", onClick: () => setFormatsModalOpen(true), children: ["Formats (", communicationFormats.length, ")"] }), _jsx(Button, { size: "small", onClick: addCommunication, children: "Add action" })] })] }), _jsx(Typography.Paragraph, { type: "secondary", style: { fontSize: 12, marginBottom: 12 }, children: "Drag a component ID chip from the canvas into a binding box." }), _jsx(Card, { size: "small", title: selectedComponents.length > 1
                                    ? `Selected Components (${selectedComponents.length})`
                                    : 'Selected Component', extra: selectedComponent ? (_jsx(Button, { size: "small", onClick: () => setEditingComponentId(selectedComponent.id), children: "Edit" })) : null, style: { marginBottom: 12 }, children: selectedComponent ? (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [selectedComponents.length > 1 && (_jsxs(Space, { size: 6, wrap: true, children: [_jsx(Button, { size: "small", onClick: () => alignSelectedComponents('left'), children: "Align left" }), _jsx(Button, { size: "small", onClick: () => alignSelectedComponents('top'), children: "Align top" }), _jsx(Button, { size: "small", onClick: distributeSelectedComponents, children: "Distribute" }), _jsx(Button, { size: "small", onClick: () => alignSelectedComponents('sameWidth'), children: "Same width" })] })), _jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: selectedComponent.id }), _jsx(Typography.Text, { type: "secondary", children: selectedComponent.type })] }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "x", type: "number", value: effectiveLayout(selectedComponent).x, onChange: (e) => updateComponentLayout(selectedComponent.id, {
                                                        x: Number(e.target.value) || 0,
                                                    }) }), _jsx(Input, { addonBefore: "y", type: "number", value: effectiveLayout(selectedComponent).y, onChange: (e) => updateComponentLayout(selectedComponent.id, {
                                                        y: Number(e.target.value) || 0,
                                                    }) })] }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "w", type: "number", value: effectiveLayout(selectedComponent).w, onChange: (e) => updateComponentLayout(selectedComponent.id, {
                                                        width: Number(e.target.value) || minSize(selectedComponent.type).w,
                                                    }) }), _jsx(Input, { addonBefore: "h", type: "number", value: effectiveLayout(selectedComponent).h, onChange: (e) => updateComponentLayout(selectedComponent.id, {
                                                        height: Number(e.target.value) || minSize(selectedComponent.type).h,
                                                    }) })] }), _jsx(Input, { addonBefore: "z", type: "number", value: selectedComponent.zIndex ?? 1, onChange: (e) => setComponents((prev) => prev.map((component) => component.id === selectedComponent.id
                                                ? { ...component, zIndex: Number(e.target.value) || 1 }
                                                : component)) })] })) : (_jsx(Typography.Text, { type: "secondary", children: "Select a component on the canvas." })) }), _jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [communications.map((comm) => {
                                        const selectedFormat = communicationFormats.find((format) => format.id === (comm.formatId || comm.id)) ??
                                            {
                                                id: comm.formatId || comm.id,
                                                name: comm.formatId || comm.id,
                                                inputFields: [],
                                                outputFields: [],
                                                sampleRows: [],
                                            };
                                        const inputBindings = comm.inputBindings.length > 0
                                            ? comm.inputBindings
                                            : [{ field: 'keyword', componentId: '' }];
                                        const outputBindings = comm.outputBindings.length > 0 ? comm.outputBindings : [{ field: 'rows', componentId: '' }];
                                        const dropStyle = {
                                            minHeight: 32,
                                            border: '1px dashed #91caff',
                                            borderRadius: 6,
                                            padding: '4px 8px',
                                            background: '#f6ffed',
                                            color: '#262626',
                                            display: 'flex',
                                            alignItems: 'center',
                                        };
                                        return (_jsx(Card, { size: "small", title: comm.name || comm.id, onMouseEnter: () => setSelectedActionId(comm.id), onMouseLeave: () => setSelectedActionId((current) => (current === comm.id ? null : current)), onClick: () => setSelectedActionId(comm.id), style: {
                                                borderRadius: 8,
                                                borderColor: selectedActionId === comm.id ? '#1677ff' : '#e5e7eb',
                                            }, extra: _jsxs(Space, { size: 4, children: [_jsx(Button, { size: "small", type: "primary", onClick: () => saveAction(comm.id), children: "Save" }), _jsx(Button, { danger: true, size: "small", type: "text", onClick: () => removeCommunication(comm.id), children: "Remove" })] }), children: _jsxs(Space, { direction: "vertical", size: 10, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "ID", value: comm.id, onChange: (e) => updateCommunication(comm.id, { id: e.target.value.trim() }) }), _jsx(Input, { addonBefore: "Name", value: comm.name, onChange: (e) => updateCommunication(comm.id, { name: e.target.value }) }), _jsxs("div", { children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginBottom: 6 }, children: [_jsx(Typography.Text, { strong: true, children: "Format" }), _jsx(Button, { size: "small", type: "link", onClick: () => setFormatsModalOpen(true), children: "Manage" })] }), _jsx(Select, { placeholder: "Select format", value: comm.formatId || undefined, options: [
                                                                    ...communicationFormats.map((format) => ({
                                                                        label: `${format.name || format.id} (${format.id})`,
                                                                        value: format.id,
                                                                    })),
                                                                    ...(comm.formatId &&
                                                                        !communicationFormats.some((format) => format.id === comm.formatId)
                                                                        ? [{ label: `${comm.formatId} (missing)`, value: comm.formatId }]
                                                                        : []),
                                                                ], onChange: (value) => changeCommunicationFormat(comm, value), style: { width: '100%' } })] }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, children: "Trigger Button" }), _jsxs(Space.Compact, { style: { width: '100%', marginTop: 6 }, children: [_jsx("div", { onDragOver: acceptComponentBindingDrop, onDrop: (e) => {
                                                                            const dropped = readDroppedComponent(e, ['Button']);
                                                                            if (dropped)
                                                                                bindTriggerComponent(comm.id, dropped.id);
                                                                        }, style: { ...dropStyle, flex: 1 }, children: comm.triggerComponentId || 'Drop Button here' }), _jsx(Button, { disabled: !comm.triggerComponentId, onClick: () => clearTriggerComponent(comm.id), style: { height: 32 }, children: "Clear" })] })] }), _jsxs("div", { children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: "Inputs" }), _jsx(Button, { size: "small", onClick: () => addCommunicationInput(comm.id), children: "Add input" })] }), _jsx(Space, { direction: "vertical", size: 8, style: { width: '100%', marginTop: 6 }, children: inputBindings.map((inputBinding, index) => (_jsxs("div", { children: [_jsxs(Space.Compact, { style: { width: '100%', marginBottom: 6 }, children: [_jsx(Input, { addonBefore: "field", value: inputBinding.field, onChange: (e) => updateCommunicationInput(comm.id, index, {
                                                                                        field: e.target.value,
                                                                                    }) }), _jsx(Button, { danger: true, disabled: inputBindings.length === 1, onClick: () => removeCommunicationInput(comm.id, index), children: "Remove" })] }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx("div", { onDragOver: acceptComponentBindingDrop, onDrop: (e) => {
                                                                                        const dropped = readDroppedComponent(e, [
                                                                                            'Input',
                                                                                            'TextArea',
                                                                                            'NumberInput',
                                                                                            'Select',
                                                                                            'Checkbox',
                                                                                            'Switch',
                                                                                            'DatePicker',
                                                                                        ]);
                                                                                        if (dropped)
                                                                                            bindInputComponent(comm.id, index, dropped.id);
                                                                                    }, style: { ...dropStyle, flex: 1 }, children: inputBinding.componentId || 'Drop input component here' }), _jsx(Button, { disabled: !inputBinding.componentId, onClick: () => clearInputComponent(comm.id, index), style: { height: 32 }, children: "Unlink" })] })] }, `input-${index}`))) })] }), _jsxs("div", { children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: "Outputs" }), _jsx(Button, { size: "small", onClick: () => addCommunicationOutput(comm.id), children: "Add output" })] }), _jsx(Space, { direction: "vertical", size: 8, style: { width: '100%', marginTop: 6 }, children: outputBindings.map((outputBinding, index) => (_jsxs("div", { children: [_jsxs(Space.Compact, { style: { width: '100%', marginBottom: 6 }, children: [_jsx(Input, { addonBefore: "field", value: outputBinding.field, onChange: (e) => updateCommunicationOutput(comm.id, index, {
                                                                                        field: e.target.value,
                                                                                    }) }), _jsx(Button, { danger: true, disabled: outputBindings.length === 1, onClick: () => removeCommunicationOutput(comm.id, index), children: "Remove" })] }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx("div", { onDragOver: acceptComponentBindingDrop, onDrop: (e) => {
                                                                                        const dropped = readDroppedComponent(e, ['AgGrid']);
                                                                                        if (dropped)
                                                                                            bindOutputComponent(comm.id, index, dropped.id);
                                                                                    }, style: { ...dropStyle, flex: 1 }, children: outputBinding.componentId || 'Drop AgGrid here' }), _jsx(Button, { disabled: !outputBinding.componentId, onClick: () => clearOutputComponent(comm.id, index), style: { height: 32 }, children: "Unlink" })] })] }, `output-${index}`))) })] }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, children: "Sample Output Rows JSON" }), _jsx(Input.TextArea, { rows: 5, defaultValue: JSON.stringify(selectedFormat.sampleRows, null, 2), onBlur: (e) => updateCommunicationSampleRows(selectedFormat.id, e.target.value), style: { marginTop: 6, fontFamily: 'monospace', fontSize: 12 } }, `${comm.id}-${selectedFormat.id}-${JSON.stringify(selectedFormat.sampleRows)}`)] })] }) }, comm.id));
                                    }), _jsx(Modal, { open: !!editingComponent, title: editingComponent ? `${editingComponent.type} Component` : 'Component', width: editingComponent?.type === 'AgGrid' ? 1080 : 720, footer: null, destroyOnClose: true, onCancel: () => setEditingComponentId(null), children: editingComponent && (_jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "ID", defaultValue: editingComponent.id, onBlur: (e) => updateComponentId(editingComponent.id, e.target.value), onPressEnter: (e) => e.currentTarget.blur() }, editingComponent.id), editingComponent.type === 'Text' && (_jsx(Input, { addonBefore: "Text", value: editingComponent.props?.text ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { text: e.target.value }) })), editingComponent.type === 'Input' && (_jsx(Input, { addonBefore: "Placeholder", value: editingComponent.props?.placeholder ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { placeholder: e.target.value }) })), editingComponent.type === 'TextArea' && (_jsx(Input, { addonBefore: "Placeholder", value: editingComponent.props?.placeholder ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { placeholder: e.target.value }) })), editingComponent.type === 'NumberInput' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Placeholder", value: editingComponent.props?.placeholder ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { placeholder: e.target.value }) }), _jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(InputNumber, { addonBefore: "Min", value: typeof editingComponent.props?.min === 'number' ? editingComponent.props.min : null, onChange: (value) => updateComponentProps(editingComponent.id, { min: value ?? undefined }), style: { width: '50%' } }), _jsx(InputNumber, { addonBefore: "Max", value: typeof editingComponent.props?.max === 'number' ? editingComponent.props.max : null, onChange: (value) => updateComponentProps(editingComponent.id, { max: value ?? undefined }), style: { width: '50%' } })] })] })), editingComponent.type === 'Select' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Placeholder", value: editingComponent.props?.placeholder ?? '', onChange: (e) => updateComponentProps(editingComponent.id, {
                                                                placeholder: e.target.value,
                                                            }) }), _jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: "Options" }), _jsx(Button, { size: "small", onClick: () => addSelectOption(editingComponent.id), children: "Add" })] }), _jsx(Space, { direction: "vertical", size: 6, style: { width: '100%' }, children: getSelectOptions(editingComponent).map((option, index) => (_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "label", value: option.label, onChange: (e) => updateSelectOption(editingComponent.id, index, {
                                                                            label: e.target.value,
                                                                        }) }), _jsx(Input, { addonBefore: "value", value: option.value, onChange: (e) => updateSelectOption(editingComponent.id, index, {
                                                                            value: e.target.value,
                                                                        }) }), _jsx(Button, { danger: true, disabled: getSelectOptions(editingComponent).length === 1, onClick: () => removeSelectOption(editingComponent.id, index), children: "Delete" })] }, `${option.value}-${index}`))) })] })), editingComponent.type === 'Checkbox' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Label", value: editingComponent.props?.label ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { label: e.target.value }) }), _jsx(Checkbox, { checked: Boolean(editingComponent.props?.checked), onChange: (e) => updateComponentProps(editingComponent.id, {
                                                                checked: e.target.checked,
                                                            }), children: "Checked" })] })), editingComponent.type === 'Switch' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Label", value: editingComponent.props?.label ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { label: e.target.value }) }), _jsx(Switch, { checked: Boolean(editingComponent.props?.checked), onChange: (checked) => updateComponentProps(editingComponent.id, { checked }) })] })), editingComponent.type === 'DatePicker' && (_jsx(Input, { addonBefore: "Placeholder", value: editingComponent.props?.placeholder ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { placeholder: e.target.value }) })), editingComponent.type === 'Button' && (_jsx(Input, { addonBefore: "Text", value: editingComponent.props?.text ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { text: e.target.value }) })), editingComponent.type === 'Divider' && (_jsx(Input, { addonBefore: "Text", value: editingComponent.props?.text ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { text: e.target.value }) })), editingComponent.type === 'Alert' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Message", value: editingComponent.props?.message ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { message: e.target.value }) }), _jsx(Input, { addonBefore: "Description", value: editingComponent.props?.description ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { description: e.target.value }) }), _jsx(Select, { value: editingComponent.props?.alertType ?? 'info', options: [
                                                                { value: 'info', label: 'Info' },
                                                                { value: 'success', label: 'Success' },
                                                                { value: 'warning', label: 'Warning' },
                                                                { value: 'error', label: 'Error' },
                                                            ], onChange: (alertType) => updateComponentProps(editingComponent.id, { alertType }) })] })), editingComponent.type === 'Card' && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Title", value: editingComponent.props?.title ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { title: e.target.value }) }), _jsx(Input, { addonBefore: "Value", value: editingComponent.props?.value ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { value: e.target.value }) }), _jsx(Input, { addonBefore: "Description", value: editingComponent.props?.description ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { description: e.target.value }) })] })), (editingComponent.type === 'BarChart' ||
                                                    editingComponent.type === 'LineChart' ||
                                                    editingComponent.type === 'PieChart' ||
                                                    editingComponent.type === 'DataMap') && (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Title", value: editingComponent.props?.title ?? '', onChange: (e) => updateComponentProps(editingComponent.id, { title: e.target.value }) }), _jsx(Typography.Text, { strong: true, children: "Data JSON" }), _jsx(Input.TextArea, { rows: 8, defaultValue: JSON.stringify(editingComponent.props?.data ?? [], null, 2), onBlur: (e) => {
                                                                try {
                                                                    const parsed = JSON.parse(e.target.value);
                                                                    if (!Array.isArray(parsed)) {
                                                                        message.error('Chart data must be a JSON array.');
                                                                        return;
                                                                    }
                                                                    updateComponentProps(editingComponent.id, { data: parsed });
                                                                }
                                                                catch {
                                                                    message.error('Invalid chart data JSON.');
                                                                }
                                                            }, style: { fontFamily: 'monospace', fontSize: 12 } }, `${editingComponent.id}-chart-data-${JSON.stringify(editingComponent.props?.data)}`)] })), editingComponent.type === 'AgGrid' && (_jsx(Tabs, { items: [
                                                        {
                                                            key: 'table',
                                                            label: 'Table editor',
                                                            children: (_jsx(GridEditor, { item: editingComponent, columnNameDrafts: columnNameDrafts, onGridColumnDraftChange: updateGridColumnDraft, onGridColumnChange: updateGridColumn, onGridColumnDataTypeChange: updateGridColumnDataType, onGridAddColumn: addGridColumn, onGridRemoveColumn: removeGridColumn, onGridSaveRows: saveGridRowsToLinkedFormat, onGridCellChange: updateGridCell, onGridAddRow: addGridRow, onGridRemoveRow: removeGridRow })),
                                                        },
                                                        {
                                                            key: 'json',
                                                            label: 'JSON',
                                                            children: (_jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Typography.Text, { strong: true, children: "Column Definitions JSON" }), _jsx(Input.TextArea, { rows: 7, defaultValue: JSON.stringify(editingComponent.props?.columnDefs ?? [], null, 2), onBlur: (e) => {
                                                                            try {
                                                                                const parsed = JSON.parse(e.target.value);
                                                                                if (!Array.isArray(parsed)) {
                                                                                    message.error('Column definitions must be a JSON array.');
                                                                                    return;
                                                                                }
                                                                                updateComponentProps(editingComponent.id, { columnDefs: parsed });
                                                                            }
                                                                            catch {
                                                                                message.error('Invalid column definitions JSON.');
                                                                            }
                                                                        }, style: { fontFamily: 'monospace', fontSize: 12 } }, `${editingComponent.id}-columns-${JSON.stringify(editingComponent.props?.columnDefs)}`), _jsx(Typography.Text, { strong: true, children: "Rows JSON" }), _jsx(Input.TextArea, { rows: 9, defaultValue: JSON.stringify(editingComponent.props?.rowData ?? [], null, 2), onBlur: (e) => {
                                                                            try {
                                                                                const parsed = JSON.parse(e.target.value);
                                                                                if (!Array.isArray(parsed)) {
                                                                                    message.error('Rows must be a JSON array.');
                                                                                    return;
                                                                                }
                                                                                updateComponentProps(editingComponent.id, { rowData: parsed });
                                                                            }
                                                                            catch {
                                                                                message.error('Invalid rows JSON.');
                                                                            }
                                                                        }, style: { fontFamily: 'monospace', fontSize: 12 } }, `${editingComponent.id}-rows-${JSON.stringify(editingComponent.props?.rowData)}`)] })),
                                                        },
                                                    ] }))] })) }), _jsx(Modal, { open: formatsModalOpen, title: "Communication Formats", width: 920, footer: null, destroyOnClose: true, onCancel: () => setFormatsModalOpen(false), children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: '100%' }, children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, align: "center", children: [_jsx(Select, { placeholder: "Select format", value: selectedFormat?.id, options: communicationFormats.map((format) => ({
                                                                label: `${format.name || format.id} (${format.id})`,
                                                                value: format.id,
                                                            })), onChange: setSelectedFormatId, style: { flex: 1, minWidth: 280 } }), _jsx(Button, { type: "primary", onClick: addCommunicationFormat, children: "Add format" })] }), selectedFormat ? (_jsx("div", { style: { maxHeight: 640, overflow: 'auto' }, children: _jsx(Card, { size: "small", title: selectedFormat.id, extra: _jsxs(Space, { size: 4, children: [_jsx(Button, { size: "small", type: "primary", onClick: () => saveCommunicationFormat(selectedFormat), children: "Save" }), _jsx(Button, { size: "small", danger: true, onClick: () => deleteCommunicationFormat(selectedFormat.id), children: "Delete" })] }), children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: '100%' }, children: [_jsx(Input, { addonBefore: "Name", value: selectedFormat.name, onChange: (e) => updateCommunicationFormat(selectedFormat.id, { name: e.target.value }) }), _jsxs("div", { children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: "Inputs" }), _jsx(Button, { size: "small", onClick: () => addCommunicationFormatField(selectedFormat.id, 'inputFields'), children: "Add" })] }), _jsx(Space, { direction: "vertical", size: 6, style: { width: '100%', marginTop: 6 }, children: selectedFormat.inputFields.map((field, index) => (_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { value: field, onChange: (e) => updateCommunicationFormatField(selectedFormat.id, 'inputFields', index, e.target.value) }), _jsx(Button, { danger: true, disabled: selectedFormat.inputFields.length === 1, onClick: () => removeCommunicationFormatField(selectedFormat.id, 'inputFields', index), children: "Delete" })] }, `format-input-${index}`))) })] }), _jsxs("div", { children: [_jsxs(Space, { style: { width: '100%', justifyContent: 'space-between' }, children: [_jsx(Typography.Text, { strong: true, children: "Outputs" }), _jsx(Button, { size: "small", onClick: () => addCommunicationFormatField(selectedFormat.id, 'outputFields'), children: "Add" })] }), _jsx(Space, { direction: "vertical", size: 6, style: { width: '100%', marginTop: 6 }, children: selectedFormat.outputFields.map((field, index) => (_jsxs(Space.Compact, { style: { width: '100%' }, children: [_jsx(Input, { value: field, onChange: (e) => updateCommunicationFormatField(selectedFormat.id, 'outputFields', index, e.target.value) }), _jsx(Button, { danger: true, disabled: selectedFormat.outputFields.length === 1, onClick: () => removeCommunicationFormatField(selectedFormat.id, 'outputFields', index), children: "Delete" })] }, `format-output-${index}`))) })] }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, children: "Sample Output Rows JSON" }), _jsx(Input.TextArea, { rows: 5, defaultValue: JSON.stringify(selectedFormat.sampleRows, null, 2), onBlur: (e) => updateCommunicationSampleRows(selectedFormat.id, e.target.value), style: { marginTop: 6, fontFamily: 'monospace', fontSize: 12 } }, `format-${selectedFormat.id}-${JSON.stringify(selectedFormat.sampleRows)}`)] })] }) }, selectedFormat.id) })) : (_jsx(Typography.Text, { type: "secondary", children: "No formats. Add one to start." }))] }) }), _jsx("datalist", { id: "communication-format-ids", children: communicationFormats.map((format) => (_jsx("option", { value: format.id }, format.id))) })] })] })] })] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
