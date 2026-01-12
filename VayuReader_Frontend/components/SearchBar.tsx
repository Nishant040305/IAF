import { icons } from '@/constants/icons';
import React from 'react';
import {
  Image,
  NativeSyntheticEvent,
  TextInput,
  TextInputSubmitEditingEventData,
  TouchableOpacity,
  View,
  StyleSheet
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
}

const SearchBar = ({ placeholder, value, onChangeText, onSubmitEditing }: Props) => {
  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
  };

  return (
    <View style={styles.container}>
      <Image
        source={icons.search}
        style={styles.searchIcon}
        resizeMode="contain"
      />

      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholderTextColor="#7c86aa"
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.clearCircle}>
            <Image
              source={icons.search}
              style={styles.clearIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1731',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2540',
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#5B5FEF',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  clearButton: {
    marginLeft: 8,
  },
  clearCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    width: 10,
    height: 10,
    tintColor: '#8888aa',
    transform: [{ rotate: '45deg' }],
  },
});

export default SearchBar;

