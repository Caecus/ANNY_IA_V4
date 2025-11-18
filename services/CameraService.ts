import { Camera } from 'expo-camera';

// Esta función debe ser llamada desde un componente que renderice <Camera />
// Recibe la referencia al componente Camera y devuelve la imagen en base64
export async function captureImage(cameraRef: Camera): Promise<string | null> {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.8 });
    return photo.base64 || null;
  } catch (error) {
    return null;
  }
}