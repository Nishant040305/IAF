import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Gets the unique hardware-based device identifier.
 * 
 * Android: Uses Application.getAndroidId() - A 64-bit hex string unique to the device.
 *          This ID survives app reinstalls and storage clears.
 *          It only resets on factory reset.
 * 
 * iOS: Uses Application.getIosIdForVendorAsync() - Unique per vendor/app.
 *      Note: iOS doesn't expose hardware IDs for privacy reasons.
 * 
 * @returns Promise<string> - The unique device identifier
 */
export const getDeviceId = async (): Promise<string> => {
    try {
        if (Platform.OS === 'android') {
            // Android ID: 64-bit hex string, survives app reinstall
            // Only resets on factory reset
            const androidId = Application.getAndroidId();
            if (androidId) {
                console.log('[DeviceID] Android ID:', androidId);
                return `android-${androidId}`;
            }
        } else if (Platform.OS === 'ios') {
            // iOS: identifierForVendor - unique per vendor
            // Note: This resets if all apps from the same vendor are uninstalled
            const iosId = await Application.getIosIdForVendorAsync();
            if (iosId) {
                console.log('[DeviceID] iOS Vendor ID:', iosId);
                return `ios-${iosId}`;
            }
        }

        // Fallback: Combine available device info for a semi-unique ID
        const fallbackId = [
            Platform.OS,
            Device.brand || 'unknown',
            Device.modelName || 'unknown',
            Device.osVersion || 'unknown',
            Device.osBuildId || 'unknown',
        ].join('-');

        console.log('[DeviceID] Using fallback ID:', fallbackId);
        return `fallback-${fallbackId}`;

    } catch (error) {
        console.error('[DeviceID] Error getting device ID:', error);
        // Emergency fallback
        return `error-${Platform.OS}-${Device.modelName || 'device'}`;
    }
};
