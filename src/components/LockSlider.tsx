import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Dimensions 
} from 'react-native';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LockSliderProps {
  onLockStateChange: (locked: boolean) => void;
  isLocked: boolean;
}

const SLIDER_WIDTH = Dimensions.get('window').width - 64; // Horizontal padding padding
const THUMB_SIZE = 48;
const TRAVEL_DISTANCE = SLIDER_WIDTH - THUMB_SIZE - 8; // Margin spacing

export default function LockSlider({ onLockStateChange, isLocked }: LockSliderProps) {
  // Use state initializer instead of useRef.current to avoid access-during-render errors
  const [pan] = useState(() => new Animated.Value(0));
  
  const sliderText = isLocked ? 'Geser untuk Membuka Kunci' : 'Geser untuk Mengunci';

  // Set up PanResponder inside state to avoid access-during-render errors
  const [panResponder] = useState(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Optional haptic or visual indicator
      },
      onPanResponderMove: (_, gestureState) => {
        // Constrain movement between 0 and TRAVEL_DISTANCE
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > TRAVEL_DISTANCE) newX = TRAVEL_DISTANCE;
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= TRAVEL_DISTANCE * 0.85) {
          // Swipe successful! Trigger state change
          Animated.timing(pan, {
            toValue: TRAVEL_DISTANCE,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            onLockStateChange(!isLocked);
            
            // Instantly reset slider to beginning for next action
            pan.setValue(0);
          });
        } else {
          // Swipe failed, bounce back to start
          Animated.spring(pan, {
            toValue: 0,
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  );

  // React to prop changes - reset animation value when locked state changes
  React.useEffect(() => {
    pan.setValue(0);
  }, [isLocked, pan]);

  return (
    <View style={[
      styles.sliderTrack, 
      isLocked ? styles.lockedTrack : styles.unlockedTrack
    ]}>
      {/* Dynamic background progress fill */}
      <Animated.View style={[
        styles.progressFill,
        {
          width: Animated.add(pan, THUMB_SIZE),
          backgroundColor: isLocked ? '#F0F0F3' : Colors.light.primary + '30',
        }
      ]} />
      
      <Text style={[
        styles.text,
        isLocked ? styles.lockedText : styles.unlockedText
      ]}>
        {sliderText}
      </Text>

      {/* Sliding handle */}
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: pan }],
            backgroundColor: isLocked ? Colors.light.text : Colors.light.primary,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons 
          name={isLocked ? 'lock-open-outline' : 'lock-closed-outline'} 
          size={20} 
          color="#FFF" 
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
    marginVertical: 16,
  },
  unlockedTrack: {
    backgroundColor: '#F0F0F3',
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  lockedTrack: {
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: '#48484A',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 28,
  },
  text: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 14,
    fontWeight: '600',
    pointerEvents: 'none',
  },
  unlockedText: {
    color: '#60646C',
  },
  lockedText: {
    color: '#AEAEB2',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
