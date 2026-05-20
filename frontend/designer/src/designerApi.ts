import axios from 'axios';
import type { CommunicationFormat, MenuSummary, ScreenSummary } from './designerTypes';
import type { ScreenComponent } from './screenTypes';
import type { CommunicationDefinition } from './designerTypes';

const API_BASE_URL = 'http://localhost:8080/api';

export type ScreenPayload = {
  screenId: string;
  name: string;
  allowRuntimePersonalization: boolean;
  isInitialScreen: boolean;
  json: string;
};

export type MenuPayload = {
  id: string;
  previousId: string;
  name: string;
  screenId: string;
  parentId: string;
  targetType: 'screen' | 'folder';
  openMode: 'inline' | 'popup';
};

export type ScreenMetadata = ScreenSummary & {
  components?: ScreenComponent[];
  communications?: CommunicationDefinition[];
};

export function isApiError(error: unknown) {
  return axios.isAxiosError(error);
}

export function apiStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function setAuthToken(token: string) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export async function login(credentials: { username: string; password: string }) {
  const response = await axios.post<{ token: string }>(`${API_BASE_URL}/auth/login`, credentials);
  return response.data;
}

export async function fetchDesignerMetadata() {
  const cacheBuster = Date.now();
  const [screens, menus, communicationFormats] = await Promise.all([
    axios.get<ScreenSummary[]>(`${API_BASE_URL}/screens`, { params: { _: cacheBuster } }),
    axios.get<MenuSummary[]>(`${API_BASE_URL}/menus`, { params: { _: cacheBuster } }),
    axios.get<CommunicationFormat[]>(`${API_BASE_URL}/communications/formats`, {
      params: { _: cacheBuster },
    }),
  ]);

  return {
    screens: screens.data,
    menus: menus.data,
    communicationFormats: communicationFormats.data,
  };
}

export async function fetchScreen(screenId: string) {
  const response = await axios.get<ScreenMetadata>(`${API_BASE_URL}/screens/${screenId}`);
  return response.data;
}

export async function saveScreen(payload: ScreenPayload) {
  await axios.post(`${API_BASE_URL}/screens`, payload);
}

export async function deleteScreenById(screenId: string) {
  await axios.delete(`${API_BASE_URL}/screens/${encodeURIComponent(screenId)}`);
}

export async function saveMenu(payload: MenuPayload) {
  await axios.post(`${API_BASE_URL}/menus`, payload);
}

export async function deleteMenuById(menuId: string) {
  await axios.delete(`${API_BASE_URL}/menus/${encodeURIComponent(menuId)}`);
}

export async function executeCommunication(formatId: string, input: Record<string, unknown>) {
  const response = await axios.post<Record<string, unknown>>(
    `${API_BASE_URL}/communications/${formatId}/execute`,
    input,
  );
  return response.data;
}

export async function saveCommunicationFormat(format: CommunicationFormat) {
  await axios.post(`${API_BASE_URL}/communications/formats`, format);
}

export async function saveCommunicationFormats(formats: CommunicationFormat[]) {
  await Promise.all(formats.map((format) => saveCommunicationFormat(format)));
}

export async function deleteCommunicationFormatById(formatId: string) {
  await axios.delete(`${API_BASE_URL}/communications/formats/${encodeURIComponent(formatId)}`);
}
