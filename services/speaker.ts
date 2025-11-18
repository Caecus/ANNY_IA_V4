import * as Speech from 'expo-speech';

export const speak = (text: string) => {
  Speech.speak(text, {
    language: 'es-ES',
    pitch: 1,
    rate: 1,
  });
};

export const stopSpeaking = () => {
  Speech.stop();
};