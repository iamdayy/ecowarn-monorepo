import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '../../types/auth';

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
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  buttonContainer: {
    gap: 10,
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  roleCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    shadowColor: '#10b981',
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
    marginRight: 8,
  },
  roleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  roleTitleSelected: {
    color: '#047857',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#10b981',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  roleDescriptionSelected: {
    color: '#065f46',
  },
});
