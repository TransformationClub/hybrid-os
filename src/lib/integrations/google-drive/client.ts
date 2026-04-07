import type {
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleTokenResponse,
} from "./types";

// ============================================================
// Configuration
// ============================================================

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const isGoogleDriveConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// ============================================================
// OAuth helpers
// ============================================================

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

// ============================================================
// API client factory
// ============================================================

export interface GoogleDriveClient {
  listFiles(folderId?: string, query?: string): Promise<GoogleDriveFile[]>;
  getFileContent(fileId: string): Promise<string>;
  listFolders(parentId?: string): Promise<GoogleDriveFolder[]>;
}

export function createGoogleDriveClient(
  accessToken: string
): GoogleDriveClient {
  if (!isGoogleDriveConfigured) {
    return createMockClient();
  }
  return createLiveClient(accessToken);
}

// ============================================================
// Live client (Google Drive API v3)
// ============================================================

function createLiveClient(accessToken: string): GoogleDriveClient {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers, ...init?.headers },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async listFiles(
      folderId?: string,
      query?: string
    ): Promise<GoogleDriveFile[]> {
      const qParts: string[] = [
        "mimeType != 'application/vnd.google-apps.folder'",
        "trashed = false",
      ];
      if (folderId) {
        qParts.push(`'${folderId}' in parents`);
      }
      if (query) {
        qParts.push(`name contains '${query}'`);
      }

      const params = new URLSearchParams({
        q: qParts.join(" and "),
        fields:
          "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)",
        pageSize: "100",
        orderBy: "modifiedTime desc",
      });

      const data = await apiFetch<{ files: GoogleDriveFile[] }>(
        `${DRIVE_API_BASE}/files?${params.toString()}`
      );
      return data.files;
    },

    async getFileContent(fileId: string): Promise<string> {
      // First get file metadata to determine type
      const meta = await apiFetch<{ mimeType: string }>(
        `${DRIVE_API_BASE}/files/${fileId}?fields=mimeType`
      );

      const googleDocsMimeTypes: Record<string, string> = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
      };

      const exportMime = googleDocsMimeTypes[meta.mimeType];

      let contentUrl: string;
      if (exportMime) {
        // Export Google Workspace files
        contentUrl = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`;
      } else {
        // Download binary/text files directly
        contentUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
      }

      const res = await fetch(contentUrl, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Google Drive content fetch error ${res.status}: ${text}`
        );
      }
      return res.text();
    },

    async listFolders(parentId?: string): Promise<GoogleDriveFolder[]> {
      const qParts: string[] = [
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
      ];
      if (parentId) {
        qParts.push(`'${parentId}' in parents`);
      }

      const params = new URLSearchParams({
        q: qParts.join(" and "),
        fields: "files(id,name,parents,createdTime,modifiedTime)",
        pageSize: "100",
        orderBy: "name",
      });

      const data = await apiFetch<{ files: GoogleDriveFolder[] }>(
        `${DRIVE_API_BASE}/files?${params.toString()}`
      );
      return data.files;
    },
  };
}

// ============================================================
// Mock client (used when Google Drive is not configured)
// ============================================================

// ============================================================
// Standalone API helpers (no client instance needed)
// ============================================================

const GOOGLE_DOCS_EXPORT_BASE = "https://docs.google.com/document/d";
const GOOGLE_DOCS_API_BASE = "https://docs.googleapis.com/v1/documents";

/**
 * Fetch the plain-text / markdown content of a Google Doc via the
 * export endpoint.
 */
export async function fetchDocContent(
  accessToken: string,
  docId: string
): Promise<string> {
  if (!isGoogleDriveConfigured) {
    return `# Mock Google Doc\n\nThis is mock content for document ${docId}.\n\nConnect your Google account to import real documents.`;
  }

  const exportUrl = `${DRIVE_API_BASE}/files/${docId}/export?mimeType=text/plain`;
  const res = await fetch(exportUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch doc content: ${res.status} ${text}`);
  }

  return res.text();
}

/**
 * Fetch metadata (title, last modified, etc.) for a Google Doc.
 */
export async function fetchDocMetadata(
  accessToken: string,
  docId: string
): Promise<{
  id: string;
  title: string;
  mimeType: string;
  modifiedTime: string;
  createdTime?: string;
}> {
  if (!isGoogleDriveConfigured) {
    return {
      id: docId,
      title: `Mock Document (${docId})`,
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: new Date().toISOString(),
      createdTime: new Date().toISOString(),
    };
  }

  const url = `${DRIVE_API_BASE}/files/${docId}?fields=id,name,mimeType,modifiedTime,createdTime`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch doc metadata: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    createdTime?: string;
  };

  return {
    id: data.id,
    title: data.name,
    mimeType: data.mimeType,
    modifiedTime: data.modifiedTime,
    createdTime: data.createdTime,
  };
}

// ============================================================
// Mock client (used when Google Drive is not configured)
// ============================================================

function createMockClient(): GoogleDriveClient {
  return {
    async listFiles(): Promise<GoogleDriveFile[]> {
      return [
        {
          id: "mock-file-1",
          name: "Q2 Marketing Strategy.docx",
          mimeType: "application/vnd.google-apps.document",
          modifiedTime: "2026-03-28T14:30:00Z",
          webViewLink: "https://docs.google.com/document/d/mock-file-1",
        },
        {
          id: "mock-file-2",
          name: "Campaign Performance Report.xlsx",
          mimeType: "application/vnd.google-apps.spreadsheet",
          modifiedTime: "2026-04-01T09:15:00Z",
          webViewLink: "https://docs.google.com/spreadsheets/d/mock-file-2",
        },
        {
          id: "mock-file-3",
          name: "Brand Guidelines v3.pdf",
          mimeType: "application/pdf",
          size: 2450000,
          modifiedTime: "2026-02-15T11:00:00Z",
          webViewLink:
            "https://drive.google.com/file/d/mock-file-3/view",
        },
      ];
    },

    async getFileContent(): Promise<string> {
      return "This is mock file content from Google Drive. Connect your Google account to access real files.";
    },

    async listFolders(): Promise<GoogleDriveFolder[]> {
      return [
        {
          id: "mock-folder-1",
          name: "Marketing",
          createdTime: "2026-01-10T08:00:00Z",
        },
        {
          id: "mock-folder-2",
          name: "Campaign Assets",
          parents: ["mock-folder-1"],
          createdTime: "2026-02-01T10:00:00Z",
        },
        {
          id: "mock-folder-3",
          name: "Reports",
          createdTime: "2026-01-15T09:00:00Z",
        },
      ];
    },
  };
}
