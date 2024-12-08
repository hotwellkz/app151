import { ref, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { showErrorNotification, showSuccessNotification } from './notifications';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    if (!file || !path) {
      throw new Error('File and path are required');
    }

    // Проверяем размер файла (макс. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showErrorNotification('Файл слишком большой (максимум 10MB)');
      throw new Error('File too large');
    }

    const storageRef = ref(storage, path);
    
    // Проверяем существование storage reference
    if (!storageRef) {
      throw new Error('Failed to create storage reference');
    }

    const metadata = {
      contentType: file.type,
      cacheControl: 'public,max-age=3600'
    };

    return new Promise((resolve, reject) => {
      console.log('Starting upload task...');

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      if (!uploadTask) {
        reject(new Error('Failed to create upload task'));
        return;
      }

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress for ${file.name}: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error('Upload error:', { error, file, path });
          showErrorNotification('Ошибка при загрузке файла');
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`Upload completed for ${file.name}:`, downloadURL);
            showSuccessNotification('Файл успешно загружен');
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', { error, file, path });
            showErrorNotification('Ошибка при получении ссылки на файл');
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadFile:', { error, file, path });
    throw error;
  }
};

export const uploadImage = async (file: File, path: string): Promise<string> => {
  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    showErrorNotification('Можно загружать только изображения');
    throw new Error('Invalid file type');
  }
  
  return uploadFile(file, path);
};

export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    showSuccessNotification('Файл успешно удален');
  } catch (error) {
    console.error('Error deleting file:', error);
    showErrorNotification('Ошибка при удалении файла');
    throw error;
  }
};

export const getFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};