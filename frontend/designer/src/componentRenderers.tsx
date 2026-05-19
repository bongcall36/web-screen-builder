import React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import type { SourceScreenDraft } from './sourceImport';
import {
  GRID,
  effectiveLayout,
  type ChartDatum,
  type GridColumnDef,
  type GridRow,
  type ScreenComponent,
  type ScreenComponentType,
} from './screenTypes';

export function getGridColumns(item: ScreenComponent): GridColumnDef[] {
  const raw = item.props?.columnDefs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((col): col is GridColumnDef => typeof col === 'object' && col !== null);
}

export function getGridRows(item: ScreenComponent): GridRow[] {
  const raw = item.props?.rowData;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is GridRow => typeof row === 'object' && row !== null);
}

function getChartData(props: Record<string, unknown> | undefined): ChartDatum[] {
  const raw = props?.data;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      label: String(item.label ?? ''),
      value: Number(item.value ?? 0),
    }))
    .filter((item) => item.label && Number.isFinite(item.value));
}

const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];

function ChartPanel({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 10,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#fff',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Typography.Text strong style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
        {title}
      </Typography.Text>
      {children}
    </div>
  );
}

function ChartPreview({ type, props }: { type: ScreenComponentType; props?: Record<string, unknown> }) {
  const data = getChartData(props);
  const max = Math.max(1, ...data.map((item) => item.value));
  const title = String(props?.title ?? type);

  if (type === 'Card') {
    return (
      <div
        style={{
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
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {String(props?.title ?? 'Metric')}
        </Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0' }}>
          {String(props?.value ?? '0')}
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12 }}>
          {String(props?.description ?? '')}
        </Typography.Text>
      </div>
    );
  }

  if (type === 'BarChart') {
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 'calc(100% - 22px)' }}>
          {data.map((item, index) => (
            <div key={item.label} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <div
                style={{
                  height: `${Math.max(8, (item.value / max) * 120)}px`,
                  background: CHART_COLORS[index % CHART_COLORS.length],
                  borderRadius: 4,
                }}
              />
              <Typography.Text style={{ fontSize: 10 }}>{item.label}</Typography.Text>
            </div>
          ))}
        </div>
      </ChartPanel>
    );
  }

  if (type === 'LineChart') {
    const points = data.map((item, index) => {
      const x = data.length <= 1 ? 20 : 20 + (index / (data.length - 1)) * 260;
      const y = 130 - (item.value / max) * 110;
      return `${x},${y}`;
    });
    return (
      <ChartPanel title={title}>
        <svg viewBox="0 0 300 150" style={{ width: '100%', height: 'calc(100% - 22px)' }}>
          <polyline points={points.join(' ')} fill="none" stroke="#1677ff" strokeWidth="4" />
          {points.map((point, index) => {
            const [x, y] = point.split(',').map(Number);
            return <circle key={data[index].label} cx={x} cy={y} r="4" fill="#1677ff" />;
          })}
        </svg>
      </ChartPanel>
    );
  }

  if (type === 'PieChart') {
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 'calc(100% - 22px)' }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `conic-gradient(${data
                .reduce(
                  (parts, item, index) => {
                    const total = data.reduce((sum, row) => sum + row.value, 0) || 1;
                    const start = parts.offset;
                    const end = start + (item.value / total) * 360;
                    parts.items.push(`${CHART_COLORS[index % CHART_COLORS.length]} ${start}deg ${end}deg`);
                    parts.offset = end;
                    return parts;
                  },
                  { items: [] as string[], offset: 0 },
                )
                .items.join(', ')})`,
            }}
          />
          <Space direction="vertical" size={2}>
            {data.map((item, index) => (
              <Typography.Text key={item.label} style={{ fontSize: 11 }}>
                <span style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>■</span> {item.label}
              </Typography.Text>
            ))}
          </Space>
        </div>
      </ChartPanel>
    );
  }

  if (type === 'DataMap') {
    return (
      <ChartPanel title={title}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {data.map((item) => {
            const lightness = 92 - Math.round((item.value / max) * 42);
            return (
              <div
                key={item.label}
                style={{
                  minHeight: 34,
                  padding: 4,
                  borderRadius: 4,
                  background: `hsl(211, 100%, ${lightness}%)`,
                  fontSize: 11,
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </ChartPanel>
    );
  }

  return null;
}

export function getSelectOptions(item: ScreenComponent) {
  const raw = item.props?.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((option) => typeof option === 'object' && option !== null)
    .map((option: any) => ({
      label: String(option.label ?? option.value ?? ''),
      value: String(option.value ?? option.label ?? ''),
    }))
    .filter((option) => option.value);
}

export function getVisibleGridColumns(item: ScreenComponent): GridColumnDef[] {
  return getGridColumns(item).filter((col) => typeof col.field === 'string' && col.field);
}

export function CanvasPreview({
  item,
}: {
  item: ScreenComponent;
}) {
  if (item.type === 'Text') {
    return (
      <Typography.Text
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          fontWeight: 600,
        }}
      >
        {(item.props?.text as string) ?? 'Label'}
      </Typography.Text>
    );
  }
  if (item.type === 'Input') {
    return (
      <Input
        readOnly
        placeholder={(item.props?.placeholder as string) ?? 'Input'}
        style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
      />
    );
  }
  if (item.type === 'TextArea') {
    return (
      <Input.TextArea
        readOnly
        placeholder={(item.props?.placeholder as string) ?? 'Text area'}
        style={{ width: '100%', height: '100%', resize: 'none', boxSizing: 'border-box' }}
      />
    );
  }
  if (item.type === 'NumberInput') {
    return (
      <InputNumber
        readOnly
        placeholder={(item.props?.placeholder as string) ?? 'Number'}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
  if (item.type === 'Select') {
    return (
      <Select
        disabled
        placeholder={(item.props?.placeholder as string) ?? 'Select'}
        options={getSelectOptions(item)}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
  if (item.type === 'Checkbox') {
    return (
      <Checkbox checked={Boolean(item.props?.checked)} disabled>
        {(item.props?.label as string) ?? 'Checkbox'}
      </Checkbox>
    );
  }
  if (item.type === 'Switch') {
    return (
      <Space size={8}>
        <Switch checked={Boolean(item.props?.checked)} disabled />
        <Typography.Text>{(item.props?.label as string) ?? 'Enabled'}</Typography.Text>
      </Space>
    );
  }
  if (item.type === 'DatePicker') {
    return (
      <DatePicker
        disabled
        placeholder={(item.props?.placeholder as string) ?? 'Select date'}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
  if (item.type === 'Button') {
    return (
      <Button type="primary" disabled style={{ width: '100%', height: '100%' }}>
        {(item.props?.text as string) ?? 'Button'}
      </Button>
    );
  }
  if (item.type === 'Divider') {
    return <Divider style={{ margin: 0 }}>{(item.props?.text as string) ?? ''}</Divider>;
  }
  if (item.type === 'Alert') {
    return (
      <Alert
        type={(item.props?.alertType as 'success' | 'info' | 'warning' | 'error') ?? 'info'}
        message={(item.props?.message as string) ?? 'Information'}
        description={(item.props?.description as string) ?? undefined}
        showIcon
        style={{ height: '100%', overflow: 'hidden' }}
      />
    );
  }
  if (item.type === 'AgGrid') {
    const cols = getVisibleGridColumns(item);
    const rows = getGridRows(item);
    return (
      <div
        data-grid-editor
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          background: '#fff',
        }}
      >
        <Space style={{ width: '100%', padding: 4, borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text style={{ fontSize: 12 }} strong>
            {item.id}
          </Typography.Text>
        </Space>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col.field}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 4,
                    textAlign: 'left',
                  }}
                >
                  {col.field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {cols.map((col) => {
                  const field = col.field ?? '';
                  return (
                    <td
                      key={field}
                      style={{
                        borderBottom: '1px solid #f5f5f5',
                        fontSize: 12,
                        padding: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(row[field] ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (
    item.type === 'BarChart' ||
    item.type === 'LineChart' ||
    item.type === 'PieChart' ||
    item.type === 'DataMap' ||
    item.type === 'Card'
  ) {
    return <ChartPreview type={item.type} props={item.props} />;
  }
  return null;
}

export function SourceDraftCanvas({
  draft,
  height,
}: {
  draft: SourceScreenDraft | null;
  height: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height,
        minHeight: height,
        width: '100%',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: '#fbfcfe',
        backgroundSize: `${GRID}px ${GRID}px`,
        backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)`,
        boxSizing: 'border-box',
      }}
    >
      {!draft ? (
        <Typography.Paragraph type="secondary" style={{ margin: 16 }}>
          소스를 붙여넣고 Generate draft를 누르면 화면 초안이 여기에 표시됩니다.
        </Typography.Paragraph>
      ) : (
        draft.components.map((component) => {
          const layout = effectiveLayout(component);
          return (
            <div
              key={component.id}
              style={{
                position: 'absolute',
                left: layout.x,
                top: layout.y,
                width: layout.w,
                height: layout.h,
                zIndex: component.zIndex ?? 1,
                boxSizing: 'border-box',
                padding: 8,
                border: '1px solid #cfd7e3',
                borderRadius: 8,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              }}
            >
              <CanvasPreview item={component} />
            </div>
          );
        })
      )}
    </div>
  );
}

export function PreviewRenderer({
  components,
  inputValues,
  gridRows,
  onInputChange,
  onAction,
}: {
  components: ScreenComponent[];
  inputValues: Record<string, string | boolean | number | null>;
  gridRows: Record<string, GridRow[]>;
  onInputChange: (componentId: string, value: string | boolean | number | null) => void;
  onAction: (componentId: string) => void;
}) {
  const placed = components.map((component, index) => {
    const L = effectiveLayout(component);
    const hasLayout =
      component.layout &&
      typeof component.layout.x === 'number' &&
      typeof component.layout.y === 'number';
    const x = hasLayout ? L.x : 12;
    const y = hasLayout ? L.y : 12 + index * 80;
    return { component, L, x, y, bottom: y + L.h };
  });
  const canvasHeight = Math.max(420, ...placed.map((item) => item.bottom + 24));

  return (
    <div
      style={{
        position: 'relative',
        minHeight: canvasHeight,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#fff',
      }}
    >
      {placed.map(({ component, L, x, y }) => {
        const common: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          width: L.w,
          height: L.h,
          zIndex: component.zIndex ?? 1,
          boxSizing: 'border-box',
        };

        if (component.type === 'Text') {
          return (
            <div key={component.id} style={common}>
              <Typography.Text
                style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}
              >
                {(component.props?.text as string) ?? 'Label'}
              </Typography.Text>
            </div>
          );
        }

        if (component.type === 'Input') {
          return (
            <div key={component.id} style={common}>
              <Input
                placeholder={(component.props?.placeholder as string) ?? 'Input'}
                value={String(inputValues[component.id] ?? '')}
                onChange={(event) => onInputChange(component.id, event.target.value)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (component.type === 'TextArea') {
          return (
            <div key={component.id} style={common}>
              <Input.TextArea
                placeholder={(component.props?.placeholder as string) ?? 'Text area'}
                value={String(inputValues[component.id] ?? '')}
                onChange={(event) => onInputChange(component.id, event.target.value)}
                style={{ width: '100%', height: '100%', resize: 'none' }}
              />
            </div>
          );
        }

        if (component.type === 'NumberInput') {
          return (
            <div key={component.id} style={common}>
              <InputNumber
                placeholder={(component.props?.placeholder as string) ?? 'Number'}
                min={typeof component.props?.min === 'number' ? component.props.min : undefined}
                max={typeof component.props?.max === 'number' ? component.props.max : undefined}
                value={(inputValues[component.id] as number | null | undefined) ?? null}
                onChange={(value) => onInputChange(component.id, value)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (component.type === 'Select') {
          return (
            <div key={component.id} style={common}>
              <Select
                placeholder={(component.props?.placeholder as string) ?? 'Select'}
                options={getSelectOptions(component)}
                value={(inputValues[component.id] as string | undefined) || undefined}
                onChange={(value) => onInputChange(component.id, value)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (component.type === 'Checkbox') {
          return (
            <div key={component.id} style={common}>
              <Checkbox
                checked={Boolean(inputValues[component.id] ?? component.props?.checked)}
                onChange={(event) => onInputChange(component.id, event.target.checked)}
              >
                {(component.props?.label as string) ?? 'Checkbox'}
              </Checkbox>
            </div>
          );
        }

        if (component.type === 'Switch') {
          return (
            <div key={component.id} style={common}>
              <Space size={8}>
                <Switch
                  checked={Boolean(inputValues[component.id] ?? component.props?.checked)}
                  onChange={(checked) => onInputChange(component.id, checked)}
                />
                <Typography.Text>{(component.props?.label as string) ?? 'Enabled'}</Typography.Text>
              </Space>
            </div>
          );
        }

        if (component.type === 'DatePicker') {
          return (
            <div key={component.id} style={common}>
              <DatePicker
                placeholder={(component.props?.placeholder as string) ?? 'Select date'}
                onChange={(_, dateString) =>
                  onInputChange(
                    component.id,
                    Array.isArray(dateString) ? dateString[0] ?? '' : dateString,
                  )
                }
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          );
        }

        if (component.type === 'Button') {
          return (
            <div key={component.id} style={common}>
              <Button
                type="primary"
                onClick={() => onAction(component.id)}
                style={{ width: '100%', height: '100%' }}
              >
                {(component.props?.text as string) ?? 'Button'}
              </Button>
            </div>
          );
        }

        if (component.type === 'Divider') {
          return (
            <div key={component.id} style={common}>
              <Divider style={{ margin: 0 }}>{(component.props?.text as string) ?? ''}</Divider>
            </div>
          );
        }

        if (component.type === 'Alert') {
          return (
            <div key={component.id} style={common}>
              <Alert
                type={(component.props?.alertType as 'success' | 'info' | 'warning' | 'error') ?? 'info'}
                message={(component.props?.message as string) ?? 'Information'}
                description={(component.props?.description as string) ?? undefined}
                showIcon
                style={{ height: '100%', overflow: 'hidden' }}
              />
            </div>
          );
        }

        if (component.type === 'AgGrid') {
          const columns = getVisibleGridColumns(component);
          const rows = gridRows[component.id] ?? [];
          return (
            <div
              key={component.id}
              style={{
                ...common,
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                background: '#fff',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.field}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          padding: 6,
                          textAlign: 'left',
                          fontSize: 12,
                        }}
                      >
                        {column.field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td
                          key={column.field}
                          style={{ borderBottom: '1px solid #f5f5f5', padding: 6, fontSize: 12 }}
                        >
                          {String(row[column.field ?? ''] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (
          component.type === 'BarChart' ||
          component.type === 'LineChart' ||
          component.type === 'PieChart' ||
          component.type === 'DataMap' ||
          component.type === 'Card'
        ) {
          return (
            <div key={component.id} style={common}>
              <ChartPreview type={component.type} props={component.props} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
