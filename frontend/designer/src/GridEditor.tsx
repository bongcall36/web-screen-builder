import { DeleteOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space } from 'antd';
import { getGridRows, getVisibleGridColumns } from './componentRenderers';
import { GRID_DATA_TYPE_OPTIONS } from './designerConstants';
import {
  columnDraftKey,
  getColumnDataType,
} from './designerUtils';
import type { GridDataType, ScreenComponent } from './screenTypes';

type GridEditorProps = {
  item: ScreenComponent;
  columnNameDrafts: Record<string, string>;
  onGridColumnDraftChange: (componentId: string, field: string, value: string) => void;
  onGridColumnChange: (componentId: string, oldField: string) => void;
  onGridColumnDataTypeChange: (
    componentId: string,
    field: string,
    dataType: GridDataType,
  ) => void;
  onGridAddColumn: (componentId: string) => void;
  onGridRemoveColumn: (componentId: string, field: string) => void;
  onGridSaveRows: (componentId: string) => void;
  onGridCellChange: (componentId: string, rowIndex: number, field: string, value: string) => void;
  onGridAddRow: (componentId: string) => void;
  onGridRemoveRow: (componentId: string, rowIndex: number) => void;
};

export function GridEditor({
  item,
  columnNameDrafts,
  onGridColumnDraftChange,
  onGridColumnChange,
  onGridColumnDataTypeChange,
  onGridAddColumn,
  onGridRemoveColumn,
  onGridSaveRows,
  onGridCellChange,
  onGridAddRow,
  onGridRemoveRow,
}: GridEditorProps) {
  const cols = getVisibleGridColumns(item);
  const rows = getGridRows(item);

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space size={8} wrap>
        <Button size="small" onClick={() => onGridAddColumn(item.id)}>
          Add column
        </Button>
        <Button size="small" onClick={() => onGridAddRow(item.id)}>
          Add row
        </Button>
        <Button size="small" type="primary" onClick={() => onGridSaveRows(item.id)}>
          Save rows
        </Button>
      </Space>
      <div
        style={{
          maxHeight: 520,
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          background: '#fff',
        }}
      >
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
                    minWidth: 220,
                  }}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="small"
                      value={columnNameDrafts[columnDraftKey(item.id, col.field ?? '')] ?? col.field}
                      onChange={(e) =>
                        onGridColumnDraftChange(item.id, col.field ?? '', e.target.value)
                      }
                      onBlur={() => onGridColumnChange(item.id, col.field ?? '')}
                      onPressEnter={(e) => e.currentTarget.blur()}
                    />
                    <Select
                      size="small"
                      value={getColumnDataType(col)}
                      options={GRID_DATA_TYPE_OPTIONS}
                      onChange={(value) =>
                        onGridColumnDataTypeChange(item.id, col.field ?? '', value)
                      }
                      style={{ width: 96 }}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Remove column"
                      onClick={() => onGridRemoveColumn(item.id, col.field ?? '')}
                    />
                  </Space.Compact>
                </th>
              ))}
              <th style={{ borderBottom: '1px solid #f0f0f0', width: 42 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {cols.map((col) => {
                  const field = col.field ?? '';
                  return (
                    <td key={field} style={{ padding: 3, verticalAlign: 'top' }}>
                      <Input
                        size="small"
                        value={String(row[field] ?? '')}
                        onChange={(e) =>
                          onGridCellChange(item.id, rowIndex, field, e.target.value)
                        }
                      />
                    </td>
                  );
                })}
                <td style={{ padding: 3, verticalAlign: 'top' }}>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Remove row"
                    onClick={() => onGridRemoveRow(item.id, rowIndex)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Space>
  );
}
