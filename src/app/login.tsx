import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';
import { loginUser } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Silakan isi email dan password Anda.');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      // Success is handled by auth state listener in _layout.tsx,
      // which will redirect automatically, but let's navigate just in case
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Gagal Masuk', error.message || 'Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {/* Logo */}
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Track. Improve. Enjoy.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Selamat Datang!</Text>
          <Text style={styles.description}>Masuk untuk melanjutkan pelacakan aktivitas lari Anda.</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Alamat Email"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Kata Sandi"
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons 
                name={secureText ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={Colors.light.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Signup */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 220,
    height: 70,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  form: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
