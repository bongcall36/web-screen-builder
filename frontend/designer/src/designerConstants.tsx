import React from 'react';
import {
  CalendarOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  FieldNumberOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  FormOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  MinusOutlined,
  NotificationOutlined,
  OneToOneOutlined,
  PieChartOutlined,
  ProfileOutlined,
  SwitcherOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { CommunicationDefinition, CommunicationFormat } from './designerTypes';
import type { GridDataType, ScreenComponent, ScreenComponentType } from './screenTypes';

export const GRID_DATA_TYPE_OPTIONS: Array<{ value: GridDataType; label: string }> = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
];

export const DEFAULT_COMPONENTS: ScreenComponent[] = [];

export const DEFAULT_COMMUNICATIONS: CommunicationDefinition[] = [];

export const DEFAULT_COMMUNICATION_FORMATS: CommunicationFormat[] = [
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

export const COMPONENT_DRAG_MIME = 'application/x-wsb-component';
export const COMPONENT_BIND_MIME = 'application/x-wsb-bind-component';

export const TOOLBOX: { type: ScreenComponentType; title: string; description: string }[] = [
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

export const TOOLBOX_ICONS: Record<ScreenComponentType, React.ReactNode> = {
  Text: <FontSizeOutlined />,
  Input: <FormOutlined />,
  TextArea: <FileTextOutlined />,
  NumberInput: <FieldNumberOutlined />,
  Select: <UnorderedListOutlined />,
  Checkbox: <CheckSquareOutlined />,
  Switch: <SwitcherOutlined />,
  DatePicker: <CalendarOutlined />,
  Button: <OneToOneOutlined />,
  Divider: <MinusOutlined />,
  Alert: <NotificationOutlined />,
  AgGrid: <TableOutlined />,
  BarChart: <BarChartOutlined />,
  LineChart: <LineChartOutlined />,
  PieChart: <PieChartOutlined />,
  DataMap: <HeatMapOutlined />,
  Card: <ProfileOutlined />,
};
