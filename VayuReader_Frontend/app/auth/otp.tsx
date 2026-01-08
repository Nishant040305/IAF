import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import { AUTH_BASE_URL } from '@/constants/config';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { AuthUser } from '@/lib/authStorage';

const OtpScreen = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ phone_number?: string; name?: string }>();
  const phoneNumber = useMemo(() => params.phone_number ?? '', [params.phone_number]);
  const name = useMemo(() => params.name ?? '', [params.name]);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const otpValue = useMemo(() => digits.join(''), [digits]);

  const handleDigitChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const char = cleaned.slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!phoneNumber) {
      setError('Missing phone number. Please login again.');
      router.replace('/auth/login');
      return;
    }
    if (!/^[0-9]{6}$/.test(otpValue)) {
      setError('Enter the 6 digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post(
        '/api/auth/login/verify-otp',
        { phone_number: phoneNumber, otp: otpValue },
        { baseURL: AUTH_BASE_URL }
      );

      console.log('[OTP] Verification Success. Data:', response.data);

      const token = response.data?.data?.token as string | undefined;
      const userFromApi = response.data?.data?.user as AuthUser | undefined;

      console.log('[OTP] Extracted Token:', token);

      if (!token) {
        throw new Error('Token missing in server response (check JSON path)');
      }

      await signIn(token, userFromApi || (name && phoneNumber ? { name, phone_number: phoneNumber } : undefined));
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[OTP] Verification Catch:', err);
      const serverMessage = err?.response?.data?.message;
      const internalMessage = err?.message;
      const finalMessage = serverMessage || internalMessage || 'Unknown error during verification';

      setError(finalMessage);
      Alert.alert('Verification failed', `Error: ${finalMessage}\n\nTrace: ${internalMessage || 'No trace'}`, [
        { text: 'OK' },
        { text: 'Reset Login', onPress: () => router.replace('/auth/login') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!name || !phoneNumber) {
      router.replace('/auth/login');
      return;
    }

    try {
      setResending(true);
      await apiClient.post(
        '/api/auth/login/request-otp',
        { name, phone_number: phoneNumber },
        { baseURL: AUTH_BASE_URL }
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to resend OTP.';
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const renderOtpBoxes = () => {
    return (
      <View className="flex-row justify-between mt-4">
        {Array.from({ length: 6 }).map((_, idx) => {
          const active = Boolean(digits[idx]);
          return (
            <TextInput
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              value={digits[idx]}
              onChangeText={(val) => handleDigitChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              className={`w-12 h-14 rounded-xl text-center text-white text-xl font-bold border ${active ? 'border-[#5B5FEF]' : 'border-[#2a2540]'
                } bg-[#1c1731]`}
              returnKeyType="done"
            />
          );
        })}
      </View>
    );
  };

  return (
    <ImageBackground source={images.bg} className="flex-1 bg-black" resizeMode="stretch">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View className="flex-1 bg-black/65 px-6 justify-center mb-12">
          <View className="items-center mb-6">
            <Image source={icons.logo} className="w-28 h-32" resizeMode="cover" />
            <Text className="text-white text-2xl font-extrabold mt-4">Enter OTP</Text>
            <Text className="text-gray-300 mt-1">Sent to {phoneNumber || 'your phone'}</Text>
          </View>

          {renderOtpBoxes()}

          {error ? <Text className="text-red-400 text-sm mt-3">{error}</Text> : null}

          <TouchableOpacity
            className="bg-[#1E1B3A] rounded-2xl py-3 mt-6 border border-[#3b3560]"
            activeOpacity={0.85}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text className="text-center text-white text-lg font-bold">
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-3 mt-3 rounded-2xl border border-[#2a2540]"
            activeOpacity={0.8}
            onPress={handleResend}
            disabled={resending}
          >
            <Text className="text-center text-[#9aa3c5] font-semibold">
              {resending ? 'Resending...' : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
          <View className="items-center mt-4 mb-2">
            <Text className="text-gray-400 text-xs font-extrabold text-center">
              Developed and maintained by 820 SU, AF Stn Bamrauli
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default OtpScreen;
