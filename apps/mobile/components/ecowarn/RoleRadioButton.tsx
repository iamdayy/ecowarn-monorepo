import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '../../types/auth';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';

interface RoleRadioButtonProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleRadioButton: React.FC<RoleRadioButtonProps> = ({ selectedRole, onSelectRole }) => {
  const roles: { label: UserRole; description: string; icon: string }[] = [
    {
      label: 'Warga',
      description: 'Pemantauan peta spasial & notifikasi peringatan dini',
      icon: '🗺️',
    },
    {
      label: 'Relawan',
      description: 'Akses Kamera AI & riwayat pelaporan lapangan',
      icon: '🛡️',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Pilih Peran Pendaftaran:</Text>
      <View style={styles.buttonContainer}>
        {roles.map((item) => {
          const isSelected = selectedRole === item.label;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => onSelectRole(item.label)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.roleIcon}>{item.icon}</Text>
                <Text style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}>
                  {item.label}
                </Text>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={[styles.roleDescription, isSelected && styles.roleDescriptionSelected]}>
                {item.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md - 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: EcoWarnColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  buttonContainer: {
    gap: 10,
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: EcoWarnColors.border,
    borderRadius: BorderRadius.md,
    padding: 14,
    backgroundColor: EcoWarnColors.surface,
  },
  roleCardSelected: {
    borderColor: EcoWarnColors.primaryLight,
    backgroundColor: EcoWarnColors.primarySurface,
    shadowColor: EcoWarnColors.primaryLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  roleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: EcoWarnColors.textSecondary,
  },
  roleTitleSelected: {
    color: EcoWarnColors.primary,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: EcoWarnColors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: EcoWarnColors.primaryLight,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: EcoWarnColors.primaryLight,
  },
  roleDescription: {
    fontSize: 12,
    color: EcoWarnColors.textMuted,
    lineHeight: 16,
  },
  roleDescriptionSelected: {
    color: EcoWarnColors.primaryDark,
  },
});
