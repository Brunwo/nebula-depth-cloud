// Using Gradio Client for Depth Anything V2 Space
import { Client } from "@gradio/client";

const GRADIO_SPACE = "depth-anything/Depth-Anything-V2";

// Helper function to convert base64 to blob
const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
  // Remove data URL prefix if present
  const cleanBase64 = base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const generateDepthMap = async (base64Image: string): Promise<string> => {
  try {
    // Connect to the Gradio space
    const client = await Client.connect(GRADIO_SPACE);

    // Convert base64 to blob
    const imageBlob = base64ToBlob(base64Image);

    // Make prediction
    const result = await client.predict("/on_submit", {
      image: imageBlob, // Pass the blob directly
    });

    // The result.data is an array with 3 elements:
    // [0]: Depth Map with Slider View
    // [1]: Grayscale depth map (FileData object with URL)
    // [2]: 16-bit raw output (File)
    // We want the grayscale depth map [1]
    const grayscaleDepthMap = result.data[1];

    if (!grayscaleDepthMap) {
      throw new Error("No grayscale depth map returned from the model");
    }

    // Handle Gradio FileData object with URL property
    if (grayscaleDepthMap && typeof grayscaleDepthMap === 'object' && 'url' in grayscaleDepthMap) {
      console.log('Fetching image from Gradio URL:', grayscaleDepthMap.url);
      try {
        const response = await fetch(grayscaleDepthMap.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log('Fetched blob size:', blob.size, 'type:', blob.type);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('Successfully converted blob to data URL, length:', reader.result?.toString().length);
            resolve(reader.result as string);
          };
          reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(new Error('Failed to convert blob to data URL'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        console.error('Error fetching from Gradio URL:', fetchError);
        throw new Error(`Failed to fetch depth map image: ${fetchError.message}`);
      }
    }

    // Fallback: handle other formats if they occur
    // The result is likely already a data URL or we need to convert it
    if (typeof grayscaleDepthMap === 'string' && grayscaleDepthMap.startsWith('data:')) {
      console.log('Returning data URL directly');
      return grayscaleDepthMap;
    }

    // If it's a blob/file, convert to data URL
    if (grayscaleDepthMap instanceof Blob || grayscaleDepthMap instanceof File) {
      console.log('Converting blob/file to data URL');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('FileReader result:', reader.result);
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(grayscaleDepthMap);
      });
    }

    // If it's already a base64 string, convert to data URL
    if (typeof grayscaleDepthMap === 'string') {
      console.log('Converting base64 string to data URL');
      return `data:image/png;base64,${grayscaleDepthMap}`;
    }

    console.error('Unexpected response format:', grayscaleDepthMap);
    throw new Error("Unexpected response format from depth estimation model");

  } catch (error) {
    console.error('Depth map generation failed:', error);
    throw new Error(`Failed to generate depth map: ${error.message}`);
  }
};

// Legacy API key functions (kept for compatibility but no longer needed for Gradio)
export const saveApiKey = (key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('hf_api_key', key.trim());
  }
};

const getApiKey = () => {
  // No longer needed for Gradio client
  return '';
};
