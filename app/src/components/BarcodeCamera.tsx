// Native barcode camera (iOS/Android app) — uses expo-camera's CameraView.
// The web build resolves BarcodeCamera.web.tsx instead (BarcodeDetector API).
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme';

interface Props {
  active: boolean;
  onDetected: (code: string) => void;
}

export default function BarcodeCamera({ active, onDetected }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={theme.accentBlue} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.note}>Camera access is needed to scan.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      {active ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          autofocus="on"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={({ data }) => onDetected(data)}
        />
      ) : null}
      <View style={styles.reticle} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 300,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  reticle: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    right: '12%',
    height: '40%',
    borderWidth: 2,
    borderColor: theme.accentBlue,
    borderRadius: 12,
  },
  note: { color: theme.textDim, textAlign: 'center', marginBottom: 14 },
  btn: { backgroundColor: theme.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
});
