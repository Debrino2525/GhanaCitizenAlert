import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { safeHaptics, announceAccessibility } from '../utils/haptics';
import { getRealFileSizeBytes, formatBytesToMB } from '../utils/fileSize';

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
    safeHaptics.light();
  }, []);

  // Stop recording internal implementation
  const stopRecordingInternal = useCallback(() => {
    setIsRecording(false);
    safeHaptics.medium();
    announceAccessibility('Video recording stopped and evidence captured.');
    try {
      if (cameraRef.current && cameraRef.current.stopRecording) {
        cameraRef.current.stopRecording();
      }
    } catch (e) {
      console.warn('Stop record error:', e);
    }
  }, []);

  // 45-Second Hard Limit Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 44) {
            stopRecordingInternal();
            return 45;
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
      safeHaptics.heavy();
      announceAccessibility('Video recording started. 45 seconds maximum duration.');

      try {
        if (cameraRef.current) {
          // ALWAYS pass codec: 'avc1' on iOS; otherwise AVFoundation silently ignores the videoBitrate prop set on CameraView.
          cameraRef.current
            .recordAsync({
              codec: 'avc1',
              maxDuration: 45,
              maxFileSize: 40 * 1024 * 1024 // 40 MB hard stop in bytes
            })
            .then(async (result: any) => {
              if (result?.uri) {
                setRecordedUri(result.uri);
                setHasRecordedMedia(true);
                const finalDur = recordingSeconds || 15;
                setRecordedDuration(finalDur);

                // Read real file size and log
                const realSizeBytes = await getRealFileSizeBytes(result.uri);
                console.log(`[EVIDENCE_MEDIA] Camera recording complete: duration=${finalDur}s, size=${realSizeBytes} bytes (${formatBytesToMB(realSizeBytes)}), uri=${result.uri}`);

                // Inform citizen if recording halted due to limits
                if (realSizeBytes >= 39.5 * 1024 * 1024) {
                  Alert.alert(
                    'Size Limit Reached',
                    'Recording stopped automatically because the 40 MB evidence size limit was reached.'
                  );
                } else if (finalDur >= 45) {
                  Alert.alert(
                    'Time Limit Reached',
                    'Recording stopped automatically at the 45-second statutory time limit.'
                  );
                }

                onMediaAttached('VIDEO', result.uri, finalDur);
                safeHaptics.success();
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
        safeHaptics.medium();
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          const realSizeBytes = await getRealFileSizeBytes(photo.uri);
          console.log(`[EVIDENCE_MEDIA] Photo captured: size=${realSizeBytes} bytes (${formatBytesToMB(realSizeBytes)}), uri=${photo.uri}`);

          setRecordedUri(photo.uri);
          setHasRecordedMedia(true);
          setMediaType('IMAGE');
          setRecordedDuration(1);
          onMediaAttached('IMAGE', photo.uri, 1);
          safeHaptics.success();
          announceAccessibility('Photo captured and watermarked.');
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

      safeHaptics.light();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos', 'images'],
        allowsEditing: false,
        quality: 0.8,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_640x480
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video';
        const dur = asset.duration ? Math.round(asset.duration / 1000) : 10;
        const realSizeBytes = (await getRealFileSizeBytes(asset.uri)) || asset.fileSize || 0;

        console.log(`[EVIDENCE_MEDIA] Gallery item picked: type=${asset.type}, duration=${dur}s, size=${realSizeBytes} bytes (${formatBytesToMB(realSizeBytes)}), uri=${asset.uri}`);

        if (isVid && (dur > 45 || realSizeBytes > 40 * 1024 * 1024)) {
          Alert.alert(
            'Video Exceeds Limit',
            'This video is longer than 45 seconds or larger than 40 MB. Trim it in your phone\'s Photos app and choose it again, record inside the app, or choose a photo.'
          );
          return;
        }

        if (!isVid && realSizeBytes > 40 * 1024 * 1024) {
          Alert.alert(
            'Photo Exceeds Limit',
            'This image is larger than 40 MB. Please choose a smaller photo or take a photo inside the app.'
          );
          return;
        }

        const type = isVid ? 'VIDEO' : 'IMAGE';
        setRecordedUri(asset.uri);
        setHasRecordedMedia(true);
        setMediaType(type);
        setRecordedDuration(dur);
        onMediaAttached(type, asset.uri, dur);
        safeHaptics.success();
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Unable to open gallery.');
    }
  }, [onMediaAttached]);

  const toggleCameraFacing = useCallback(() => {
    safeHaptics.light();
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
