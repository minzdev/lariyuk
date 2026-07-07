import React, { createContext, useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface ToastOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
}

interface DialogContextProps {
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
    type?: 'danger' | 'primary'
  ) => void;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast State
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const timeoutRef = useRef<any>(null);

  // Confirm State
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 3000
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ title, message, type });

    // Slide Down
    Animated.spring(slideAnim, {
      toValue: 50, // Safe Area offset roughly
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();

    // Auto dismiss
    timeoutRef.current = setTimeout(() => {
      dismissToast();
    }, duration);
  };

  const dismissToast = () => {
    Animated.timing(slideAnim, {
      toValue: -180,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Yakin',
    cancelText = 'Batal',
    type: 'danger' | 'primary' = 'primary'
  ) => {
    setConfirm({ title, message, onConfirm, confirmText, cancelText, type });
  };

  const handleConfirmAction = () => {
    if (confirm?.onConfirm) {
      confirm.onConfirm();
    }
    setConfirm(null);
  };

  const handleCancelAction = () => {
    setConfirm(null);
  };

  // Get Icon based on Type
  const getToastIcon = (type: 'success' | 'error' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'error':
        return <Ionicons name="alert-circle" size={24} color="#F44336" />;
      case 'warning':
        return <Ionicons name="warning" size={24} color="#FF9800" />;
      case 'info':
      default:
        return <Ionicons name="information-circle" size={24} color="#007AFF" />;
    }
  };

  // Get Border Color based on Type
  const getToastBorderColor = (type: 'success' | 'error' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'info':
      default:
        return '#007AFF';
    }
  };

  return (
    <DialogContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Animated Toast Notification */}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: slideAnim }],
              borderLeftColor: getToastBorderColor(toast.type),
            },
          ]}
        >
          <View style={styles.toastContent}>
            <View style={styles.toastIconWrapper}>{getToastIcon(toast.type)}</View>
            <View style={styles.toastTextWrapper}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastMessage}>{toast.message}</Text>
            </View>
            <TouchableOpacity onPress={dismissToast} style={styles.toastCloseBtn}>
              <Ionicons name="close" size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Modern Confirmation Modal */}
      <Modal
        visible={confirm !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelAction}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconContainer}>
              <Ionicons
                name={confirm?.type === 'danger' ? 'trash-outline' : 'help-circle-outline'}
                size={32}
                color={confirm?.type === 'danger' ? '#F44336' : Colors.light.primary}
              />
            </View>
            <Text style={styles.confirmTitle}>{confirm?.title}</Text>
            <Text style={styles.confirmMessage}>{confirm?.message}</Text>

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={handleCancelAction} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>{confirm?.cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAction}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: confirm?.type === 'danger' ? '#F44336' : Colors.light.primary },
                ]}
              >
                <Text style={styles.confirmBtnText}>{confirm?.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
};

export const useDialogs = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogs must be used within a DialogProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  // Toast styles
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 5,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIconWrapper: {
    marginRight: 12,
  },
  toastTextWrapper: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  toastMessage: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  toastCloseBtn: {
    padding: 4,
  },

  // Confirm Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 12, 18, 0.45)', // Slightly dark overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
