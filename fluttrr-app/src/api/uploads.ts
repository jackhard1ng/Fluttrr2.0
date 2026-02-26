import client from './client';

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

interface MultipleUploadResponse {
  files: UploadResponse[];
}

export type { UploadResponse, MultipleUploadResponse };

export const uploadsApi = {
  upload(file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    return client.post<UploadResponse>('/api/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadMultiple(files: { uri: string; name: string; type: string }[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file as unknown as Blob);
    });
    return client.post<MultipleUploadResponse>('/api/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
