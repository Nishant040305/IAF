import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const LoginScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async () => {
    // console.log('AUTH_BASE_URL', AUTH_BASE_URL);
    const trimmedName = name.trim();
    const trimmedPhone = phoneNumber.trim();
    setError('');

    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setError('Enter a valid 10 digit phone number');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(
        '/api/auth/login/request-otp',
        { name: trimmedName, phone_number: trimmedPhone },
        { baseURL: AUTH_BASE_URL }
      );

      router.push({
        pathname: '/auth/otp',
        params: { phone_number: trimmedPhone, name: trimmedName },
      });
    } catch (err: any) {
      // console.error('OTP request failed', err?.response?.status, err?.response?.data, err?.message);
      const message =
        err?.response?.data?.message || 'Failed to request OTP. Please try again.';
      setError(message);
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={images.bg} className="flex-1 bg-black" resizeMode="stretch">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View className="flex-1 bg-black/65 px-6 justify-center">
          <View className="items-center mb-10">
            <Image source={icons.logo} className="w-28 h-28" resizeMode="contain" />
            <Text className="text-white text-3xl font-extrabold mt-6">Welcome</Text>
            <Text className="text-gray-300 mt-2">Gateway to Documents, Dictionary, Abbreviation</Text>
          </View>

          <View className="gap-4 mb-10">
            <View className="bg-[#1c1731] rounded-2xl px-4 py-3 border border-[#2a2540]">
              <Text className="text-gray-300 text-sm mb-1">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#7c86aa"
                className="text-white text-base"
                autoCapitalize="words"
              />
            </View>

            <View className="bg-[#1c1731] rounded-2xl px-4 py-3 border border-[#2a2540]">
              <Text className="text-gray-300 text-sm mb-1">Phone Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                placeholder="10 digit phone number"
                placeholderTextColor="#7c86aa"
                className="text-white text-base tracking-widest"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            {error ? <Text className="text-red-400 text-sm">{error}</Text> : null}

            <TouchableOpacity
              className="bg-[#1E1B3A] rounded-2xl py-3 mt-2 border border-[#3b3560]"
              activeOpacity={0.85}
              onPress={requestOtp}
              disabled={loading}
            >
              <Text className="text-center text-white text-lg font-bold">
                {loading ? 'Sending...' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="items-center mb-10">
            <Text className="text-gray-400 text-xs font-extrabold text-center">
              Developed and maintained by 820 SU, AF Stn Bamrauli
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default LoginScreen;
