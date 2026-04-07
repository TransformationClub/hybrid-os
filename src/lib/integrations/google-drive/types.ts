// ============================================================
// Google Drive integration types
// ============================================================

export interface GoogleDriveConnection {
  id: string;
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  google_email: string;
  connected_at: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

/** Token response from Google OAuth exchange */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}
