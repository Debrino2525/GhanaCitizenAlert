import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export interface UseCameraRecorderProps {
  onMediaAttached: (type: 'VIDEO' | 'IMAGE', uri: string, durationSec: number) => void;
}

export interface UseCameraRecorderResult {
  cameraRef: React.RefObject<any>;
  hasCameraPermission: boolean | null;
  facing: CameraType;
  isRecording: boolean;
  recordingSeconds: number;
  recordedDuration: number;
  hasRecordedMedia: boolean;
  recordedUri: string | null;
  mediaType: 'VIDEO' | 'IMAGE';
  toggleCameraFacing: () => void;
  handleToggleRecording: () => Promise<void>;
  handleSnapPhoto: () => Promise<void>;
  handlePickFromGallery: () => Promise<void>;
  handleClearMedia: () => void;
  requestPermissions: () => Promise<void>;
}

export const useCameraRecorder = ({ onMediaAttached }: UseCameraRecorderProps): UseCameraRecorderResult => {
  const cameraRef = useRef<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [hasRecordedMedia, setHasRecordedMedia] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'VIDEO' | 'IMAGE'>('VIDEO');

  const requestPermissions = useCallback(async () => {
    try {
      const cam = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      setHasCameraPermission(cam.status === 'granted' && mic.status === 'granted');
    } catch {
      setHasCameraPermission(false);
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  const handleClearMedia = useCallback(() => {
    setRecordedUri(null);
    setHasRecordedMedia(false);
    setRecordingSeconds(0);
    setRecordedDuration(0);
  }, []);

  // Stop recording internal implementation
  const stopRecordingInternal = useCallback(() => {
    setIsRecording(false);
    try {
      if (cameraRef.current && cameraRef.current.stopRecording) {
        cameraRef.current.stopRecording();
      }
    } catch (e) {
      console.warn('Stop record error:', e);
    }
  }, []);

  // 60-Second Hard Limit Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            stopRecordingInternal();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, stopRecordingInternal]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecordingInternal();
      setRecordedDuration(recordingSeconds || 1);
    } else {
      if (!hasCameraPermission) {
        const cam = await Camera.requestCameraPermissionsAsync();
        const mic = await Camera.requestMicrophonePermissionsAsync();
        if (cam.status !== 'granted' || mic.status !== 'granted') {
          Alert.alert(
            'Permissions Needed',
            'Camera and Microphone access are required to record video evidence.'
          );
          return;
        }
        setHasCameraPermission(true);
      }

      setHasRecordedMedia(false);
      setRecordedUri(null);
      setRecordingSeconds(0);
      setIsRecording(true);
      setMediaType('VIDEO');

      try {
        if (cameraRef.current) {
          cameraRef.current
            .recordAsync({
              maxDuration: 60,
              quality: '720p',
              codec: 'avc1'
            })
            .then((result: any) => {
              if (result?.uri) {
                setRecordedUri(result.uri);
                setHasRecordedMedia(true);
                const finalDur = recordingSeconds || 15;
                setRecordedDuration(finalDur);
                onMediaAttached('VIDEO', result.uri, finalDur);
              }
            })
            .catch((err: any) => {
              console.warn('Record promise error:', err);
            })
            .finally(() => {
              setIsRecording(false);
            });
        }
      } catch (err: any) {
        console.warn('Camera record start failed:', err);
        setIsRecording(false);
      }
    }
  }, [isRecording, hasCameraPermission, recordingSeconds, onMediaAttached, stopRecordingInternal]);

  const handleSnapPhoto = useCallback(async () => {
    if (!hasCameraPermission) {
      const cam = await Camera.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera permission required to take photo.');
        return;
      }
      setHasCameraPermission(true);
    }

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          setRecordedUri(photo.uri);
          setHasRecordedMedia(true);
          setMediaType('IMAGE');
          setRecordedDuration(1);
          onMediaAttached('IMAGE', photo.uri, 1);
        }
      }
    } catch (err: any) {
      Alert.alert('Photo Error', err.message || 'Could not snap photo.');
    }
  }, [hasCameraPermission, onMediaAttached]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to select evidence.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos', 'images'],
        allowsEditing: false,
        quality: 0.8,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video';
        const dur = asset.duration ? Math.round(asset.duration / 1000) : 10;

        if (isVid && dur > 60) {
          Alert.alert(
            'Video Exceeds Limit',
            'Evidence videos must be 60 seconds or less under Emergency CAD protocol. Please trim or record a shorter clip.'
          );
          return;
        }

        const type = isVid ? 'VIDEO' : 'IMAGE';
        setRecordedUri(asset.uri);
        setHasRecordedMedia(true);
        setMediaType(type);
        setRecordedDuration(dur);
        onMediaAttached(type, asset.uri, dur);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Unable to open gallery.');
    }
  }, [onMediaAttached]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  return {
    cameraRef,
    hasCameraPermission,
    facing,
    isRecording,
    recordingSeconds,
    recordedDuration,
    hasRecordedMedia,
    recordedUri,
    mediaType,
    toggleCameraFacing,
    handleToggleRecording,
    handleSnapPhoto,
    handlePickFromGallery,
    handleClearMedia,
    requestPermissions
  };
};
