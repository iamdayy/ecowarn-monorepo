import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrashVolumeStatus } from '../../types/ecowarn';

interface SeverityStatusBadgeProps {
  severity: TrashVolumeStatus;
  ratio?: number;
}

export const SeverityStatusBadge: React.FC<SeverityStatusBadgeProps> = ({ severity, ratio }) => {
  const getBadgeColor = (): string => {
    switch (severity) {
      case 'Kritis':
        return '#FF3B30'; // Merah (Bahaya Kritis)
      case 'Sedang':
        return '#FF9500'; // Jingga (Peringatan)
      case 'Ringan':
      default:
        return '#34C759'; // Hijau (Aman/Ringan)
    }
  };

  return (
    <View style={[styles.badgeContainer, { backgroundColor: getBadgeColor() }]}>
      <Text style={styles.badgeText}>Status: {severity.toUpperCase()}</Text>
      {ratio !== undefined && (
        <Text style={styles.ratioText}>({(ratio * 100).toFixed(1)}% Area Kamera)</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },
  ratioText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
});
