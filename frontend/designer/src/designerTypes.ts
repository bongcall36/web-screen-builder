import type { GridRow } from './screenTypes';

export type CommunicationDefinition = {
  id: string;
  name: string;
  formatId: string;
  triggerComponentId: string;
  inputBindings: Array<{ field: string; componentId: string }>;
  outputBindings: Array<{ field: string; componentId: string }>;
  sampleRows?: GridRow[];
};

export type CommunicationFormat = {
  id: string;
  name: string;
  inputFields: string[];
  outputFields: string[];
  sampleRows: GridRow[];
};

export type ScreenSummary = {
  screenId: string;
  name: string;
  allowRuntimePersonalization?: boolean;
  isInitialScreen?: boolean;
};

export type MenuSummary = {
  id: string;
  name: string;
  screenId?: string;
  parentId?: string;
  targetType?: 'folder' | 'screen';
  openMode?: 'inline' | 'popup';
};

export type DesignerFormValues = {
  screenId: string;
  name: string;
  allowRuntimePersonalization?: boolean;
  isInitialScreen?: boolean;
  menuId: string;
  menuName: string;
  menuParentId?: string;
  menuTargetType?: 'screen' | 'folder';
  menuOpenMode?: 'inline' | 'popup';
};

export type SettingsModalState =
  | { type: 'menu'; mode: 'edit' | 'new-screen' | 'new-folder' }
  | { type: 'screen'; mode: 'edit' | 'new' }
  | null;
