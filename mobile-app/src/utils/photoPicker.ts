import { ActionSheetIOS, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as api from "../api/endpoints";
import { apiRequest } from "../api/client";

export interface PickedPhotoResult {
  uri: string;
  url: string;
}

// Crea un FormData universal para iOS, Android y Web
export function buildPhotoFormData(uri: string, customFilename?: string): FormData {
  let finalUri = uri;
  if (Platform.OS === "ios") {
    // Si la URI en iOS no tiene esquema, añadir file://
    if (!finalUri.includes("://")) {
      finalUri = `file://${finalUri}`;
    }
  } else if (Platform.OS === "android") {
    // En Android file:// o content:// son válidos
  }

  // Extraer nombre de archivo limpio
  const pathParts = uri.split("/");
  const lastPart = pathParts[pathParts.length - 1] || "";
  const cleanName = lastPart.split("?")[0] || `photo_${Date.now()}.jpg`;
  const filename = customFilename || (cleanName.includes(".") ? cleanName : `${cleanName}.jpg`);

  // Detectar extensión y tipo MIME
  const dotIndex = filename.lastIndexOf(".");
  const ext = dotIndex !== -1 ? filename.substring(dotIndex + 1).toLowerCase() : "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("photo", {
    uri: finalUri,
    name: filename,
    type: mimeType,
  } as any);

  return formData;
}

// Sube un archivo a partir de su URI local con fallback robusto
export async function uploadLocalPhoto(uri: string, base64?: string | null): Promise<string> {
  // 1. Si tenemos el Base64 generado por el picker, subir como JSON Base64 directamente
  // Esto evita caídas de socket y límites de multipart en React Native / Expo Go sobre red local
  if (base64) {
    try {
      const response = await apiRequest<{ url: string }>("/runs/upload", {
        method: "POST",
        body: { base64 },
      });
      return response.url;
    } catch (base64Err) {
      console.warn("[Upload Base64 Failed, trying multipart...]", base64Err);
    }
  }

  // 2. Intentar vía FormData multipart estándar
  try {
    const formData = buildPhotoFormData(uri);
    const response = await api.uploadPhoto(formData);
    return response.url;
  } catch (err) {
    console.error("[Upload Multipart Failed]", err);
    throw err;
  }
}

// Abre el selector (Cámara o Galería) con permisos completos
export async function promptPhotoSelection(options?: {
  title?: string;
  message?: string;
  allowsMultiple?: boolean;
}): Promise<PickedPhotoResult[] | null> {
  return new Promise((resolve) => {
    const title = options?.title || "Adjuntar fotografía";
    const message = options?.message || "Selecciona cómo deseas agregar la foto:";

    const takePhoto = async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permiso de cámara requerido",
            "Por favor permite el acceso a la cámara en los ajustes de tu dispositivo para capturar evidencia."
          );
          resolve(null);
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: false,
          base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          resolve(null);
          return;
        }

        const uploadedList: PickedPhotoResult[] = [];
        for (const asset of result.assets) {
          const url = await uploadLocalPhoto(asset.uri, asset.base64);
          uploadedList.push({ uri: asset.uri, url });
        }
        resolve(uploadedList);
      } catch (err) {
        Alert.alert("Error al capturar foto", err instanceof Error ? err.message : "No se pudo tomar la foto");
        resolve(null);
      }
    };

    const chooseGallery = async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permiso de galería requerido",
            "Por favor permite el acceso a las fotos en los ajustes de tu dispositivo para adjuntar evidencia."
          );
          resolve(null);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsMultipleSelection: options?.allowsMultiple ?? false,
          base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          resolve(null);
          return;
        }

        const uploadedList: PickedPhotoResult[] = [];
        for (const asset of result.assets) {
          const url = await uploadLocalPhoto(asset.uri, asset.base64);
          uploadedList.push({ uri: asset.uri, url });
        }
        resolve(uploadedList);
      } catch (err) {
        Alert.alert("Error al seleccionar foto", err instanceof Error ? err.message : "No se pudo cargar la foto");
        resolve(null);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: ["Tomar foto con la cámara", "Elegir de la galería", "Cancelar"],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            takePhoto();
          } else if (buttonIndex === 1) {
            chooseGallery();
          } else {
            resolve(null);
          }
        }
      );
    } else {
      Alert.alert(title, message, [
        { text: "Tomar foto con la cámara", onPress: takePhoto },
        { text: "Elegir de la galería", onPress: chooseGallery },
        { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
      ]);
    }
  });
}
